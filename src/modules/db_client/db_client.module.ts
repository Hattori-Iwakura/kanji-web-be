import { Global, Module } from '@nestjs/common';
import { DbClient } from './db_client.service';

@Global()
@Module({
  providers: [DbClient],
  exports: [DbClient]
})
export class DbClientModule {}
