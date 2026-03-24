# PulsePanel 部署说明（详细版）

这份文档专门讲 **如何把 PulsePanel 以 Docker 方式部署起来**。

如果你只是第一次接触这个项目，建议先看根目录 `README.md`，那里是更完整的中文总教程。

---

## 1. 部署前准备

你需要准备：

1. 一台能运行 Docker 的机器
2. 能访问到 OPNsense Web API
3. 一组 OPNsense API Key / Secret

建议环境：

- Docker
- Docker Compose（或 `docker compose` 插件）
- 与 OPNsense 同内网，或者能稳定访问 OPNsense

---

## 2. 环境变量说明

先复制模板：

```bash
cp .env.example .env
```

然后编辑 `.env`。

示例：

```env
PORT=8710
TIMEZONE=Asia/Shanghai
OPNSENSE_BASE_URL=https://192.168.10.1
OPNSENSE_API_KEY=replace_me
OPNSENSE_API_SECRET=replace_me
VERIFY_TLS=false
OPNSENSE_TIMEOUT_MS=10000
TRAFFIC_PROVIDER=core
ENABLE_CADDY_LOGS=false
ENABLE_DNS_LOGS=false
```

### 必填项

#### `OPNSENSE_BASE_URL`
你的 OPNsense 地址，例如：

```env
OPNSENSE_BASE_URL=https://192.168.10.1
```

#### `OPNSENSE_API_KEY`
OPNsense API Key。

#### `OPNSENSE_API_SECRET`
OPNsense API Secret。

---

### 常用项

#### `VERIFY_TLS`
- `false`：适合内网 / 自签名证书调试
- `true`：适合正式环境

#### `OPNSENSE_TIMEOUT_MS`
后端请求 OPNsense API 的超时时间，默认 `10000` 毫秒。

#### `TIMEZONE`
时区，默认 `Asia/Shanghai`。

---

## 3. Docker 启动

在项目根目录执行：

```bash
docker compose up -d --build
```

启动后会拉起两个容器：

- `pulsepanel-backend`
- `pulsepanel-frontend`

---

## 4. 对外端口

默认映射：

- 前端：`8711`
- 后端：`8710`

访问方式：

- 前端页面：
  ```text
  http://服务器IP:8711
  ```
- 后端 API：
  ```text
  http://服务器IP:8710/api
  ```

---

## 5. 前端如何知道后端地址

前端当前的 runtime-config 采用自动推断方式：

如果你通过：

```text
http://192.168.10.50:8711
```

访问前端，那么前端默认会请求：

```text
http://192.168.10.50:8710/api
```

这意味着：

- 同一台机器部署前后端时，默认开箱即用
- 如果未来你想把前后端拆到不同域名或反代下，再进一步改 runtime-config 即可

---

## 6. 健康检查

### 6.1 检查后端健康

```bash
curl http://127.0.0.1:8710/api/health
```

期望看到：

- `ok: true`
- `mode: "opnsense"`（如果配置完整）

---

### 6.2 检查能力接口

```bash
curl http://127.0.0.1:8710/api/capabilities
```

---

### 6.3 检查 OPNsense 基础探测

```bash
curl http://127.0.0.1:8710/api/opnsense/probe
```

如果这里失败，优先检查：

1. OPNsense 地址是否正确
2. API key / secret 是否正确
3. `VERIFY_TLS` 是否需要改成 `false`
4. 部署机器能否访问 OPNsense

---

## 7. 常见问题

### 问题 1：页面能打开，但没有真实数据

先检查：

```bash
curl http://127.0.0.1:8710/api/health
```

如果返回 `mode: "mock"`：
- 说明 `.env` 没填完整
- 或者没成功加载

---

### 问题 2：配置完整，但 OPNsense 连接失败

常见原因：

- 地址不通
- API 凭据错误
- 自签证书导致 TLS 校验失败

可以先尝试：

```env
VERIFY_TLS=false
```

---

### 问题 3：部分卡片显示“待映射 / 当前权限或接口未提供”

这是当前设计的正常行为。

原因通常是：
- 对应 OPNsense 接口不存在
- 当前 API 权限不足
- 某些数据源本身没有开放出来

PulsePanel 当前策略是：

> 不伪造数据，拿不到就明确说明。

---

## 8. 升级项目

如果后续代码更新，重新构建即可：

```bash
git pull
docker compose up -d --build
```

---

## 9. 停止 / 重启

停止：

```bash
docker compose down
```

重启：

```bash
docker compose restart
```

查看日志：

```bash
docker compose logs -f pulsepanel-backend
docker compose logs -f pulsepanel-frontend
```

---

## 10. 当前部署结论

截至目前，PulsePanel 已经具备：

- 前后端分离
- Docker 运行能力
- `.env` 驱动配置
- 可面向 OPNsense 真实部署

也就是说，它已经不只是一个本地开发原型，而是开始具备“拿去部署”的基础条件。
