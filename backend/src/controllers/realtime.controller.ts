import { Request, Response, NextFunction } from 'express';
import { realtimeEmitterService } from '../services/realtimeEmitter.service';

export class RealtimeController {
  public streamUpdates = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      realtimeEmitterService.addClient(res);
      res.write(`event: connected\ndata: {}\n\n`);
    } catch (error) {
      next(error);
    }
  };
}

export const realtimeController = new RealtimeController();
