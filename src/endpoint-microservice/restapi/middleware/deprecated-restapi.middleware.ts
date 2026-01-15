import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class DeprecatedRestapiMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DeprecatedRestapiMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.warn(
      `Deprecated: ${req.method} ${req.path} - use /rest instead of /restapi`,
    );
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', '2026-01-01');
    next();
  }
}
