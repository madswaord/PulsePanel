# PulsePanel

PulsePanel 是一个面向 OPNsense 的前后端分离实时态势面板。

## 目标

- 面向 OPNsense / 插件生态的数据聚合与可视化
- 前后端分离，可独立部署
- 可打包分发，用户只需填写 OPNsense 地址与 API 凭据即可使用
- 风格：新潮、科技感、深色实时控制台

## 当前阶段

- [x] 项目初始化
- [x] 架构文档
- [x] 后端 API 设计
- [x] 后端配置层与 Client 骨架
- [x] 前端 MVP 原型
- [ ] 真实 OPNsense 数据持续接入
- [ ] Docker 打包完善

## 目录结构

- `frontend/` 前端应用
- `backend/` 后端聚合服务
- `docs/` 产品、架构与接口文档
- `ops/` 部署与运维文件

## 快速启动（开发模式）

### 1. 准备配置

复制：

```bash
cp .env.example .env
```

然后编辑 `.env`：

```env
OPNSENSE_BASE_URL=https://你的OPNsense地址
OPNSENSE_API_KEY=你的API_KEY
OPNSENSE_API_SECRET=你的API_SECRET
VERIFY_TLS=false
TIMEZONE=Asia/Shanghai
TRAFFIC_PROVIDER=core
```

如果暂时不填 OPNsense 配置，系统会自动进入 **Mock 模式**。

### 2. 启动后端

```bash
cd backend
npm install
npm start
```

默认监听：

```text
http://127.0.0.1:8710
```

### 3. 启动前端

```bash
cd frontend
npm install
npm start
```

默认监听：

```text
http://127.0.0.1:8711
```

### 4. 打开页面

访问：

```text
http://127.0.0.1:8711
```

## 当前可用接口

- `/api/health`
- `/api/capabilities`
- `/api/opnsense/probe`
- `/api/dashboard/overview`
- `/api/dashboard/wan/status`
- `/api/dashboard/wan/throughput`
- `/api/dashboard/wan/timeseries`
- `/api/dashboard/clients/online`
- `/api/dashboard/vpn/online`
- `/api/dashboard/firewall/states`
- `/api/dashboard/system/health`

## 当前状态说明

系统目前支持两种模式：

### Mock 模式
当未完整配置 OPNsense 凭据时，使用内置模拟数据运行。

### OPNsense 模式
当以下三项都配置完整时进入：

- `OPNSENSE_BASE_URL`
- `OPNSENSE_API_KEY`
- `OPNSENSE_API_SECRET`

如果真实接口调用失败，后端会保留 fallback 逻辑，避免页面直接崩掉。

## MVP 范围

第一阶段优先实现：

1. WAN 状态
2. 总上下行流量
3. WAN 实时带宽图
4. LAN 在线设备数/列表
5. VPN 在线人数
6. 防火墙实时连接数
7. 系统健康

增强项：

- DNS 实时窗口
- Caddy 访问轨迹
- block 概况
- Top 客户端流量
