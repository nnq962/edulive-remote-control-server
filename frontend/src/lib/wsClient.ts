// src/lib/wsClient.ts
type Device = { id: string; deviceName: string };
type WsIn =
  | { type: 'device-list'; items: Device[] }
  | { type: 'pong' }
  | { type: string; [k: string]: any };

type Listener = (msg: WsIn) => void;

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (location.protocol === 'https:'
    ? `wss://${location.hostname}/ws`
    : `ws://localhost:8080/ws`);

class WsClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private retry = 0;
  private closedByUser = false;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify({ type: 'hello', role: 'viewer' }));
    };

    ws.onmessage = (ev) => {
      let msg: WsIn;
      try { msg = JSON.parse(ev.data); } catch { return; }
      this.listeners.forEach(l => l(msg));
    };

    ws.onclose = () => {
      if (this.closedByUser) return;
      this.retry = Math.min(this.retry + 1, 5);
      const delay = 500 * this.retry;
      setTimeout(() => this.connect(), delay);
    };

    ws.onerror = () => ws.close();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(data: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  requestDevices() {
    this.send({ type: 'hello', role: 'viewer' });
  }

  // === API điều khiển cho modal dùng sau này ===
  sendControl(deviceId: string, payload: unknown) {
    this.send({ type: 'control', deviceId, payload });
  }

  close() {
    this.closedByUser = true;
    this.ws?.close();
    this.ws = null;
  }
}

export const wsClient = new WsClient();