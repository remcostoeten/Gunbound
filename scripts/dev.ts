#!/usr/bin/env bun
/**
 * Gunbound dev process manager — replaces `bun run dev`
 * Usage: bun scripts/dev.ts
 *
 * Keys: Tab/1-3 select process · s start · k kill · r restart
 *       a start all · ↑↓/PgUp/PgDn scroll · g bottom · q quit
 */

import { spawn, type ChildProcess } from "child_process";

// ── ANSI primitives ──────────────────────────────────────────────────────────
const R   = "\x1b[0m";
const B   = "\x1b[1m";
const DIM = "\x1b[2m";

const f = {
  red:    "\x1b[31m", green:   "\x1b[32m", yellow:  "\x1b[33m",
  cyan:   "\x1b[36m", gray:    "\x1b[90m", white:   "\x1b[37m",
  bred:   "\x1b[91m", bgreen:  "\x1b[92m", byellow: "\x1b[93m",
  bcyan:  "\x1b[96m", bwhite:  "\x1b[97m", bblue:   "\x1b[94m",
} as const;

const bg = {
  header: "\x1b[48;5;17m",   // deep navy
  tab:    "\x1b[48;5;234m",  // very dark
  selTab: "\x1b[48;5;24m",   // steel blue
  footer: "\x1b[48;5;232m",  // near-black
  log:    "",                 // default terminal bg
} as const;

const to        = (r: number, c: number) => `\x1b[${r};${c}H`;
const clrLine   = () => "\x1b[2K";
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");

const ALT_ENTER   = "\x1b[?1049h";
const ALT_EXIT    = "\x1b[?1049l";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const FULL_CLEAR  = "\x1b[2J\x1b[H";

function write(s: string) { process.stdout.write(s); }

// ── Process definitions ──────────────────────────────────────────────────────
type Status = "idle" | "starting" | "running" | "stopped" | "error";

interface ProcDef {
  id: string;
  label: string;
  desc: string;
  cmd: string;
  args: string[];
  color: string;
  autoStart: boolean;
  readyPattern?: RegExp;
  urlPattern?: RegExp;
}

const DEFS: ProcDef[] = [
  {
    id: "next",
    label: "Next.js",
    desc: "Frontend dev server",
    cmd: "bun",
    args: ["--bun", "next", "dev"],
    color: f.bcyan,
    autoStart: true,
    readyPattern: /ready|started on|listening/i,
    urlPattern: /(?:Local|started on):\s+(https?:\/\/\S+)/i,
  },
  {
    id: "stdb",
    label: "SpacetimeDB",
    desc: "Local DB server :3001",
    cmd: "spacetime",
    args: ["start", "--listen-addr", "0.0.0.0:3001"],
    color: f.byellow,
    autoStart: true,
    readyPattern: /listening|started|ready/i,
  },
  {
    id: "stdb-module",
    label: "STDB Module",
    desc: "Build + watch + TS bindings",
    cmd: "spacetime",
    args: [
      "dev", "gunbound",
      "--no-config",
      "--server", "http://127.0.0.1:3001",
      "--module-path", "server/spacetimedb",
      "--client-lang", "typescript",
      "--module-bindings-path",
      "src/features/game/spacetime/module_bindings",
      "--server-only",
      "--yes",
    ],
    color: f.bblue,
    autoStart: false,
    readyPattern: /build succeeded|published|watching/i,
  },
];

// ── State ────────────────────────────────────────────────────────────────────
interface ProcState {
  def: ProcDef;
  status: Status;
  child?: ChildProcess;
  logs: string[];
  exitCode?: number | null;
  startedAt?: number;
  url?: string;
}

const MAX_LOGS = 800;
const procs = new Map<string, ProcState>(
  DEFS.map(d => [d.id, { def: d, status: "idle", logs: [] }])
);

let selectedId   = DEFS[0].id;
let logScroll    = 0;   // lines from bottom; 0 = pinned
let dirty        = true;
let cols         = process.stdout.columns ?? 120;
let rows         = process.stdout.rows    ?? 30;

// ── Layout constants ─────────────────────────────────────────────────────────
const HDR  = 1;  // header row
const TABS = 2;  // tab bar row
const BOT  = 2;  // status + footer rows at bottom
function logTop()    { return HDR + TABS; }         // first log row (1-based)
function logHeight() { return Math.max(4, rows - HDR - TABS - BOT); }

