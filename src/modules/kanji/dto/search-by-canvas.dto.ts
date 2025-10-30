import { IsString } from 'class-validator';

export class SearchByCanvasDto {
  @IsString()
  image: string;
}
