const { spawn } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

function runScript(name) {
  const child = spawn(`npm run ${name}`, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(`${name} exited with code ${code}`);
    }
  });

  child.on("error", (err) => {
    console.error(`Failed to start ${name}:`, err);
  });

  return child;
}

console.log("Starting frontend and backend...");

const frontend = runScript("dev:frontend");
const backend = runScript("dev:backend");

function shutdown() {
  if (!frontend.killed) frontend.kill("SIGINT");
  if (!backend.killed) backend.kill("SIGINT");
  process.exit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
