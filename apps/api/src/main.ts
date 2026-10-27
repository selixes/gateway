import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { json } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ProductionExceptionFilter } from './common/filters/production-exception.filter';
import { validateProductionSecrets } from './common/config/production-secrets.validator';

async function bootstrap() {
  // Load .env manually in development before any guards or service initiations
  if (process.env.NODE_ENV !== 'production') {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        for (const line of envConfig.split('\n')) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = (match[2] || '').trim();
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
              value = value.slice(1, -1);
            }
            if (process.env[key] === undefined) {
              process.env[key] = value;
            }
          }
        }
      }
    } catch (err) {
      Logger.warn(`Failed to dynamically parse .env file: ${err.message}`);
    }
  }

  // Hardened production startup secrets validation
  validateProductionSecrets();

  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.enableShutdownHooks();

  // Payload size guard (G2 — 413 Payload Too Large) & rawBody capture for webhooks
  app.use(json({
    limit: '1mb',
    verify: (req: any, _res: any, buf: Buffer) => {
      req.rawBody = buf;
    },
  }));

  // Global strict validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // allow non-white listed to proxy extra LLM fields transparently
      transform: true,
    }),
  );

  // Global production exception filter (prevents stack trace leaks)
  app.useGlobalFilters(new ProductionExceptionFilter());

  // Split CORS Policy
  app.enableCors({
    origin: (origin, callback) => {
      // Allow any origin for server-to-server gateway calls (often no origin header)
      if (!origin) return callback(null, true);
      
      const allowedFrontend = process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
      const gatewayOrigins = process.env.GATEWAY_CORS_ORIGINS === '*' 
        ? '*' 
        : (process.env.GATEWAY_CORS_ORIGINS?.split(',') || []);

      // If gateway origins is '*', allow all
      if (gatewayOrigins === '*') {
        return callback(null, true);
      }
      
      // Allow frontend origin for dashboard
      if (origin === allowedFrontend) {
        return callback(null, true);
      }
      
      // Allow specific gateway origins if configured
      if (Array.isArray(gatewayOrigins) && gatewayOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Default fallback (block)
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  Logger.log(`🚀 Selixes running on port ${port}`);
}

bootstrap();
// TOUCH_FLAG: 1782560694855
