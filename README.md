# PulsePanel

PulsePanel 是一个面向 **OPNsense** 的前后端分离实时态势面板。

它的目标不是做“路由器后台换皮”，而是做一个更适合日常查看的网络控制台：

- 首页首屏直接看 WAN、吞吐、防火墙、VPN、在线终端、系统健康
- 前后端分离，便于独立部署
- 优先使用 **真实 OPNsense API**，拿不到的数据明确降级，不伪造
- 支持 Docker 部署，后续可直接推到 GitHub 供别人拉起

---

# 1. 当前能力

目前已经接入并验证的真实数据：

- WAN 在线状态
- WAN 延迟 / 丢包
- WAN 公网 IP / 默认网关 / 接口信息
- WAN 实时吞吐
- WAN 时间序列
- 防火墙当前 states / limit / pressure
- WireGuard 在线人数与 peer 明细
- 在线终端（基于 ARP）
- 系统健康（CPU / 内存 / 磁盘）
- OPNsense 关键服务运行状态

当前暂未打通或不稳定的数据：

- OPNsense 内部 DNS 查询统计（dnsmasq / unbound）
- 防火墙 block / log / top 更深层细节
- DHCP 明细租约（当前权限下 403）

所以当前项目策略是：

> **真实优先，拿不到就明确说明，不做假数据。**

---

# 2. 项目结构

```text
pulsepanel/
├── backend/              # 后端聚合服务
├── frontend/             # 前端静态页面
├── docs/                 # 文档
├── docker-compose.yml    # Docker 部署入口
├── .env.example          # 环境变量模板
└── README.md
```

---

# 3. 本地开发启动

## 3.1 准备配置

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
PORT=8710
TIMEZONE=Asia/Shanghai
OPNSENSE_BASE_URL=https://192.168.10.1
OPNSENSE_API_KEY=你的API_KEY
OPNSENSE_API_SECRET=你的API_SECRET
VERIFY_TLS=false
OPNSENSE_TIMEOUT_MS=10000
TRAFFIC_PROVIDER=core
```

### 关键说明

#### `OPNSENSE_BASE_URL`
填你的 OPNsense 地址，例如：

```env
OPNSENSE_BASE_URL=https://192.168.10.1
```

#### `VERIFY_TLS`
- 内网 / 自签证书调试：通常先用 `false`
- 正式公网环境：建议改成 `true`

#### `OPNSENSE_API_KEY` / `OPNSENSE_API_SECRET`
需要在 OPNsense 里创建 API 凭据。

---

## 3.2 启动后端

```bash
cd backend
npm install
npm start
```

默认地址：

```text
http://127.0.0.1:8710
```

---

## 3.3 启动前端

```bash
cd frontend
npm install
npm start
```

默认地址：

```text
http://127.0.0.1:8711
```

前端会自动把 API 指向：

```text
http://当前访问主机:8710/api
```

也就是说，如果你通过 `http://你的服务器IP:8711` 打开前端，前端会自动请求：

```text
http://你的服务器IP:8710/api
```

---

# 4. Docker 部署（推荐）

这是后续最推荐的运行方式。

## 4.1 准备 `.env`

```bash
cp .env.example .env
```

然后改成你的 OPNsense 实际配置。

---

## 4.2 构建并启动

在项目根目录执行：

```bash
docker compose up -d --build
```

---

## 4.3 访问地址

- 前端：
  ```text
  http://服务器IP:8711
  ```
- 后端 API：
  ```text
  http://服务器IP:8710/api
  ```

---

## 4.4 停止服务

```bash
docker compose down
```

---

## 4.5 查看日志

```bash
docker compose logs -f pulsepanel-backend
docker compose logs -f pulsepanel-frontend
```

---

# 5. 如何判断是否接入成功

## 5.1 检查后端健康

```bash
curl http://127.0.0.1:8710/api/health
```

如果返回：
- `mode: "opnsense"`，说明已经进入真实模式
- `configured: true`，说明配置完整

---

## 5.2 检查能力接口

```bash
curl http://127.0.0.1:8710/api/capabilities
```

可以确认当前功能开关和校验状态。

---

## 5.3 检查 OPNsense 探测

```bash
curl http://127.0.0.1:8710/api/opnsense/probe
```

如果这里失败，说明后端到 OPNsense 的 API 链路有问题。

---

# 6. 当前页面说明

## 首屏概览
- WAN 链路
- WAN 吞吐
- 防火墙态势
- VPN 在线
- 终端资产
- 系统健康
- 关键服务
- DNS 视图（当前保留真实占位）

## 主图区
- WAN 流量脉冲
- 防火墙态势图

## 明细区
- 在线终端
- VPN 状态
- 系统健康详情

---

# 7. 当前设计原则

## 7.1 真实数据优先
能拿到真数据就显示真数据。

## 7.2 拿不到就明确降级
例如：
- 显示“当前权限或接口未提供”
- 显示“真实占位”
- 不用 mock 伪装成真实环境

## 7.3 先把可稳定部署打磨好
比起盲目继续接一堆不稳定接口，优先保证：
- 页面清晰
- API 稳定
- Docker 可部署
- 文档够完整

---

# 8. 已知限制

当前 OPNsense API 权限/接口限制下：

- dnsmasq / unbound 查询统计暂未打通
- firewall 更深层 block/log 统计暂未打通
- DHCP 详细租约接口权限受限

这不影响当前作为“网络实时态势面板”使用，但会影响更深入的 DNS / 安全分析能力。

---

# 9. 后续建议路线

接下来可以继续做的方向：

1. Docker 部署进一步打磨
2. GitHub 发布准备
3. SmartDNS / 外部 DNS 数据源接入
4. 更丰富的防火墙与 DNS 分析
5. 登录鉴权 / 多实例配置

---

# 10. 一句话部署教程

如果你只是想快速跑起来：

```bash
cp .env.example .env
# 编辑 .env，填入 OPNsense 地址和 API

docker compose up -d --build
```

然后打开：

```text
http://你的服务器IP:8711
```

就能看到 PulsePanel。
