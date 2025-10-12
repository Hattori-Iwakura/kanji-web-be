import { Expose, Type } from "class-transformer";

export class KanjiListOutputDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  description?: string;

  @Expose()
  user_id?: number;

  @Expose()
  is_public: boolean;

  @Expose()
  collection_type: string;

  @Expose()
  metadata?: any;

  @Expose()
  kanji_count?: number;

  @Expose()
  create_at: Date;

  @Expose()
  update_at: Date;
}

export class KanjiListWithKanjiDto extends KanjiListOutputDto {
  @Expose()
  @Type(() => Object)
  kanjis: any[];
}