// ── Helpers ───────────────────────────────────────────────────────────────────
function pushLog(id: string, raw: string) {
  const ps = procs.get(id)!;
  // split on newlines but keep ANSI
  for (const line of raw.split(/\r?\n/)) {
    if (!line && ps.logs[ps.logs.length - 1] === "") continue; // collapse blank lines
    ps.logs.push(line);
    if (ps.logs.length > MAX_LOGS) ps.logs.shift();
  }
  if (id === selectedId) dirty = true;
}

function dot(status: Status): string {
  switch (status) {
    case "running":  return `${f.bgreen}●${R}`;
    case "starting": return `${f.byellow}◌${R}`;
    case "error":    return `${f.bred}✖${R}`;
    case "stopped":  return `${f.gray}◼${R}`;
    default:         return `${f.gray}○${R}`;
  }
}

function elapsed(t?: number) {
  if (!t) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
}

function visLen(s: string) { return stripAnsi(s).length; }

function rpad(s: string, n: number) {
  const v = visLen(s);
  return v >= n ? s : s + " ".repeat(n - v);
}

function truncVis(s: string, max: number) {
  const plain = stripAnsi(s);
  if (plain.length <= max) return s;
  // naive truncation — strip ANSI then re-add reset
  return plain.slice(0, max - 1) + `…${R}`;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderHeader() {
  const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
  const left  = `${B}${f.bcyan} ◆ GUNBOUND${R}${bg.header}${B}${f.bwhite} DEV${R}${bg.header}`;
  const right = `${DIM}${f.gray}${time} ${R}${bg.header}`;
  const gap   = Math.max(0, cols - visLen(" ◆ GUNBOUND DEV") - time.length - 1);
  write(to(1, 1) + bg.header + left + " ".repeat(gap) + right + R);
}

function renderTabs() {
  const tabRow = HDR + 1;
  write(to(tabRow, 1) + bg.tab);

  let x = 2;
  const ids = DEFS.map(d => d.id);
  for (let i = 0; i < ids.length; i++) {
    const ps = procs.get(ids[i])!;
    const active = ps.def.id === selectedId;
    const uptime = ps.status === "running" ? ` ${DIM}${f.gray}${elapsed(ps.startedAt)}${R}${bg.tab}` : "";
    const num    = `${DIM}${i + 1}:${R}${bg.tab}`;
    const label  = active
      ? `${bg.selTab}${B} ${dot(ps.status)} ${ps.def.color}${ps.def.label}${R}${bg.selTab}${DIM}${uptime ? uptime.replace(bg.tab, bg.selTab) : ""}${R}${bg.selTab} ${R}${bg.tab}`
      : ` ${dot(ps.status)} ${DIM}${num}${ps.def.label}${R}${bg.tab}${uptime} `;

    write(label);
    if (i < ids.length - 1) write(`${DIM}${f.gray}│${R}${bg.tab}`);
  }
  write(" ".repeat(Math.max(0, cols)) + R);
}

function renderLogs() {
  const ps  = procs.get(selectedId)!;
  const h   = logHeight();
  const top = logTop() + 1; // 1-based row offset

  if (ps.status === "idle") {
    // empty pane with hint
    for (let i = 0; i < h; i++) {
      write(to(top + i, 1) + clrLine());
    }
    const hint = `${DIM}${f.gray}  press ${R}${B}s${R}${DIM}${f.gray} to start · ${R}${B}a${R}${DIM}${f.gray} to start all${R}`;
    write(to(top + Math.floor(h / 2), 1) + hint);
    return;
  }

  const logs   = ps.logs;
  const total  = logs.length;
  const endIdx = logScroll === 0 ? total : Math.max(0, total - logScroll);
  const start  = Math.max(0, endIdx - h);

  for (let i = 0; i < h; i++) {
    write(to(top + i, 1) + clrLine());
    const idx = start + i;
    if (idx < total) {
      const line = logs[idx];
      write(" " + truncVis(line, cols - 2));
    }
  }

  // scroll indicator
  if (logScroll > 0) {
    const indicator = `${bg.selTab}${f.bwhite} ↑ +${logScroll} ${R}`;
    write(to(top + h - 1, cols - visLen(` ↑ +${logScroll} `) - 1) + indicator);
  }
}

function renderStatusBar() {
  const row = rows - 1;
  write(to(row, 1) + bg.footer + " ");
  for (const ps of procs.values()) {
    let extra = "";
    if (ps.status === "running" && ps.url) {
      extra = ` ${DIM}${f.gray}${ps.url}${R}${bg.footer}`;
    } else if (ps.status === "error") {
      extra = ` ${f.bred}exit ${ps.exitCode ?? "?"}${R}${bg.footer}`;
    }
    write(`${dot(ps.status)} ${ps.def.color}${ps.def.label}${R}${bg.footer}${extra}   `);
  }
  write(" ".repeat(cols) + R);
}

function renderFooter() {
  const row = rows;
  const keys: Array<[string, string]> = [
    ["Tab", "cycle"], ["1-3", "select"],
    ["s", "start"],   ["k", "kill"],    ["r", "restart"], ["a", "all"],
    ["o", "open"],    ["↑↓", "scroll"], ["g", "bottom"],  ["q", "quit"],
  ];
  const parts = keys.map(([k, v]) => `${B}${f.bwhite}${k}${R}${bg.footer}${DIM}${f.gray} ${v}${R}${bg.footer}`);
  write(to(row, 1) + bg.footer + "  " + parts.join(`  ${DIM}·${R}${bg.footer}  `) + " ".repeat(cols) + R);
}

let renderPending = false;
function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  setImmediate(() => {
    renderPending = false;
    if (!dirty) return;
    dirty = false;
    write(HIDE_CURSOR);
    renderHeader();
    renderTabs();
    renderLogs();
    renderStatusBar();
    renderFooter();
  });
}

