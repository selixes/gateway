import { IsString, IsNotEmpty, IsInt, IsNumber, IsOptional, IsObject } from 'class-validator';

export class IngestTraceDto {
  @IsString()
  @IsNotEmpty()
  runId: string;

  @IsString()
  @IsNotEmpty()
  provider: string; // "openai" | "anthropic" | "google"

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsInt()
  promptTokens: number;

  @IsInt()
  completionTokens: number;

  @IsInt()
  latency: number; // ms

  @IsNumber()
  estimatedCost: number;

  @IsNumber()
  @IsOptional()
  actualCost?: number;

  @IsString()
  @IsNotEmpty()
  status: string; // "success" | "error"

  @IsInt()
  @IsOptional()
  httpStatus?: number;

  @IsString()
  @IsOptional()
  providerRequestId?: string;

  @IsObject()
  @IsOptional()
  promptSnapshot?: Record<string, any>;

  @IsObject()
  @IsOptional()
  responseSnapshot?: Record<string, any>;
}
