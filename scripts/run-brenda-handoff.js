const fs = require("fs");
const path = require("path");
const { buildTeamsHandoffMessage } = require("./lib/teams-handoff-message");
const { localDateKey, localIso } = require("./lib/report-window-engine");

const root = path.resolve(__dirname, "..");
const timezone = "America/Mexico_City";

const args = new Set(process.argv.slice(2));
const argValue = (name, fallback = "") => {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const dryRun = args.has("--dry-run");
const force = args.has("--force");
const skipBuild = args.has("--skip-build");
const markSent = args.has("--mark-sent");
const testWebhook = args.has("--test-webhook");
const delivery = argValue("--delivery", markSent ? "teams_web_manual" : "pending_manual");

const clean = (value) => String(value || "").trim();

const loadDotEnv = () => {
  const file = path.join(root, ".env");
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
};

const readJson = (relativePath, fallback) => {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const writeJson = (relativePath, value) => {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const runLocalScript = (label, relativePath) => {
  const scriptPath = path.join(root, relativePath);
  const originalArgv = process.argv;
  const originalLog = console.log;
  const output = [];

  try {
    process.argv = [process.execPath, scriptPath];
    console.log = (...values) => output.push(values.map((value) => String(value)).join(" "));
    delete require.cache[require.resolve(scriptPath)];
    require(scriptPath);
  } catch (error) {
    throw new Error(`${label} fallo: ${error.message || error}`);
  } finally {
    process.argv = originalArgv;
    console.log = originalLog;
  }

  return clean(output.join("\n"));
};

const writeMessageFiles = (handoff) => {
  writeJson("work/teams-handoff-current.json", handoff);
  fs.writeFileSync(path.join(root, "work", "teams-handoff-current.md"), `${handoff.message}\n`, "utf8");
};

const postWebhook = async (url, payload) => {
  if (typeof fetch !== "function") throw new Error("Esta version de Node no tiene fetch global para enviar webhook.");
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Webhook Teams respondio ${response.status}: ${body.slice(0, 500)}`);
  }
};

const updateHandoffState = (patch) => {
  const state = readJson("work/reporte-automation-state.json", { version: 1, timezone });
  state.last_teams_handoff_brenda_mexico = {
    ...(state.last_teams_handoff_brenda_mexico || {}),
    ...patch,
  };
  if (!dryRun) writeJson("work/reporte-automation-state.json", state);
  return state.last_teams_handoff_brenda_mexico;
};

const main = async () => {
  loadDotEnv();

  const now = new Date();
  const dateKey = localDateKey(now, timezone);
  const generatedAt = localIso(now, timezone);
  const webhookUrl = clean(process.env.TEAMS_HANDOFF_WEBHOOK_URL);
  const useWebhook = args.has("--webhook") || clean(process.env.TEAMS_HANDOFF_USE_WEBHOOK).toLowerCase() === "true";

  if (testWebhook) {
    if (!webhookUrl) throw new Error("Falta TEAMS_HANDOFF_WEBHOOK_URL en .env o variables de entorno.");
    await postWebhook(webhookUrl, {
      chat_name: "Agents team <3",
      text: `[Prueba mini TMS] Power Automate conectado correctamente. ${generatedAt}`,
      item_count: 0,
      owner_count: 0,
      groups: [],
      generated_at: generatedAt,
      source: "mini_tms_webhook_test",
    });
    console.log("NOTIFY: prueba Teams enviada por Power Automate.");
    return;
  }

  if (!skipBuild) runLocalScript("Generar datos del dashboard", "scripts/build-dashboard-data.js");

  const dashboard = readJson("dashboard/data/current.json", null);
  if (!dashboard) throw new Error("No se pudo leer dashboard/data/current.json.");

  const handoff =
    dashboard.executive_digest?.teams_handoff ||
    buildTeamsHandoffMessage(dashboard.tabs?.cotizaciones?.items || [], { chatName: "Agents team <3" });

  if (!handoff.has_items) {
    updateHandoffState({
      date_key: dateKey,
      at: generatedAt,
      status: "sin_pendientes",
      item_count: 0,
      message_hash: "",
      chat_name: handoff.chat_name,
    });
    console.log("DONT_NOTIFY: sin cotizaciones Brenda pendientes para handoff Mexico.");
    return;
  }

  const state = readJson("work/reporte-automation-state.json", { version: 1, timezone });
  const last = state.last_teams_handoff_brenda_mexico || {};
  const alreadyDelivered =
    last.date_key === dateKey &&
    last.message_hash === handoff.message_hash &&
    ["manual_sent", "webhook_sent", "sent"].includes(last.status);

  if (!force && alreadyDelivered) {
    console.log(`DONT_NOTIFY: handoff Teams ya enviado hoy (${last.status}).`);
    return;
  }

  writeMessageFiles(handoff);

  if (markSent) {
    updateHandoffState({
      date_key: dateKey,
      at: generatedAt,
      status: "manual_sent",
      delivery,
      item_count: handoff.item_count,
      owner_count: handoff.owner_count,
      message_hash: handoff.message_hash,
      chat_name: handoff.chat_name,
      groups: handoff.groups,
    });
    console.log("NOTIFY: handoff Teams marcado como enviado manualmente.");
    return;
  }

  if (useWebhook && webhookUrl) {
    await postWebhook(webhookUrl, {
      chat_name: handoff.chat_name,
      text: handoff.message,
      item_count: handoff.item_count,
      owner_count: handoff.owner_count,
      groups: handoff.groups,
      generated_at: generatedAt,
      source: "mini_tms_brenda_handoff",
    });
    updateHandoffState({
      date_key: dateKey,
      at: generatedAt,
      status: "webhook_sent",
      delivery: "power_automate_webhook",
      item_count: handoff.item_count,
      owner_count: handoff.owner_count,
      message_hash: handoff.message_hash,
      chat_name: handoff.chat_name,
      groups: handoff.groups,
    });
    console.log("NOTIFY: handoff Teams enviado por webhook.");
    return;
  }

  updateHandoffState({
    date_key: dateKey,
    at: generatedAt,
    status: "pending_manual",
    delivery,
    item_count: handoff.item_count,
    owner_count: handoff.owner_count,
    message_hash: handoff.message_hash,
    chat_name: handoff.chat_name,
    groups: handoff.groups,
    message_file: "work/teams-handoff-current.md",
  });
  console.log("NOTIFY: handoff Teams listo para enviar manualmente.");
  console.log(handoff.message);
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
