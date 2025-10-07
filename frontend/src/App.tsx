import { Button, Card, Layout, Space, Typography } from 'antd';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ color: '#fff', fontWeight: 600 }}>Remote Android Viewer</Header>
      <Content style={{ padding: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
          <Card>
            <Space align="center">
              <Text>Ant Design ready.</Text>
              <Button type="primary">Test Button</Button>
            </Space>
          </Card>
        </Space>
      </Content>
      <Footer style={{ textAlign: 'center' }}>© {new Date().getFullYear()}</Footer>
    </Layout>
  );
}