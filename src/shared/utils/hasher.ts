import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export class Hasher {
  static async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  static async verify(hash: string, plainText: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
