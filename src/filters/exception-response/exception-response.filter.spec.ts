import { ExceptionResponseFilter } from './exception-response.filter';
import { LoggerService } from '../../shared/services/logger.service';

describe('ExceptionResponseFilter', () => {
  it('should be defined', () => {
    const mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    } as unknown as LoggerService;
    
    expect(new ExceptionResponseFilter(mockLogger)).toBeDefined();
  });
});