setInterval(() => { dirty = true; scheduleRender(); }, 1000);

// ── Process control ───────────────────────────────────────────────────────────
function startProc(id: string) {
  const ps = procs.get(id)!;
  if (ps.status === "running" || ps.status === "starting") return;

  ps.status    = "starting";
  ps.logs      = [`${DIM}  ▶ ${ps.def.cmd} ${ps.def.args.join(" ")}${R}`];
  ps.exitCode  = undefined;
  ps.startedAt = undefined;
  ps.url       = undefined;
  dirty = true;

  const child = spawn(ps.def.cmd, ps.def.args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    cwd: process.cwd(),
  });

  ps.child = child;

  // Fallback: mark running after 4s if no readyPattern fires
  const fallback = setTimeout(() => {
    if (ps.status === "starting") {
      ps.status    = "running";
      ps.startedAt = Date.now();
      dirty = true;
      scheduleRender();
    }
  }, 4000);

  const onData = (chunk: Buffer) => {
    const text = chunk.toString();
    pushLog(id, text);

    if (ps.status === "starting" && ps.def.readyPattern?.test(stripAnsi(text))) {
      clearTimeout(fallback);
      ps.status    = "running";
      ps.startedAt = Date.now();
    }

    if (ps.def.urlPattern) {
      const m = stripAnsi(text).match(ps.def.urlPattern);
      if (m) ps.url = m[1];
    }

    scheduleRender();
  };

  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);

  child.on("error", err => {
    clearTimeout(fallback);
    pushLog(id, `${f.bred}spawn error: ${err.message}${R}`);
    ps.status = "error";
    ps.child  = undefined;
    dirty = true;
    scheduleRender();
  });

  child.on("exit", (code, signal) => {
    clearTimeout(fallback);
    ps.exitCode = code;
    ps.status   = (code === 0 || signal === "SIGTERM") ? "stopped" : "error";
    ps.child    = undefined;
    pushLog(id, `${DIM}── process exited${code != null ? ` (${code})` : signal ? ` (${signal})` : ""} ──${R}`);
    dirty = true;
    scheduleRender();
  });

  scheduleRender();
}

function killProc(id: string) {
  const ps = procs.get(id)!;
  if (!ps.child) return;
  ps.child.kill("SIGTERM");
  const tid = setTimeout(() => ps.child?.kill("SIGKILL"), 3000);
  ps.child.once("exit", () => clearTimeout(tid));
}

function restartProc(id: string) {
  const ps = procs.get(id)!;
  if (ps.child) {
    ps.child.once("exit", () => setTimeout(() => startProc(id), 200));
    killProc(id);
  } else {
    startProc(id);
  }
}

