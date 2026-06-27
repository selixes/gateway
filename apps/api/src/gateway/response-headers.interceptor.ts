import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ResponseHeadersInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse();
    
    // Inject runtime mode header indicating Redis coordination state
    const mode = this.redis.isFallbackActive() ? 'fallback-memory' : 'redis';
    res.setHeader('X-SELIXES-RUNTIME-MODE', mode);
    res.setHeader('X-APISHIELD-RUNTIME-MODE', mode);

    return next.handle().pipe(
      map((data) => {
        if (data && data._meta) {
          res.setHeader('X-Request-Id',     data._meta.requestId);
          res.setHeader('X-Provider-Chain', data._meta.providerChain.join(','));
          res.setHeader('X-Provider',       data._meta.providerChain
            .findLast((p: string) => p.includes(':200') || p.endsWith(':200'))
            ?.split(':')[0] ?? 'unknown');

          // Strip internal meta from client-facing response body
          const { _meta, _continuity, ...clientData } = data;
          return clientData;
        }
        return data;
      }),
    );
  }
}
