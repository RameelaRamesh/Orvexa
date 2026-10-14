import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponseFormat<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseFormat<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseFormat<T>> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => {
        const message = data && data.message ? data.message : 'Operation successful';
        const responseData = data && data.message && data.data !== undefined ? data.data : data;
        const meta = data && data.meta ? data.meta : undefined;

        return {
          statusCode: response.statusCode,
          success: true,
          message,
          data: responseData,
          ...(meta ? { meta } : {}),
        };
      }),
    );
  }
}
