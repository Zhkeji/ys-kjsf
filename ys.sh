#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — 统一管理菜单
# 用法: bash ys.sh [命令]
# 不带参数进入交互菜单
#
# 快捷命令:
#   bash ys.sh         # 交互菜单
#   bash ys.sh start   # 启动
#   bash ys.sh stop    # 停止
#   bash ys.sh daemon  # 守护模式（保长期运行）
#   bash ys.sh status  # 查看状态
#   bash ys.sh logs    # 查看日志
#   bash ys.sh restart # 重启
#   bash ys.sh update  # 拉取最新代码并重启
#   bash ys.sh install # 首次安装

ROOT="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS="$ROOT/scripts"

# 颜色（如终端支持）
if [ -t 1 ]; then
  G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; C=$'\033[36m'; B=$'\033[1m'; N=$'\033[0m'
else
  G=""; Y=""; R=""; C=""; B=""; N=""
fi

print_banner() {
  echo "${C}${B}"
  cat <<'EOF'
   __    __  ____  ___  ___
   \ \  / / / _  ||   ||   |
    \ \/ / | |_| || | || |
     \  /  |  __/ |___||___|
     / /   | |   _
    /_/    |_|  |_|
EOF
  echo "${N}"
  echo "  ${B}YS 论坛系统 — 统一管理${N}"
}

print_menu() {
  echo ""
  echo "  ${B}1)${N} 启动服务        ${B}2)${N} 停止服务"
  echo "  ${B}3)${N} 守护模式(保活)  ${B}4)${N} 重启服务"
  echo "  ${B}5)${N} 查看状态        ${B}6)${N} 查看日志"
  echo "  ${B}7)${N} 更新代码并重启  ${B}8)${N} 首次安装"
  echo "  ${B}0)${N} 退出"
  echo ""
}

do_start()   { bash "$SCRIPTS/start.sh"; }
do_stop()    { bash "$SCRIPTS/stop.sh"; }
do_daemon()  { bash "$SCRIPTS/daemon.sh"; }
do_status()  { bash "$SCRIPTS/status.sh"; }
do_logs()    { bash "$SCRIPTS/logs.sh" "$@"; }
do_install() { bash "$SCRIPTS/quick-install.sh"; }

do_restart() {
  echo "${Y}>>> 停止旧服务...${N}"
  bash "$SCRIPTS/stop.sh"
  sleep 1
  echo "${Y}>>> 启动新服务...${N}"
  bash "$SCRIPTS/start.sh"
}

do_update() {
  echo "${Y}>>> 停止服务...${N}"
  bash "$SCRIPTS/stop.sh" >/dev/null 2>&1 || true
  sleep 1
  echo "${Y}>>> 拉取最新代码...${N}"
  cd "$ROOT"
  # 备份本地数据库
  if [ -f backend/data.db ]; then
    cp backend/data.db backend/data.db.bak 2>/dev/null || true
    echo "  数据库已备份: backend/data.db.bak"
  fi
  # 多镜像拉取
  PULLED=0
  for PROXY in "https://ghfast.top" "https://gh-proxy.com" "https://mirror.ghproxy.com" ""; do
    if [ -z "$PROXY" ]; then
      echo "  尝试: 直连"
      git pull --rebase origin main 2>/dev/null && PULLED=1 && break
    else
      echo "  尝试: $PROXY"
      git -c "http.proxy=" remote set-url origin "${PROXY}/https://github.com/Zhkeji/ys-kjsf" 2>/dev/null
      if timeout 60 git pull --rebase origin main 2>/dev/null; then
        PULLED=1
        # 恢复正式 origin
        git remote set-url origin "https://github.com/Zhkeji/ys-kjsf" 2>/dev/null
        break
      fi
    fi
  done
  # 恢复正式 origin
  git remote set-url origin "https://github.com/Zhkeji/ys-kjsf" 2>/dev/null
  if [ $PULLED -eq 1 ]; then
    echo "${G}  ✓ 代码已更新${N}"
  else
    echo "${R}  ✗ 代码更新失败，使用本地版本${N}"
  fi
  # 强制重建前端（确保更新生效）
  if [ -d frontend ]; then
    echo "${Y}>>> 重建前端...${N}"
    cd "$ROOT/frontend"
    rm -rf dist
    npm install --no-audit --no-fund --prefer-offline 2>&1 | tail -1
    npm run build 2>&1 | tail -1
  fi
  echo "${Y}>>> 启动服务...${N}"
  bash "$SCRIPTS/start.sh"
}

# ========== 主入口 ==========
print_banner

# 命令行模式
case "${1:-}" in
  start)   do_start; exit $? ;;
  stop)    do_stop; exit $? ;;
  daemon)  do_daemon; exit $? ;;
  restart) do_restart; exit $? ;;
  status)  do_status; exit $? ;;
  logs)    shift; do_logs "$@"; exit $? ;;
  update)  do_update; exit $? ;;
  install) do_install; exit $? ;;
  "")      ;; # 进入交互菜单
  *)
    echo "${R}未知命令: $1${N}"
    echo "可用命令: start | stop | daemon | restart | status | logs | update | install"
    exit 1
    ;;
esac

# 交互菜单
while true; do
  print_menu
  printf "请选择 [0-8]: "
  read -r CHOICE
  case "$CHOICE" in
    1) do_start ;;
    2) do_stop ;;
    3) do_daemon ;;
    4) do_restart ;;
    5) do_status ;;
    6) do_logs ;;
    7) do_update ;;
    8) do_install ;;
    0) echo "${G}再见！${N}"; exit 0 ;;
    *) echo "${R}无效选项${N}" ;;
  esac
  echo ""
  printf "${C}按回车继续...${N}"
  read -r
done
