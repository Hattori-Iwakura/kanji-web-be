import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class TranslateDto {
  @IsNotEmpty({ message: 'Vui lòng nhập văn bản cần dịch' })
  @IsString({ message: 'Văn bản phải là chuỗi ký tự' })
  text: string;

  @IsNotEmpty({ message: 'Vui lòng chọn ngôn ngữ nguồn' })
  @IsIn(['ja', 'vi'], { message: 'Ngôn ngữ nguồn phải là "ja" hoặc "vi"' })
  sourceLang: string;

  @IsNotEmpty({ message: 'Vui lòng chọn ngôn ngữ đích' })
  @IsIn(['ja', 'vi'], { message: 'Ngôn ngữ đích phải là "ja" hoặc "vi"' })
  targetLang: string;
}
