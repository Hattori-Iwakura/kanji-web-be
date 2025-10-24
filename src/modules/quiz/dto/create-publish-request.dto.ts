import { IsString, IsOptional } from 'class-validator';

export class CreatePublishRequestDto {
  @IsString()
  @IsOptional()
  message?: string;
}
