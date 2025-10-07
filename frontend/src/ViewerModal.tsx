import { Modal, Space, Tag, Typography, Button } from 'antd';
import { useEffect, useRef } from 'react';

const { Title, Text } = Typography;

export type Device = {
  id: string;
  deviceName: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  device: Device | null;
};

const WS_URL = 'ws://192.168.0.100:8080/ws'; // đổi theo backend của bạn

export default function ViewerModal({ open, onClose, device }: Props) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!open || !device) return;

    // Kết nối WS riêng cho modal này
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Đăng ký viewer trước
      ws.send(JSON.stringify({ type: 'viewer.register', deviceId: device.id }));
      // Gửi yêu cầu xin MediaProjection tới Android (qua server relay)
      ws.send(JSON.stringify({ type: 'stream.start', deviceId: device.id }));
      // (Optional) log debug
      console.log('[ViewerModal] sent stream.start for', device.id);
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        try {
          const obj = JSON.parse(ev.data);
          if (obj.type === 'stream.ended') {
            console.log('[ViewerModal] stream.ended', obj.deviceId);
          }
          if (obj.type === 'error') {
            console.warn('[ViewerModal] server error:', obj);
          }
        } catch {}
      }
    };

    ws.onerror = (e) => console.warn('[ViewerModal] WS error', e);
    ws.onclose = () => console.log('[ViewerModal] WS closed');

    // Cleanup khi đóng modal
    return () => {
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stream.stop', deviceId: device.id }));
          console.log('[ViewerModal] sent stream.stop for', device.id);
        }
      } catch {}
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [open, device]);

  return (
    <Modal
      centered
      open={open}
      onCancel={onClose}
      closable={false}
      maskClosable={false}
      footer={
        <Space>
          <Button danger onClick={onClose}>Close</Button>
        </Space>
      }
      title={
        device ? (
          <Space size="small" align="center">
            <Title level={5} style={{ margin: 0 }}>{device.deviceName}</Title>
            <Tag color="geekblue" style={{ width: 'fit-content' }}>{device.id}</Tag>
          </Space>
        ) : 'Viewer'
      }
      width={880}
    >
      {/* TODO: nhét canvas/video sau */}
      <Text type="secondary">Viewer content placeholder.</Text>
    </Modal>
  );
}