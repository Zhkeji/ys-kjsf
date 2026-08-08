# YS 论坛系统 — Sealos 免费部署

> Sealos 是国内容器云平台，免费额度足够本项目运行。无需银行卡，仅需身份证实名认证。

## 前置条件

1. **注册 Sealos 账号**（免费）：https://cloud.sealos.io
   - 用手机号或 GitHub 登录
   - 完成身份证实名认证（赠送免费额度，无需银行卡）
2. 免费额度：
   - 5 元代金券（足够运行数月）
   - CPU/内存按量计费，小应用月消耗约 2-3 元

## 部署步骤

### 方式一：在线构建部署（推荐，无需本地装 Docker）

1. 登录 Sealos 云控制台：https://cloud.sealos.io
2. 进入 **「应用管理」→「容器应用」→「新建应用」**
3. 选择 **「从镜像部署」**，但我们需要先构建镜像，所以用下面的 **Terminal 方式**：

#### 在 Sealos 终端构建镜像

1. 进入 Sealos **「终端」**（控制台首页有 Terminal 入口）
2. 拉取代码并构建：
   ```bash
   git clone https://github.com/Zhkeji/ys-kjsf
   cd ys-kjsf
   docker build -t ys-forum:latest .
   ```

3. 推送到 Sealos 内置镜像仓库（或直接用本地镜像部署）

#### 创建持久卷（保存数据库和上传文件）

在控制台 **「应用管理」→「持久卷」** 创建：
- 名称：`ys-data`
- 大小：1 Gi
- 访问模式：单机读写

#### 部署应用

在 **「容器应用」→「新建应用」**：
- 镜像：`ys-forum:latest`（或你构建的镜像名）
- CPU：0.5 核
- 内存：256 MB
- 端口：8080 → 对外暴露
- 环境变量：
  - `DATA_DIR=/data`
  - `NODE_ENV=production`
  - `PORT=8080`
- 挂载持久卷：`ys-data` → `/data`

4. 部署完成后，Sealos 会分配一个公网访问地址（如 `https://xxx.cloud.sealos.io`）

### 方式二：本地构建推送（如本地有 Docker）

```bash
# clone 仓库
git clone https://github.com/Zhkeji/ys-kjsf
cd ys-kjsf

# 构建镜像
docker build -t ys-forum:latest .

# 登录 Sealos 镜像仓库（控制台→镜像仓库获取地址）
docker login <sealos-registry>

# 打标签并推送
docker tag ys-forum:latest <sealos-registry>/ys-forum:latest
docker push <sealos-registry>/ys-forum:latest
```
然后在控制台用该镜像部署。

## 免费额度注意事项

- Sealos 注册赠送 **5 元代金券**，小应用约可运行 2-3 个月
- 用完后可继续领取免费额度或充值（最低 1 元起，微信/支付宝即可，无需银行卡）
- 实际上月消耗约 2-3 元，长期使用成本极低

## 常用运维

```bash
# 查看日志（控制台应用详情→日志）
# 进入容器（控制台应用详情→终端）
# 更新部署：重新构建镜像 → 更新应用镜像版本
```

## 数据备份

在 Sealos 终端：
```bash
cp /data/ysforum.db /data/backup-$(date +%Y%m%d).db
```
或通过应用终端下载。
