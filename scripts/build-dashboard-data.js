const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath, fallback) => {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return { ...fallback, parse_error: String(error.message || error) };
  }
};

const normalizeText = (value) => String(value || "").trim();

const bucketCount = (items, key, fallback = "sin_dato") => {
  return items.reduce((acc, item) => {
    const value = normalizeText(item[key] || fallback).toLowerCase().replace(/\s+/g, "_");
    acc[value || fallback] = (acc[value || fallback] || 0) + 1;
    return acc;
  }, {});
};

const flattenReferenciaMap = (referencias) => {
  if (!Array.isArray(referencias)) return [];
  const out = [];
  for (const entry of referencias) {
    if (!entry || typeof entry !== "object") continue;
    if (entry.id || entry.referencia || entry.int_ref) {
      out.push(entry);
      continue;
    }
    for (const [id, value] of Object.entries(entry)) {
      if (value && typeof value === "object") out.push({ id, ...value });
    }
  }
  return out;
};

const state = readJson("work/reporte-automation-state.json", {});
const pendientesRaw = readJson("work/outlook-pendientes-abiertos.json", {});
const cotizacionesRaw = readJson("work/cotizaciones-seguimiento-metricas.json", {});
const historicaRaw = readJson("work/memoria-historica-referencias.json", {});

const pendientes = [
  ...(Array.isArray(pendientesRaw.pendientes_abiertos) ? pendientesRaw.pendientes_abiertos : []),
  ...(Array.isArray(pendientesRaw.pendientes) ? pendientesRaw.pendientes : []),
].filter((item) => normalizeText(item.estado).toLowerCase() !== "cerrado");

const cotizaciones = flattenReferenciaMap(cotizacionesRaw.referencias);
const historicas = [
  ...Object.entries(historicaRaw.watchlist || {}).map(([id, value]) => ({ id, ...value })),
  ...(Array.isArray(historicaRaw.referencias) ? historicaRaw.referencias : []),
].filter((item) => item.seguir_en_reportes_diarios !== false);

const latestPendientes = pendientes
  .slice()
  .sort((a, b) => normalizeText(b.ultima_revision || b.fecha_detectado).localeCompare(normalizeText(a.ultima_revision || a.fecha_detectado)))
  .slice(0, 15)
  .map((item) => ({
    referencia: normalizeText(item.referencia || item.id || item.asunto),
    cliente_actor: normalizeText(item.cliente_actor || item.cliente),
    criticidad: normalizeText(item.criticidad || "sin dato"),
    pelota: normalizeText(item.quien_tiene_la_pelota || item.responsable_probable),
    accion: normalizeText(item.accion_sugerida || item.accion_reporte),
    ultima_revision: normalizeText(item.ultima_revision || item.fecha_detectado),
    link: normalizeText(item.link_correo),
  }));

const latestCotizaciones = cotizaciones
  .slice()
  .sort((a, b) => normalizeText(b.ultima_evidencia_at || b.updated_at).localeCompare(normalizeText(a.ultima_evidencia_at || a.updated_at)))
  .slice(0, 15)
  .map((item) => ({
    referencia: normalizeText(item.id || item.referencia || item.int_ref),
    cliente: normalizeText(item.cliente),
    servicio: normalizeText(item.servicio),
    usuario: normalizeText(item.usuario_sheet || item.usuario),
    estatus: normalizeText(item.estatus_sheet || item.estatus),
    semaforo: normalizeText(item.semaforo || "sin dato"),
    pelota: normalizeText(item.quien_tiene_la_pelota),
    accion: normalizeText(item.accion_reporte || item.accion_sugerida),
    ultima_evidencia: normalizeText(item.ultima_evidencia_at || item.updated_at),
  }));

const activeHistorical = historicas
  .slice(0, 20)
  .map((item) => ({
    referencia: normalizeText(item.id || item.referencia || item.int_ref),
    sam: normalizeText(item.referencia_sam || item.sam_ref || item.sam),
    cliente: normalizeText(item.cliente || item.cliente_actor),
    estado: normalizeText(item.estado || item.estado_operativo || "viva"),
    criticidad: normalizeText(item.criticidad || item.semaforo || "sin dato"),
    ultima_revision: normalizeText(item.ultima_revision || item.updated_at || item.ultima_evidencia_at),
  }));

const dashboard = {
  version: "dashboard-v0",
  generated_at: new Date().toISOString(),
  timezone: state.timezone || "America/Mexico_City",
  source_state: {
    configured_version: state.configured_version || "",
    last_morning_report: state.last_morning_report || "",
    last_midday_report: state.last_midday_report || "",
    last_closing_report: state.last_closing_report || "",
    last_successful_report: state.last_successful_report || "",
    last_report_type: state.last_report_type || "",
    last_sheet_scan: state.last_sheet_scan || null,
  },
  summary: {
    pendientes_abiertos: pendientes.length,
    cotizaciones_monitoreadas: cotizaciones.length,
    referencias_historicas_vivas: historicas.length,
    pendientes_por_criticidad: bucketCount(pendientes, "criticidad"),
    cotizaciones_por_semaforo: bucketCount(cotizaciones, "semaforo"),
    cotizaciones_por_estatus: bucketCount(cotizaciones, "estatus_sheet"),
  },
  sections: {
    pendientes: latestPendientes,
    cotizaciones: latestCotizaciones,
    historicas: activeHistorical,
  },
  warnings: [
    "Este archivo puede contener informacion operativa privada.",
    "No publicarlo en repositorios publicos sin sanitizar.",
  ],
};

const outDir = path.join(root, "dashboard", "data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "current.json"), JSON.stringify(dashboard, null, 2), "utf8");
console.log(`Dashboard data generated: ${path.join(outDir, "current.json")}`);

