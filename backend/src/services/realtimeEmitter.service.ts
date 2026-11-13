import { Response } from 'express';

export type RealtimeChangeType = 'inventory' | 'votes';

class RealtimeEmitterService {
  private clients: Set<Response> = new Set();

  constructor() {
    const keepAliveTimer = setInterval(() => {
      for (const client of this.clients) {
        try {
          client.write(': keep-alive\n\n');
        } catch {
          this.clients.delete(client);
        }
      }
    }, 25000);

    if (typeof keepAliveTimer.unref === 'function') {
      keepAliveTimer.unref();
    }
  }

  public addClient(res: Response): void {
    this.clients.add(res);
    res.on('close', () => this.clients.delete(res));
  }

  public broadcast(change: RealtimeChangeType, snackId?: string): void {
    const payload = `event: data-change\ndata: ${JSON.stringify({
      change,
      snackId,
      timestamp: new Date().toISOString(),
    })}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}

export const realtimeEmitterService = new RealtimeEmitterService();
