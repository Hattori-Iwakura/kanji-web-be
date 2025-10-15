import { Expose } from 'class-transformer';

export class UserOutputDto {
  @Expose()
  id: number;

  @Expose()
  account: string;

  @Expose()
  email: string;

  @Expose()
  profile_image?: string;

  @Expose()
  is_first_login: boolean;

  @Expose()
  create_at: Date;
}

export class SessionOutputDto {
  @Expose()
  id: string;

  @Expose()
  user_id: number;

  @Expose()
  expires_at: Date;

  @Expose()
  create_at: Date;
}