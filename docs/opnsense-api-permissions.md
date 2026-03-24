# PulsePanel 最小 API 提权清单

这份文档用于说明：

当 PulsePanel 接入 OPNsense 时，哪些接口最值得优先放权，为什么要放，以及放开后能带来什么能力提升。

---

## 目标

原则不是“把权限全开”，而是：

> 只放开对 PulsePanel 真正有价值的最小接口集合。

---

## P0：最高优先级

### DHCPv4 租约
接口：

```text
/api/dhcpv4/leases/searchLease
```

当前状态：
- 现网实测返回 `403 Forbidden`

放开后价值：
- 提升在线终端名称质量
- 更稳定识别设备身份
- 有机会拿到比 ARP 更像“备注/租约名”的字段
- 减轻 alias 手工维护压力

对 PulsePanel 的直接收益：
- 在线终端面板更像真实设备资产列表
- 设备名称更接近人能理解的名字

---

## P1：很值得验证

### 接口统计细项
接口：

```text
/api/diagnostics/interface/getInterfaceStatistics
```

当前状态：
- 现网实测返回 `403 Forbidden`

放开后价值：
- 有机会获得更细的接口统计能力
- 帮助判断是否能进一步逼近设备级流量
- 为本地流量统计层设计提供更多依据

对 PulsePanel 的潜在收益：
- 后续终端流量 / 速率 / 排行能力更有希望落地

---

## P2：可选放开

### 完整 ARP 明细
接口：

```text
/api/diagnostics/interface/getArp
```

当前状态：
- 现网实测返回 `403 Forbidden`

说明：
- 当前已能使用 `search_arp`
- 所以这条不是第一优先级
- 但如果字段更完整，仍有补充价值

---

### DNS 服务状态
接口：

```text
/api/dnsmasq/service/status
/api/unbound/service/status
```

当前状态：
- 现网实测返回 `403 Forbidden`

说明：
- 主要帮助 DNS 卡片和系统状态更完整
- 不属于单终端能力核心路径

---

## P3：暂缓

### OpenVPN Sessions
接口：

```text
/api/openvpn/service/searchSessions
```

说明：
- 对当前“终端资产 + 设备流量”主线帮助有限
- 可等主线稳定后再考虑

---

### system memory
接口：

```text
/api/diagnostics/system/memory
```

说明：
- 当前系统健康已能通过其他接口基本实现
- 不是现阶段卡点

---

## 最小建议版本

如果只想先以最小成本提升 PulsePanel，建议优先放开：

1. `/api/dhcpv4/leases/searchLease`
2. `/api/diagnostics/interface/getInterfaceStatistics`

这是当前最接近“终端名字更准确”和“设备级流量更有机会落地”的两条关键接口。
