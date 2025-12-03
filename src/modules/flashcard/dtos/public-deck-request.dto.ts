import { IsString, IsEnum, IsInt, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PublicDeckRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class CreatePublicDeckRequestDto {
  @ApiProperty({ description: 'ID của deck muốn public', example: 1 })
  @IsInt()
  deck_id: number;

  @ApiProperty({ 
    description: 'Lý do muốn public deck (tối thiểu 20 ký tự)', 
    example: 'This deck contains well-structured JLPT N5 kanji that would be helpful for beginners learning Japanese.'
  })
  @IsString()
  @MinLength(20, { message: 'Lý do phải có ít nhất 20 ký tự' })
  reason: string;
}

export class ReviewPublicDeckRequestDto {
  @ApiProperty({ 
    description: 'Trạng thái xét duyệt',
    enum: PublicDeckRequestStatus,
    example: PublicDeckRequestStatus.APPROVED
  })
  @IsEnum(PublicDeckRequestStatus)
  status: PublicDeckRequestStatus;

  @ApiPropertyOptional({ 
    description: 'Ghi chú từ admin',
    example: 'Great content, approved for public access'
  })
  @IsString()
  @IsOptional()
  admin_note?: string;
}

export class PublicDeckRequestQueryDto {
  @ApiPropertyOptional({ 
    description: 'Lọc theo trạng thái',
    enum: PublicDeckRequestStatus
  })
  @IsEnum(PublicDeckRequestStatus)
  @IsOptional()
  status?: PublicDeckRequestStatus;

  @ApiPropertyOptional({ description: 'Số trang', example: 1 })
  @IsInt()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang', example: 20 })
  @IsInt()
  @IsOptional()
  limit?: number;
}
