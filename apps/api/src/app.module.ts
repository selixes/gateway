import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ExecutionsModule } from './executions/executions.module';
import { TracesModule } from './traces/traces.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { GatewayModule } from './gateway/gateway.module';
import { KeysModule } from './keys/keys.module';
import { RedisModule } from './redis/redis.module';
import { BillingModule } from './billing/billing.module';
import * as crypto from 'crypto';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers["x-api-key"]', 'req.headers.cookie', 'req.headers["set-cookie"]'],
        customProps: () => ({ context: 'HTTP' }),
        autoLogging: true,
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
      },
    }),
    PrismaModule,
    HealthModule,
    OrganizationsModule,
    WorkflowsModule,
    ExecutionsModule,
    TracesModule,
    WebhooksModule,
    GatewayModule,
    KeysModule,
    RedisModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
