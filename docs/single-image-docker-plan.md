# PulsePanel 单镜像一体化 Docker 方案

## 目标

虽然代码保持前后端分离开发，但最终对外发布时，希望交付为：

> 一个镜像、一个容器、一次启动即可运行。

用户不需要理解前后端拆分，也不需要自己拼两个容器。

---

## 交付目标

### 开发阶段
- frontend/
- backend/
- 前后端继续分离开发

### 发布阶段
- Docker Hub 只发布一个镜像
- 容器启动后同时提供：
  - 前端页面
  - 后端 API
- 对外尽量只暴露一个访问入口

---

## 推荐架构

### 容器内组成
建议单镜像里包含：

1. **Node 后端服务**
   - 负责 OPNsense API 聚合
   - 负责设备身份层、本地数据层

2. **静态前端文件**
   - 编译/打包后随镜像一起带入

3. **统一入口层**
   推荐使用一个轻量 Web Server 或反向代理，把：
   - `/` 指向前端静态页面
   - `/api` 反代到后端服务

这样用户只需要访问一个端口。

---

## 为什么推荐单入口

如果继续保留两个端口：
- 用户理解成本高
- 配置更复杂
- Docker Hub 镜像交付体验一般

如果改成单入口：
- 页面和 API 走同一个地址
- 前端不需要再推断 `8710 / 8711`
- 用户体验更像真正产品

---

## 推荐环境变量设计

### 运行监听
- `HOST=0.0.0.0`
- `PORT=8080`

说明：
- 最终建议容器对外统一只暴露一个端口
- 如果用户要本机访问，可用 `127.0.0.1`
- 如果要内网访问，可用 `0.0.0.0`

---

### OPNsense 配置
- `OPNSENSE_BASE_URL`
- `OPNSENSE_API_KEY`
- `OPNSENSE_API_SECRET`
- `VERIFY_TLS`
- `OPNSENSE_TIMEOUT_MS`

可继续保留当前模型。

---

### SmartDNS 预留配置
建议先预留：
- `SMARTDNS_ENABLED=false`
- `SMARTDNS_HOST=`
- `SMARTDNS_PORT=`
- `SMARTDNS_PROTOCOL=http`

这样现在即使还没接功能，也不影响以后扩展。

---

### 品牌/UI 预留
后续如果需要，也可以预留：
- `PULSEPANEL_BRAND_NAME`
- `PULSEPANEL_BRAND_SUBTITLE`

---

## 最终用户体验（理想）

用户以后只需要：

```bash
docker run -d \
  --name pulsepanel \
  -p 8080:8080 \
  -e HOST=0.0.0.0 \
  -e PORT=8080 \
  -e OPNSENSE_BASE_URL=https://192.168.10.1 \
  -e OPNSENSE_API_KEY=xxx \
  -e OPNSENSE_API_SECRET=xxx \
  -e VERIFY_TLS=false \
  madswaord/pulsepanel:latest
```

然后访问：

```text
http://服务器IP:8080
```

即可。

---

## 与当前项目相比，需要调整的地方

### 1. 端口模型要统一
当前项目默认：
- 前端 8711
- 后端 8710

单镜像交付时建议统一成：
- 对外只暴露一个端口（如 8080）

### 2. 前端 runtime-config 逻辑要改
当前前端会推断 API 端口。

单镜像单入口后，更推荐直接使用：
- `/api`

而不是拼接 `host:8710`。

### 3. Dockerfile 需要重构
当前是：
- frontend Dockerfile
- backend Dockerfile
- compose 分开启动

后续要改成：
- 一个根目录 Dockerfile
- 一个镜像把前后端都放进去

### 4. 启动方式要统一
可以考虑：
- 由一个入口脚本同时拉起后端与静态服务/反代
- 或直接用一个统一 Web 层处理前端与 API

---

## 对 GitHub Actions / Docker Hub 的影响

一旦切成单镜像方案，后续自动发布就简单很多：

- push 到 GitHub
- GitHub Actions 构建一个镜像
- push 到 Docker Hub

不再需要分别维护 frontend/backend 两套镜像发布逻辑。

---

## 推荐推进顺序

### 第一阶段
先完成：
1. 单镜像架构设计
2. 环境变量模型定稿
3. 前端 API 路径改成可适配单入口

### 第二阶段
再完成：
1. 单镜像 Dockerfile
2. 容器启动脚本
3. 本地运行测试

### 第三阶段
最后完成：
1. GitHub Actions 自动构建
2. Docker Hub 自动推送
3. README 中加入单镜像部署说明

---

## 当前建议结论

现在最合理的路线不是先写 GitHub Actions，而是：

> 先把 PulsePanel 的最终交付形态，从“双容器前后端分离部署”，收成“单镜像一体化交付”。

等交付形态稳定后，再上 GitHub → Docker Hub 自动发布，成本最低，也最稳。
