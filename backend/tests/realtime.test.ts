/// <reference types="jest" />
import { EventEmitter } from 'events';
import { Response } from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import { realtimeEmitterService } from '../src/services/realtimeEmitter.service';

describe('Realtime updates', () => {
  it('requires authentication to open the event stream', async () => {
    await request(createApp()).get('/api/realtime/stream').expect(401);
  });

  it('broadcasts inventory and vote changes to connected clients', () => {
    const client = Object.assign(new EventEmitter(), { write: jest.fn() });
    realtimeEmitterService.addClient(client as unknown as Response);

    realtimeEmitterService.broadcast('inventory', 'snack-1');
    realtimeEmitterService.broadcast('votes', 'snack-2');

    expect(client.write).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('"change":"inventory","snackId":"snack-1"')
    );
    expect(client.write).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('"change":"votes","snackId":"snack-2"')
    );

    client.emit('close');
  });
});
