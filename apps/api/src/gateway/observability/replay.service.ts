import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface ReplayEnvelope {
  keyVersion: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

@Injectable()
export class ReplayService implements OnModuleInit {
  private readonly logger = new Logger(ReplayService.name);
  private encryptionKey: Buffer;
  private readonly KEY_VERSION = 'v1';

  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.REPLAY_CRYPTO_SECRET || 'akra-shield-default-secure-vault-key-32b';
    const isProd = process.env.NODE_ENV === 'production';
    
    if (isProd && (!process.env.REPLAY_CRYPTO_SECRET || secret === 'akra-shield-default-secure-vault-key-32b' || secret.includes('REPLACE'))) {
      throw new Error(
        'FATAL: REPLAY_CRYPTO_SECRET environment variable is not set, is using the insecure default, or contains REPLACE. A secure, custom 32-byte minimum secret key is required for the Replay Vault in production.',
      );
    } else if (!isProd && (!process.env.REPLAY_CRYPTO_SECRET || secret === 'akra-shield-default-secure-vault-key-32b' || secret.includes('REPLACE'))) {
      this.logger.warn('⚠️  REPLAY_CRYPTO_SECRET is not configured or using default. This is allowed in development, but WILL fail to boot in production.');
    }
    
    this.encryptionKey = crypto.createHash('sha256').update(secret).digest();
  }

  onModuleInit() {
    this.logger.log('Initializing Replay Vault background 30-day TTL pruner...');
    // Execute cleanup immediately on start, then every 24 hours
    this.pruneOldTraces().catch(err => {
      this.logger.error(`Initial trace pruning failed: ${err.message}`);
    });
    
    setInterval(() => {
      this.pruneOldTraces().catch(err => {
        this.logger.error(`Background trace pruning failed: ${err.message}`);
      });
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Cleans up AITrace entries older than 30 days to limit space consumption.
   */
  async pruneOldTraces(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const deleteCount = await this.prisma.aITrace.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });
      if (deleteCount.count > 0) {
        this.logger.log(`[Replay Vault TTL] Successfully pruned ${deleteCount.count} traces older than 30 days.`);
      }
    } catch (err: any) {
      this.logger.error(`Error pruning old traces: ${err.message}`);
    }
  }

  /**
   * Recursively scrubs PII (emails, phone numbers, cards) from a string or object.
   */
  scrubPII(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      let result = data;
      const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;
      const PHONE_REGEX = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
      const PASSPORT_REGEX = /\b[A-Z0-9]{9}\b/gi;
      const IBAN_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi;
      const DOB_REGEX = /\b(?:\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})\b/g;

      const redactAndLog = (text: string, regex: RegExp, label: string, replacement: string) => {
        let updated = text;
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
          this.logger.warn(`[PII Audit Log] Replay Vault redacted ${matches.length} instance(s) of ${label}`);
          updated = text.replace(regex, replacement);
        }
        return updated;
      };

      result = redactAndLog(result, EMAIL_REGEX, 'Email Address', '[REDACTED_EMAIL]');
      result = redactAndLog(result, CREDIT_CARD_REGEX, 'Credit Card Number', '[REDACTED_CARD]');
      result = redactAndLog(result, PHONE_REGEX, 'Phone Number', '[REDACTED_PHONE]');
      result = redactAndLog(result, SSN_REGEX, 'Social Security Number (SSN)', '[REDACTED_SSN]');
      result = redactAndLog(result, PASSPORT_REGEX, 'Passport Number', '[REDACTED_PASSPORT]');
      result = redactAndLog(result, IBAN_REGEX, 'IBAN Bank Account', '[REDACTED_IBAN]');
      result = redactAndLog(result, DOB_REGEX, 'Date of Birth (DOB)', '[REDACTED_DOB]');

      return result;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.scrubPII(item));
    }

    if (typeof data === 'object') {
      const scrubbed: Record<string, any> = {};
      for (const [key, val] of Object.entries(data)) {
        if (/api_?key|password|secret|token|auth/i.test(key)) {
          scrubbed[key] = '[REDACTED_CREDENTIAL]';
        } else {
          scrubbed[key] = this.scrubPII(val);
        }
      }
      return scrubbed;
    }

    return data;
  }

  /**
   * Encrypts any JSON-serializable payload into a versioned ReplayEnvelope using AES-256-GCM.
   */
  encrypt(payload: any): ReplayEnvelope {
    const cleanPayload = this.scrubPII(payload);
    const plaintext = JSON.stringify(cleanPayload);
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return {
      keyVersion: this.KEY_VERSION,
      iv: iv.toString('hex'),
      authTag,
      ciphertext,
    };
  }

  /**
   * Decrypts a ReplayEnvelope back into its original object.
   */
  decrypt(envelope: ReplayEnvelope): any {
    if (envelope.keyVersion !== this.KEY_VERSION) {
      throw new Error(`Unsupported envelope key version: ${envelope.keyVersion}`);
    }

    const iv = Buffer.from(envelope.iv, 'hex');
    const authTag = Buffer.from(envelope.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(envelope.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return JSON.parse(plaintext);
  }
}
