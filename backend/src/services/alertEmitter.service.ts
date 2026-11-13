import { EventEmitter } from 'events';
import { Response } from 'express';
import { StockAlert } from '../types/restock.types';

class AlertEmitterService extends EventEmitter {
  private clients: Set<Response> = new Set();

  constructor() {
    super();
    // Periodically send keep-alive comment so proxies/browsers don't drop the connection
    const keepAliveTimer = setInterval(() => {
      this.sendKeepAlive();
    }, 25000);
    // Unref timer so Jest and Node process can exit cleanly
    if (typeof keepAliveTimer.unref === 'function') {
      keepAliveTimer.unref();
    }
  }

  public addClient(res: Response): void {
    this.clients.add(res);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  public removeClient(res: Response): void {
    this.clients.delete(res);
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public broadcastAlert(alert: StockAlert): void {
    const payload = `data: ${JSON.stringify(alert)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  public broadcastRefresh(): void {
    const payload = `event: refresh\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  private sendKeepAlive(): void {
    for (const client of this.clients) {
      try {
        client.write(': keep-alive\n\n');
      } catch {
        this.clients.delete(client);
      }
    }
  }
}

export const alertEmitterService = new AlertEmitterService();
