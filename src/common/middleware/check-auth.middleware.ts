import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CheckAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.userInfo) {
      req.isAuthenticated = false;
    } else {
      req.isAuthenticated = true;
    }
    next();
  }
}
