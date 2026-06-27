import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  externalWorkflowId?: string;
}
