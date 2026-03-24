# PulsePanel

PulsePanel 是一个面向 **OPNsense** 的前后端分离实时态势面板。

它的目标不是做“路由器后台换皮”，而是做一个更适合日常查看的网络控制台：

- 首页首屏直接看 WAN、吞吐、防火墙、VPN、在线终端、系统健康
- 前后端分离，便于独立部署
- 优先使用 **真实 OPNsense API**，拿不到的数据明确降级，不伪造
- 支持 Docker 部署，后续可直接推到 GitHub 供别人拉起

---

## 快速导航

- 当前能力
- 本地开发启动
- 非 Docker 直接运行
- Docker 部署
- 设备别名与设备资产
- 已知限制
- API 提权参考

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

## 运行与部署

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

前端默认会自动把 API 指向：

```text
http://当前访问主机:8710/api
```

也就是说，如果你通过 `http://你的服务器IP:8711` 打开前端，前端默认会请求：

```text
http://你的服务器IP:8710/api
```

如果页面不是通过前端开发端口 `8711` 访问，而是走统一入口（例如未来的单镜像/反代 `/api` 模式），前端会优先走同源 `/api`。\n\n如果你要显式指定 API 地址，也可以在前端运行环境里设置：

```js
window.PULSEPANEL_API_BASE_URL = '/api'
```

或者指定成完整地址：

```js
window.PULSEPANEL_API_BASE_URL = 'http://你的地址:8710/api'
```

---

# 4. 非 Docker 直接运行

如果你不想用 Docker，也可以直接在 Linux 主机上运行前后端。

## 4.1 准备 `.env`

```bash
cp .env.example .env
```

然后改成你的 OPNsense 实际配置。

---

## 4.2 启动后端

```bash
cd backend
npm install
npm start
```

默认监听：

```text
http://0.0.0.0:8710
```

---

## 4.3 启动前端

```bash
cd frontend
npm install
npm start
```

默认访问：

```text
http://0.0.0.0:8711
```

---

## 设备资产管理

### 4.4 设备别名（可选，但强烈推荐）

如果你希望在线终端显示成你真正认识的名字，而不是厂商名/自动识别名，可以在本地维护一个别名文件。

文件位置：

```text
backend/data/device-aliases.json
```

你可以先复制示例：

```bash
cp backend/data/device-aliases.example.json backend/data/device-aliases.json
```

格式示例：

```json
{
  "bc:24:11:e6:40:52": "Proxmox-1",
  "6c:4a:85:23:8b:35": "iPhone",
  "f8:6f:b0:1c:01:fa": "AP-客厅"
}
```

说明：
- key 是设备的 **MAC 地址**（建议小写）
- value 是你希望页面显示的名称

### 设备身份库里还能维护什么

除了 alias 之外，设备身份层现在还保留这些字段：

- `notes`：备注
- `role`：设备角色
- `tags`：标签数组
- `firstSeen`：首次识别时间
- `lastSeen`：最近活跃时间

这些字段当前主要作为设备资产层的基础，后面可以继续用于：
- 更清楚的终端展示
- 资产分类
- 重点设备标记
- 角色识别

如果你想参考完整格式，可以看：

```text
backend/data/device-identity.template.json
```

### 推荐维护顺序

如果你现在准备开始整理设备资产，建议按这个顺序来：

1. **先写 alias**
   - 先把你最常看的设备改成你认得出来的名字
2. **再补 role**
   - 比如 `Phone` / `Server` / `AP` / `TV`
3. **再补 tags**
   - 比如 `重点设备` / `常驻` / `IoT`
4. **最后写 notes**
   - 只给真正需要说明的设备补备注

这样维护成本最低，也最容易看到页面效果变化。

生效规则：
1. PulsePanel 先从在线设备里识别 MAC
2. 再读取 `device-aliases.json`
3. 如果命中别名，页面优先显示这个名称

### 怎么快速找到要写的 MAC

最简单的方法是直接看设备身份库：

```bash
cat backend/data/devices.json
```

里面会按 MAC 记录当前识别到的设备，例如：

