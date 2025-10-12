import { Injectable } from "@nestjs/common";
import { DbClient } from "../db_client/db_client.service";
import { Kanji } from "generated/prisma";
import { CreateKanjiDto, UpdateKanjiDto } from "./dtos";

@Injectable()
export class KanjiRepository {
    constructor(private readonly dbClient: DbClient) {}

    async fetchAllAsync(): Promise<Kanji[]> {
        return this.dbClient.kanji.findMany();
    }

    async fetchAsync(info: {
        id?: number;
        character?: string;
    }): Promise<Kanji | null> {
        return this.dbClient.kanji.findFirst({
            where: {
                OR: [
                    { id: info.id },
                    { character: info.character },
                ],
            },
        });
    }

    async updateAsync(id: number, info: UpdateKanjiDto): Promise<Kanji | null> {
        return this.dbClient.kanji.update({
            where: {
                id: id
            },
            data: info
        })
    }

    async createAsync(info: CreateKanjiDto): Promise<Kanji> {
        return this.dbClient.kanji.create({
            data: info
        })
    }

    async deleteAsync(id: number): Promise<Kanji> {
        return this.dbClient.kanji.delete({
            where: {
                id: id
            }
        })
    }
}