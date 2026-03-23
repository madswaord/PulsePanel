# PulsePanel 数据卡片与 OPNsense 数据映射

## 1. WAN 状态

- 模块优先级：`core/interfaces` → `core/routes` → `core/routing` → `core/diagnostics`
- 展示：在线状态、延迟、丢包、默认网关、公网地址（可选）

## 2. 总上下行流量

- 模块优先级：`core/interfaces` → `plugins/vnstat` → `plugins/netdata`
- 展示：当前下载/上传、峰值

## 3. WAN 实时带宽图

- 模块优先级：`core/interfaces`（第一版轮询） → `plugins/netdata` / `plugins/vnstat`
- 展示：时间序列上/下行趋势

## 4. LAN 在线设备

- 模块优先级：`plugins/dhcpv4` / `plugins/dhcpv6` → `core/hostdiscovery`
- 展示：在线设备数、设备列表、最近活跃

## 5. Top 客户端流量

- 模块优先级：`plugins/ntopng` → `plugins/netdata`
- 说明：第一版可暂时降级

## 6. VPN 在线人数

- 模块优先级：`core/openvpn` → `core/wireguard` → VPN 插件（tailscale/zerotier）
- 展示：在线总数、按协议分类

## 7. 防火墙实时连接数

- 模块优先级：`core/diagnostics` → `core/firewall`
- 展示：当前 states、趋势

## 8. block 概况

- 模块优先级：`core/firewall` → `core/diagnostics` → 日志流
- 展示：最近 block 数、趋势、Top 来源

## 9. DNS 实时窗口

- 模块优先级：`core/unbound` / `core/dnsmasq` → DNS 日志
- 展示：QPS、最近请求、Top 域名、Top 客户端

## 10. Caddy 访问轨迹

- 数据源优先级：Caddy access log → 插件 API（如可用）
- 展示：最近访问、源 IP、Host、Path、Status、Top 来源

## 11. 系统健康

- 模块优先级：`core/core` → `core/diagnostics` → `core/monit` → `plugins/netdata`
- 展示：CPU、内存、磁盘、关键服务状态
