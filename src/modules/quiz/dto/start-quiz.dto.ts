import { IsInt, IsNotEmpty } from 'class-validator';

export class StartQuizDto {
  @IsInt()
  @IsNotEmpty()
  quiz_id: number;
}
