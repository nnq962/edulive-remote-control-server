import { Modal, Space, Tag, Typography, Button } from 'antd';

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

export default function ViewerModal({ open, onClose, device }: Props) {
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