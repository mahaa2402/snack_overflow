import { Request, Response, NextFunction } from 'express';
import { restockService } from '../services/restock.service';
import { alertEmitterService } from '../services/alertEmitter.service';
import { sendSuccess } from '../utils/apiResponse';

export class AlertController {
  /**
   * GET /alerts
   * Returns live stock alerts for running-low and out-of-stock snacks.
   */
  public async getAlerts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alerts = await restockService.getLiveAlerts();
      sendSuccess(res, alerts, 'Stock alerts retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /alerts/stream
   * Real-time Server-Sent Events (SSE) notification stream for low stock & restock changes.
   */
  public async streamAlerts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (nginx etc)
      res.flushHeaders?.();

      alertEmitterService.addClient(res);

      // Send initial connection handshake and active alerts
      const initialAlerts = await restockService.getLiveAlerts();
      res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to stock alert stream', alertCount: initialAlerts.length })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'INITIAL_ALERTS', alerts: initialAlerts })}\n\n`);
    } catch (error) {
      next(error);
    }
  }
}

export const alertController = new AlertController();

