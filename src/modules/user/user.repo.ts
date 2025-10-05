import { Injectable } from '@nestjs/common';
import { DbClient } from '../db_client/db_client.service';
import { Prisma, Users } from 'generated/prisma';

@Injectable()
export class UserRepository {
    constructor(private readonly dbClient: DbClient) {}

    async fetchAllAsync(): Promise<Users[]> {

        return this.dbClient.users.findMany(); 
    }

    async fetchAsync(info: {
        id?: number;
        account?: string;
    }): Promise<Users | null> {

        const conditions = Object.entries(info)
        .filter(([, value]) => value !== undefined)
        .map(([key, value])  => ({ [key]: value }));

        if (conditions.length === 0) {
            return null;
        }

        return this.dbClient.users.findFirst({
            where: { OR: conditions },
        });
    }

    async updateAsync(id: number, info: Prisma.UsersUpdateInput): Promise<Users | null> {
        return this.dbClient.users.update({
            where: {
                id: id
            },
            data: info
        })
    }
}