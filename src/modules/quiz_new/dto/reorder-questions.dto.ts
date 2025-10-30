import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionOrderDto {
  @ApiProperty({ description: 'Question ID', example: 1 })
  @IsInt()
  id: number;

  @ApiProperty({ description: 'New order position', example: 0 })
  @IsInt()
  order: number;
}

export class ReorderQuestionsDto {
  @ApiProperty({ 
    description: 'Array of question orders', 
    type: [QuestionOrderDto],
    example: [{ id: 1, order: 0 }] 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOrderDto)
  questionOrders: QuestionOrderDto[];
}
