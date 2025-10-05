import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ConfigKey = {
  PORT_SERVER: 'PORT_SERVER',
  DB_ADDRESS: 'DB_ADDRESS',
  DB_USER: 'DB_USER',
  DB_PASS: 'DB_PASS',
} as const;

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  private getOrStop<T = string>(key: string): T {
    const value = this.config.get<T>(key)

    if (value === undefined || value === null || value === '') {
      throw new Error(`❌ Missing required config: ${key}`)
    }

    return value
  }

  get port(): number {
    return this.getOrStop<number>(ConfigKey.PORT_SERVER)
  }

  get dbAddress(): string {
    return this.getOrStop(ConfigKey.DB_ADDRESS)
  }

}
