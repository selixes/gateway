import { HttpException, HttpStatus } from '@nestjs/common';
import { ProductionExceptionFilter } from './production-exception.filter';

describe('ProductionExceptionFilter (Task 3 Production Hygiene)', () => {
  let filter: ProductionExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: any;

  beforeEach(() => {
    filter = new ProductionExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ url: '/api/v1/faulty', method: 'GET' }),
      }),
    };
  });

  it('formats standard HttpExceptions cleanly without stack traces', () => {
    const exception = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        path: '/api/v1/faulty',
        message: 'Forbidden resource',
      }),
    );
    const result = mockJson.mock.calls[0][0];
    expect(result.stack).toBeUndefined();
    expect(result.trace).toBeUndefined();
  });

  it('catches raw unhandled Errors and returns generic 500 without leaking stack traces', () => {
    const rawError = new Error('Database password failed: connection string leaked secret_pass_123');
    filter.catch(rawError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/api/v1/faulty',
        message: 'Internal server error',
      }),
    );
    const result = mockJson.mock.calls[0][0];
    expect(result.stack).toBeUndefined();
    expect(result.trace).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('secret_pass_123');
  });
});
