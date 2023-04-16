import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { LOG_MESSAGE, LOG_KEY } from '../constants/logs';
import { Logger } from '../utils';

function getPrintLogFormat(message: string) {
  return `
<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
${message}
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`;
}

function getBaseData(context: ExecutionContext) {
  const request: Request = context.switchToHttp().getRequest();
  return {
    params: request.params,
    query: request.query,
    body: request.body,
    headers: request.headers,
  };
}

function getInfoData(context: ExecutionContext) {
  const request: Request = context.switchToHttp().getRequest();
  return {
    class: context.getClass()['name'],
    method: context.getHandler()['name'],
    url: `${request.method} - ${request.url}`,
    IP: request.ip,
  };
}

@Injectable()
export class LogsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isPrintLog =
      Reflect.getMetadata(LOG_KEY, context.getHandler()) ||
      Reflect.getMetadata(LOG_KEY, context.getClass());
    const fileName =
      Reflect.getMetadata(LOG_MESSAGE, context.getHandler()) ||
      Reflect.getMetadata(LOG_MESSAGE, context.getClass());

    const observable = next.handle();
    if (isPrintLog) {
      let response: any;
      const startTime = Date.now();
      observable.subscribe({
        next: (value) => {
          response = value;
        },
        complete: () => {
          const logMessageData = {
            ...getInfoData(context),
            time: `${Date.now() - startTime}ms`,
            request: getBaseData(context),
            response,
          };
          const logStr = getPrintLogFormat(
            JSON.stringify(logMessageData, null, 2),
          );
          Logger.access(fileName, logStr);
        },
      });
    }

    return observable;
  }
}
