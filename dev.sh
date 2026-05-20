#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'
FRONTEND_PORT="3000"
PROMPT_INPUT=""

print_header() {
  clear
  echo -e "${CYAN}${BOLD}"
  echo "  ╔══════════════════════════════╗"
  echo "  ║       GUNBOUND DEV MENU      ║"
  echo "  ╚══════════════════════════════╝"
  echo -e "${RESET}"
}

print_menu() {
  echo -e "${BOLD}  Frontend${RESET}"
  echo -e "  ${GREEN}1)${RESET} dev          ${DIM}Next.js dev server${RESET}"
  echo -e "  ${GREEN}2)${RESET} build        ${DIM}Production build${RESET}"
  echo -e "  ${GREEN}3)${RESET} start        ${DIM}Start production server${RESET}"
  echo ""
  echo -e "${BOLD}  SpacetimeDB${RESET}"
  echo -e "  ${YELLOW}4)${RESET} spacetime:dev      ${DIM}Build + watch + generate bindings${RESET}"
  echo -e "  ${YELLOW}5)${RESET} spacetime:build    ${DIM}Build server module${RESET}"
  echo -e "  ${YELLOW}6)${RESET} spacetime:start    ${DIM}Start local SpacetimeDB${RESET}"
  echo -e "  ${YELLOW}7)${RESET} spacetime:generate ${DIM}Regenerate TS bindings${RESET}"
  echo -e "  ${YELLOW}8)${RESET} spacetime:publish  ${DIM}Publish to cloud${RESET}"
  echo -e "  ${YELLOW}9)${RESET} spacetime:publish:local ${DIM}Publish to local server${RESET}"
  echo -e "  ${YELLOW}0)${RESET} spacetime:logs     ${DIM}Tail server logs${RESET}"
  echo ""
  echo -e "${BOLD}  Utilities${RESET}"
  echo -e "  ${CYAN}m)${RESET} prepare-mobile-asset  ${DIM}Run python asset script${RESET}"
  echo -e "  ${CYAN}b)${RESET} bun install            ${DIM}Install dependencies${RESET}"
  echo ""
  echo -e "  ${RED}q)${RESET} quit"
  echo ""
  echo -ne "${BOLD}  Select: ${RESET}"
}

run_cmd() {
  local label="$1"
  local cmd="$2"
  echo ""
  echo -e "${GREEN}▶ ${label}${RESET}"
  echo -e "${DIM}  $ ${cmd}${RESET}"
  echo ""
  eval "$cmd"
}

read_cancellable_input() {
  local prompt="$1"
  local previous_int_trap
  local interrupted=0
  local input

  previous_int_trap="$(trap -p INT)"
  trap 'interrupted=1; printf "\n" >&2' INT
  echo -ne "$prompt" >&2

  if ! read -r input; then
    if [[ -n "$previous_int_trap" ]]; then
      eval "$previous_int_trap"
    else
      trap - INT
    fi

    if [[ "$interrupted" -eq 1 ]]; then
      return 130
    fi

    return 1
  fi

  if [[ -n "$previous_int_trap" ]]; then
    eval "$previous_int_trap"
  else
    trap - INT
  fi

  PROMPT_INPUT="$input"
  return 0
}

is_port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -Pn >/dev/null 2>&1
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltn | awk '{ print $4 }' | grep -Eq "(^|:)$port$"
    return
  fi

  timeout 1 bash -c "</dev/tcp/127.0.0.1/$port" >/dev/null 2>&1
}

find_open_port() {
  local port="$1"

  while is_port_in_use "$port"; do
    port=$((port + 1))
  done

  echo "$port"
}

confirm_fallback_port() {
  local requested_port="$1"
  local fallback_port="$2"
  local port
  local read_status

  while true; do
    echo "" >&2
    echo -e "${YELLOW}  Port ${requested_port} is in use.${RESET}" >&2
    if read_cancellable_input "${BOLD}  Use ${fallback_port} instead? ${RESET}${DIM}[Y/n] ${RESET}"; then
      case "$PROMPT_INPUT" in
        ""|y|Y|yes|YES|Yes)
          FRONTEND_PORT="$fallback_port"
          echo "$fallback_port"
          return 0
          ;;
        n|N|no|NO|No)
          if read_cancellable_input "${BOLD}  Port: ${RESET}"; then
            port="$PROMPT_INPUT"

            if is_valid_port "$port"; then
              if is_port_in_use "$port"; then
                echo -e "${RED}  Port ${port} is also in use.${RESET}" >&2
                continue
              fi

              FRONTEND_PORT="$port"
              echo "$port"
              return 0
            fi

            echo -e "${RED}  Invalid port.${RESET}" >&2
            continue
          else
            read_status=$?

            if [[ "$read_status" -eq 130 ]]; then
              return 130
            fi

            continue
          fi
          ;;
        *)
          echo -e "${RED}  Enter y or n.${RESET}" >&2
          ;;
      esac
    else
      read_status=$?

      if [[ "$read_status" -eq 130 ]]; then
        return 130
      fi

      continue
    fi
  done
}

