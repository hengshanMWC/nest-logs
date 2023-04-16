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

function getPrintLogFormat(message: string, name = '') {
  return `
${name}<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
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

function getLogData(context: ExecutionContext) {
  return {
    ...getInfoData(context),
    request: getBaseData(context),
  };
}

function getLogDataFormat(data: any, name?: string) {
  return getPrintLogFormat(JSON.stringify(data, null, 2), name);
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
      function getTime() {
        return `${Date.now() - startTime}ms`;
      }
      observable.subscribe({
        next: (value) => {
          response = value;
        },
        error: (error: Error) => {
          const logMessageData = {
            ...getLogData(context),
            time: getTime(),
            responseError: error.message,
          };
          Logger.access(fileName, getLogDataFormat(logMessageData, 'error'));
        },
        complete: () => {
          const logMessageData = {
            ...getLogData(context),
            time: getTime(),
            response,
          };
          Logger.access(fileName, getLogDataFormat(logMessageData));
        },
      });
    }

    return observable;
  }
}
