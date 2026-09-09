const fs = require("fs");
const path = require("path");
const { decideReportRun, localIso } = require("./lib/report-window-engine");

const root = path.resolve(__dirname, "..");
const timezone = "America/Mexico_City";

const argValue = (name, fallback = "") => {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const readJson = (relativePath, fallback) => {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const nowArg = argValue("--now", "");
const now = nowArg ? new Date(nowArg) : new Date();
if (Number.isNaN(now.getTime())) throw new Error(`Fecha invalida en --now=${nowArg}`);

const requestedType = argValue("--type", "auto");
const force = process.argv.includes("--force");
const state = readJson("work/reporte-automation-state.json", {});
const decision = decideReportRun({ requestedType, now, state, force, timezone });

console.log(
  JSON.stringify(
    {
      ...decision,
      local_time: localIso(now, timezone),
      timezone,
    },
    null,
    2
  )
);
