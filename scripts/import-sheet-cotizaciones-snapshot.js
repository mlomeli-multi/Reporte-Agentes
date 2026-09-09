const fs = require("fs");
const path = require("path");
const { classifySheetQuoteStatus } = require("./lib/quote-status-engine");

const root = path.resolve(__dirname, "..");
const inputPath = path.resolve(root, process.argv[2] || "work/sheet-cotizaciones-snapshot.json");
const memoryPath = path.resolve(root, "work/cotizaciones-seguimiento-metricas.json");
const timezone = "America/Mexico_City";

const monthCodes = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

const SHIPMENT_RE =
  /\b(?:DPA|EPA|IPA|APM|EPM|IPM|DPT|EPT|IPT|AA|EA|IA|IM|EM|AM|DT|ET|IT|WH|DA|DH|EH|IH|EC|IC|DC)-\d{6}-\d{4}\b/gi;

const shipmentCatalog = {
  IA: { modalidad: "aereo", tipo: "importacion", activa: true },
  EA: { modalidad: "aereo", tipo: "exportacion", activa: true },
  IH: { modalidad: "aereo", tipo: "importacion_handcarry", activa: true },
  EH: { modalidad: "aereo", tipo: "exportacion_handcarry", activa: true },
  DH: { modalidad: "aereo", tipo: "domestico_handcarry", activa: true },
  DA: { modalidad: "aereo", tipo: "domestico", activa: true },
  IC: { modalidad: "aereo", tipo: "importacion_charter", activa: true },
  EC: { modalidad: "aereo", tipo: "exportacion_charter", activa: true },
  DC: { modalidad: "aereo", tipo: "domestico_charter", activa: true },
  AA: { modalidad: "aereo", tipo: "arrastre", activa: true },
  EM: { modalidad: "maritimo", tipo: "exportacion", activa: true },
  IM: { modalidad: "maritimo", tipo: "importacion", activa: true },
  AM: { modalidad: "maritimo", tipo: "arrastre", activa: true },
  DT: { modalidad: "terrestre", tipo: "domestico", activa: true },
  ET: { modalidad: "terrestre", tipo: "exportacion", activa: true },
  IT: { modalidad: "terrestre", tipo: "importacion", activa: true },
  WH: { modalidad: "warehouse", tipo: "almacenaje", activa: true },
  DPA: { modalidad: "aereo", tipo: "domestico_proyecto", activa: true },
  EPA: { modalidad: "aereo", tipo: "exportacion_proyecto", activa: true },
  IPA: { modalidad: "aereo", tipo: "importacion_proyecto", activa: true },
  APM: { modalidad: "maritimo", tipo: "arrastre_proyecto", activa: true },
  EPM: { modalidad: "maritimo", tipo: "exportacion_proyecto", activa: true },
  IPM: { modalidad: "maritimo", tipo: "importacion_proyecto", activa: true },
  DPT: { modalidad: "terrestre", tipo: "domestico_proyecto", activa: true },
  EPT: { modalidad: "terrestre", tipo: "exportacion_proyecto", activa: true },
  IPT: { modalidad: "terrestre", tipo: "importacion_proyecto", activa: true },
  DM: { modalidad: "maritimo", tipo: "domestico", activa: false },
  DP: { modalidad: "proyecto", tipo: "domestico", activa: false },
  EP: { modalidad: "proyecto", tipo: "exportacion_domestica", activa: false },
  IP: { modalidad: "proyecto", tipo: "importacion_proyecto", activa: false },
};

const clean = (value) => String(value || "").trim().replace(/\s+/g, " ");
const normalize = (value) =>
  clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const shipmentRefsFrom = (...values) =>
  [...new Set(values.map(clean).join(" ").match(SHIPMENT_RE) || [])].map((ref) => ref.toUpperCase());

const shipmentProfile = (ref) => {
  const prefix = clean(ref).match(/^([A-Z]{2,3})-/i)?.[1]?.toUpperCase() || "";
  return { prefix, ...(shipmentCatalog[prefix] || { modalidad: "incierto", tipo: "por_validar", activa: true }) };
};

