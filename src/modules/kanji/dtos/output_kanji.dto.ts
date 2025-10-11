import { Expose } from "class-transformer";

export class KanjiDto {
    @Expose()
    id: number;

    @Expose()
    character: string;

    @Expose()
    meaning: string;

    @Expose()
    onyomi?: string;

    @Expose()
    kunyomi?: string;

    @Expose()
    strokes?: number;

    @Expose()
    jlpt?: number;

    @Expose()
    grade?: number;

    @Expose()
    frequency?: number;

    @Expose()
    radicals?: string[];
}
