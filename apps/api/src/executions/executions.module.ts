import { Module } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController, ExecutionsWebhookController } from './executions.controller';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  controllers: [ExecutionsWebhookController, ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
