import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class ProductionExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProductionExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && (res as any).error) {
        // Preserve OpenAI-compatible error shapes directly (e.g. { error: { type, code, message, details } })
        response.status(status).json(res);
        return;
      }
      message = typeof res === 'object' ? (res as any).message || res : res;
    } else {
      // Log error server-side for operators, but never leak trace to the HTTP client
      const err = exception as Error;
      this.logger.error(
        `[ProductionExceptionFilter] Unhandled Error on ${request.method} ${request.url}: ${err?.message}`,
        err?.stack,
      );
    }

    // In production, sanitize response body: zero stack trace or internal details
    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: message,
    });
  }
}
