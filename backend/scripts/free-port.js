#!/usr/bin/env node
// Force-frees the backend's port before every dev start.
//
// `nest start --watch` spawns the actual listening process as a child of
// the CLI's own watcher. On Windows, stopping that watcher (e.g. Ctrl+C, or
// a plain `Stop-Process` on whichever PID happened to be visible) does not
// kill its children — Windows has no signal-based process-group teardown
// like POSIX does — so the real listener can survive as an orphan holding
// the port, and the next `npm run start:dev` fails with EADDRINUSE. This
// runs automatically before every start:*/start:dev:*/start:debug via npm's
// pre<script> hook, so a stale listener never blocks a fresh start.
const { execSync } = require('child_process');

const port = process.env.PORT || 5000;

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    return '';
  }
}

if (process.platform === 'win32') {
  const output = run(`netstat -ano -p tcp`);
  const pids = new Set();
  for (const line of output.split('\n')) {
    // e.g. "  TCP    0.0.0.0:5000    0.0.0.0:0    LISTENING    12345"
    const match = line.match(/^\s*TCP\s+\S*:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
    if (match && Number(match[1]) === Number(port)) {
      pids.add(match[2]);
    }
  }
  for (const pid of pids) {
    console.log(`[free-port] Killing stale process ${pid} still holding port ${port}`);
    run(`taskkill /PID ${pid} /F /T`);
  }
} else {
  const output = run(`lsof -ti tcp:${port}`);
  const pids = output.split('\n').map((s) => s.trim()).filter(Boolean);
  for (const pid of pids) {
    console.log(`[free-port] Killing stale process ${pid} still holding port ${port}`);
    run(`kill -9 ${pid}`);
  }
}
