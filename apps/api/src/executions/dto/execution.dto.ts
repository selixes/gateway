import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class StartRunDto {
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @IsString()
  @IsOptional()
  triggerType?: string;
}

export class EndRunDto {
  @IsString()
  @IsNotEmpty()
  runId: string;

  @IsString()
  @IsNotEmpty()
  status: string; // SUCCESS | FAILED

  @IsString()
  @IsOptional()
  errorMessage?: string;
}

export class AddEventDto {
  @IsString()
  @IsNotEmpty()
  runId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsOptional()
  metadata?: any;
}
