const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  localDateKey,
  localIso,
  localParts,
  periodStateField,
  decideReportRun,
} = require("./lib/report-window-engine");

const root = path.resolve(__dirname, "..");
const timezone = "America/Mexico_City";

const args = new Set(process.argv.slice(2));
const argValue = (name, fallback = "") => {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const requestedType = argValue("--type", args.has("--auto") ? "auto" : "manual");
const force = args.has("--force");
const dryRun = args.has("--dry-run");
const skipSheet = args.has("--skip-sheet");
const skipOutlook = args.has("--skip-outlook");
const deploy = args.has("--deploy");
const nowArg = argValue("--now", "");

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

const clean = (value) => String(value || "").trim();

const typeLabel = {
  manana: "manana",
  mediodia: "mediodia",
  cierre: "cierre",
  manual: "manual",
};

const runCommand = (label, command, commandArgs) => {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`${label} fallo: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = clean(result.stderr) || clean(result.stdout) || `exit ${result.status}`;
    throw new Error(`${label} fallo: ${detail}`);
  }

  return clean(result.stdout);
};

const runLocalScript = (label, relativePath, scriptArgs = []) => {
  const scriptPath = path.join(root, relativePath);
  const originalArgv = process.argv;
  const originalLog = console.log;
  const output = [];

  try {
    process.argv = [process.execPath, scriptPath, ...scriptArgs];
    console.log = (...values) => output.push(values.map((value) => String(value)).join(" "));
    delete require.cache[require.resolve(scriptPath)];
    require(scriptPath);
  } catch (error) {
    throw new Error(`${label} fallo: ${error.message || error}`);
  } finally {
    process.argv = originalArgv;
    console.log = originalLog;
  }

  return clean(output.join("\n")) || `${label} completado.`;
};

const maybeImportSheetSnapshot = () => {
  if (skipSheet) return "Snapshot de Sheet omitido por bandera.";
  const snapshotPath = path.join(root, "work", "sheet-cotizaciones-snapshot.json");
  if (!fs.existsSync(snapshotPath)) return "No hay snapshot local del Sheet; se conserva memoria actual.";

  const memoryPath = path.join(root, "work", "cotizaciones-seguimiento-metricas.json");
  const snapshotMtime = fs.statSync(snapshotPath).mtimeMs;
  const memoryMtime = fs.existsSync(memoryPath) ? fs.statSync(memoryPath).mtimeMs : 0;
  if (!force && snapshotMtime <= memoryMtime) {
    return "Snapshot del Sheet sin cambios nuevos; no se reimporta.";
  }

  return runLocalScript("Importar snapshot del Sheet", "scripts/import-sheet-cotizaciones-snapshot.js");
};

const maybeImportOutlookSnapshot = () => {
  if (skipOutlook) return "Snapshot de Outlook omitido por bandera.";
  const snapshotPath = path.join(root, "work", "outlook-messages-snapshot.json");
  if (!fs.existsSync(snapshotPath)) return "No hay snapshot local de Outlook; se conserva memoria actual.";

  const memoryPath = path.join(root, "work", "outlook-pendientes-abiertos.json");
  const snapshotMtime = fs.statSync(snapshotPath).mtimeMs;
  const memoryMtime = fs.existsSync(memoryPath) ? fs.statSync(memoryPath).mtimeMs : 0;
  if (!force && snapshotMtime <= memoryMtime) {
    return "Snapshot de Outlook sin cambios nuevos; no se reimporta.";
  }

  return runLocalScript("Importar snapshot de Outlook", "scripts/import-outlook-snapshot.js");
};

const formatDate = (value) => {
  if (!value) return "sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
};

const valueText = (value, fallback = "sin dato") => clean(value) || fallback;

const bullet = (value) => `- ${value}`;

const tableRows = (items, columns) => {
  if (!items.length) return "_Sin registros visibles._";
  const header = `| ${columns.map(([label]) => label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const rows = items.map((item) => `| ${columns.map(([, getter]) => clean(getter(item)).replaceAll("|", "/") || "-").join(" | ")} |`);
  return [header, divider, ...rows].join("\n");
};

const refId = (item) => valueText(item.int_ref || item.referencia_int || item.referencia_id || item.referencia || item.id, "sin referencia");
const itemDate = (item) => formatDate(item.ultimo_movimiento_at || item.ultima_evidencia_at || item.at || item.fecha_at || item.inicio_at);
const itemEstado = (item) => valueText(item.estado || item.estado_cotizacion || item.estado_operativo || item.estado_medicion || item.decision_ejecutiva);
const itemPelota = (item) => valueText(item.pelota || item.actor || item.quien_tiene_la_pelota || item.actor_destino || item.actor_responsable);
const itemAccion = (item) => valueText(item.accion || item.accion_sugerida || item.accion_siguiente || item.observacion);
const itemPorque = (item) =>
  valueText(item.por_que_importa || item.ultimo_movimiento || item.ultimo_movimiento_resumen || item.ultima_evidencia || item.lectura_tiempo);
const normalizedKey = (value) =>
  clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
const trustLabel = (value) =>
  ({
    accion_confiable: "Accion confiable",
    accion_probable: "Accion probable",
    validar_antes: "Validar antes",
    sin_evidencia_suficiente: "Sin evidencia suficiente",
    monitoreo_controlado: "Monitoreo controlado",
  })[normalizedKey(value)] || valueText(value, "Validar lectura");
const itemTrust = (item) => normalizedKey(item.lectura_confianza);
const itemValidationReason = (item) =>
  valueText(
    item.lectura_confianza_reason ||
      item.motivo_prioridad ||
      item.por_que_importa ||
      item.ultimo_movimiento ||
      item.ultima_evidencia ||
      item.observacion
  );

const reportItemTable = (items) =>
  tableRows(items, [
    ["Tipo", (item) => item.tipo || item.tipo_registro],
    ["Ref", (item) => refId(item)],
    ["Cliente/actor", (item) => item.cliente || item.cliente_actor || item.actor_origen],
    ["Estado", itemEstado],
    ["Ultimo mov.", itemDate],
    ["Por que importa", itemPorque],
    ["Pelota", itemPelota],
    ["Accion", itemAccion],
  ]);

const trustItemTable = (items) =>
  tableRows(items, [
    ["Tipo", (item) => item.tipo || item.tipo_registro],
    ["Ref", (item) => refId(item)],
    ["Cliente/actor", (item) => item.cliente || item.cliente_actor || item.actor_origen],
    ["Lectura", (item) => trustLabel(item.lectura_confianza)],
    ["Estado", itemEstado],
    ["Motivo", itemValidationReason],
    ["Pelota", itemPelota],
    ["Accion", itemAccion],
  ]);

const riskTable = (items) =>
  tableRows(items, [
    ["Riesgo", (item) => item.titulo || item.id],
    ["Nivel", (item) => item.nivel],
    ["Detalle", (item) => item.detalle],
    ["Accion", (item) => item.accion],
  ]);

const coverageLines = (coverage) => {
  if (!coverage || typeof coverage !== "object") return [];
  const sheet = coverage.sheet || {};
  const outlook = coverage.outlook || {};
  const dashboard = coverage.dashboard || {};
  return [
    sheet.tab ? `Sheet: ${sheet.spreadsheet || "COTIZACIONES AGENTES 2026 MLTI"} / ${sheet.tab}${sheet.range ? ` / ${sheet.range}` : ""}.` : "",
    sheet.scanned_at ? `Ultima lectura Sheet: ${formatDate(sheet.scanned_at)}; filas reales ${sheet.real_rows ?? "sin dato"}, parciales ${sheet.partial_rows ?? "sin dato"}, placeholders ${sheet.placeholder_rows ?? "sin dato"}.` : "",
    outlook.last_import_at ? `Ultima lectura Outlook/memoria: ${formatDate(outlook.last_import_at)}.` : "",
    outlook.coverage_note ? `Outlook: ${outlook.coverage_note}` : "",
    dashboard.operaciones != null
      ? `Dashboard: ${dashboard.operaciones} operaciones, ${dashboard.cotizaciones} cotizaciones, ${dashboard.tiempos_calidad} mediciones y ${dashboard.historial} eventos de historial.`
      : "",
    coverage.privacidad || "",
  ].filter(Boolean);
};

const reportMarkdown = (data, type, generatedAt, notes) => {
  const digest = data.executive_digest || {};
  const report = digest.reporte || {};
  const summary = data.summary || {};
  const tabs = data.tabs || {};
  const operaciones = tabs.operacion?.items || [];
  const cotizaciones = tabs.cotizaciones?.items || [];
  const tiempos = tabs.tiempos_calidad?.items || [];
  const history = data.history || [];
  const priorities = digest.prioridades || [];
  const alerts = digest.alertas || [];
  const sections = report.bloques || report.secciones || [];
  const risks = report.riesgos || [];
  const riskDetails = report.riesgos_detalle || [];
  const actionDetails = report.acciones_miguel_detalle || [];
  const readyDetails = report.acciones_listas_detalle || [];
  const probableDetails = report.acciones_probables_detalle || [];
  const validationDetails = report.validaciones_detalle || [];
  const dataQuality = report.calidad_dato || {};
  const coverageDetail = report.cobertura_detalle || null;
  const limitations = report.limitaciones || [];
  const typeName = typeLabel[type] || type;

  const topOps = operaciones
    .filter((item) => item.es_prioridad_reporte === true && item.estado_operativo !== "cotizacion_activa" && item.cola_trabajo !== "pelota_pricing")
    .slice(0, type === "mediodia" ? 8 : 14);
  const topQuotes = cotizaciones
    .filter((item) => item.es_prioridad_reporte === true)
    .slice(0, type === "mediodia" ? 8 : 14);
  const backlog = [...operaciones, ...cotizaciones]
    .filter((item) => item.bandeja_ejecutiva === "backlog_historico" || item.bandeja_ejecutiva === "por_validar")
    .slice(0, type === "mediodia" ? 5 : 10);
  const topTimes = tiempos
    .filter((item) => ["rojo", "gris", "amarillo"].includes(item.semaforo))
    .slice(0, type === "mediodia" ? 6 : 10);
  const changes = history.slice(0, type === "mediodia" ? 10 : 16);
  const fallbackReady = actionDetails.filter((item) => itemTrust(item) === "accion_confiable");
  const fallbackProbable = actionDetails.filter((item) => ["accion_probable", "monitoreo_controlado"].includes(itemTrust(item)));
  const fallbackValidation = actionDetails.filter((item) => ["validar_antes", "sin_evidencia_suficiente"].includes(itemTrust(item)));
  const readyRows = (readyDetails.length ? readyDetails : fallbackReady).slice(0, type === "mediodia" ? 5 : 8);
  const probableRows = (probableDetails.length ? probableDetails : fallbackProbable).slice(0, type === "mediodia" ? 5 : 8);
  const validationRows = (validationDetails.length ? validationDetails : fallbackValidation).slice(0, type === "mediodia" ? 6 : 12);

  return [
    `# ${report.asunto_sugerido || `Reporte ejecutivo MLTI - ${typeName}`}`,
    "",
    `Generado: ${formatDate(generatedAt)} (${timezone})`,
    `Tipo: ${typeName}`,
    "",
    "## Resumen ejecutivo",
    ...(report.bullets?.length ? report.bullets.map(bullet) : [bullet(digest.headline || "Sin resumen disponible.")]),
    "",
    "## Alertas accionables",
    ...(alerts.length ? alerts.map((item) => bullet(`${item.titulo}: ${item.detalle} Accion: ${item.accion}.`)) : [bullet("Sin alertas accionables visibles.")]),
    "",
    "## Acciones listas para Miguel",
    readyRows.length
      ? trustItemTable(readyRows)
      : bullet("Sin acciones marcadas como 100% listas; revisar acciones probables o validaciones antes de mover al equipo."),
    "",
    "## Acciones probables / revisar detalle",
    probableRows.length
      ? trustItemTable(probableRows)
      : bullet("Sin acciones probables visibles con la regla actual."),
    "",
    "## Validar antes de actuar",
    validationRows.length
      ? trustItemTable(validationRows)
      : bullet("Sin validaciones previas visibles en el corte actual."),
    !readyRows.length && !probableRows.length && !validationRows.length
      ? (report.acciones_miguel?.length ? report.acciones_miguel.map(bullet).join("\n") : priorities.map((item) => bullet(`${item.id}: ${item.accion}`)).join("\n"))
      : "",
    !topOps.length && !topQuotes.length ? bullet("Sin prioridades reales con evidencia suficiente para poner arriba.") : "",
    "",
    "## Calidad de lectura",
    bullet(dataQuality.regla_reporte || "El reporte separa acciones listas, probables y validaciones para no tratar evidencia incompleta como instruccion segura."),
    bullet(`Acciones listas mostradas: ${readyRows.length}.`),
    bullet(`Acciones probables mostradas: ${probableRows.length}.`),
    bullet(`Validaciones mostradas: ${validationRows.length}; total por validar en dashboard: ${dataQuality.registros_validar_total ?? summary.acciones_validar_antes ?? 0}.`),
    bullet(`Sheet desfasado: ${dataQuality.sheet_desfasado ?? summary.sheet_desfasado ?? 0}.`),
    bullet(`Cotizaciones: Sheet/memoria dicen ${summary.cotizaciones_sheet_pendientes ?? summary.cotizaciones_pendientes_reales ?? 0} pendientes de Pricing (${summary.cotizaciones_sheet_pendientes_mes_actual ?? 0} de mes actual); tras cruzar correo quedan ${summary.cotizaciones_pendientes_reales ?? 0} pendientes reales y ${summary.cotizaciones_sheet_pendientes_reclasificadas ?? 0} requieren otra lectura/accion.`),
    "",
    "## Riesgos a cuidar",
    riskDetails.length ? riskTable(riskDetails) : (risks.length ? risks.map(bullet).join("\n") : bullet("Sin riesgos adicionales detectados con la regla actual.")),
    "",
    "## Lectura por bloque",
    ...(sections.length
      ? sections.flatMap((section) => [
          `### ${section.titulo}`,
          section.lectura ? section.lectura : "",
          ...(section.bullets || []).map(bullet),
          section.items?.length ? reportItemTable(section.items) : "",
          "",
        ])
      : [bullet("Sin bloques ejecutivos disponibles.")]),
    "",
    "## Cambios recientes",
    changes.length
      ? tableRows(changes, [
          ["Ref", (item) => refId(item)],
          ["Carril", (item) => item.historial_lane || item.tipo_cambio || item.evento],
          ["Cambio", (item) => item.tipo_cambio || item.evento],
          ["Actor", (item) => item.actor || item.fuente],
          ["Lectura", (item) => item.lectura_memoria || item.resumen || item.cambio],
          ["Fecha", (item) => formatDate(item.at || item.fecha_at)],
        ])
      : "_Sin cambios recientes visibles._",
    "",
    "## Operacion",
    tableRows(topOps, [
      ["Ref", (item) => refId(item)],
      ["Cliente", (item) => item.cliente || item.cliente_actor],
      ["Decision", (item) => item.decision_ejecutiva],
      ["Estado", (item) => item.estado_operativo],
      ["Pelota", (item) => item.pelota || item.quien_tiene_la_pelota],
      ["Accion", (item) => item.accion_sugerida || item.accion_siguiente],
    ]),
    "",
    "## Cotizaciones",
    tableRows(topQuotes, [
      ["Ref", (item) => refId(item)],
      ["Cliente", (item) => item.cliente],
      ["Usuario", (item) => item.usuario_sheet || item.usuario_responsable],
      ["Etapa", (item) => item.etapa_comercial],
      ["Estado", (item) => item.estado_cotizacion],
      ["Accion", (item) => item.accion_sugerida || item.accion_siguiente],
    ]),
    "",
    "## Backlog vivo / por validar",
    tableRows(backlog, [
      ["Ref", (item) => refId(item)],
      ["Cliente", (item) => item.cliente || item.cliente_actor],
      ["Bandeja", (item) => item.bandeja_ejecutiva],
      ["Estado", (item) => item.estado_cotizacion || item.estado_operativo],
      ["Accion", (item) => item.accion_sugerida || item.accion_siguiente || item.motivo_prioridad],
    ]),
    "",
    "## Tiempos y calidad",
    tableRows(topTimes, [
      ["Ref", (item) => refId(item)],
      ["Vista", (item) => item.lane_tiempo || item.tipo],
      ["Semaforo", (item) => item.semaforo],
      ["Responsable", (item) => item.actor_destino || item.actor_responsable],
      ["Duracion", (item) => (typeof item.duracion_min === "number" ? `${item.duracion_min} min` : item.estado_medicion)],
      ["Lectura", (item) => item.lectura_tiempo || item.observacion],
    ]),
    "",
    "## Cobertura",
    ...(report.cobertura?.length ? report.cobertura.map(bullet) : []),
    ...coverageLines(coverageDetail).map(bullet),
    bullet(`Operaciones vivas: ${summary.operaciones_vivas || 0}.`),
    bullet(`Cotizaciones vivas: ${summary.cotizaciones_vivas || 0}.`),
    bullet(`Prioridades reales de hoy: ${summary.prioridad_hoy || 0}.`),
    bullet(`Cotizaciones pendientes reales de Pricing: ${summary.cotizaciones_pendientes_reales || 0} (${summary.cotizaciones_pendientes_mes_actual || 0} mes actual, ${summary.cotizaciones_pendientes_historicas || 0} historicas).`),
    bullet(`Pendientes segun estatus literal del Sheet/memoria: ${summary.cotizaciones_sheet_pendientes || 0} (${summary.cotizaciones_sheet_pendientes_mes_actual || 0} mes actual, ${summary.cotizaciones_sheet_pendientes_historicas || 0} historicas); reclasificadas por correo/evidencia: ${summary.cotizaciones_sheet_pendientes_reclasificadas || 0}.`),
    bullet(`Cotizaciones ya cotizadas/en monitoreo: ${summary.cotizaciones_cotizadas || 0}.`),
    bullet(`Backlog historico separado: ${summary.backlog_historico || 0}.`),
    bullet(`Alertas de tiempos: ${summary.respuestas_rojas || 0}.`),
    ...notes.map(bullet),
    ...limitations.map((item) => bullet(`Limitacion: ${item}`)),
    "",
    "## Privacidad",
    "- Reporte generado localmente desde memorias privadas.",
    "- No se modifico Outlook ni Google Sheet.",
    "- No publicar este archivo en GitHub publico si contiene datos reales.",
    "",
  ].join("\n");
};

const appendRunHistory = (entry) => {
  const history = readJson("work/dashboard-runs-history.json", { version: 1, timezone, runs: [] });
  history.runs = [entry, ...(history.runs || [])].slice(0, 250);
  writeJson("work/dashboard-runs-history.json", history);
};

const parseCloudflareDeployOutput = (output) => {
  const url = clean(output.match(/https:\/\/[^\s]+\.pages\.dev[^\s]*/)?.[0]);
  return {
    status: "success",
    at: localIso(new Date(), timezone),
    provider: "cloudflare_pages",
    project: "reporte-agentes-mlti",
    url,
    access_required: true,
    output_excerpt: clean(output).slice(-1200),
  };
};

const cloudflareDeployFailure = (error) => ({
  status: "failed",
  at: localIso(new Date(), timezone),
  provider: "cloudflare_pages",
  project: "reporte-agentes-mlti",
  access_required: true,
  error: clean(error?.message || error),
});

const updateDeploymentState = (deployment) => {
  const state = readJson("work/reporte-automation-state.json", { version: 1, timezone });
  state.last_cloudflare_deploy = deployment;
  if (state.last_automation_run && typeof state.last_automation_run === "object") {
    state.last_automation_run.cloudflare = deployment;
  }
  writeJson("work/reporte-automation-state.json", state);
};

const appendDeploymentSection = (reportFile, deployment) => {
  const lines = [
    "",
    "## Publicacion Cloudflare",
    `- Estado: ${deployment.status === "success" ? "publicado" : "fallo al publicar"}.`,
    deployment.url ? `- URL: ${deployment.url}` : "",
    "- Privacidad: Cloudflare Access requerido antes de ver el dashboard.",
    deployment.error ? `- Error: ${deployment.error}` : "",
    "",
  ].filter(Boolean);
  fs.appendFileSync(reportFile, lines.join("\n"), "utf8");
};

const updateState = (type, generatedAt, reportPath, data, decision) => {
  const state = readJson("work/reporte-automation-state.json", { version: 1, timezone });
  const field = periodStateField[type] || "last_manual_report";
  state[field] = generatedAt;
  state.last_successful_report = generatedAt;
  state.last_report_type = type;
  state.last_generated_report_file = reportPath.replaceAll("\\", "/");
  state.last_dashboard_refresh = generatedAt;
  state.last_automation_run = {
    at: generatedAt,
    type,
    requested_type: requestedType,
    status: decision?.status || "",
    reason: decision?.reason || "",
    summary: data.summary || {},
    executive_digest: {
      alertas: data.executive_digest?.alertas?.length || 0,
      prioridades: data.executive_digest?.prioridades?.length || 0,
    },
  };
  writeJson("work/reporte-automation-state.json", state);
};

const main = () => {
  const now = nowArg ? new Date(nowArg) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error(`Fecha invalida en --now=${nowArg}`);

  const state = readJson("work/reporte-automation-state.json", {});
  const decision = decideReportRun({ requestedType, now, state, force, timezone });

  if (!decision.shouldRun) {
    console.log(`${decision.decision}: ${decision.reason}`);
    return;
  }

  const type = decision.type;
  const generatedAt = localIso(now, timezone);
  const dateKey = localDateKey(now, timezone);
  const notes = [`Decision automatica: ${decision.reason} Estado: ${decision.status}.`, maybeImportSheetSnapshot()];
  notes.push(maybeImportOutlookSnapshot());
  notes.push(runLocalScript("Generar datos del dashboard", "scripts/build-dashboard-data.js"));

  const data = readJson("dashboard/data/current.json", null);
  if (!data) throw new Error("No se pudo leer dashboard/data/current.json despues de generar datos.");

  const parts = localParts(now, timezone);
  const reportDir = path.join(root, "work", "reports", "generated");
  fs.mkdirSync(reportDir, { recursive: true });
  const fileName = `reporte-${type}-${dateKey}-${parts.hour}${parts.minute}.md`;
  const reportFile = path.join(reportDir, fileName);
  const markdown = reportMarkdown(data, type, generatedAt, notes);
  let deployment = null;
  let deploymentError = null;

  if (!dryRun) {
    fs.writeFileSync(reportFile, markdown, "utf8");
    updateState(type, generatedAt, path.relative(root, reportFile), data, decision);
    notes.push(runLocalScript("Actualizar estado final en dashboard", "scripts/build-dashboard-data.js"));

    if (deploy) {
      try {
        const output = runCommand("Publicar en Cloudflare", "powershell", [
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          "scripts/deploy-cloudflare.ps1",
          "-AccessReady",
          "-SkipDataBuild",
        ]);
        deployment = parseCloudflareDeployOutput(output);
      } catch (error) {
        deployment = cloudflareDeployFailure(error);
        deploymentError = error;
      }
      updateDeploymentState(deployment);
      appendDeploymentSection(reportFile, deployment);
    }

    appendRunHistory({
      at: generatedAt,
      type,
      requested_type: requestedType,
      status: decision.status,
      reason: decision.reason,
      report_file: path.relative(root, reportFile).replaceAll("\\", "/"),
      summary: data.summary || {},
      digest: {
        headline: data.executive_digest?.headline || "",
        alertas: data.executive_digest?.alertas?.length || 0,
        prioridades: data.executive_digest?.prioridades?.length || 0,
      },
      cloudflare: deployment,
    });
  }

  if (deploymentError) {
    throw deploymentError;
  }

  console.log(`${dryRun ? "Simulacion de reporte" : "Reporte generado"}: ${path.relative(root, reportFile)}`);
  console.log(data.executive_digest?.headline || "Sin headline ejecutivo.");
  if (deployment?.status === "success") console.log(`Cloudflare publicado: ${deployment.url || "ver panel de Cloudflare"}`);
};

main();
