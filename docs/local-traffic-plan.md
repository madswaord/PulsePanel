# PulsePanel 本地设备流量统计方案（草案）

## 目标

在 OPNsense 不直接提供设备级流量排行/周期统计的情况下，由 PulsePanel 在本地采集并聚合：

- 每设备上下行累计
- 实时速率
- Top 10 设备排行
- 小时 / 日 / 周 / 月窗口统计

## 当前已确认可用的数据源

### 1. 设备识别
- `GET /api/diagnostics/interface/search_arp`
- 可提供：IP / MAC / 接口 / hostname / vendor
- 作用：把“流量样本”归属到设备

### 2. WAN / 接口累计流量
- `GET /api/interfaces/overview/export`
- 可提供：接口级 bytes received / bytes transmitted
- 作用：目前只够做接口维度，不够直接做设备维度

## 当前问题

仅靠当前已验证的 OPNsense 接口：

- 能做接口级流量
- 不能稳定做设备级流量
- 不能直接做设备 Top 10
- 不能直接做小时/日/周/月设备排行

## 可行路线

### 路线 A：继续从 OPNsense 挖设备级流量源
候选：Insight / NetFlow / ntopng / 其他插件接口。

优点：
- 数据更准确
- 更接近真实设备流量

缺点：
- 依赖额外插件或权限
- 当前未确认可用

### 路线 B：PulsePanel 自建本地采集层（推荐方向）
思路：
1. 先持续采集设备清单（ARP）
2. 再接入某个可输出设备流量的来源
3. 本地落盘后聚合出多个统计窗口

## 本地存储建议

建议新增本地数据目录：

```text
backend/data/
  traffic-samples.jsonl
  traffic-rollups.json
  devices.json
```

### 数据结构建议

#### devices.json
维护设备身份：
- mac
- ip
- interface
- displayName
- vendor
- aliases
- lastSeen

#### traffic-samples.jsonl
原始样本流：
- ts
- mac / ip
- rxBytes
- txBytes
- rxRate
- txRate
- source

#### traffic-rollups.json
聚合窗口：
- hourly
- daily
- weekly
- monthly

## 统计方式建议

### 实时速率
使用最近两次样本差值：
- `rxRate = (rx2 - rx1) / dt`
- `txRate = (tx2 - tx1) / dt`

### Top 10 排行
按窗口累计总流量排序：
- hourTop
- dayTop
- weekTop
- monthTop

## 第一阶段最小闭环

先不要直接做完整排行榜，建议先落这三步：

1. 增加本地设备身份缓存
2. 设计样本存储结构
3. 确认可用的设备级流量来源后再接真实排行

## 当前结论

- 设备名、分组展示：现在就能继续做
- 设备级流量 / 速率 / 周期排行：需要额外设备级流量来源
- 如果没有新的流量源，仅靠当前 OPNsense 已验证接口，做不出可信的设备排行榜
