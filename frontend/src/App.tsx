// src/App.tsx
import { useMemo, useState } from 'react';
import ViewerModal, { type Device as ViewerDevice } from './ViewerModal';
import {
  App as AntApp,
  Badge,
  Button,
  Card,
  Flex,
  Input,
  Layout,
  List,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  MobileOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

type Device = {
  id: string;
  deviceName: string;
};

const initialDevices: Device[] = [
  { id: 'device_01qưeqweqweqweqwe', deviceName: 'Galaxy A52' },
  { id: 'device_02', deviceName: 'Pixel 4a' },
  // { id: 'device_03', deviceName: 'iPhone 12' },
];

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [devices] = useState<Device[]>(initialDevices);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ViewerDevice | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.deviceName.toLowerCase().includes(q)
    );
  }, [devices, query]);

  const refresh = async () => {
    setLoading(true);
    // mock refresh; sau nối WS thì thay bằng request thật
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
  };

  const openViewer = (device: Device) => {
    setSelectedDevice(device);
    setViewerOpen(true);
  };

  return (
    <AntApp>
      <Layout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            color: '#fff',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <MobileOutlined />
          Remote Android Viewer
        </Header>

        <Content style={{ padding: 24, maxWidth: 1024, margin: '0 auto', width: '100%' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Flex justify="space-between" align="center" wrap>
              <Title level={3} style={{ margin: 0 }}>
                {/* Devices: N */}
                Devices: {filtered.length}
              </Title>
              <Space.Compact>
                <Input
                  allowClear
                  placeholder="Search by deviceName / id"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ width: 320 }}
                />
                <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>
                  Refresh
                </Button>
              </Space.Compact>
            </Flex>

            <Card>
              <List
                itemLayout="horizontal"
                dataSource={filtered}
                locale={{ emptyText: 'No devices' }}
                renderItem={(d) => (
                  <List.Item
                    actions={[
                      <Button
                        key="open"
                        type="primary"
                        onClick={() => openViewer(d)}
                      >
                        Open
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        // giữ chấm xanh lá báo "online"
                        <Badge status="success" />
                      }
                      title={
                        <Space size="small" wrap>
                          {/* deviceName */}
                          <Text strong>{d.deviceName}</Text>
                          {/* id tag màu "geekblue" giống tag model trước đó */}
                          <Tag color="geekblue">{d.id}</Tag>
                        </Space>
                      }
                      // bỏ mô tả phụ: ip / last seen / model
                      description={null}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        </Content>

        <Footer style={{ textAlign: 'center' }}>
          © {new Date().getFullYear()} Remote Android
        </Footer>
      </Layout>
      <ViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        device={selectedDevice}
      />
    </AntApp>
  );
}