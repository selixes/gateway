import { IsArray, IsString, ArrayMinSize, ValidateNested, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageDto {
  @IsEnum(['system', 'user', 'assistant', 'tool', 'function'])
  role: string;

  @IsOptional()
  content?: any; // can be string, array, or null

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  tool_call_id?: string;

  @IsOptional()
  @IsArray()
  tool_calls?: any[];
}

export class CreateCompletionDto {
  @IsString()
  model: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'messages must be a non-empty array' })
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(1)
  top_p?: number;

  @IsOptional()
  @IsNumber()
  max_tokens?: number;

  @IsOptional()
  stream?: boolean;
}
