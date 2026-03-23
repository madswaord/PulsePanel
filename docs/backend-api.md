# PulsePanel 后端 API 设计（MVP v1）

## 约定

- Base Path: `/api`
- 所有响应均为 JSON
- 时间统一返回 Unix 秒级时间戳与 ISO 时间字符串（后续可二选一）

## 1. 能力探测

### `GET /api/capabilities`
返回当前实例支持的功能开关。

## 2. 首页总览

### `GET /api/dashboard/overview`
聚合 WAN、总流量、防火墙、VPN、DNS、系统健康。

## 3. WAN 状态

### `GET /api/dashboard/wan/status`

## 4. WAN 当前流量

### `GET /api/dashboard/wan/throughput`

## 5. WAN 时间序列

### `GET /api/dashboard/wan/timeseries?range=5m`

## 6. LAN 在线设备

### `GET /api/dashboard/clients/online`

## 7. Top 客户端

### `GET /api/dashboard/clients/top-talkers`

## 8. VPN 在线状态

### `GET /api/dashboard/vpn/online`

## 9. VPN 流量

### `GET /api/dashboard/vpn/traffic`

## 10. 防火墙状态

### `GET /api/dashboard/firewall/states`

## 11. 防火墙 block 概况

### `GET /api/dashboard/firewall/blocks`
### `GET /api/dashboard/firewall/blocks/recent`

## 12. DNS

### `GET /api/dashboard/dns/summary`
### `GET /api/dashboard/dns/recent`

## 13. Caddy

### `GET /api/dashboard/caddy/summary`
### `GET /api/dashboard/caddy/recent`

## 14. 系统健康

### `GET /api/dashboard/system/health`
