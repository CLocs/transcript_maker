/**
 * Free port 8787 (API proxy) before local dev.
 * Only kills processes bound to that port — does not touch other Wrangler/Vite apps.
 */
import { execSync } from "node:child_process";

const PORT = 8787;

function pidsOnPort(port) {
  if (process.platform === "win32") {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -join ' '"`,
        { encoding: "utf8" },
      ).trim();
      return out ? out.split(/\s+/).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    return out ? out.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

try {
  execSync(`npx kill-port ${PORT}`, { stdio: "inherit", shell: true });
} catch {
  // Port may already be free.
}

for (let attempt = 0; attempt < 5; attempt++) {
  const pids = pidsOnPort(PORT);
  if (pids.length === 0) break;
  for (const pid of pids) killPid(pid);
}

const remaining = pidsOnPort(PORT);
if (remaining.length > 0) {
  console.warn(`Port ${PORT} still in use (PIDs: ${remaining.join(", ")}). Stop other dev:all instances.`);
} else {
  console.log(`Port ${PORT} is free.`);
}
