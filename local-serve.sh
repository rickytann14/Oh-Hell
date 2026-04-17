#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-8090}"
BIND_ADDR="${BIND_ADDR:-0.0.0.0}"
PID_FILE="${ROOT_DIR}/.local-serve.pid"
LOG_FILE="${ROOT_DIR}/.local-serve.log"

if [[ -x "${ROOT_DIR}/.venv/bin/python" ]]; then
  PYTHON_BIN="${ROOT_DIR}/.venv/bin/python"
else
  PYTHON_BIN="${PYTHON_BIN:-python3}"
fi

usage() {
  cat <<'USAGE'
Usage: ./local-serve.sh <start|stop|restart|status|url>

Environment overrides:
  PORT=8090          Server port (default 8090)
  BIND_ADDR=0.0.0.0  Bind address (default 0.0.0.0)
  PYTHON_BIN=python3 Python executable (auto-detected from .venv first)

Examples:
  ./local-serve.sh start
  PORT=9000 ./local-serve.sh start
  ./local-serve.sh url
USAGE
}

is_running() {
  [[ -f "${PID_FILE}" ]] || return 1
  local pid
  pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  [[ -n "${pid}" ]] || return 1
  kill -0 "${pid}" 2>/dev/null
}

port_in_use() {
  ss -ltn 2>/dev/null | grep -E ":${PORT}\\b" >/dev/null 2>&1
}

primary_ip() {
  ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++){if($i=="src"){print $(i+1); exit}}}'
}

show_urls() {
  local ip
  ip="$(primary_ip || true)"
  echo "Local URL: http://127.0.0.1:${PORT}/index.html"
  if [[ -n "${ip}" ]]; then
    echo "LAN URL:   http://${ip}:${PORT}/index.html"
  else
    echo "LAN URL:   http://<your-lan-ip>:${PORT}/index.html"
  fi
}

start_server() {
  if is_running; then
    echo "Server is already running (PID $(cat "${PID_FILE}"))"
    show_urls
    exit 0
  fi

  if port_in_use; then
    echo "Port ${PORT} is already in use."
    echo "Refusing to start to avoid interfering with other services."
    echo "Use a different port: PORT=9000 ./local-serve.sh start"
    exit 1
  fi

  cd "${ROOT_DIR}"
  nohup "${PYTHON_BIN}" -m http.server "${PORT}" --bind "${BIND_ADDR}" >"${LOG_FILE}" 2>&1 &
  local pid=$!
  echo "${pid}" >"${PID_FILE}"

  if ! kill -0 "${pid}" 2>/dev/null; then
    echo "Failed to start local server. Check ${LOG_FILE}"
    rm -f "${PID_FILE}"
    exit 1
  fi

  echo "Started local server (PID ${pid})"
  show_urls
  echo "Log file: ${LOG_FILE}"
}

stop_server() {
  if ! is_running; then
    echo "Server is not running."
    rm -f "${PID_FILE}"
    exit 0
  fi

  local pid
  pid="$(cat "${PID_FILE}")"
  kill "${pid}" 2>/dev/null || true
  rm -f "${PID_FILE}"
  echo "Stopped local server (PID ${pid})"
}

status_server() {
  if is_running; then
    echo "Server is running (PID $(cat "${PID_FILE}"))"
    show_urls
    echo "Log file: ${LOG_FILE}"
  else
    echo "Server is not running."
  fi
}

cmd="${1:-}"

case "${cmd}" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server || true
    start_server
    ;;
  status)
    status_server
    ;;
  url)
    show_urls
    ;;
  *)
    usage
    exit 1
    ;;
esac
