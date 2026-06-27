import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const keys = await prisma.apiKey.findMany();
  console.log(`Found ${keys.length} API keys to check.`);

  for (const k of keys) {
    const isAlreadyHashed = /^[a-f0-9]{64}$/.test(k.key);
    if (!isAlreadyHashed) {
      console.log(`Hashing key ${k.id} (${k.name})...`);
      const rawKey = k.key;
      const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
      const preview = rawKey.startsWith('selixes_live_') || rawKey.startsWith('apishield_live_')
        ? 'selixes_live_••••••••' + rawKey.slice(-4)
        : 'key_••••••••' + rawKey.slice(-4);
      
      await prisma.apiKey.update({
        where: { id: k.id },
        data: {
          key: hashedKey,
          preview,
        },
      });
    } else {
      console.log(`Key ${k.id} (${k.name}) is already hashed.`);
    }
  }

  console.log('Migration completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
