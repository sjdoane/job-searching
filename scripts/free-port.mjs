// Frees TCP port 3000 (or argv[2]) before `next dev` starts, by stopping a
// STALE node dev server still holding it — including a hung one that's bound to
// the port but no longer responding (the usual cause of an "empty dashboard /
// Tectonic isn't installed" zombie). This lets `cd <repo> && npm run dev` always
// bind 3000 cleanly. Windows-focused; a safe no-op elsewhere or if the port is
// already free. Always exits 0 so it never blocks `next dev`.
import { execSync } from "node:child_process";

const PORT = Number(process.argv[2] || 3000);

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

async function main() {
  // Only the Windows path-resolution is implemented; elsewhere let next dev deal
  // with the port (this suite targets Windows).
  if (process.platform !== "win32") return;

  let pids = [];
  try {
    const out = run("netstat -ano");
    const set = new Set();
    for (const line of out.split(/\r?\n/)) {
      const p = line.trim().split(/\s+/);
      // TCP  <local:port>  <foreign>  LISTENING  <pid>
      if (p[0] === "TCP" && p[3] === "LISTENING" && (p[1] || "").endsWith(":" + PORT)) {
        const pid = Number(p[4]);
        if (Number.isInteger(pid) && pid > 0) set.add(pid);
      }
    }
    pids = [...set];
  } catch {
    return; // couldn't inspect; let next dev proceed
  }

  let killed = false;
  for (const pid of pids) {
    let name = "";
    try {
      name = run(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
    } catch {
      /* process may be gone already */
    }
    if (/node/i.test(name)) {
      try {
        run(`taskkill /F /PID ${pid}`);
        console.log(`[dev] Freed port ${PORT}: stopped a stale dev server (PID ${pid}).`);
        killed = true;
      } catch (e) {
        console.warn(`[dev] Could not stop PID ${pid} on port ${PORT}: ${e.message}`);
      }
    } else {
      console.warn(
        `[dev] Port ${PORT} is held by a non-node process (PID ${pid}); leaving it. Next will pick another port.`,
      );
    }
  }
  if (killed) await new Promise((r) => setTimeout(r, 700)); // let the OS release the socket
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
