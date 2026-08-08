# YS 论坛系统 — Termux 部署（Android 手机）

> 在 Android 手机上用 Termux 运行，通过 Cloudflare 隧道暴露公网。
> 完全免费，无需 root，无需账号/银行卡/实名。

## 第一步：安装 Termux

从 F-Droid 下载安装 Termux（不要用 Google Play 版，已过时）：
- 下载页：https://f-droid.org/packages/com.termux/

安装后打开 Termux 应用。

## 第二步：一键启动（复制粘贴执行）

打开 Termux，粘贴这一行命令回车：

```bash
curl -sL https://raw.githubusercontent.com/Zhkeji/ys-kjsf/main/start-termux-quick.sh | bash
```

脚本会自动完成：
1. 安装 Node.js / git / curl / 编译工具
2. 克隆代码
3. 构建前端 + 安装后端依赖
4. 下载 cloudflared（自动识别 ARM64/ARM32）
5. 启动服务 + 建立公网隧道

首次运行约 5-8 分钟（编译 better-sqlite3 较慢），之后启动很快。

## 第三步：获取公网地址

启动后控制台会显示类似：
```
==========================================
  ✓ 本地: http://localhost:3001
  正在建立公网隧道...
  找到下面的 trycloudflare.com 地址
  Ctrl+C 停止
==========================================
2026-XX-XX INF |  https://xxx-xxx-xxx.trycloudflare.com |
```

把那个 `https://xxx.trycloudflare.com` 地址发给别人，就能在任何设备浏览器打开访问你的论坛。

## 手动方式（如自动脚本失败）

```bash
# 1. 安装依赖
pkg install -y nodejs-lts git curl python make clang

# 2. 克隆
git clone https://github.com/Zhkeji/ys-kjsf
cd ys-kjsf

# 3. 启动
bash start-termux.sh
```

## 常见问题

**Q: npm install 报错 / better-sqlite3 编译失败？**
```bash
pkg install -y python make clang
cd ys-kjsf/backend && npm rebuild better-sqlite3
```

**Q: 端口 3001 被占用？**
修改 `backend/server.js` 最后的 `PORT` 值。

**Q: 手机锁屏后断开？**
在 Termux 设置中获取「电池优化白名单」和「后台运行」权限：
```bash
termux-wake-lock    # 保持唤醒
```
停止后执行 `termux-wake-unlock`。

**Q: 公网地址变了？**
快速隧道每次启动随机分配域名，属正常现象。

**Q: 需要一直开着 Termux 吗？**
是的。关闭 Termux 或锁屏（未加白名单）服务会停止。可使用 `termux-wake-lock` 保持后台运行。

## 文件说明

| 文件 | 用途 |
|------|------|
| `start-termux-quick.sh` | 极速版，一行命令启动 |
| `start-termux.sh` | 标准版，已克隆代码后使用 |
