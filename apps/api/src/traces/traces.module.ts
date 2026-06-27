import { Module } from '@nestjs/common';
import { TracesService } from './traces.service';
import { TracesController, TracesWebhookController } from './traces.controller';

@Module({
  controllers: [TracesWebhookController, TracesController],
  providers: [TracesService],
  exports: [TracesService],
})
export class TracesModule {}
