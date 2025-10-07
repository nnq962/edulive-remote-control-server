// src/hooks/useWsViewer.ts
import { useEffect, useState, useMemo } from 'react';
import { wsClient } from '../lib/wsClient';

export type Device = { id: string; deviceName: string };

export function useWsViewer() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.subscribe((msg) => {
      if (msg.type === 'device-list' && Array.isArray(msg.items)) {
        setDevices(msg.items);
      }
    });

    // đánh dấu ready theo trạng thái socket
    const t = setInterval(() => {
      // crude: xem có socket mở không
      // (có thể mở rộng bằng ping/pong)
      // @ts-expect-error private access ok cho nhanh
      const ws = wsClient.ws as WebSocket | null;
      setReady(!!ws && ws.readyState === WebSocket.OPEN);
    }, 300);

    return () => {
      unsub();
      clearInterval(t);
      // Không close() để giữ singleton cho component khác (Modal) dùng chung.
    };
  }, []);

  const refresh = () => wsClient.requestDevices();
  const sendControl = (deviceId: string, payload: unknown) =>
    wsClient.sendControl(deviceId, payload);

  return useMemo(
    () => ({ devices, ready, refresh, sendControl }),
    [devices, ready]
  );
}