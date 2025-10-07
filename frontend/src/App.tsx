// src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import ViewerModal, { type Device as ViewerDevice } from './ViewerModal';
import { useWsViewer } from './hooks/useWsViewer';
import {
  App as AntApp,
  Badge,
  Button,
  Card,
  Flex,
  Grid,
  Input,
  Layout,
  List,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  MobileOutlined,
} from '@ant-design/icons';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function App() {
  const [query, setQuery] = useState('');
  const { devices, ready } = useWsViewer();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ViewerDevice | null>(null);
  const screens = Grid.useBreakpoint();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.deviceName.toLowerCase().includes(q)
    );
  }, [devices, query]);

  const openViewer = (device: ViewerDevice) => {
    setSelectedDevice(device);
    setViewerOpen(true);
  };

  useEffect(() => {
    console.log('[UI] devices len:', devices.length, devices);
  }, [devices]);
  useEffect(() => {
    console.log('[UI] ws ready:', ready);
  }, [ready]);

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
            <Flex
              justify="space-between"
              align="center"
              wrap
              style={{
                flexWrap: 'wrap',
                rowGap: 12,
                columnGap: 12,
              }}
            >
              <Title level={3} style={{ margin: 0 }}>
                Devices: {filtered.length}
              </Title>
              <div
                style={{
                  width: screens.md ? 250 : '100%',
                  flex: screens.md ? '0 0 auto' : '1 0 100%'
                }}
              >
                <Input
                  allowClear
                  placeholder="Search by device name / id"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
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