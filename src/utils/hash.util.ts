import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';

export function randomToken(len = 48) {
  return randomBytes(len).toString('base64url');
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
