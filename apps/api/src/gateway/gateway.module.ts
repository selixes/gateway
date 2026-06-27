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

@Module({
  imports: [PrismaModule],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    UsageAccumulatorService,
    GatewayEventBus,
    PrometheusService,
    ProviderHealthService,
    ReplayService,
    TelemetryService,
  ],
  exports: [
    GatewayService,
    UsageAccumulatorService,
    GatewayEventBus,
    PrometheusService,
    ProviderHealthService,
    ReplayService,
    TelemetryService,
  ],
})
export class GatewayModule {}