```json
{
  "devices": {
    "6c:4a:85:23:8b:35": {
      "mac": "6c:4a:85:23:8b:35",
      "ip": "192.168.10.26",
      "interface": "LAN",
      "displayName": "Apple"
    }
  }
}
```

你只要把这个 MAC 抄到 `device-aliases.json` 里即可。

### 推荐使用方式

建议流程：
1. 先打开 PulsePanel，看终端列表里有哪些设备
2. 再查看 `backend/data/devices.json` 找到对应 MAC
3. 写入 `backend/data/device-aliases.json`
4. 刷新页面确认名称是否变成你想要的样子

如果你改了别名文件：
- 一般刷新页面后就能看到
- 如果后端已缓存旧身份，可重启 backend 让显示更快同步

---

## 4.5 做成 systemd 自启动服务（推荐）

如果你希望机器重启后自动起来，最推荐用 `systemd`。

### 后端服务示例

新建：

```bash
sudo nano /etc/systemd/system/pulsepanel-backend.service
```

写入：

```ini
[Unit]
Description=PulsePanel Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/pulsepanel/backend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
Environment=NODE_ENV=production
User=root

[Install]
WantedBy=multi-user.target
```

### 前端服务示例

新建：

```bash
sudo nano /etc/systemd/system/pulsepanel-frontend.service
```

写入：

```ini
[Unit]
Description=PulsePanel Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/pulsepanel/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
Environment=NODE_ENV=production
User=root

[Install]
WantedBy=multi-user.target
```

### 使服务生效

```bash
sudo systemctl daemon-reload
sudo systemctl enable pulsepanel-backend
sudo systemctl enable pulsepanel-frontend
sudo systemctl start pulsepanel-backend
sudo systemctl start pulsepanel-frontend
```

### 查看状态

```bash
sudo systemctl status pulsepanel-backend
sudo systemctl status pulsepanel-frontend
```

### 查看日志

```bash
journalctl -u pulsepanel-backend -f
journalctl -u pulsepanel-frontend -f
```

> 注意：上面的 `/opt/pulsepanel` 只是示例路径。你实际部署在哪，就把 `WorkingDirectory` 改成你的真实路径。

---

# 5. Docker 部署（推荐）

这是后续最推荐的运行方式。

## 5.1 准备 `.env`

```bash
cp .env.example .env
```

然后改成你的 OPNsense 实际配置。

---

## 5.2 构建并启动

在项目根目录执行：

```bash
docker compose up -d --build
```

如果你后续希望把运行时数据（例如设备身份、alias 文件）映射到宿主机，可以考虑在 Docker 配置里为 `backend/data/` 做卷映射。当前仓库里的 compose 还是开发期结构，后续如果切换到单镜像交付，这个目录会是优先建议映射出来的配置路径之一。

---

## 5.3 访问地址

- 前端：
  ```text
  http://服务器IP:8711
  ```
- 后端 API：
  ```text
  http://服务器IP:8710/api
  ```

---

## 5.4 停止服务

```bash
docker compose down
```

---

## 5.5 查看日志

```bash
docker compose logs -f pulsepanel-backend
docker compose logs -f pulsepanel-frontend
```

---

# 6. 如何判断是否接入成功

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

# 7. 当前页面说明

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

# 8. 当前设计原则

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

如果你后面要继续提高 OPNsense 接口权限，可以参考：

```text
docs/opnsense-api-permissions.md
```

## 限制与扩展

# 9. 已知限制

当前 OPNsense API 权限/接口限制下：

- dnsmasq / unbound 查询统计暂未打通
- firewall 更深层 block/log 统计暂未打通
- DHCP 详细租约接口权限受限

这不影响当前作为“网络实时态势面板”使用，但会影响更深入的 DNS / 安全分析能力。

---

# 10. 后续建议路线

接下来可以继续做的方向：

1. Docker 部署进一步打磨
2. GitHub 发布准备
3. SmartDNS / 外部 DNS 数据源接入
4. 更丰富的防火墙与 DNS 分析
5. 登录鉴权 / 多实例配置

---

# 11. 一句话部署教程

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