is_valid_port() {
  local port="$1"

  [[ "$port" =~ ^[0-9]+$ ]] && ((port > 0 && port < 65536))
}

read_frontend_port() {
  local port
  local read_status

  echo ""
  if read_cancellable_input "${BOLD}  Port: ${RESET}"; then
    port="$PROMPT_INPUT"

    if is_valid_port "$port"; then
      FRONTEND_PORT="$port"
      echo -e "${GREEN}  Next frontend run will use port ${FRONTEND_PORT}.${RESET}"
      return 0
    fi

    echo -e "${RED}  Invalid port. Keeping ${FRONTEND_PORT}.${RESET}"
    return 0
  else
    read_status=$?

    if [[ "$read_status" -eq 130 ]]; then
      echo -e "${DIM}  Port prompt canceled. Returning to menu.${RESET}"
      return 130
    fi

    echo -e "${RED}  Invalid port. Keeping ${FRONTEND_PORT}.${RESET}"
    return 0
  fi
}

open_url() {
  local url="$1"

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 &
    return
  fi

  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 &
    return
  fi

  if command -v wslview >/dev/null 2>&1; then
    wslview "$url" >/dev/null 2>&1 &
    return
  fi

  echo -e "${YELLOW}  Open ${url} in your browser.${RESET}"
}

stop_process() {
  local pid="$1"

  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    wait "$pid" >/dev/null 2>&1 || true
  fi
}

run_server_cmd() {
  local label="$1"
  local base_cmd="$2"
  local port
  local pid
  local key
  local url
  local action

  port="$(find_open_port "$FRONTEND_PORT")"
  if [[ "$port" != "$FRONTEND_PORT" ]]; then
    if ! port="$(confirm_fallback_port "$FRONTEND_PORT" "$port")"; then
      return
    fi
  fi

  url="http://localhost:${port}"

  while true; do
    echo ""
    echo -e "${GREEN}▶ ${label}${RESET}"
    echo -e "${DIM}  $ ${base_cmd} --port ${port}${RESET}"
    echo -e "${DIM}  o open · r restart · p set next port · q quit · Backspace menu${RESET}"
    echo ""

    ${base_cmd} --port "$port" &
    pid=$!
    action=""

    while kill -0 "$pid" >/dev/null 2>&1; do
      if read -rsn1 -t 1 key; then
        case "$key" in
          o|O) open_url "$url" ;;
          r|R)
            stop_process "$pid"
            action="restart"
            break
            ;;
          p|P)
            if ! read_frontend_port; then
              return
            fi
            echo -e "${DIM}  Returning to menu.${RESET}"
            return
            ;;
          q|Q)
            stop_process "$pid"
            echo -e "\n${DIM}bye${RESET}\n"
            exit 0
            ;;
          $'\177'|$'\b')
            echo -e "\n${DIM}  Returning to menu. ${label} is still running on ${url}.${RESET}"
            return
            ;;
        esac
      fi
    done

    if [[ "$action" == "restart" ]]; then
      continue
    fi

    wait "$pid" || true
    echo ""
    echo -ne "${DIM}  Press Enter to return to menu...${RESET}"
    read -r
    return
  done
}

cd "$(dirname "$0")"

while true; do
  print_header
  print_menu
  read -r choice

  case "$choice" in
    1) run_server_cmd "Next.js dev" "bun --bun next dev"; continue ;;
    2) run_cmd "Production build" "NODE_ENV=production bun --bun next build" ;;
    3) run_server_cmd "Start production" "bun --bun next start"; continue ;;
    4) run_cmd "spacetime:dev" "spacetime dev gunbound --server http://127.0.0.1:3001 --module-path server/spacetimedb --client-lang typescript --module-bindings-path src/features/game/spacetime/module_bindings" ;;
    5) run_cmd "spacetime:build" "spacetime build --module-path server/spacetimedb" ;;
    6) run_cmd "spacetime:start" "spacetime start --listen-addr 0.0.0.0:3001" ;;
    7) run_cmd "spacetime:generate" "spacetime generate --lang typescript --out-dir src/features/game/spacetime/module_bindings --module-path server/spacetimedb" ;;
    8) run_cmd "spacetime:publish" "spacetime publish gunbound --module-path server/spacetimedb --yes" ;;
    9) run_cmd "spacetime:publish:local" "spacetime publish gunbound --server http://127.0.0.1:3001 --module-path server/spacetimedb --yes" ;;
    0) run_cmd "spacetime:logs" "spacetime logs gunbound --server http://127.0.0.1:3001" ;;
    m) run_cmd "prepare-mobile-asset" "python3 scripts/prepare-mobile-asset.py" ;;
    b) run_cmd "bun install" "bun install" ;;
    q|Q) echo -e "\n${DIM}bye${RESET}\n"; exit 0 ;;
    *) echo -e "\n${RED}  Invalid choice.${RESET}" ;;
  esac

  echo ""
  echo -ne "${DIM}  Press Enter to return to menu...${RESET}"
  read -r
done