function startAll() {
  for (const ps of procs.values()) {
    if (ps.def.autoStart) startProc(ps.def.id);
  }
}

function openUrl(url: string) {
  const opener =
    process.platform === "darwin" ? "open" :
    process.env.BROWSER ?? "xdg-open";
  spawn(opener, [url], { stdio: "ignore", detached: true }).unref();
}

function killAll(cb?: () => void) {
  const alive = [...procs.values()].filter(ps => ps.child);
  if (!alive.length) { cb?.(); return; }
  let n = 0;
  const done = () => { if (++n === alive.length) cb?.(); };
  for (const ps of alive) {
    ps.child!.once("exit", done);
    ps.child!.kill("SIGTERM");
  }
  setTimeout(() => { alive.forEach(ps => ps.child?.kill("SIGKILL")); }, 2500);
}

// ── Keyboard input ────────────────────────────────────────────────────────────
const IDS = DEFS.map(d => d.id);

function handleKey(buf: Buffer) {
  const k = buf.toString("binary");

  // quit
  if (k === "\x03" || k === "q" || k === "Q") { cleanup(); return; }

  // Tab — next process
  if (k === "\t") {
    const i = IDS.indexOf(selectedId);
    selectedId = IDS[(i + 1) % IDS.length];
    logScroll = 0; dirty = true; scheduleRender(); return;
  }
  // Shift+Tab — prev process
  if (k === "\x1b[Z") {
    const i = IDS.indexOf(selectedId);
    selectedId = IDS[(i - 1 + IDS.length) % IDS.length];
    logScroll = 0; dirty = true; scheduleRender(); return;
  }

  // 1/2/3 — direct select
  const n = parseInt(k);
  if (n >= 1 && n <= IDS.length) {
    selectedId = IDS[n - 1];
    logScroll = 0; dirty = true; scheduleRender(); return;
  }

  // process actions
  if (k === "s") { startProc(selectedId); return; }
  if (k === "k") { killProc(selectedId); return; }
  if (k === "r") { restartProc(selectedId); return; }
  if (k === "a") { startAll(); return; }
  if (k === "o" || k === "O") {
    const ps = procs.get(selectedId)!;
    const url = ps.url ?? (ps.status === "running" ? "http://localhost:3000" : null);
    if (url) openUrl(url);
    return;
  }

  // scroll
  const ps     = procs.get(selectedId)!;
  const maxSc  = Math.max(0, ps.logs.length - logHeight());
  const PG     = Math.floor(logHeight() / 2);

  if (k === "\x1b[A") { logScroll = Math.min(logScroll + 1,  maxSc); dirty = true; scheduleRender(); return; }
  if (k === "\x1b[B") { logScroll = Math.max(logScroll - 1,  0);     dirty = true; scheduleRender(); return; }
  if (k === "\x1b[5~") { logScroll = Math.min(logScroll + PG, maxSc); dirty = true; scheduleRender(); return; }
  if (k === "\x1b[6~") { logScroll = Math.max(logScroll - PG, 0);     dirty = true; scheduleRender(); return; }
  if (k === "g" || k === "G") { logScroll = 0; dirty = true; scheduleRender(); return; }
}

// ── Resize ────────────────────────────────────────────────────────────────────
process.stdout.on("resize", () => {
  cols  = process.stdout.columns ?? 120;
  rows  = process.stdout.rows    ?? 30;
  dirty = true;
  scheduleRender();
});

// ── Exit / cleanup ────────────────────────────────────────────────────────────
let exiting = false;
function cleanup() {
  if (exiting) return;
  exiting = true;
  write(ALT_EXIT + SHOW_CURSOR + "\n");
  process.stdout.write(`${f.gray}Stopping processes…${R}\n`);
  killAll(() => {
    process.stdout.write(`${f.gray}bye${R}\n`);
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 4000);
}

process.on("SIGINT",  cleanup);
process.on("SIGTERM", cleanup);

// ── Boot ──────────────────────────────────────────────────────────────────────
if (!process.stdin.isTTY) {
  process.stderr.write("Error: dev.ts must be run in an interactive terminal.\n");
  process.exit(1);
}

write(ALT_ENTER + FULL_CLEAR + HIDE_CURSOR);
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on("data", handleKey);

dirty = true;
scheduleRender();
startAll();