const readJson = (file, fallback) => {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const flattenReferenciaMap = (referencias) => {
  const out = {};
  if (!Array.isArray(referencias)) return out;
  for (const entry of referencias) {
    if (!entry || typeof entry !== "object") continue;
    if (entry.id || entry.referencia || entry.int_ref) {
      const id = clean(entry.id || entry.referencia || entry.int_ref);
      if (id) out[id] = entry;
      continue;
    }
    for (const [id, value] of Object.entries(entry)) {
      if (value && typeof value === "object") out[id] = value;
    }
  }
  return out;
};

const sheetNameFromRange = (range) => clean(range).split("!")[0].replace(/^'|'$/g, "");

const monthCodeFrom = (tab, reference, dateText) => {
  const refMatch = clean(reference).match(/\bINT(\d{2})-\d{4}-\d{3,4}\b/i);
  if (refMatch) return refMatch[1];
  const dateMatch = clean(dateText).match(/\b(\d{2})[-/]\d{2}[-/]\d{4}\b/);
  if (dateMatch) return dateMatch[1];
  return monthCodes[normalize(tab)] || "";
};

const isoFromSheetDate = (value) => {
  const match = clean(value).match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month}-${day}T00:00:00-06:00`;
};

const statusProfile = (status, user, shipment) => {
  const profile = classifySheetQuoteStatus(status, { hasShipment: Boolean(shipment) });
  if (profile.pendiente_pricing_sheet) {
    return {
      semaforo: "amarillo",
      pelota: `Pricing / ${user || "MULTI"}`,
      accion: "Dar seguimiento a Pricing hasta recibir tarifa.",
      ...profile,
    };
  }
  if (profile.estado_cotizacion === "no_cotizada") {
    return {
      semaforo: "verde",
      pelota: `Sin pelota visible / no cotizada`,
      accion: "No contar como pendiente; conservar solo como antecedente si hace falta.",
      ...profile,
    };
  }
  if (profile.cotizada_sheet) {
    return {
      semaforo: "verde",
      pelota: `cliente/agente externo / ${user || "MULTI"} monitoreo`,
      accion: "Cotizacion ya enviada/registrada; monitorear respuesta del cliente o cierre.",
      ...profile,
    };
  }
  if (profile.cerrada_sheet) {
    return {
      semaforo: shipment ? "verde" : "amarillo",
      pelota: shipment ? "Sin pelota visible / cierre registrado" : `${user || "MULTI"} / validar cierre`,
      accion: shipment ? "Mantener como cierre con numero de embarque visible." : "Validar cierre porque no hay no de embarque visible.",
      ...profile,
    };
  }
  return {
    semaforo: "amarillo",
    pelota: `${user || "MULTI"} / validar estatus`,
    accion: "Validar estatus porque la fila no trae un estado operativo claro.",
    ...profile,
  };
};

const snapshot = readJson(inputPath, null);
if (!snapshot || !Array.isArray(snapshot.values) || !snapshot.values.length) {
  throw new Error(`No se encontro una foto valida del Sheet en ${inputPath}`);
}

const memory = readJson(memoryPath, {
  version: 1,
  descripcion: "Memoria V2 para medir tiempos de respuesta, seguimiento de cotizaciones y observaciones de calidad. No modifica Outlook ni Google Sheet.",
  timezone,
  referencias: [],
});

const tab = clean(snapshot.sheet_name || sheetNameFromRange(snapshot.range));
const importedAt = new Date().toISOString();
const [headers, ...rows] = snapshot.values;
const headerIndex = Object.fromEntries(headers.map((header, index) => [normalize(header), index]));
const value = (row, key) => clean(row[headerIndex[key]]);
const references = flattenReferenciaMap(memory.referencias);
let importedRows = 0;
let placeholderRows = 0;

rows.forEach((row, index) => {
  const referencia = value(row, "referencia");
  if (!referencia) return;
  const refRowMatch = referencia.match(/\bINT\d{2}-\d{4}-(\d{3,4})\b/i);
  const sheetRow = refRowMatch ? Number(refRowMatch[1]) + 1 : index + 2;

  const dia = value(row, "dia");
  const cliente = value(row, "cliente");
  const network = value(row, "network");
  const servicio = value(row, "servicio");
  const usuario = value(row, "usuario");
  const estatus = value(row, "estatus_solicitud");
  const noEmbarque = value(row, "no_de_embarque");
  const shipmentRefs = shipmentRefsFrom(noEmbarque);
  const shipmentInfo = shipmentProfile(shipmentRefs[0]);
  const feedback = value(row, "feedback");
  const hasRealData = [dia, cliente, network, servicio, usuario, estatus, noEmbarque, feedback].some(Boolean);

  if (!hasRealData) {
    placeholderRows += 1;
    return;
  }

  const profile = statusProfile(estatus, usuario, noEmbarque);
  const existing = references[referencia] || {};
  const existingNotes = clean(existing.notas);
  const shouldRefreshSheetNote = !existingNotes || existingNotes.startsWith("Importado desde Sheet ");
  const sheetDate = isoFromSheetDate(dia);
  const monthCode = monthCodeFrom(tab, referencia, dia);
  const sheetFields = {
    int_ref: referencia,
    referencia_int: referencia,
    int_origin_ref: referencia,
    cliente,
    network,
    servicio,
    usuario_sheet: usuario,
    estatus_sheet: estatus || "Sin estatus en Sheet",
    no_embarque: noEmbarque,
    shipment_refs: shipmentRefs,
    sam_refs: shipmentRefs,
    referencias_sam: shipmentRefs,
    primary_operation_ref: shipmentRefs[0] || "",
    operation_identity: shipmentRefs.length ? "embarque_ligado" : "cotizacion_int",
    int_origin_ref: referencia,
    shipment_prefix: shipmentInfo.prefix || "",
    shipment_modalidad: shipmentInfo.modalidad || "",
    shipment_tipo: shipmentInfo.tipo || "",
    shipment_clasificacion_activa: shipmentRefs.length ? shipmentInfo.activa !== false : false,
    sugerencia_actualizacion_sheet: shipmentRefs.length
      ? ""
      : "Sin numero de embarque en Sheet; si Outlook confirma cierre con embarque, sugerir captura antes de actualizar.",
    feedback,
    semaforo: profile.semaforo,
    estado_cotizacion: profile.estado_cotizacion,
    estado_sheet_canonico: profile.estado_sheet_canonico,
    sheet_status_key: profile.sheet_status_key,
    pendiente_pricing_sheet: profile.pendiente_pricing_sheet,
    cotizada_sheet: profile.cotizada_sheet,
    cerrada_sheet: profile.cerrada_sheet,
    status_rule: profile.status_rule,
    sheet_row: sheetRow,
    sheet_tab: tab,
    sheet_range: snapshot.range || "",
    mes_origen: tab,
    mes_codigo: monthCode,
    periodo_trabajo: "mes_actual",
    es_mes_actual: true,
    es_historico_vivo: false,
    ultima_evidencia_at: existing.ultima_evidencia_at || sheetDate,
    quien_tiene_la_pelota: profile.pelota,
    accion_reporte: profile.accion,
    notas_sheet: `Importado desde Sheet ${tab}, fila ${sheetRow}.`,
    source_sheet_snapshot: {
      imported_at: importedAt,
      range: snapshot.range || "",
      sheet_tab: tab,
      sheet_row: sheetRow,
    },
  };

  references[referencia] = {
    ...existing,
    ...sheetFields,
    notas: shouldRefreshSheetNote ? sheetFields.notas_sheet : existing.notas,
  };
  importedRows += 1;
});

const sortedReferences = Object.fromEntries(Object.entries(references).sort(([a], [b]) => a.localeCompare(b, "es")));
memory.referencias = [sortedReferences];
memory.last_sheet_import = {
  imported_at: importedAt,
  spreadsheet: snapshot.spreadsheet || "COTIZACIONES AGENTES 2026 MLTI",
  sheet_tab: tab,
  range: snapshot.range || "",
  imported_rows: importedRows,
  placeholder_rows: placeholderRows,
};

writeJson(memoryPath, memory);
console.log(`Imported ${importedRows} real rows from ${tab}; ignored ${placeholderRows} placeholders.`);
