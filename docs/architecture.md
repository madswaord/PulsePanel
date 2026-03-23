# PulsePanel 架构设计

## 1. 架构原则

- 前后端分离
- 后端统一对接 OPNsense API、日志与增强型监控来源
- 前端不直接持有 OPNsense API Secret
- 支持 Docker 化打包分发
- 支持能力探测与功能降级

## 2. 部署结构

### 前端

- 提供单页 Dashboard
- 负责图表、状态卡片、实时窗口、科技风 UI

### 后端

负责：

- OPNsense API 调用
- 认证与 TLS 管理
- 数据聚合与缓存
- 轮询与时间序列缓存
- 实时日志流解析
- 能力探测

## 3. 配置模型

建议通过环境变量配置：

- `OPNSENSE_BASE_URL`
- `OPNSENSE_API_KEY`
- `OPNSENSE_API_SECRET`
- `VERIFY_TLS`
- `TIMEZONE`
- `ENABLE_CADDY_LOGS`
- `ENABLE_DNS_LOGS`
- `TRAFFIC_PROVIDER`

## 4. 功能分层

### 核心能力（MVP）

- WAN 状态
- 接口流量
- LAN 在线设备
- VPN 在线人数
- 防火墙实时连接数
- 系统健康

### 增强能力

- block 概况
- DNS 实时窗口
- Caddy 访问轨迹
- Top 客户端流量

## 5. 后端模块建议

- `opnsense_client`
- `capability_service`
- `metrics_service`
- `dashboard_service`
- `log_stream_service`
- `cache_service`

## 6. 前端页面结构

- 顶部概览卡
- WAN 实时流量图
- 防火墙态势区
- LAN 在线终端区
- VPN 状态区
- 系统健康区
- 可选：DNS / Caddy 实时窗口
