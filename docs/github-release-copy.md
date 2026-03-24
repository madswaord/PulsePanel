# PulsePanel GitHub 发布文案

## 仓库简介（短版）

PulsePanel 是一个面向 OPNsense 的实时态势面板，聚合 WAN、终端、VPN、防火墙、系统健康等关键信息，支持前后端分离、Docker 部署和本地设备资产管理。

---

## 仓库简介（稍长版）

PulsePanel 是一个专门给 OPNsense 使用的实时态势面板。它不是简单把路由器后台换个皮，而是把你真正高频关注的状态——WAN、多 WAN、在线终端、WireGuard、系统健康、防火墙态势——压缩到一个更适合日常查看的页面里。

当前项目已经支持：
- WAN / 多 WAN 状态与吞吐
- 在线终端分组展示
- VPN 在线状态与 peer 明细
- 系统健康与关键服务状态
- 设备别名、角色、标签、备注等资产信息
- Docker / 非 Docker / systemd 部署

---

## GitHub 仓库描述（description）

Realtime OPNsense dashboard with WAN, clients, VPN, firewall, system health, and device identity management.

---

## GitHub 发布说明（适合发 Release / 仓库首页说明）

PulsePanel 当前已经进入“可运行、可部署、核心功能成型”的阶段。

已完成的核心能力：
- WAN / 多 WAN 状态、IPv4 / IPv6、吞吐、时间序列
- 在线终端面板（按网络分组）
- WireGuard 在线状态与 peer 明细
- 防火墙 states / pressure 展示
- 系统健康、关键服务状态
- 设备身份层（alias / role / tags / notes）
- Docker / 非 Docker / systemd 运行方式
- 中文 README 与部署说明

当前已明确但尚未完全闭环的部分：
- 设备级流量 / 速率 / Top 10 排行
- DNS 深层统计
- 部分 OPNsense 接口仍受 API 权限限制

项目原则：
> 真实优先，拿不到就明确说明，不做假数据。

---

## 推荐发布时的说明语气

可以这样描述当前状态：

> PulsePanel 现在已经不是原型壳子了，而是一套可以实际跑起来的 OPNsense 实时态势面板。核心信息已经成型，文档与部署方式也基本齐全，后续还会继续补设备级流量统计和更深层的 DNS / 安全分析能力。
