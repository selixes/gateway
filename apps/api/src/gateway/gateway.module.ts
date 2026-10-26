import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { UsageAccumulatorService } from './usage-accumulator.service';
import { GatewayEventBus } from './observability/gateway-event-bus.service';
import { PrometheusService } from './observability/prometheus.service';
import { ProviderHealthService } from './observability/provider-health.service';
import { ReplayService } from './observability/replay.service';
import { TelemetryService } from './observability/telemetry.service';
import { SemanticCacheService } from './semantic-cache.service';
import { AiImmuneSystemService } from './immune-system.service';
import { TimeTravelRollbackService } from './time-travel-rollback.service';
import { AlertsModule } from '../alerts/alerts.module';

import { AsyncAuditService } from './async-audit.service';

@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    AsyncAuditService,
    UsageAccumulatorService,
    GatewayEventBus,
    PrometheusService,
    ProviderHealthService,
    ReplayService,
    TelemetryService,
    SemanticCacheService,
    AiImmuneSystemService,
    TimeTravelRollbackService,
  ],
  exports: [
    GatewayService,
    AsyncAuditService,
    UsageAccumulatorService,
    GatewayEventBus,
    PrometheusService,
    ProviderHealthService,
    ReplayService,
    TelemetryService,
    SemanticCacheService,
    AiImmuneSystemService,
    TimeTravelRollbackService,
  ],
})
export class GatewayModule {}

