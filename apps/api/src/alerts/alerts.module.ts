import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AlertsService } from './alerts.service';

@Module({
  imports: [HttpModule],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
