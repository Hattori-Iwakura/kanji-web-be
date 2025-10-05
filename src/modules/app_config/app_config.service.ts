import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ConfigKey = {
  PORT_SERVER: 'PORT_SERVER',
  DATABASE_URL: 'DATABASE_URL',
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

  get dbUrl(): string {
    return this.getOrStop(ConfigKey.DATABASE_URL)
  }

}
