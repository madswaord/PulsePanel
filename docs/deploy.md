# PulsePanel 部署说明（当前阶段）

## 1. 基础要求

- Node.js 22+
- 可访问 OPNsense Web API
- 具备 OPNsense API Key / Secret

## 2. 环境变量

参考根目录 `.env.example`

关键项：

- `OPNSENSE_BASE_URL`
- `OPNSENSE_API_KEY`
- `OPNSENSE_API_SECRET`
- `VERIFY_TLS`
- `TRAFFIC_PROVIDER`

## 3. 模式说明

### Mock 模式
适合 UI 开发与结构联调。

### OPNsense 模式
适合真实环境联调。

## 4. 验证步骤

### 健康检查

```bash
curl http://127.0.0.1:8710/api/health
```

### 能力检查

```bash
curl http://127.0.0.1:8710/api/capabilities
```

### OPNsense 探测

```bash
curl http://127.0.0.1:8710/api/opnsense/probe
```

## 5. 预期行为

- 配置缺失：回到 Mock 模式
- 配置完整但不可达：进入 OPNsense 模式，但相关卡片显示不可达/待映射
- 配置完整且接口正常：逐步显示真实状态数据
