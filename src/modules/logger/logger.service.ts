import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger{
  private logPath = path.join(process.cwd(), 'logs');
  private logFile = path.join(this.logPath, 'app.log');

  constructor() {
    super();
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath);
    }
  }

  private writeToFile(message: string) {
    fs.appendFileSync(this.logFile, message + '\n');
  }

  log(message: string) {
    const formatted = `[INFO] ${new Date().toISOString()} ${message}`;
    super.log(formatted);
    this.writeToFile(formatted);
  }

  warn(message: string) {
    const formatted = `[WARN] ${new Date().toISOString()} ${message}`;
    super.warn(formatted);
    this.writeToFile(formatted);
  }

  error(message: string, trace?: string) {
    const formatted = `[ERROR] ${new Date().toISOString()} ${message} ${trace ?? ''}`;
    super.error(formatted);
    this.writeToFile(formatted);
  }
}
