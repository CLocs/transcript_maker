import { execSync } from "node:child_process";

const PORT = 8787;

try {
  execSync(`npx kill-port ${PORT}`, { stdio: "inherit", shell: true });
} catch {
  // Port may already be free.
}

if (process.platform === "win32") {
  try {
    const output = execSync('tasklist /FI "IMAGENAME eq workerd.exe" /FO CSV /NH', {
      encoding: "utf8",
    });
    if (output.includes("workerd.exe")) {
      execSync("taskkill /F /IM workerd.exe", { stdio: "inherit" });
    }
  } catch {
    // No workerd processes left.
  }
}
