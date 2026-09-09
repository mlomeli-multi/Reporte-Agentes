const fs = require("fs");
const path = require("path");
const {
  auditConversationGroup,
  buildConversationKey,
  buildThreadIdentity,
  classifyRecordKind,
  dedupeConversations,
  inferChainAction,
  referenceKeys,
  selectActionableConversation,
} = require("./lib/conversation-thread-engine");
const {
  classifySheetQuoteStatus,
  executiveQuoteStatus,
  hasClientDoubtEvidence,
  hasPricingReadyEvidence,
  hasQuoteEmailStatus,
  inferQuoteStatusFromItem,
  isRealPricingPending,
  quoteEmailStatusKey,
} = require("./lib/quote-status-engine");
const { cleanHistoryEvents } = require("./lib/history-engine");

const root = path.resolve(__dirname, "..");
const timezone = "America/Mexico_City";

const readJson = (relativePath, fallback) => {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return { ...fallback, parse_error: String(error.message || error) };
  }
};

const actorCatalog = readJson("work/catalogo-actores-v1.json", { version: 1, actor_types: {} });

const normalizeText = (value) => String(value || "").trim();
const textLower = (value) =>
  normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const compact = (value) => normalizeText(value).replace(/\s+/g, " ");
const unique = (values) => [...new Set(values.map(compact).filter(Boolean))];
const uniqueMixed = (values) => {
  const seen = new Set();
  const out = [];
  for (const value of values.filter((entry) => entry !== undefined && entry !== null && entry !== "")) {
    const key = typeof value === "object" ? JSON.stringify(value) : compact(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
};

const firstText = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) {
      const joined = value.map(normalizeText).filter(Boolean).join(" / ");
      if (joined) return joined;
      continue;
    }
    const clean = normalizeText(value);
    if (clean) return clean;
  }
  return "";
};

const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value);
  return [value];
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

const INT_RE = /\bINT\d{2}-\d{4}-\d{3,4}\b/gi;
const SHIPMENT_RE =
  /\b(?:DPA|EPA|IPA|APM|EPM|IPM|DPT|EPT|IPT|AA|EA|IA|IM|EM|AM|DT|ET|IT|WH|DA|DH|EH|IH|EC|IC|DC)-\d{6}-\d{4}\b/gi;
const SAM_RE = SHIPMENT_RE;

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

const shipmentProfile = (ref) => {
  const prefix = normalizeText(ref).match(/^([A-Z]{2,3})-/i)?.[1]?.toUpperCase() || "";
  return { prefix, ...(shipmentCatalog[prefix] || { modalidad: "incierto", tipo: "por_validar", activa: true }) };
};

const monthCatalog = [
  ["01", "Enero"],
  ["02", "Febrero"],
  ["03", "Marzo"],
  ["04", "Abril"],
  ["05", "Mayo"],
  ["06", "Junio"],
  ["07", "Julio"],
  ["08", "Agosto"],
  ["09", "Septiembre"],
  ["10", "Octubre"],
  ["11", "Noviembre"],
  ["12", "Diciembre"],
];

const monthCodeToName = Object.fromEntries(monthCatalog);
const monthNameToCode = Object.fromEntries(monthCatalog.map(([code, name]) => [textLower(name), code]));
let activeMonthCode = null;
let activeMonthName = "";

const inferMonthCode = (...values) => {
  const text = textLower(values.flatMap(asArray).join(" "));
  const intMatch = text.match(/\bint(\d{2})-\d{4}-\d{3,4}\b/);
  if (intMatch && monthCodeToName[intMatch[1]]) return intMatch[1];

  const shipmentMatch = text.match(/\b[a-z]{2,3}-\d{4}(\d{2})-\d{4}\b/);
  if (shipmentMatch && monthCodeToName[shipmentMatch[1]]) return shipmentMatch[1];

  const isoMatch = text.match(/\b\d{4}-(\d{2})-\d{2}\b/);
  if (isoMatch && monthCodeToName[isoMatch[1]]) return isoMatch[1];

  for (const [name, code] of Object.entries(monthNameToCode)) {
    if (text.includes(name)) return code;
  }

  return null;
};

const monthName = (code) => monthCodeToName[code] || "";

const monthContext = (item, source, fallbackId) => {
  const code = inferMonthCode(
    item.mes_origen,
    item.mes,
    item.sheet_tab,
    item.tab,
    item.periodo,
    item.id,
    item.int_ref,
    item.referencia,
    item.asunto,
    item.ultima_evidencia_at,
    item.ultima_revision,
    fallbackId
  );
  const hasActiveMonth = Boolean(activeMonthCode);
  const isCurrent = Boolean(code && hasActiveMonth && code === activeMonthCode);
  const isHistorical = Boolean(code && hasActiveMonth && code !== activeMonthCode);
  const sourceIsMemory = source === "outlook_memoria" || source === "memoria_historica";

  return {
    mes_origen: monthName(code) || "Sin mes claro",
    mes_codigo: code || "",
    es_mes_actual: isCurrent,
    es_historico_vivo: isHistorical || (!code && sourceIsMemory),
    periodo_trabajo: isCurrent ? "mes_actual" : isHistorical || sourceIsMemory ? "historico_vivo" : "sin_mes_claro",
  };
};

const extractRefs = (...values) => {
  const text = values
    .flatMap(asArray)
    .map((value) => {
      if (!value || typeof value !== "object") return normalizeText(value);
      return Object.values(value).flatMap(asArray).join(" ");
    })
    .join(" ");

  return {
    int_refs: unique(text.match(INT_RE) || []).map((ref) => ref.toUpperCase()),
    shipment_refs: unique(text.match(SHIPMENT_RE) || []).map((ref) => ref.toUpperCase()),
    sam_refs: unique(text.match(SAM_RE) || []).map((ref) => ref.toUpperCase()),
  };
};

const shipmentRefsFrom = (...values) => unique(extractRefs(...values).shipment_refs || []);

const primaryOperationRef = (refs, item, fallback) =>
  firstText(
    refs.shipment_refs?.[0],
    item.primary_operation_ref,
    item.no_embarque,
    item.referencia_sam,
    item.sam_ref,
    refs.int_refs?.[0],
    fallback
  );

const primaryId = (item, fallbackPrefix) => {
  const refs = extractRefs(item.id, item.int_ref, item.referencia, item.asunto, item.referencias);
  return firstText(item.id, item.int_ref, refs.int_refs[0], item.referencia, refs.sam_refs[0], `${fallbackPrefix}-sin-ref`);
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isoOrNull = (value) => {
  const date = parseDate(value);
  return date ? date.toISOString() : null;
};

const minutesBetween = (start, end) => {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return null;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
};

const dateValueLike = (value) => {
  const date = parseDate(value);
  return date ? date.getTime() : 0;
};

const severityRank = {
  critico: 0,
  critica: 0,
  rojo: 0,
  alto: 1,
  alta: 1,
  amarillo: 1,
  medio: 2,
  media: 2,
  verde: 3,
  bajo: 4,
  baja: 4,
  sin_dato: 5,
};

const rankSeverity = (value) => severityRank[textLower(value).replace(/\s+/g, "_")] ?? 5;

const normalizedBucketKey = (value, fallback = "sin_dato") =>
  textLower(value || fallback).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || fallback;

const domainFromText = (value) => compact(value).toLowerCase().split("@")[1] || "";

const actorTypeLabels = {
  cnee: "CNEE",
  shipper: "Shipper",
  proveedor: "Proveedor",
  pricing: "Pricing",
  agente: "Agente",
  cliente: "Cliente",
  multi: "MULTI",
  actor_externo: "Actor externo",
};

const actorTypeKnown = (value) => Boolean(actorTypeLabels[normalizedBucketKey(value, "")]);
const actorTypeConfig = (actorType) => actorCatalog.actor_types?.[actorType] || {};
const catalogValues = (actorType, field) => asArray(actorTypeConfig(actorType)[field]).map(textLower).filter(Boolean);
const readableCatalogHit = (value) => normalizeText(value).slice(0, 42);
const matchActorCatalog = (actorType, text, senderDomain) => {
  const haystack = textLower(text);
  const term = catalogValues(actorType, "terms").find((value) => value && haystack.includes(value));
  if (term) {
    return {
      actor_tipo: actorType,
      actor_detection_reason: `catalogo_${actorType}: ${readableCatalogHit(term)}`,
      actor_confidence: "alta",
    };
  }

  const domain = textLower(senderDomain);
  const domainHit = catalogValues(actorType, "domains").find((value) => value && domain.includes(value));
  if (domainHit) {
    return {
      actor_tipo: actorType,
      actor_detection_reason: `dominio_catalogo_${actorType}: ${readableCatalogHit(domainHit)}`,
      actor_confidence: "alta",
    };
  }

  return null;
};

const clientTokenStopwords = new Set([
  "sa",
  "de",
  "cv",
  "sapi",
  "inc",
  "ltd",
  "llc",
  "the",
  "and",
  "mexico",
  "mexicana",
  "international",
  "logistics",
  "freight",
  "services",
  "shipping",
]);
let knownClientTokens = new Set();

const clientTokensFrom = (...values) =>
  textLower(values.flatMap(asArray).join(" "))
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !clientTokenStopwords.has(token));

const hasKnownClientSignal = (...values) => {
  const tokens = clientTokensFrom(...values);
  return tokens.some((token) => knownClientTokens.has(token));
};

const bucketCount = (items, getter, fallback = "sin_dato") =>
  items.reduce((acc, item) => {
    const value = typeof getter === "function" ? getter(item) : item[getter];
    const key = normalizedBucketKey(value, fallback);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const inferSemaforo = (item) => {
  const raw = firstText(item.semaforo, item.criticidad, item.prioridad);
  const lower = textLower(raw);
  if (lower.includes("rojo") || lower.includes("critic")) return "rojo";
  if (lower.includes("amarillo") || lower.includes("alto")) return "amarillo";
  if (lower.includes("verde") || lower.includes("medio")) return "verde";
  if (lower.includes("bajo")) return "verde";
  return raw || "sin_dato";
};

const inferCriticidad = (item) => {
  const raw = firstText(item.criticidad, item.semaforo, item.prioridad);
  const lower = textLower(raw);
  if (lower.includes("rojo") || lower.includes("critic")) return "critico";
  if (lower.includes("amarillo") || lower.includes("alto")) return "alto";
  if (lower.includes("verde") || lower.includes("medio")) return "medio";
  if (lower.includes("bajo")) return "bajo";
  return raw || "sin_dato";
};

const inferModalidad = (item) => {
  const refs = extractRefs(item.referencia, item.id, item.asunto, item.no_embarque, item.shipment_refs, item.referencias_sam, item.referencias);
  const shipmentInfo = shipmentProfile(refs.shipment_refs[0] || refs.sam_refs[0]);
  if (shipmentInfo.modalidad && shipmentInfo.modalidad !== "incierto") return shipmentInfo.modalidad;
  const text = textLower([item.servicio, item.servicio_sheet, item.referencia, item.asunto, refs.shipment_refs.join(" "), refs.sam_refs.join(" ")].join(" "));
  if (/\b(aereo|air|awb|aa-|ea-|ia-)\b/.test(text)) return "aereo";
  if (/\b(maritimo|ocean|fcl|lcl|bl|am-|em-|im-)\b/.test(text)) return "maritimo";
  if (/\b(terrestre|truck|otr|d2d|dt-|et-|it-)\b/.test(text)) return "terrestre";
  if (/\b(warehouse|wh-)\b/.test(text)) return "warehouse";
  if (/\b(proyecto|project|dpa-|epa-|ipa-)\b/.test(text)) return "proyecto";
  return "sin_dato";
};

const inferEstadoOperativo = (item) => {
  const lower = textLower(firstText(item.estado_real, item.estado_operativo, item.estado, item.estatus_sheet, item.asunto, item.notas, item.ultima_evidencia));
  if (!lower) return "incierto";
  if (lower.includes("cerrado") || lower.includes("concluida") || lower.includes("entregada")) return "cerrado";
  if (lower.includes("duda") || lower.includes("aclar")) return "cliente_con_duda";
  if (lower.includes("pricing") || lower.includes("cotizacion")) return "cotizacion_activa";
  if (lower.includes("unidad") || lower.includes("pickup") || lower.includes("recoleccion")) return "pickup_programado";
  if (lower.includes("transito") || lower.includes("ruta") || lower.includes("eta")) return "en_transito";
  if (lower.includes("document")) return "documental";
  if (lower.includes("pre alert") || lower.includes("pre-alert") || lower.includes("prealert")) return "prealerta";
  return "abierto";
};

const inferEstadoCotizacion = (item) => {
  const hasShipment = shipmentRefsFrom(item.no_embarque, item.shipment_refs, item.referencias_sam, item.referencia, item.id).length > 0;
  return inferQuoteStatusFromItem(item, { hasShipment }).estado_cotizacion;
};

const isClosed = (item) => {
  const lower = textLower(firstText(item.estado_real, item.estado_operativo, item.estado, item.estatus_sheet));
  return lower.includes("cerrado") || lower.includes("concluida") || lower.includes("entregada");
};

const isSheetLagging = (item, estadoCotizacion) => {
  const status = textLower(item.estatus_sheet);
  const emailStatus = normalizedBucketKey(firstText(item.estado_correo, item.estado_ejecutivo_correo), "");
  const notes = textLower([item.estado, item.estado_correo, item.accion_reporte, item.accion_sugerida, item.notas].join(" "));
  if (Boolean(item.sheet_desfasado)) return true;
  if (
    status.includes("pendiente") &&
    [
      "pricing_respondio_falta_enviar",
      "pricing_respondio_validar_envio",
      "respuesta_enviada_validar_sheet",
      "cliente_con_duda",
      "esperando_cliente_agente",
      "cotizada_cliente",
      "cotizada_cliente_monitoreo",
    ].includes(emailStatus)
  ) {
    return true;
  }
  if (status.includes("pendiente") && /respondio|compartio|costos|opciones|enviada|cotizada/.test(notes)) return true;
  if (status.includes("cerrado") && item.seguir_en_reportes_diarios === true) return true;
  const sheetStatusIsExplicit =
    status.includes("pendiente") ||
    status.includes("cotizado") ||
    status.includes("cerrado") ||
    status.includes("cancel") ||
    status.includes("no cotiz");
  if (sheetStatusIsExplicit) return false;
  return status.includes("pendiente") && estadoCotizacion === "pricing_respondio_falta_enviar";
};

const inferEtapaComercial = (item, estadoCotizacion, sheetDesfasado) => {
  const estado = normalizedBucketKey(estadoCotizacion, "");
  const decision = normalizedBucketKey(item.decision_ejecutiva, "");
  if (sheetDesfasado || decision === "revisar_inconsistencia") return "etapa_inconsistencia";
  if (estado === "pendiente_pricing") return "etapa_pricing";
  if (estado === "pricing_respondio_falta_enviar" || estado === "cliente_con_duda") return "etapa_multi";
  if (estado === "cotizada" || estado === "enviada_cliente") return "etapa_cliente";
  if (estado === "aceptada_pasa_operacion" || estado === "cliente_acepto") return "etapa_sam";
  return "etapa_monitoreo";
};

const daysSince = (value) => {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 86_400_000));
};

const evidenceText = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) return value.map(evidenceText).filter(Boolean).join(" / ");
  if (typeof value === "object") {
    return firstText(value.resumen, value.summary, value.detalle, value.texto, value.asunto, value.link);
  }
  return normalizeText(value);
};

const canonicalSource = (source) => {
  if (source === "sheet") return "google_sheet";
  if (source === "outlook_memoria") return "outlook";
  if (source === "memoria_historica") return "memoria_local";
  return source || "memoria_local";
};

const sourceEvidence = (item, fuente, tipo) => ({
  fuente: canonicalSource(fuente),
  tipo,
  link: firstText(item.link_correo, item.link, item.url),
  resumen: firstText(
    evidenceText(item.evidencia),
    evidenceText(item.ultima_evidencia),
    item.razon_del_pendiente,
    item.notas,
    item.notas_calibracion
  ),
});

const operationAction = (item, shipmentRefs, intRef, fallbackAction) => {
  const action = firstText(fallbackAction);
  const chain = firstText(item.cadena_correo, item.asunto, item.cliente_actor, item.cliente);
  const actorType = firstText(item.actor_tipo);
  if (shipmentRefs.length && intRef && !actorType) {
    return chain
      ? `Validar cadena especifica (${chain}) y confirmar ultimo hito/pelota antes de actuar; no tomar decision solo por ${intRef}.`
      : `Validar cadena especifica y confirmar ultimo hito/pelota antes de actuar; no tomar decision solo por ${intRef}.`;
  }
  return action || "Revisar cadena especifica y definir siguiente hito con evidencia.";
};

const hoursSince = (value) => {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 36_000) / 100);
};

const inferFreshness = (item) => {
  const hours = hoursSince(item.ultimo_movimiento_at || item.ultima_evidencia_at);
  if (hours == null) return "sin_fecha";
  const severity = rankSeverity(item.criticidad || item.semaforo);
  if (severity === 0 && hours > 4) return "rojo";
  if (severity <= 1 && hours > 12) return "rojo";
  if (hours > 24) return "rojo";
  if (severity === 0 && hours > 2) return "amarillo";
  if (severity <= 1 && hours > 6) return "amarillo";
  return "verde";
};

const decisionOrder = {
  atender_ahora: 0,
  revisar_inconsistencia: 1,
  seguimiento_hoy: 2,
  actualizar_sheet: 3,
  esperar_respuesta: 4,
  puede_esperar: 5,
  incierto: 6,
};

const decisionRank = (value) => decisionOrder[normalizedBucketKey(value, "incierto")] ?? decisionOrder.incierto;

const itemText = (item) =>
  textLower(
    [
      item.id,
      item.asunto,
      item.subject,
      item.int_ref,
      item.referencia_int,
      item.primary_operation_ref,
      item.no_embarque,
      item.shipment_refs,
      item.sam_refs,
      item.referencias_sam,
      item.cliente,
      item.cliente_actor,
      item.actor_principal,
      item.actor_tipo,
      item.sender_email,
      item.sender_domain,
      item.servicio,
      item.modalidad,
      item.estado_operativo,
      item.estado_cotizacion,
      item.proceso_actual,
      item.estatus_sheet,
      item.criticidad,
      item.semaforo,
      item.pelota,
      item.quien_tiene_la_pelota,
      item.responsable_multi,
      item.usuario_sheet,
      item.responsable_probable,
      item.accion_sugerida,
      item.accion_siguiente,
      item.ultima_evidencia,
      item.ultimo_movimiento,
      item.cadena_correo,
      item.carpeta,
      item.notas,
    ].join(" ")
  );

const actorNameFromItem = (item) =>
  firstText(
    item.actor_principal,
    item.cliente_actor,
    item.cliente,
    typeof item.sender === "string" ? item.sender : "",
    item.sender?.emailAddress?.name,
    item.sender?.name,
    typeof item.from === "string" ? item.from : "",
    item.from?.emailAddress?.name,
    item.from?.name
  );

const senderEmailFromItem = (item) => {
  const direct = firstText(
    item.sender_email,
    item.from_email,
    item.email,
    item.sender?.emailAddress?.address,
    item.sender?.address,
    item.from?.emailAddress?.address,
    item.from?.address,
    typeof item.sender === "string" ? item.sender : "",
    typeof item.from === "string" ? item.from : ""
  );
  return compact(direct.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || direct).toLowerCase();
};

const actorSignalText = (item) =>
  textLower(
    [
      item.asunto,
      item.subject,
      item.cadena_correo,
      item.carpeta,
      item.folder,
      item.folder_path,
      item.actor_principal,
      item.cliente_actor,
      item.cliente,
      item.sender_email,
      item.sender_domain,
      item.source_outlook_snapshot?.folder_path,
      item.ultimo_movimiento_resumen,
      item.razon_del_pendiente,
      item.ultima_evidencia,
      item.estado_correo,
      item.estado_ejecutivo_correo,
      item.estatus_sheet,
    ].join(" ")
  );

const inferActorProfileFromItem = (item) => {
  const existing = normalizedBucketKey(item.actor_tipo, "");
  const actorName = actorNameFromItem(item);
  const senderEmail = senderEmailFromItem(item);
  const senderDomain = firstText(item.sender_domain, domainFromText(senderEmail));
  const text = actorSignalText(item);
  const sender = textLower([actorName, senderEmail, senderDomain].join(" "));
  const subjectFolder = textLower([item.asunto, item.subject, item.cadena_correo, item.carpeta, item.folder, item.folder_path].join(" "));
  const allActorSignals = `${subjectFolder} ${sender} ${text}`;

  const knownCnee = matchActorCatalog("cnee", subjectFolder, senderDomain);
  if (knownCnee || /cnee|consignee/.test(subjectFolder)) {
    const match = knownCnee || { actor_tipo: "cnee", actor_detection_reason: "keyword_cnee_en_asunto_o_carpeta", actor_confidence: "alta" };
    return { ...match, actor_principal: firstText(actorName, "CNEE"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  const knownShipper = matchActorCatalog("shipper", subjectFolder, senderDomain);
  if (knownShipper || /shipper|pickup|recoleccion/.test(subjectFolder)) {
    const match = knownShipper || { actor_tipo: "shipper", actor_detection_reason: "keyword_shipper_pickup_en_asunto_o_carpeta", actor_confidence: "alta" };
    return { ...match, actor_principal: firstText(actorName, "Shipper"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  const knownPricing = matchActorCatalog("pricing", subjectFolder, senderDomain);
  if (knownPricing || /pricing|cotiz|tarifa|rate|rates/.test(subjectFolder)) {
    const match = knownPricing || { actor_tipo: "pricing", actor_detection_reason: "keyword_pricing_tarifa_en_asunto_o_carpeta", actor_confidence: "alta" };
    return { ...match, actor_principal: firstText(actorName, "Pricing"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  const knownAgent = matchActorCatalog("agente", allActorSignals, senderDomain);
  if (knownAgent || /quick|time matters|time_matters|versant|world cargo|world_cargo|priority freight|priority_freight/.test(text)) {
    const match = knownAgent || { actor_tipo: "agente", actor_detection_reason: "agente_conocido_en_cadena", actor_confidence: "alta" };
    return { ...match, actor_principal: firstText(actorName, "Agente"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  const knownProvider = matchActorCatalog("proveedor", allActorSignals, senderDomain);
  if (knownProvider || /proveedor|carrier|transportista|trucker|trucking|naviera|aerolinea|airline|terminal|warehouse|almacen/.test(`${subjectFolder} ${textLower(actorName)}`)) {
    const match = knownProvider || { actor_tipo: "proveedor", actor_detection_reason: "keyword_proveedor_en_asunto_o_carpeta", actor_confidence: "media" };
    return { ...match, actor_principal: firstText(actorName, "Proveedor"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  const knownMulti = matchActorCatalog("multi", sender, senderDomain);
  if (knownMulti || /mlti|multilogistics|multi logistics|multi_logistics|miguel|brenda|rodrigo|luz|joss|joselyn|erika|salma|uriel|carolina|susana|andrea/.test(sender)) {
    const match = knownMulti || { actor_tipo: "multi", actor_detection_reason: "remitente_multi", actor_confidence: "alta" };
    return { ...match, actor_principal: firstText(actorName, "MULTI"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  if (/agente|agent|forwarder|freight|shipping/.test(text)) {
    return { actor_tipo: "agente", actor_principal: firstText(actorName, "Agente"), sender_email: senderEmail, sender_domain: senderDomain, actor_detection_reason: "keyword_agente_en_cadena", actor_confidence: "media" };
  }
  const knownClient = matchActorCatalog("cliente", allActorSignals, senderDomain);
  if (knownClient || hasKnownClientSignal(subjectFolder, actorName)) {
    const match = knownClient || { actor_tipo: "cliente", actor_detection_reason: "cliente_conocido_en_sheet_o_memoria", actor_confidence: "media" };
    return { ...match, actor_principal: firstText(actorName, "Cliente"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  if (actorTypeKnown(existing) && existing !== "actor_externo") {
    return { actor_tipo: existing, actor_principal: actorName, sender_email: senderEmail, sender_domain: senderDomain, actor_detection_reason: "actor_importado_en_memoria", actor_confidence: firstText(item.actor_confidence, item.confianza_actor, "media") };
  }
  if (senderEmail || senderDomain) {
    return { actor_tipo: "cliente", actor_principal: firstText(actorName, senderEmail, "Cliente"), sender_email: senderEmail, sender_domain: senderDomain, actor_detection_reason: "dominio_externo", actor_confidence: "media" };
  }
  return { actor_tipo: "actor_externo", actor_principal: firstText(actorName, "Actor no identificado"), sender_email: senderEmail, sender_domain: senderDomain, actor_detection_reason: "sin_senal_suficiente", actor_confidence: "baja" };
};

const hasShipment = (item) => Boolean(item.shipment_refs?.length || item.sam_refs?.length || item.referencias_sam?.length || item.no_embarque);
const hasSam = hasShipment;

const inferWorkQueue = (item, decision, kind) => {
  const text = itemText(item);
  const estadoCotizacion = normalizedBucketKey(item.estado_cotizacion, "");
  const estadoOperativo = normalizedBucketKey(item.estado_operativo, "");
  if (decision === "revisar_inconsistencia") {
    return "sheet_desfasado";
  }
  if (estadoCotizacion === "pricing_respondio_falta_enviar" || estadoCotizacion === "cliente_con_duda") return "pelota_multi";
  if (estadoCotizacion === "pendiente_pricing") return "pelota_pricing";
  if (estadoCotizacion === "cotizada" || estadoCotizacion === "enviada_cliente") return "pelota_cliente_agente";
  if (item.sheet_desfasado || item.estado_sincronizacion === "sheet_desfasado") return "sheet_desfasado";
  if (decision === "actualizar_sheet" && (item.int_ref || item.referencia_int || kind === "cotizacion")) {
    return "sin_sam";
  }
  if (
    estadoOperativo === "documental" ||
    /bloqueo documental|falta(?:n)? (?:document|guia|guias|bl|awb|factura|pedimento|ccp|carta|d\/o)|sin (?:document|guia|guias|bl|awb|factura|pedimento|ccp|carta|d\/o)/.test(text)
  ) {
    return "riesgo_documental";
  }
  if (/pricing|tarifa|coti|proveedor|costos/.test(text)) return "pelota_pricing";
  if (/miguel|multi|joss|brenda|rodrigo|luz|salma|uriel|carolina|susana|andrea/.test(text)) return "pelota_multi";
  if (/cliente|customer|agente|shipper|cnee|consignee|carrier|forwarder/.test(text)) return "pelota_cliente_agente";
  if (!hasSam(item) && (item.int_ref || item.referencia_int || kind === "cotizacion")) return "sin_sam";
  if (item.frescura === "rojo") return "urgencias_viejas";
  return "monitoreo";
};

const inferExecutiveDecision = (item, kind) => {
  const text = itemText(item);
  const severity = rankSeverity(item.criticidad || item.semaforo);
  const estadoCotizacion = normalizedBucketKey(item.estado_cotizacion, "");
  const estadoOperativo = normalizedBucketKey(item.estado_operativo, "");
  const freshness = normalizedBucketKey(item.frescura, "");

  if (text.includes("sheet_cerrado_pero_operacion_viva")) return "revisar_inconsistencia";

  if (kind === "cotizacion") {
    if (estadoCotizacion === "pricing_respondio_falta_enviar" || estadoCotizacion === "cliente_con_duda") return "atender_ahora";
    if (item.sheet_desfasado) return "revisar_inconsistencia";
    if (estadoCotizacion === "por_validar") return "revisar_inconsistencia";
    if (estadoCotizacion === "pendiente_pricing") return "seguimiento_hoy";
    if (estadoCotizacion === "aceptada_pasa_operacion" && !hasSam(item)) return "actualizar_sheet";
    if (estadoCotizacion === "cotizada" || estadoCotizacion === "enviada_cliente") return "esperar_respuesta";
    if ((severity === 0 || freshness === "rojo") && item.periodo_trabajo === "mes_actual") return "seguimiento_hoy";
    return estadoCotizacion === "activa_incierta" ? "seguimiento_hoy" : "puede_esperar";
  }

  if (item.sheet_desfasado) return "revisar_inconsistencia";
  if (estadoOperativo === "cliente_con_duda" || estadoOperativo === "documental" || /duda|aclar|bloqueo|urgente|critical/.test(text)) {
    return "atender_ahora";
  }
  if (severity === 0) return "atender_ahora";
  if (severity === 1 || freshness === "rojo") return "seguimiento_hoy";
  if (!hasSam(item) && (item.int_ref || item.referencia_int)) return "actualizar_sheet";
  if (/pricing|cotizacion|tarifa/.test(text)) return "seguimiento_hoy";
  if (/cliente|customer|agente|shipper|cnee|consignee/.test(text)) return "esperar_respuesta";
  return "puede_esperar";
};

const decisionReason = (item, decision, queue, kind) => {
  const severity = item.criticidad || item.semaforo || "sin dato";
  const estado = item.estado_cotizacion || item.estado_operativo || item.proceso_actual || "sin estado claro";
  const pelota = firstText(item.pelota, item.quien_tiene_la_pelota, item.responsable_multi, item.usuario_sheet, "actor incierto");

  if (decision === "atender_ahora") return `Requiere accion inmediata: ${estado}; pelota visible en ${pelota}.`;
  if (decision === "revisar_inconsistencia") return "Hay desfase entre fuentes o estado dudoso; conviene validar antes de decidir.";
  if (decision === "seguimiento_hoy") return `Seguimiento necesario hoy por criticidad ${severity} o antiguedad de la evidencia.`;
  if (decision === "actualizar_sheet") return queue === "sin_sam" ? "Falta ligar o confirmar SAM para cerrar trazabilidad." : "La informacion operativa necesita quedar alineada en el Sheet.";
  if (decision === "esperar_respuesta") return `La pelota parece estar fuera de MULTI: esperar respuesta de ${pelota} y monitorear.`;
  if (kind === "cotizacion") return `Cotizacion viva sin bloqueo inmediato; mantener monitoreo por estado ${estado}.`;
  return `Referencia viva sin bloqueo inmediato; mantener monitoreo por estado ${estado}.`;
};

const classifyExecutiveLane = (item, kind) => {
  const estadoCotizacion = normalizedBucketKey(item.estado_cotizacion, "");
  const decision = normalizedBucketKey(item.decision_ejecutiva, "");
  const recent = typeof item.antiguedad_horas === "number" && item.antiguedad_horas <= 36;
  const current = item.periodo_trabajo === "mes_actual";

  if (kind === "cotizacion") {
    if (["cerrada_con_sam", "cerrada_sin_sam", "cancelada", "no_cotizada"].includes(estadoCotizacion)) return "cerrado";
    if (estadoCotizacion === "pendiente_pricing" || estadoCotizacion === "cliente_con_duda" || estadoCotizacion === "pricing_respondio_falta_enviar") {
      return current || recent ? "prioridad_hoy" : "backlog_historico";
    }
    if (estadoCotizacion === "por_validar" || decision === "revisar_inconsistencia") return current ? "por_validar" : "backlog_historico";
    if (estadoCotizacion === "cotizada" || estadoCotizacion === "enviada_cliente") return current ? "monitoreo_cliente" : "backlog_historico";
    return current ? "monitoreo" : "backlog_historico";
  }

  if (item.periodo_trabajo === "historico_vivo" && !recent) return "backlog_historico";
  if (decision === "atender_ahora" || decision === "revisar_inconsistencia") return current || recent ? "prioridad_hoy" : "backlog_historico";
  if (decision === "seguimiento_hoy") return current || recent ? "seguimiento_hoy" : "backlog_historico";
  return current ? "monitoreo" : "backlog_historico";
};

const applyExecutiveDecision = (item, kind) => {
  item.decision_ejecutiva = inferExecutiveDecision(item, kind);
  item.cola_trabajo = inferWorkQueue(item, item.decision_ejecutiva, kind);
  item.nivel_decision = decisionRank(item.decision_ejecutiva);
  item.motivo_prioridad = decisionReason(item, item.decision_ejecutiva, item.cola_trabajo, kind);
  item.bandeja_ejecutiva = classifyExecutiveLane(item, kind);
  item.es_prioridad_reporte = item.bandeja_ejecutiva === "prioridad_hoy";
  return item;
};

const classifyOperationView = (item) => {
  const decision = normalizedBucketKey(item.decision_ejecutiva, "");
  const queue = normalizedBucketKey(item.cola_trabajo, "");
  const lane = normalizedBucketKey(item.bandeja_ejecutiva, "");
  const confidence = normalizedBucketKey(item.confianza, "");
  const recent = typeof item.antiguedad_horas === "number" && item.antiguedad_horas <= 36;
  const current = item.periodo_trabajo === "mes_actual";

  if (confidence === "baja" || decision === "actualizar_sheet" || queue === "sin_sam") return "por_validar";
  if (lane === "prioridad_hoy" || (decision === "atender_ahora" && (current || recent))) return "frente_activo";
  if (lane === "seguimiento_hoy" || (decision === "seguimiento_hoy" && (current || recent))) return "frente_activo";
  if (decision === "esperar_respuesta" || queue === "pelota_cliente_agente") return "espera_externa";
  if (item.periodo_trabajo === "historico_vivo") return "historico_en_radar";
  return "monitoreo_operativo";
};

const operationHealth = (item) => {
  const view = normalizedBucketKey(item.vista_operativa, "");
  const decision = normalizedBucketKey(item.decision_ejecutiva, "");
  const severity = rankSeverity(item.criticidad);

  if (view === "frente_activo" && decision === "atender_ahora") return "viva_accionable";
  if (view === "frente_activo") return "viva_seguimiento";
  if (view === "por_validar") return "trazabilidad_incompleta";
  if (view === "espera_externa") return "esperando_tercero";
  if (view === "historico_en_radar" && severity <= 1) return "historico_revisar";
  if (view === "historico_en_radar") return "historico_contexto";
  return "monitoreo_sano";
};

const operationViewReason = (item) => {
  const view = normalizedBucketKey(item.vista_operativa, "");
  if (view === "frente_activo") return "Tiene movimiento reciente o decision ejecutiva accionable para hoy.";
  if (view === "por_validar") return "Falta evidencia, SAM o alineacion suficiente para decidir con confianza.";
  if (view === "espera_externa") return "La pelota visible esta fuera de MULTI; conviene monitorear sin inflar urgencias.";
  if (view === "historico_en_radar") return "Sigue en memoria viva, pero no debe competir con el frente operativo actual.";
  return "Referencia abierta sin bloqueo inmediato visible.";
};

const applyOperationTmsFields = (item) => {
  item.vista_operativa = classifyOperationView(item);
  item.estado_tms_operacion = operationHealth(item);
  item.razon_tms = operationViewReason(item);
  return item;
};

const modalityFromSignal = (value) => {
  const text = textLower(value);
  if (/aereo|air|airport|awb|hawb|mawb|vuelo|nfo|\baa-|\bea-|\bia-|\bdpa-|\bepa-|\bipa-/.test(text)) return "aereo";
  if (/marit|ocean|sea|fcl|lcl|bl|buque|vessel|naviera|\bam-|\bem-|\bim-|\bapm-|\bepm-|\bipm-/.test(text)) return "maritimo";
  if (/terrestre|truck|trucking|unidad|pickup|recoleccion|cita|maniobra|\bdt-|\bet-|\bit-|\bdpt-|\bept-|\bipt-/.test(text)) return "terrestre";
  if (/warehouse|almacen|almacenaje|\bwh-/.test(text)) return "warehouse";
  return "";
};

const pricingTeamFor = (modalidad) =>
  ({
    aereo: "pricing_aereo",
    maritimo: "pricing_maritimo",
    terrestre: "pricing_terrestre",
    warehouse: "pricing_warehouse",
  }[modalidad] || "pricing_general");

const opsTeamFor = (modalidad) =>
  ({
    aereo: "ops_aereo",
    maritimo: "ops_maritimo",
    terrestre: "ops_terrestre",
    warehouse: "ops_warehouse",
  }[modalidad] || "equipo_mi");

const isPricingTeam = (value) => normalizedBucketKey(value, "").startsWith("pricing");
const isMiTeam = (value) => ["equipo_mi", "multi", "ops_aereo", "ops_maritimo", "ops_terrestre", "ops_warehouse", "documental_sam"].includes(normalizedBucketKey(value, ""));

const inferEquipoResponsableProfile = (item = {}, context = {}) => {
  const rawValues = asArray(context.raw_values);
  const text = textLower(
    [
      ...rawValues,
      item.pelota,
      item.quien_tiene_la_pelota,
      item.responsable_multi,
      item.responsable_probable,
      item.usuario_sheet,
      item.usuario_responsable,
      item.servicio,
      item.modalidad,
      item.shipment_modalidad,
      item.shipment_tipo,
      item.shipment_refs,
      item.no_embarque,
      item.cola_trabajo,
      item.decision_ejecutiva,
      item.estado_operativo,
      item.estado_cotizacion,
      item.estado_correo,
      item.etapa_comercial,
      item.accion_sugerida,
      item.accion_siguiente,
      item.ultimo_movimiento_resumen,
      item.ultima_evidencia,
    ].join(" ")
  );
  const queue = normalizedBucketKey(item.cola_trabajo, "");
  const state = normalizedBucketKey(item.estado_cotizacion || item.estado_operativo || item.estado_correo, "");
  const actor = normalizedBucketKey(item.actor_tipo, "");
  const kind = normalizedBucketKey(context.kind || item.tipo_registro || item.record_kind, "");
  const modalidad = normalizedBucketKey(item.shipment_modalidad || item.modalidad || modalityFromSignal(text), "");
  const hasPricingSignal =
    queue === "pelota_pricing" ||
    state === "pendiente_pricing" ||
    /pricing|tarifa|cotiz|rate|costos|costo|charges|proveedor.*costo/.test(text);

  if (kind === "cotizacion" || item.estado_cotizacion || item.estatus_sheet) {
    if (hasPricingSignal && !["pricing_respondio_falta_enviar", "pricing_respondio_validar_envio", "cliente_con_duda", "cotizada", "enviada_cliente"].includes(state)) {
      return {
        responsable_equipo: pricingTeamFor(modalidad),
        responsable_area: "pricing",
        responsable_equipo_reason: "La cotizacion sigue con tarifa/costo pendiente de Pricing o proveedor.",
        responsable_equipo_confidence: modalidad ? "alta" : "media",
      };
    }
    if (queue === "sin_sam" || state === "aceptada_pasa_operacion" || /cliente_acepto|cerrada_sin_sam|cerrada_con_sam/.test(state)) {
      return {
        responsable_equipo: "documental_sam",
        responsable_area: "operacion",
        responsable_equipo_reason: "La cotizacion necesita validar embarque/SAM o pasar a operacion.",
        responsable_equipo_confidence: "alta",
      };
    }
    if (["pricing_respondio_falta_enviar", "pricing_respondio_validar_envio", "cliente_con_duda"].includes(state) || queue === "pelota_multi") {
      return {
        responsable_equipo: "equipo_mi",
        responsable_area: "comercial",
        responsable_equipo_reason: "La cotizacion ya requiere accion interna de MULTI: enviar, aclarar o cerrar seguimiento.",
        responsable_equipo_confidence: "alta",
      };
    }
    if (queue === "pelota_cliente_agente" || /cliente|customer|agente|agent|externo/.test(text)) {
      return {
        responsable_equipo: "externo",
        responsable_area: "externo",
        responsable_equipo_reason: "La cotizacion parece estar esperando respuesta de cliente, agente o externo.",
        responsable_equipo_confidence: "media",
      };
    }
    return {
      responsable_equipo: firstText(item.usuario_sheet, item.usuario_responsable) ? "equipo_mi" : "incierto",
      responsable_area: "comercial",
      responsable_equipo_reason: "Cotizacion viva sin bloqueo de Pricing detectado; cae en seguimiento comercial MULTI.",
      responsable_equipo_confidence: firstText(item.usuario_sheet, item.usuario_responsable) ? "media" : "baja",
    };
  }

  if (queue === "sheet_desfasado" || queue === "sin_sam" || /sam|sheet|google_sheet|documental|pedimento|aduana|customs|liberacion/.test(text)) {
    return {
      responsable_equipo: "documental_sam",
      responsable_area: "operacion",
      responsable_equipo_reason: "Requiere alinear documento, SAM, Sheet o evidencia operativa.",
      responsable_equipo_confidence: /sam|sheet|pedimento|aduana|customs|liberacion/.test(text) ? "alta" : "media",
    };
  }

  if (hasPricingSignal && !["pricing_respondio_falta_enviar", "pricing_respondio_validar_envio", "cliente_con_duda"].includes(state)) {
    return {
      responsable_equipo: pricingTeamFor(modalidad),
      responsable_area: "pricing",
      responsable_equipo_reason: "La pelota o estado indica tarifa/cotizacion pendiente de Pricing o proveedor.",
      responsable_equipo_confidence: modalidad ? "alta" : "media",
    };
  }

  if (queue === "pelota_cliente_agente" || actor === "cliente" || /cliente|customer|agente|agent|shipper|cnee|consignee|externo|carrier|forwarder/.test(text)) {
    return {
      responsable_equipo: "externo",
      responsable_area: "externo",
      responsable_equipo_reason: "La pelota visible esta fuera de MULTI; conviene monitorear sin inflar accion interna.",
      responsable_equipo_confidence: actor || queue ? "media" : "baja",
    };
  }

  if (modalidad) {
    return {
      responsable_equipo: opsTeamFor(modalidad),
      responsable_area: "operacion",
      responsable_equipo_reason: `Operacion clasificada por modalidad ${modalidad}.`,
      responsable_equipo_confidence: "alta",
    };
  }

  if (/miguel|multi|joss|brenda|rodrigo|luz|salma|uriel|carolina|susana|andrea|joselyn|erika/.test(text)) {
    return {
      responsable_equipo: "equipo_mi",
      responsable_area: "multi",
      responsable_equipo_reason: "El responsable visible pertenece a MULTI, pero sin modalidad clara.",
      responsable_equipo_confidence: "media",
    };
  }

  return {
    responsable_equipo: "incierto",
    responsable_area: "incierto",
    responsable_equipo_reason: "No hay senal suficiente para asignar equipo sin revisar la cadena.",
    responsable_equipo_confidence: "baja",
  };
};

const applyResponsibleTeam = (item, context = {}) => {
  const profile = inferEquipoResponsableProfile(item, context);
  item.responsable_equipo = profile.responsable_equipo;
  item.responsable_area = profile.responsable_area;
  item.responsable_equipo_reason = profile.responsable_equipo_reason;
  item.responsable_equipo_confidence = profile.responsable_equipo_confidence;
  return item;
};

const inferEquipoResponsable = (...values) =>
  inferEquipoResponsableProfile({}, { raw_values: values }).responsable_equipo;

const confidenceFor = (item) => {
  const evidence = item.evidencias?.[0]?.resumen || item.ultimo_movimiento || item.ultima_evidencia;
  if (item.ultimo_movimiento_at && evidence && (item.referencia_int || item.int_ref || item.shipment_refs?.length || item.referencias_sam?.length || item.sam_refs?.length)) {
    return "alta";
  }
  if (evidence || item.ultimo_movimiento_at) return "media";
  return "baja";
};

const trustRank = {
  accion_confiable: 0,
  accion_probable: 1,
  validar_antes: 2,
  sin_evidencia_suficiente: 3,
  monitoreo_controlado: 4,
};

const actionTrustProfile = (item, kind = "registro") => {
  const decision = normalizedBucketKey(item.decision_ejecutiva, "");
  const queue = normalizedBucketKey(item.cola_trabajo, "");
  const view = normalizedBucketKey(item.vista_operativa, "");
  const audit = normalizedBucketKey(item.auditoria_cadenas_status, "");
  const lane = normalizedBucketKey(item.cadena_accionable_lane, "");
  const measurement = normalizedBucketKey(item.estado_medicion, "");
  const timeLane = normalizedBucketKey(item.lane_tiempo, "");
  const confidence = normalizedBucketKey(firstText(item.confianza, item.responsable_equipo_confidence), "baja");
  const actionConfidence = normalizedBucketKey(firstText(item.accion_confidence, item.cadena_accionable?.accion_confidence), confidence);
  const actorConfidence = normalizedBucketKey(firstText(item.actor_confidence, item.cadena_accionable?.actor_confidence), "media");
  const evidence = firstText(
    item.ultimo_movimiento_resumen,
    item.ultimo_movimiento,
    item.ultima_evidencia,
    item.lectura_tiempo,
    item.observacion,
    item.evidencia?.resumen,
    item.evidencias?.[0]?.resumen
  );
  const needsValidation =
    item.necesita_validar_cadena === true ||
    queue === "validacion" ||
    decision === "revisar_inconsistencia" ||
    lane === "cadena_por_validar" ||
    ["requiere_validacion", "actores_mixtos_en_alerta", "multiples_alertas"].includes(audit);

  if (kind === "tiempo" && (timeLane === "falta_evidencia" || measurement === "sin_medicion")) {
    return {
      lectura_confianza: "sin_evidencia_suficiente",
      lectura_confianza_rank: trustRank.sin_evidencia_suficiente,
      lectura_confianza_reason: "La medicion no tiene hitos suficientes para evaluar tiempo/calidad con confianza.",
      accion_lista: false,
    };
  }

  if (!evidence && confidence === "baja") {
    return {
      lectura_confianza: "sin_evidencia_suficiente",
      lectura_confianza_rank: trustRank.sin_evidencia_suficiente,
      lectura_confianza_reason: "Falta evidencia resumida o fecha visible; no conviene tratarlo como accion segura.",
      accion_lista: false,
    };
  }

  if (needsValidation || actionConfidence === "baja" || actorConfidence === "baja") {
    return {
      lectura_confianza: "validar_antes",
      lectura_confianza_rank: trustRank.validar_antes,
      lectura_confianza_reason: "Hay cadena, actor o sincronizacion por validar antes de mover la accion.",
      accion_lista: false,
    };
  }

  if (["esperar_respuesta", "puede_esperar"].includes(decision) || ["espera_externa", "monitoreo_operativo"].includes(view)) {
    return {
      lectura_confianza: "monitoreo_controlado",
      lectura_confianza_rank: trustRank.monitoreo_controlado,
      lectura_confianza_reason: "La lectura es suficiente para monitorear, pero la pelota no parece interna.",
      accion_lista: false,
    };
  }

  if (confidence === "alta" && actionConfidence === "alta") {
    return {
      lectura_confianza: "accion_confiable",
      lectura_confianza_rank: trustRank.accion_confiable,
      lectura_confianza_reason: "Hay referencia, evidencia reciente y accion calculada con alta confianza.",
      accion_lista: true,
    };
  }

  return {
    lectura_confianza: "accion_probable",
    lectura_confianza_rank: trustRank.accion_probable,
    lectura_confianza_reason: "La lectura tiene evidencia parcial o confianza media; accion util, pero revisar detalle.",
    accion_lista: true,
  };
};

const applyTrustProfile = (item, kind) => {
  const profile = actionTrustProfile(item, kind);
  item.lectura_confianza = profile.lectura_confianza;
  item.lectura_confianza_rank = profile.lectura_confianza_rank;
  item.lectura_confianza_reason = profile.lectura_confianza_reason;
  item.accion_lista = profile.accion_lista;
  return item;
};

const buildTags = (item, extra = []) =>
  unique([
    ...extra,
    item.estado_operativo,
    item.estado_cotizacion,
    item.operation_identity,
    item.shipment_modalidad,
    item.shipment_tipo,
    item.periodo_trabajo,
    item.mes_origen,
    item.criticidad === "critico" ? "urgente" : "",
    item.sheet_desfasado ? "sheet_desfasado" : "",
    item.referencias_sam?.length || item.sam_refs?.length ? "sam_ligado" : "sam_pendiente",
    item.bandeja_ejecutiva,
    item.vista_operativa,
    item.estado_tms_operacion,
    item.decision_ejecutiva,
    item.cola_trabajo,
    item.fuente_principal,
    item.responsable_equipo,
    item.lectura_confianza,
  ]);

const mergeItem = (target, incoming) => {
  for (const [key, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) {
      const merged = [...(target[key] || []), ...value];
      target[key] = merged.some((entry) => entry && typeof entry === "object") ? uniqueMixed(merged) : unique(merged);
      continue;
    }
    if (typeof value === "boolean") {
      target[key] = Boolean(target[key]) || value;
      continue;
    }
    if (!target[key] && value) target[key] = value;
  }

  const currentDate = parseDate(target.ultimo_movimiento_at || target.ultima_evidencia_at || target.ultima_revision);
  const incomingDate = parseDate(incoming.ultimo_movimiento_at || incoming.ultima_evidencia_at || incoming.ultima_revision);
  if (incomingDate && (!currentDate || incomingDate > currentDate)) {
    target.ultimo_movimiento_at = incoming.ultimo_movimiento_at || incoming.ultima_evidencia_at || incoming.ultima_revision;
    target.ultimo_movimiento = incoming.ultimo_movimiento || incoming.ultima_evidencia || incoming.notas || target.ultimo_movimiento;
  }

  target.evidencias = [...(target.evidencias || []), ...(incoming.evidencias || [])].filter(Boolean).slice(0, 5);
  return target;
};

const normalizeOperacion = (item, source, index) => {
  const refs = extractRefs(
    item.id,
    item.int_ref,
    item.referencia,
    item.no_embarque,
    item.shipment_refs,
    item.referencias,
    item.referencias_sam,
    item.sam,
    item.sam_ref,
    item.asunto
  );
  const shipmentRefs = unique([
    ...refs.shipment_refs,
    ...refs.sam_refs,
    ...asArray(item.shipment_refs),
    item.no_embarque,
    item.primary_operation_ref,
    item.referencia_sam,
    item.sam,
    item.sam_ref,
  ]);
  const shipmentInfo = shipmentProfile(shipmentRefs[0]);
  const intRef = refs.int_refs[0] || (normalizeText(item.id).startsWith("INT") ? normalizeText(item.id).toUpperCase() : "");
  const id = primaryOperationRef({ ...refs, shipment_refs: shipmentRefs }, item, primaryId(item, `OP-${index + 1}`));
  const month = monthContext(item, source, id);
  const samRefs = unique([
    ...shipmentRefs,
    ...asArray(item.referencias_sam),
    item.referencia_sam,
    item.sam,
    item.sam_ref,
  ]);
  const estadoOperativo = inferEstadoOperativo(item);
  const ultimoMovimientoAt = isoOrNull(firstText(item.ultima_evidencia_at, item.ultima_revision, item.updated_at, item.fecha_detectado));
  const cliente = firstText(item.cliente_actor, item.cliente);
  const pelota = firstText(item.quien_tiene_la_pelota, item.responsable_probable, item.usuario_sheet);
  const responsableMulti = firstText(item.responsable_multi, item.usuario_sheet, item.responsable_probable);
  const accion = operationAction(item, shipmentRefs, intRef, firstText(item.accion_siguiente, item.accion_sugerida, item.accion_reporte));
  const ultimoMovimiento = firstText(item.ultima_evidencia, item.evidencia, item.razon_del_pendiente, item.notas, item.asunto);
  const actorProfile = inferActorProfileFromItem(item);
  const stableThreadKey = buildConversationKey(item, actorProfile.actor_tipo, index);
  const evidencias = [sourceEvidence(item, source, source === "sheet" ? "fila" : "correo")];
  if (item.source_outlook_snapshot) {
    evidencias.push({
      fuente: "outlook",
      tipo: "correo",
      link: firstText(item.link_correo, item.link, item.url),
      resumen: firstText(item.ultima_evidencia, item.razon_del_pendiente, item.notas, item.asunto, "Evidencia operativa detectada en Outlook."),
      at: firstText(item.source_outlook_snapshot.received_at, item.ultimo_movimiento_at, item.ultima_evidencia_at),
      folder_path: firstText(item.source_outlook_snapshot.folder_path, item.carpeta),
    });
  }

  const out = {
    id,
    primary_operation_ref: id,
    operation_identity: shipmentRefs.length ? "embarque" : intRef ? "int_provisional" : "cadena_sin_ref",
    int_ref: intRef,
    int_origin_ref: intRef,
    no_embarque: shipmentRefs[0] || firstText(item.no_embarque),
    shipment_refs: shipmentRefs,
    shipment_prefix: shipmentInfo.prefix || "",
    shipment_modalidad: shipmentInfo.modalidad || "",
    shipment_tipo: shipmentInfo.tipo || "",
    shipment_clasificacion_activa: shipmentRefs.length ? shipmentInfo.activa !== false : false,
    sam_refs: samRefs,
    referencias_externas: unique([...(asArray(item.referencias_externas)), ...(refs.int_refs.includes(id) ? [] : refs.int_refs)]),
    cliente,
    cliente_actor: firstText(cliente, actorProfile.actor_principal),
    servicio: firstText(item.servicio, item.servicio_sheet),
    modalidad: inferModalidad(item),
    estado_operativo: estadoOperativo,
    proceso_actual: firstText(item.estado_real, item.estado_operativo, item.estado, item.estatus_sheet, estadoOperativo),
    criticidad: inferCriticidad(item),
    semaforo: inferSemaforo(item),
    pelota,
    quien_tiene_la_pelota: pelota,
    responsable_multi: responsableMulti,
    accion_sugerida: accion,
    accion_siguiente: accion,
    ultimo_movimiento_at: ultimoMovimientoAt,
    ultimo_movimiento_resumen: ultimoMovimiento,
    ultimo_movimiento: ultimoMovimiento,
    carpeta: firstText(item.carpeta),
    actor_tipo: actorProfile.actor_tipo,
    actor_principal: actorProfile.actor_principal,
    actor_detection_reason: actorProfile.actor_detection_reason,
    actor_confidence: actorProfile.actor_confidence,
    sender_email: actorProfile.sender_email,
    sender_domain: actorProfile.sender_domain,
    actor_profile: actorProfile,
    cadena_correo: firstText(item.cadena_correo, item.asunto),
    email_thread_id: firstText(item.email_thread_id),
    thread_key: stableThreadKey,
    fuente_principal: source,
    mes_origen: month.mes_origen,
    mes_codigo: month.mes_codigo,
    es_mes_actual: month.es_mes_actual,
    es_historico_vivo: month.es_historico_vivo,
    periodo_trabajo: month.periodo_trabajo,
    evidencia: evidencias[0],
    evidencias,
    source_sheet_snapshot: item.source_sheet_snapshot || null,
    source_outlook_snapshot: item.source_outlook_snapshot || null,
    seguir_en_reportes_diarios: item.seguir_en_reportes_diarios !== false,
  };
  out.referencia_int = out.int_ref;
  out.referencias_sam = out.sam_refs;
  out.antiguedad_horas = hoursSince(out.ultimo_movimiento_at);
  out.frescura = inferFreshness(out);
  out.confianza = confidenceFor(out);
  applyExecutiveDecision(out, "operacion");
  applyResponsibleTeam(out, { kind: "operacion" });
  applyOperationTmsFields(out);
  applyTrustProfile(out, "operacion");
  out.tags = buildTags(out);
  return out;
};

const normalizeCotizacion = (item, source, index) => {
  const id = primaryId(item, `COT-${index + 1}`);
  const month = monthContext(item, source, id);
  const refs = extractRefs(item.id, item.referencia, item.int_ref, item.no_embarque, item.shipment_refs, item.referencias_sam, item.referencias, item.asunto);
  const shipmentRefs = unique([...refs.shipment_refs, ...refs.sam_refs, ...asArray(item.shipment_refs), item.no_embarque, item.referencia_sam, item.sam_ref, item.sam]);
  const quoteStatusProfile = inferQuoteStatusFromItem(item, { hasShipment: shipmentRefs.length > 0 });
  const estadoCotizacion = quoteStatusProfile.estado_cotizacion;
  const ultimaEvidenciaAt = isoOrNull(firstText(item.ultima_evidencia_at, item.ultima_revision, item.updated_at));
  const shipmentInfo = shipmentProfile(shipmentRefs[0]);
  const samRefs = unique([...shipmentRefs, ...asArray(item.referencias_sam), item.referencia_sam, item.sam_ref, item.sam]);
  const cliente = firstText(item.cliente, item.cliente_actor);
  const usuario = firstText(item.usuario_sheet, item.usuario, item.responsable_multi);
  const pelota = firstText(item.quien_tiene_la_pelota, item.responsable_probable);
  const accion = firstText(item.accion_reporte, item.accion_siguiente, item.accion_sugerida);
  const ultimaEvidencia = firstText(item.ultima_evidencia, item.evidencia, item.notas);
  const estadoCorreo = firstText(item.estado_correo, item.estado_ejecutivo_correo);
  const sheetDesfasado = isSheetLagging(item, estadoCotizacion);
  const evidencias = [sourceEvidence(item, source, source === "sheet" ? "fila" : "registro")];
  if (item.source_outlook_snapshot) {
    evidencias.push({
      fuente: "outlook",
      tipo: "correo",
      link: firstText(item.link_correo, item.link, item.url),
      resumen: firstText(item.ultima_evidencia, item.notas, item.asunto, "Evidencia comercial detectada en Outlook."),
      at: firstText(item.source_outlook_snapshot.received_at, item.ultima_evidencia_at),
      folder_path: firstText(item.source_outlook_snapshot.folder_path, item.carpeta),
    });
  }

  const out = {
    id,
    int_ref: refs.int_refs[0] || (id.startsWith("INT") ? id : ""),
    int_origin_ref: refs.int_refs[0] || (id.startsWith("INT") ? id : ""),
    primary_operation_ref: shipmentRefs[0] || "",
    operation_identity: shipmentRefs.length ? "embarque_ligado" : "cotizacion_int",
    no_embarque: shipmentRefs[0] || firstText(item.no_embarque),
    shipment_refs: shipmentRefs,
    shipment_prefix: shipmentInfo.prefix || "",
    shipment_modalidad: shipmentInfo.modalidad || "",
    shipment_tipo: shipmentInfo.tipo || "",
    shipment_clasificacion_activa: shipmentRefs.length ? shipmentInfo.activa !== false : false,
    sam_refs: samRefs,
    cliente,
    network: firstText(item.network, item.red, item.agente_network),
    servicio: firstText(item.servicio, item.servicio_sheet),
    modalidad: inferModalidad(item),
    usuario_sheet: usuario,
    usuario_responsable: usuario,
    estatus_sheet: firstText(item.estatus_sheet, item.estado),
    estado_sheet_canonico: quoteStatusProfile.estado_sheet_canonico,
    sheet_status_key: quoteStatusProfile.sheet_status_key,
    pendiente_pricing_sheet: quoteStatusProfile.pendiente_pricing_sheet,
    cotizada_sheet: quoteStatusProfile.cotizada_sheet,
    cerrada_sheet: quoteStatusProfile.cerrada_sheet,
    status_rule: quoteStatusProfile.status_rule,
    estado_correo: estadoCorreo,
    estado_ejecutivo_correo: estadoCorreo,
    estado_cotizacion: estadoCotizacion,
    semaforo: inferSemaforo(item),
    pelota,
    quien_tiene_la_pelota: pelota,
    accion_sugerida: accion,
    accion_siguiente: accion,
    solicitud_cliente_at: isoOrNull(item.solicitud_cliente_at),
    primera_respuesta_multi_at: isoOrNull(item.primera_respuesta_multi_at),
    pricing_solicitado_at: isoOrNull(item.pricing_solicitado_at),
    pricing_responde_at: isoOrNull(item.pricing_responde_at),
    tarifa_enviada_cliente_at: isoOrNull(item.tarifa_enviada_cliente_at),
    cliente_responde_at: isoOrNull(item.cliente_responde_at),
    cerrado_at: isoOrNull(item.cerrado_at),
    sheet_row: Number.isFinite(Number(item.sheet_row)) ? Number(item.sheet_row) : null,
    ultima_evidencia_at: ultimaEvidenciaAt,
    ultima_evidencia: ultimaEvidencia,
    sheet_desfasado: sheetDesfasado,
    etapa_comercial: inferEtapaComercial(item, estadoCotizacion, sheetDesfasado),
    antiguedad_dias: daysSince(firstText(item.solicitud_cliente_at, item.ultima_evidencia_at, item.ultima_revision, item.updated_at)),
    fuente_principal: source,
    mes_origen: month.mes_origen,
    mes_codigo: month.mes_codigo,
    es_mes_actual: month.es_mes_actual,
    es_historico_vivo: month.es_historico_vivo,
    periodo_trabajo: month.periodo_trabajo,
    evidencia: evidencias[0],
    evidencias,
    source_sheet_snapshot: item.source_sheet_snapshot || null,
    source_outlook_snapshot: item.source_outlook_snapshot || null,
  };
  out.referencia_int = out.int_ref;
  out.referencias_sam = out.sam_refs;
  out.antiguedad_horas = hoursSince(out.ultima_evidencia_at);
  out.frescura = inferFreshness(out);
  out.estado_sincronizacion = out.sheet_desfasado ? "sheet_desfasado" : out.sam_refs.length ? "sam_ligado" : "sin_sam";
  out.confianza = confidenceFor(out);
  applyExecutiveDecision(out, "cotizacion");
  applyResponsibleTeam(out, { kind: "cotizacion" });
  applyTrustProfile(out, "cotizacion");
  out.tags = buildTags(out, [out.estado_sincronizacion]);
  return out;
};

const finalizeOperacion = (item) => {
  item.int_ref = firstText(item.int_ref, item.referencia_int);
  item.int_origin_ref = firstText(item.int_origin_ref, item.int_ref);
  item.referencia_int = item.int_ref;
  item.shipment_refs = unique([...(item.shipment_refs || []), ...(item.sam_refs || []), ...(item.referencias_sam || []), item.no_embarque]);
  item.sam_refs = unique([...(item.sam_refs || []), ...(item.referencias_sam || []), ...(item.shipment_refs || [])]);
  item.referencias_sam = item.sam_refs;
  item.no_embarque = firstText(item.no_embarque, item.shipment_refs[0]);
  item.primary_operation_ref = firstText(item.primary_operation_ref, item.shipment_refs[0], item.int_ref, item.id);
  item.operation_identity = item.shipment_refs.length ? "embarque" : item.int_ref ? "int_provisional" : "cadena_sin_ref";
  const shipmentInfo = shipmentProfile(item.shipment_refs[0]);
  item.shipment_prefix = firstText(item.shipment_prefix, shipmentInfo.prefix);
  item.shipment_modalidad = firstText(item.shipment_modalidad, shipmentInfo.modalidad);
  item.shipment_tipo = firstText(item.shipment_tipo, shipmentInfo.tipo);
  item.shipment_clasificacion_activa = item.shipment_refs.length ? item.shipment_clasificacion_activa !== false && shipmentInfo.activa !== false : false;
  item.cliente = firstText(item.cliente, item.cliente_actor);
  item.cliente_actor = item.cliente;
  item.pelota = firstText(item.pelota, item.quien_tiene_la_pelota);
  item.quien_tiene_la_pelota = item.pelota;
  item.accion_sugerida = firstText(item.accion_sugerida, item.accion_siguiente);
  item.accion_siguiente = item.accion_sugerida;
  item.ultimo_movimiento_resumen = firstText(item.ultimo_movimiento_resumen, item.ultimo_movimiento);
  item.ultimo_movimiento = item.ultimo_movimiento_resumen;
  const month = monthContext(item, item.fuente_principal, item.id);
  item.mes_origen = firstText(item.mes_origen, month.mes_origen);
  item.mes_codigo = firstText(item.mes_codigo, month.mes_codigo);
  item.es_mes_actual = item.es_mes_actual === true || month.es_mes_actual;
  item.es_historico_vivo = item.es_historico_vivo === true || month.es_historico_vivo;
  item.periodo_trabajo = firstText(item.periodo_trabajo, month.periodo_trabajo);
  item.antiguedad_horas = hoursSince(item.ultimo_movimiento_at);
  item.frescura = inferFreshness(item);
  item.evidencia = item.evidencia || item.evidencias?.[0] || null;
  item.confianza = confidenceFor(item);
  applyExecutiveDecision(item, "operacion");
  applyResponsibleTeam(item, { kind: "operacion" });
  applyOperationTmsFields(item);
  applyTrustProfile(item, "operacion");
  item.tags = buildTags(item);
  return item;
};

const finalizeCotizacion = (item) => {
  item.int_ref = firstText(item.int_ref, item.referencia_int);
  item.int_origin_ref = firstText(item.int_origin_ref, item.int_ref);
  item.referencia_int = item.int_ref;
  item.shipment_refs = unique([...(item.shipment_refs || []), ...(item.sam_refs || []), ...(item.referencias_sam || []), item.no_embarque]);
  item.sam_refs = unique([...(item.sam_refs || []), ...(item.referencias_sam || []), ...(item.shipment_refs || [])]);
  item.referencias_sam = item.sam_refs;
  item.no_embarque = firstText(item.no_embarque, item.shipment_refs[0]);
  item.primary_operation_ref = firstText(item.primary_operation_ref, item.shipment_refs[0]);
  item.operation_identity = item.shipment_refs.length ? "embarque_ligado" : "cotizacion_int";
  const shipmentInfo = shipmentProfile(item.shipment_refs[0]);
  item.shipment_prefix = firstText(item.shipment_prefix, shipmentInfo.prefix);
  item.shipment_modalidad = firstText(item.shipment_modalidad, shipmentInfo.modalidad);
  item.shipment_tipo = firstText(item.shipment_tipo, shipmentInfo.tipo);
  item.shipment_clasificacion_activa = item.shipment_refs.length ? item.shipment_clasificacion_activa !== false && shipmentInfo.activa !== false : false;
  item.usuario_sheet = firstText(item.usuario_sheet, item.usuario_responsable);
  item.usuario_responsable = item.usuario_sheet;
  item.estado_correo = firstText(item.estado_correo, item.estado_ejecutivo_correo);
  item.estado_ejecutivo_correo = item.estado_correo;
  item.pelota = firstText(item.pelota, item.quien_tiene_la_pelota);
  item.quien_tiene_la_pelota = item.pelota;
  item.accion_sugerida = firstText(item.accion_sugerida, item.accion_siguiente);
  item.accion_siguiente = item.accion_sugerida;
  const month = monthContext(item, item.fuente_principal, item.id);
  item.mes_origen = firstText(item.mes_origen, month.mes_origen);
  item.mes_codigo = firstText(item.mes_codigo, month.mes_codigo);
  item.es_mes_actual = item.es_mes_actual === true || month.es_mes_actual;
  item.es_historico_vivo = item.es_historico_vivo === true || month.es_historico_vivo;
  item.periodo_trabajo = firstText(item.periodo_trabajo, month.periodo_trabajo);
  item.antiguedad_horas = hoursSince(item.ultima_evidencia_at);
  item.frescura = inferFreshness(item);
  item.estado_sincronizacion = item.sheet_desfasado ? "sheet_desfasado" : item.sam_refs.length ? "sam_ligado" : "sin_sam";
  item.evidencia = item.evidencia || item.evidencias?.[0] || null;
  item.confianza = confidenceFor(item);
  applyExecutiveDecision(item, "cotizacion");
  item.etapa_comercial = inferEtapaComercial(item, item.estado_cotizacion, item.sheet_desfasado);
  applyResponsibleTeam(item, { kind: "cotizacion" });
  item.antiguedad_dias = item.antiguedad_dias ?? daysSince(firstText(item.solicitud_cliente_at, item.ultima_evidencia_at));
  applyTrustProfile(item, "cotizacion");
  item.tags = buildTags(item, [item.estado_sincronizacion]);
  return item;
};

const responseTeam = (tipo, actorDestino) => {
  const kind = normalizedBucketKey(tipo, "");
  const actor = textLower(actorDestino);
  if (kind === "multi_a_pricing") return "pricing_general";
  if (["cliente_a_multi", "multi_a_cliente", "pricing_a_multi", "cliente_reabre", "ops_update"].includes(kind)) return "equipo_mi";
  if (/pricing|tarifa|coti/.test(actor)) return "pricing_general";
  if (/cliente|customer|agente|shipper|cnee|consignee|externo|carrier|forwarder/.test(actor)) return "externo";
  if (/miguel|multi|joss|brenda|rodrigo|luz|salma|uriel|carolina|susana|andrea|joselyn|erika/.test(actor)) return "equipo_mi";
  return "incierto";
};

const responseKind = (tipo) => {
  const kind = normalizedBucketKey(tipo, "");
  if (kind === "cliente_a_multi") return "primera_respuesta";
  if (kind === "multi_a_pricing") return "pricing";
  if (kind === "multi_a_cliente") return "envio_cliente";
  if (kind === "nota_calidad") return "nota_calidad";
  return "seguimiento";
};

const timeLane = (tipo, estadoMedicion, semaforo, responsableEquipo, finAt) => {
  const kind = normalizedBucketKey(tipo, "");
  const state = normalizedBucketKey(estadoMedicion, "");
  const light = normalizedBucketKey(semaforo, "");
  const team = normalizedBucketKey(responsableEquipo, "");

  if (state === "fuera_objetivo") return "atraso_medido";
  if (state === "abierto_sin_fin" && (kind === "multi_a_pricing" || isPricingTeam(team))) return "pricing_abierto";
  if (state === "abierto_sin_fin") return "respuesta_abierta";
  if (state === "sin_medicion" || state === "sin_objetivo" || light === "gris") return "falta_evidencia";
  if (state === "cerca_objetivo" || light === "amarillo") return "cerca_objetivo";
  if (state === "cumplido" || light === "verde" || finAt) return "dentro_objetivo";
  return "falta_evidencia";
};

const delayOwner = (tipo, lane, responsableEquipo, actorDestino) => {
  const kind = normalizedBucketKey(tipo, "");
  const view = normalizedBucketKey(lane, "");
  const team = normalizedBucketKey(responsableEquipo, "");
  const actor = textLower(actorDestino);
  if (view === "falta_evidencia") return "evidencia";
  if (view === "pricing_abierto" || kind === "multi_a_pricing" || isPricingTeam(team)) return "pricing";
  if (/cliente|customer|agente|shipper|cnee|consignee|externo|carrier|forwarder/.test(actor) || team === "externo") return "externo";
  if (isMiTeam(team) || /miguel|multi|joss|brenda|rodrigo|luz|salma|uriel|carolina|susana|andrea|joselyn|erika/.test(actor)) return "equipo_mi";
  return "incierto";
};

const qualityRisk = (lane, semaforo) => {
  const view = normalizedBucketKey(lane, "");
  const light = normalizedBucketKey(semaforo, "");
  if (view === "atraso_medido" || view === "respuesta_abierta" || light === "rojo") return "requiere_revision";
  if (view === "falta_evidencia" || light === "gris") return "medicion_incompleta";
  if (view === "cerca_objetivo" || light === "amarillo") return "vigilar";
  return "saludable";
};

const timeReading = (tipo, lane, actorDestino, duracion, objetivoMin) => {
  const kind = responseKind(tipo);
  const view = normalizedBucketKey(lane, "");
  const actor = firstText(actorDestino, "actor incierto");
  if (view === "atraso_medido") return `${kind}: excedio objetivo de ${objetivoMin || "N/A"} min; revisar respuesta de ${actor}.`;
  if (view === "pricing_abierto") return `${kind}: Pricing sigue abierto o sin cierre visible.`;
  if (view === "respuesta_abierta") return `${kind}: tramo abierto sin respuesta/cierre visible.`;
  if (view === "falta_evidencia") return `${kind}: falta evidencia suficiente para medir con confianza.`;
  if (view === "cerca_objetivo") return `${kind}: cerca del limite objetivo.`;
  return `${kind}: dentro del objetivo visible (${duracion ?? 0} min).`;
};

const addResponseRows = (rows, quote) => {
  const quoteId = quote.int_ref || quote.referencia_int || quote.id;
  const classifyMeasurement = (duracion, fin, objetivoMin) => {
    if (!objetivoMin) return "sin_objetivo";
    if (duracion == null) return fin ? "sin_medicion" : "abierto_sin_fin";
    if (duracion > objetivoMin) return "fuera_objetivo";
    if (duracion > Math.round(objetivoMin * 0.7)) return "cerca_objetivo";
    return "cumplido";
  };
  const add = (tipo, inicio, fin, actorOrigen, actorDestino, objetivoMin) => {
    const duracion = minutesBetween(inicio, fin);
    if (!inicio && !fin) return;
    const estadoMedicion = classifyMeasurement(duracion, fin, objetivoMin);
    const baseTeam = responseTeam(tipo, actorDestino);
    const responsableProfile = inferEquipoResponsableProfile(
      {
        ...quote,
        pelota: actorDestino,
        responsable_equipo: baseTeam,
        estado_cotizacion: isPricingTeam(baseTeam) ? "pendiente_pricing" : quote.estado_cotizacion,
        cola_trabajo: isPricingTeam(baseTeam) ? "pelota_pricing" : tipo === "multi_a_cliente" ? "pelota_multi" : quote.cola_trabajo,
      },
      { kind: "cotizacion", raw_values: [tipo, actorOrigen, actorDestino, baseTeam] }
    );
    const responsableEquipo = responsableProfile.responsable_equipo;
    const lane = timeLane(tipo, estadoMedicion, duracion == null ? "gris" : duracion > objetivoMin ? "rojo" : duracion > Math.round(objetivoMin * 0.7) ? "amarillo" : "verde", responsableEquipo, fin);
    rows.push({
      id: `${quote.id}-${tipo}`,
      referencia_id: quoteId,
      referencia: quoteId,
      tipo,
      inicio_at: inicio || null,
      fin_at: fin || null,
      duracion_min: duracion,
      objetivo_min: objetivoMin,
      brecha_min: duracion == null || !objetivoMin ? null : duracion - objetivoMin,
      estado_medicion: estadoMedicion,
      semaforo: duracion == null ? "gris" : duracion > objetivoMin ? "rojo" : duracion > Math.round(objetivoMin * 0.7) ? "amarillo" : "verde",
      actor_origen: actorOrigen,
      actor_destino: actorDestino,
      actor_responsable: actorDestino,
      responsable_equipo: responsableEquipo,
      responsable_area: responsableProfile.responsable_area,
      responsable_equipo_reason: responsableProfile.responsable_equipo_reason,
      responsable_equipo_confidence: responsableProfile.responsable_equipo_confidence,
      tipo_respuesta: responseKind(tipo),
      lane_tiempo: lane,
      dueno_atraso: delayOwner(tipo, lane, responsableEquipo, actorDestino),
      riesgo_calidad: qualityRisk(lane, duracion == null ? "gris" : duracion > objetivoMin ? "rojo" : duracion > Math.round(objetivoMin * 0.7) ? "amarillo" : "verde"),
      lectura_tiempo: timeReading(tipo, lane, actorDestino, duracion, objetivoMin),
      mes_origen: quote.mes_origen,
      mes_codigo: quote.mes_codigo,
      periodo_trabajo: quote.periodo_trabajo,
      es_mes_actual: quote.es_mes_actual,
      es_historico_vivo: quote.es_historico_vivo,
      observacion: quote.ultima_evidencia || quote.accion_siguiente || "Sin observacion registrada.",
      evidencia: quote.evidencia || quote.evidencias?.[0] || null,
    });
  };

  add("cliente_a_multi", quote.solicitud_cliente_at, quote.primera_respuesta_multi_at || quote.tarifa_enviada_cliente_at, quote.cliente, quote.usuario_sheet || "MULTI", 120);
  add("multi_a_pricing", quote.pricing_solicitado_at, quote.pricing_responde_at, quote.usuario_sheet || "MULTI", "Pricing", 240);
  add("multi_a_cliente", quote.pricing_responde_at, quote.tarifa_enviada_cliente_at, "Pricing", quote.usuario_sheet || "MULTI", 120);
};

const sortByRiskAndDate = (a, b) => {
  const decision = decisionRank(a.decision_ejecutiva) - decisionRank(b.decision_ejecutiva);
  if (decision !== 0) return decision;
  const severity = rankSeverity(a.criticidad || a.semaforo) - rankSeverity(b.criticidad || b.semaforo);
  if (severity !== 0) return severity;
  return normalizeText(b.ultimo_movimiento_at || b.ultima_evidencia_at).localeCompare(normalizeText(a.ultimo_movimiento_at || a.ultima_evidencia_at));
};

const operationExecutiveKey = (item) =>
  normalizedBucketKey(
    firstText(item.primary_operation_ref, item.no_embarque, item.shipment_refs?.[0], item.sam_refs?.[0], item.int_origin_ref, item.int_ref, item.id),
    "sin_referencia"
  );

const mergeUniqueArrayField = (target, incoming, field) => {
  const merged = [...asArray(target[field]), ...asArray(incoming[field])].filter(Boolean);
  if (!merged.length) return;
  target[field] = merged.some((entry) => entry && typeof entry === "object") ? uniqueMixed(merged) : unique(merged);
};

const mergeExecutiveOperation = (target, incoming) => {
  [
    "shipment_refs",
    "sam_refs",
    "referencias_sam",
    "referencias_externas",
    "evidencias",
    "cadenas_relacionadas",
    "cadenas_actores",
    "tags",
  ].forEach((field) => mergeUniqueArrayField(target, incoming, field));

  target.cadenas_relacionadas_count = Math.max(Number(target.cadenas_relacionadas_count || 0), Number(incoming.cadenas_relacionadas_count || 0));
  target.cadenas_alerta_count = Math.max(Number(target.cadenas_alerta_count || 0), Number(incoming.cadenas_alerta_count || 0));
  target.cadenas_por_validar_count = Math.max(Number(target.cadenas_por_validar_count || 0), Number(incoming.cadenas_por_validar_count || 0));
  target.cadenas_referencia_multiple_count = Math.max(
    Number(target.cadenas_referencia_multiple_count || 0),
    Number(incoming.cadenas_referencia_multiple_count || 0)
  );
  target.necesita_validar_cadena = Boolean(target.necesita_validar_cadena || incoming.necesita_validar_cadena);

  if (!target.no_embarque && incoming.no_embarque) target.no_embarque = incoming.no_embarque;
  if (!target.primary_operation_ref && incoming.primary_operation_ref) target.primary_operation_ref = incoming.primary_operation_ref;
  if (!target.int_ref && incoming.int_ref) target.int_ref = incoming.int_ref;
  if (!target.int_origin_ref && incoming.int_origin_ref) target.int_origin_ref = incoming.int_origin_ref;
  if (!target.evidencia && incoming.evidencia) target.evidencia = incoming.evidencia;
  if (!target.cadena_accionable && incoming.cadena_accionable) target.cadena_accionable = incoming.cadena_accionable;

  return target;
};

const dedupeExecutiveOperations = (rows) => {
  const groups = new Map();
  rows.forEach((row) => {
    const key = operationExecutiveKey(row);
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  });

  return [...groups.values()]
    .map((group) => {
      const [best, ...rest] = [...group].sort(sortByRiskAndDate);
      const merged = { ...best };
      rest.forEach((row) => mergeExecutiveOperation(merged, row));
      merged.duplicados_operacion_ocultos = rest.length;
      if (rest.length) {
        merged.tags = unique([...(merged.tags || []), "operacion_deduplicada"]);
        merged.motivo_prioridad =
          (merged.motivo_prioridad || "Operacion viva.") +
          " Vista ejecutiva consolidada: " +
          (rest.length + 1) +
          " registros locales ligados a la misma operacion.";
      }
      return merged;
    })
    .sort(sortByRiskAndDate);
};

const dedupeExecutiveTimeRows = (rows) => {
  const groups = new Map();
  rows.forEach((row) => {
    const key = normalizedBucketKey(row.id || [row.referencia_id, row.tipo, row.inicio_at].join("|"), "sin_medicion");
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  });

  return [...groups.values()]
    .map((group) => [...group].sort(sortByRiskAndDate)[0])
    .sort(sortByRiskAndDate);
};

const inferHistoryChange = (item, kind) => {
  if (kind === "cotizacion") {
    if (item.sheet_desfasado) return "sheet_desfasado";
    if (item.estado_cotizacion === "cotizada" || item.estado_cotizacion === "enviada_cliente") return "mejoro";
    if (item.estado_cotizacion === "pendiente_pricing") return "sigue_igual";
    if (item.estado_cotizacion === "por_validar" || item.estado_cotizacion === "activa_incierta") return "incierto";
    if (item.estado_cotizacion === "pricing_respondio_falta_enviar") return "cambio_pelota";
    if (item.estado_cotizacion === "cliente_con_duda") return "empeoro";
  }

  const text = textLower(
    [
      item.estado_operativo,
      item.estado_cotizacion,
      item.proceso_actual,
      item.ultimo_movimiento_resumen,
      item.ultima_evidencia,
      item.accion_sugerida,
      item.accion_siguiente,
      item.notas,
    ].join(" ")
  );

  if (item.sheet_desfasado || text.includes("sheet desfasado") || text.includes("sheet_cerrado_pero_operacion_viva")) {
    return "sheet_desfasado";
  }
  if (text.includes("cliente_con_duda") || text.includes("duda") || text.includes("please advise") || text.includes("bloqueo")) {
    return "empeoro";
  }
  if (text.includes("nuevo") || text.includes("detectado por primera vez")) return "nuevo";
  if (
    text.includes("cambio de pelota") ||
    text.includes("regresa a multi") ||
    text.includes("pricing respondio") ||
    text.includes("falta enviar") ||
    text.includes("proveedor")
  ) {
    return "cambio_pelota";
  }
  if (
    text.includes("mejoro") ||
    text.includes("ligada") ||
    text.includes("unidad") ||
    text.includes("llego") ||
    text.includes("confirm") ||
    text.includes("compartio") ||
    text.includes("enviada") ||
    text.includes("ok")
  ) {
    return "mejoro";
  }
  return item.estado_operativo === "incierto" || item.estado_cotizacion === "activa_incierta" ? "incierto" : "sigue_igual";
};

const historyRisk = (change, item) => {
  const key = normalizedBucketKey(change, "");
  if (["empeoro", "sheet_desfasado", "cliente_con_duda"].includes(key)) return "riesgo_abierto";
  if (["cambio_pelota", "nuevo", "incierto"].includes(key)) return "vigilar";
  if (item?.periodo_trabajo === "historico_vivo" && key === "sigue_igual") return "arrastre_historico";
  if (["mejoro", "parece_cerrado", "cerrado"].includes(key)) return "saludable";
  return "sin_cambio";
};

const historyLane = (item, kind, change) => {
  const key = normalizedBucketKey(change, "");
  if (["empeoro", "sheet_desfasado", "cliente_con_duda"].includes(key)) return "riesgo_abierto";
  if (key === "cambio_pelota") return "cambio_pelota";
  if (key === "nuevo") return "movimiento_nuevo";
  if (["mejoro", "parece_cerrado", "cerrado"].includes(key)) return "mejora_cierre";
  if (item?.periodo_trabajo === "historico_vivo") return "arrastre_historico";
  if (key === "incierto") return "por_validar";
  return "sin_cambio";
};

const historyReading = (item, kind, change, lane) => {
  const ref = firstText(item.int_ref, item.referencia_int, item.id, "Referencia sin ID");
  const actor = firstText(item.pelota, item.usuario_sheet, item.responsable_multi, "actor incierto");
  const state = firstText(item.estado_cotizacion, item.estado_operativo, item.decision_ejecutiva, "estado incierto");
  const source = kind === "cotizacion" ? "cotizacion" : "operacion";
  if (lane === "riesgo_abierto") return `${ref}: ${source} con riesgo visible (${state}); validar pelota en ${actor}.`;
  if (lane === "cambio_pelota") return `${ref}: cambio de pelota o respuesta recibida; siguiente accion depende de ${actor}.`;
  if (lane === "movimiento_nuevo") return `${ref}: movimiento nuevo detectado; revisar si entra al frente activo.`;
  if (lane === "mejora_cierre") return `${ref}: mejora o avance visible; mantener monitoreo hasta cierre claro.`;
  if (lane === "arrastre_historico") return `${ref}: sigue vivo desde mes anterior; conservar en radar sin inflar prioridad del dia.`;
  if (lane === "por_validar") return `${ref}: evidencia insuficiente o inconsistente; validar antes de decidir.`;
  return `${ref}: sin cambio operativo relevante; mantener como contexto.`;
};

const state = readJson("work/reporte-automation-state.json", {});
const pendientesRaw = readJson("work/outlook-pendientes-abiertos.json", {});
const cotizacionesRaw = readJson("work/cotizaciones-seguimiento-metricas.json", {});
const historicaRaw = readJson("work/memoria-historica-referencias.json", {});

activeMonthCode =
  inferMonthCode(state.last_sheet_scan?.tab, state.last_sheet_scan?.range, state.last_successful_report) ||
  inferMonthCode(new Date().toISOString());
activeMonthName = monthName(activeMonthCode) || "Mes actual";

const pendientes = [
  ...(Array.isArray(pendientesRaw.pendientes_abiertos) ? pendientesRaw.pendientes_abiertos : []),
  ...(Array.isArray(pendientesRaw.pendientes) ? pendientesRaw.pendientes : []),
].filter((item) => item?.seguir_en_reportes_diarios !== false && !isClosed(item));

const cotizacionesAllRawItems = flattenReferenciaMap(cotizacionesRaw.referencias);
const sheetQuoteStatusProfileFor = (item) =>
  classifySheetQuoteStatus(item.estatus_sheet || item.estado, {
    hasShipment: shipmentRefsFrom(item.no_embarque, item.shipment_refs, item.referencias_sam, item.referencia, item.id).length > 0,
  });
const cotizacionesAllSheetProfiles = cotizacionesAllRawItems.map((item) => ({
  item,
  profile: sheetQuoteStatusProfileFor(item),
}));
const quoteIdFor = (item, index = 0) => {
  const id = primaryId(item, `COT-${index + 1}`);
  const refs = extractRefs(item.id, item.referencia, item.int_ref, item.referencias_sam, item.referencias, item.asunto);
  return refs.int_refs[0] || (id.startsWith("INT") ? id : id);
};
const closedBySheetQuoteRefs = new Set(
  cotizacionesAllRawItems
    .filter((item) => ["cerrada_con_sam", "cerrada_sin_sam", "cancelada", "no_cotizada"].includes(inferEstadoCotizacion(item)))
    .map(quoteIdFor)
    .filter(Boolean)
);
const cotizacionesRawItems = cotizacionesAllRawItems.filter(
  (item) => !closedBySheetQuoteRefs.has(quoteIdFor(item)) && !isClosed(item)
);
const historicasRawItems = [
  ...Object.entries(historicaRaw.watchlist || {}).map(([id, value]) => ({ id, ...value })),
  ...(Array.isArray(historicaRaw.referencias) ? historicaRaw.referencias : []),
].filter((item) => item.seguir_en_reportes_diarios !== false && !isClosed(item));

knownClientTokens = new Set(
  [
    ...catalogValues("cliente", "terms").flatMap((term) => clientTokensFrom(term)),
    ...cotizacionesAllRawItems.flatMap((item) => clientTokensFrom(item.cliente)),
    ...pendientes.flatMap((item) => clientTokensFrom(item.cliente, item.cliente_actor)),
    ...historicasRawItems.flatMap((item) => clientTokensFrom(item.cliente, item.cliente_actor)),
  ].filter(Boolean)
);

const operacionMap = new Map();
[
  ...pendientes.map((item, index) => normalizeOperacion(item, "outlook_memoria", index)),
  ...historicasRawItems.map((item, index) => normalizeOperacion(item, "memoria_historica", index)),
].forEach((item) => {
  const key = item.thread_key || item.email_thread_id || item.primary_operation_ref || item.referencia_int || item.id;
  operacionMap.set(key, mergeItem(operacionMap.get(key) || {}, item));
});

const cotizacionMap = new Map();
[
  ...cotizacionesRawItems.map((item, index) => normalizeCotizacion(item, "sheet", index)),
  ...historicasRawItems
    .map((item, index) => normalizeCotizacion(item, "memoria_historica", index))
    .filter((item) => !closedBySheetQuoteRefs.has(item.referencia_int || item.id)),
].forEach((item) => {
  const key = item.referencia_int || item.id;
  cotizacionMap.set(key, mergeItem(cotizacionMap.get(key) || {}, item));
});

const operacionesCandidatas = [...operacionMap.values()]
  .map(finalizeOperacion)
  .filter((item) => item.estado_operativo !== "cerrado")
  .map((item) => ({ ...item, record_kind: classifyRecordKind(item) }));

const operacionesExcluidasPorCotizacion = operacionesCandidatas.filter((item) => item.record_kind === "cotizacion");
const operacionesInciertasDescartadas = operacionesCandidatas.filter((item) => item.record_kind === "incierto");

const operacionesBase = operacionesCandidatas
  .filter((item) => item.record_kind === "operacion")
  .sort(sortByRiskAndDate);

const cotizaciones = [...cotizacionMap.values()]
  .map(finalizeCotizacion)
  .filter((item) => !["cerrada_con_sam", "cerrada_sin_sam", "cancelada", "no_cotizada"].includes(item.estado_cotizacion))
  .sort(sortByRiskAndDate)
  .slice(0, 80);

let tiempos = [];
cotizaciones.forEach((quote) => addResponseRows(tiempos, quote));
operacionesBase.slice(0, 20).forEach((op) => {
  if (!op.ultimo_movimiento_at) return;
  const semaforo = op.frescura === "rojo" ? "rojo" : op.semaforo;
  const responsableProfile = inferEquipoResponsableProfile(op, { kind: "operacion" });
  const responsableEquipo = op.responsable_equipo || responsableProfile.responsable_equipo;
  const lane = op.vista_operativa === "frente_activo" && semaforo === "rojo" ? "respuesta_abierta" : "falta_evidencia";
  tiempos.push({
    id: `${op.id}-calidad`,
    referencia_id: op.primary_operation_ref || op.int_ref || op.id,
    referencia: op.primary_operation_ref || op.int_ref || op.id,
    int_origin_ref: op.int_origin_ref || op.int_ref,
    shipment_refs: op.shipment_refs || [],
    tipo: "nota_calidad",
    inicio_at: op.ultimo_movimiento_at,
    fin_at: null,
    duracion_min: null,
    objetivo_min: null,
    brecha_min: null,
    estado_medicion: "sin_objetivo",
    semaforo,
    actor_origen: op.cliente || op.cliente_actor,
    actor_destino: op.pelota,
    actor_responsable: op.pelota,
    responsable_equipo: responsableEquipo,
    responsable_area: op.responsable_area || responsableProfile.responsable_area,
    responsable_equipo_reason: op.responsable_equipo_reason || responsableProfile.responsable_equipo_reason,
    responsable_equipo_confidence: op.responsable_equipo_confidence || responsableProfile.responsable_equipo_confidence,
    tipo_respuesta: "nota_calidad",
    lane_tiempo: lane,
    dueno_atraso: delayOwner("nota_calidad", lane, responsableEquipo, op.pelota),
    riesgo_calidad: qualityRisk(lane, semaforo),
    lectura_tiempo: op.razon_tms || "Nota de calidad operativa sin medicion exacta.",
    mes_origen: op.mes_origen,
    mes_codigo: op.mes_codigo,
    periodo_trabajo: op.periodo_trabajo,
    es_mes_actual: op.es_mes_actual,
    es_historico_vivo: op.es_historico_vivo,
    observacion: op.ultimo_movimiento_resumen || op.accion_sugerida,
    evidencia: op.evidencia || op.evidencias?.[0] || null,
  });
});

const historyRaw = [
  ...operacionesBase.map((item) => {
    const change = inferHistoryChange(item, "operacion");
    const lane = historyLane(item, "operacion", change);
    const at = item.ultimo_movimiento_at;
    return {
      id: `${item.id}-hist`,
      referencia_id: item.primary_operation_ref || item.int_ref || item.id,
      referencia: item.primary_operation_ref || item.int_ref || item.id,
      int_origin_ref: item.int_origin_ref || item.int_ref,
      shipment_refs: item.shipment_refs || [],
      operation_identity: item.operation_identity,
      tipo_registro: "operacion",
      at,
      fecha_at: at,
      antiguedad_dias: daysSince(at),
      fuente: canonicalSource(item.fuente_principal),
      tipo_cambio: change,
      evento: change,
      historial_lane: lane,
      riesgo_memoria: historyRisk(change, item),
      lectura_memoria: historyReading(item, "operacion", change, lane),
      resumen: firstText(item.proceso_actual, item.ultimo_movimiento_resumen),
      cambio: firstText(item.proceso_actual, item.ultimo_movimiento_resumen),
      actor: item.pelota,
      mes_origen: item.mes_origen,
      mes_codigo: item.mes_codigo,
      periodo_trabajo: item.periodo_trabajo,
      despues: {
        estado_operativo: item.estado_operativo,
        criticidad: item.criticidad,
        pelota: item.pelota,
      },
      evidencia: item.evidencia || item.evidencias?.[0] || null,
    };
  }),
  ...cotizaciones.map((item) => {
    const change = inferHistoryChange(item, "cotizacion");
    const lane = historyLane(item, "cotizacion", change);
    const at = item.ultima_evidencia_at;
    return {
      id: `${item.id}-cot-hist`,
      referencia_id: item.int_ref || item.id,
      referencia: item.int_ref || item.id,
      primary_operation_ref: item.primary_operation_ref || "",
      shipment_refs: item.shipment_refs || [],
      operation_identity: item.operation_identity,
      tipo_registro: "cotizacion",
      at,
      fecha_at: at,
      antiguedad_dias: daysSince(at),
      fuente: canonicalSource(item.fuente_principal),
      tipo_cambio: change,
      evento: item.estado_cotizacion,
      historial_lane: lane,
      riesgo_memoria: historyRisk(change, item),
      lectura_memoria: historyReading(item, "cotizacion", change, lane),
      resumen: firstText(item.ultima_evidencia, item.accion_sugerida),
      cambio: firstText(item.ultima_evidencia, item.accion_sugerida),
      actor: item.pelota,
      mes_origen: item.mes_origen,
      mes_codigo: item.mes_codigo,
      periodo_trabajo: item.periodo_trabajo,
      despues: {
        estado_cotizacion: item.estado_cotizacion,
        sheet_desfasado: item.sheet_desfasado,
        pelota: item.pelota,
      },
      evidencia: item.evidencia || item.evidencias?.[0] || null,
    };
  }),
]
  .filter((item) => item.at || item.resumen);
const cleanHistory = cleanHistoryEvents(historyRaw, { limit: 60 });
const history = cleanHistory.rows;

const inferEmailActorType = (item) => inferActorProfileFromItem(item).actor_tipo;

const emailThreadLane = (item) => {
  const decision = normalizedBucketKey(item.decision_ejecutiva, "");
  const view = normalizedBucketKey(item.vista_operativa, "");
  const queue = normalizedBucketKey(item.cola_trabajo, "");
  const actor = inferEmailActorType(item);
  if (decision === "atender_ahora" || view === "frente_activo") return "cadena_en_alerta";
  if (decision === "revisar_inconsistencia" || view === "por_validar") return "cadena_por_validar";
  if (queue === "pelota_cliente_agente" || ["cliente", "cnee", "shipper", "proveedor", "agente", "actor_externo"].includes(actor)) return "cadena_espera_externa";
  if (queue === "pelota_pricing" || actor === "pricing") return "cadena_pricing";
  return "cadena_monitoreo";
};

const emailThreadReading = (item, lane) => {
  const ref = firstText(item.primary_operation_ref, item.int_origin_ref, item.int_ref, item.id, "sin referencia");
  const actor = inferEmailActorType(item);
  const chain = firstText(item.cadena_correo, item.asunto, item.cliente, "cadena sin asunto");
  if (lane === "cadena_en_alerta") return `${ref}: revisar la cadena ${chain}; actor ${actor}, pelota visible en ${firstText(item.pelota, "incierta")}.`;
  if (lane === "cadena_por_validar") return `${ref}: no tomar decision agregada; validar esta cadena antes de accionar.`;
  if (lane === "cadena_espera_externa") return `${ref}: cadena separada con ${actor}; monitorear respuesta sin mezclar con otros actores.`;
  if (lane === "cadena_pricing") return `${ref}: cadena ligada a pricing/tarifa; revisar si sigue pendiente o si ya cambio de pelota.`;
  return `${ref}: cadena en monitoreo, conservar contexto por separado.`;
};

const chainRank = (thread) => {
  const laneRank = {
    cadena_en_alerta: 0,
    cadena_por_validar: 1,
    cadena_pricing: 2,
    cadena_espera_externa: 3,
    cadena_monitoreo: 4,
  }[normalizedBucketKey(thread.lane_cadena, "")] ?? 5;
  const actorRank = {
    cnee: 0,
    shipper: 1,
    proveedor: 2,
    cliente: 3,
    agente: 4,
    multi: 5,
    pricing: 6,
    actor_externo: 7,
  }[normalizedBucketKey(thread.actor_tipo, "")] ?? 7;
  return laneRank * 100 + rankSeverity(thread.criticidad || thread.semaforo) * 10 + actorRank;
};

const threadGroupKeys = (item) => referenceKeys(item);

const buildEmailThreads = (items) =>
  items
    .map((item, index) => {
      const actorProfile = inferActorProfileFromItem(item);
      const actorTipo = actorProfile.actor_tipo;
      const identity = buildThreadIdentity(item, actorTipo, index);
      const lane = identity.chain_needs_reference_review ? "cadena_por_validar" : emailThreadLane(item);
      const shipmentRefs = identity.shipment_refs.length
        ? identity.shipment_refs
        : unique([...(item.shipment_refs || []), ...(item.sam_refs || []), ...(item.referencias_sam || []), item.no_embarque]);
      const intRef = firstText(identity.int_origin_ref, item.int_origin_ref, item.int_ref, item.referencia_int);
      const primaryRef = firstText(identity.primary_operation_ref, shipmentRefs[0], intRef, item.id);
      const subject = firstText(identity.subject_display, item.cadena_correo, item.asunto, item.ultimo_movimiento_resumen);
      const threadKey = identity.thread_key;
      const action = inferChainAction({
        ...item,
        actor_tipo: actorTipo,
        actor_principal: actorProfile.actor_principal,
        actor_confidence: actorProfile.actor_confidence,
        lane_cadena: lane,
        primary_operation_ref: primaryRef,
        int_origin_ref: intRef,
        cadena_correo: subject,
        chain_has_multiple_refs: identity.chain_has_multiple_refs,
        accion_previa: item.accion_sugerida,
      });
      return {
        id: threadKey,
        thread_key: threadKey,
        thread_identity: identity.thread_identity,
        thread_identity_reason: identity.thread_identity_reason,
        thread_display: identity.thread_display,
        subject_display: identity.subject_display,
        subject_fingerprint: identity.subject_fingerprint,
        email_thread_id: firstText(item.email_thread_id),
        asunto: subject,
        cadena_correo: subject,
        actor_tipo: actorTipo,
        actor_principal: firstText(actorProfile.actor_principal, item.cliente_actor, item.cliente, item.pelota),
        actor_detection_reason: actorProfile.actor_detection_reason,
        actor_confidence: actorProfile.actor_confidence,
        sender_email: actorProfile.sender_email,
        sender_domain: actorProfile.sender_domain,
        actor_profile: actorProfile,
        cliente: firstText(item.cliente, item.cliente_actor),
        primary_operation_ref: primaryRef,
        int_origin_ref: intRef,
        int_ref: intRef,
        int_refs: identity.int_refs,
        shipment_refs: shipmentRefs,
        reference_scope: identity.reference_scope,
        reference_scope_reason: identity.reference_scope_reason,
        operation_identity: identity.operation_identity,
        chain_refs_count: identity.chain_refs_count,
        chain_has_multiple_refs: identity.chain_has_multiple_refs,
        chain_needs_reference_review: identity.chain_needs_reference_review,
        shipment_modalidad: firstText(item.shipment_modalidad, item.modalidad),
        shipment_tipo: firstText(item.shipment_tipo),
        estado_operativo: item.estado_operativo,
        criticidad: item.criticidad,
        semaforo: item.semaforo,
        pelota: item.pelota,
        responsable_equipo: item.responsable_equipo,
        accion_sugerida: action.accion_sugerida,
        accion_tipo: action.accion_tipo,
        accion_reason: action.accion_reason,
        accion_confidence: action.accion_confidence,
        accion_previa: item.accion_sugerida,
        ultimo_movimiento_at: item.ultimo_movimiento_at,
        ultimo_movimiento_resumen: item.ultimo_movimiento_resumen,
        carpeta: item.carpeta,
        lane_cadena: lane,
        lectura_cadena: emailThreadReading({ ...item, ...identity, cadena_correo: subject, actor_tipo: actorTipo }, lane),
        fuente_principal: item.fuente_principal,
        evidencia: item.evidencia || item.evidencias?.[0] || null,
        mes_origen: item.mes_origen,
        mes_codigo: item.mes_codigo,
        periodo_trabajo: item.periodo_trabajo,
        es_mes_actual: item.es_mes_actual,
        es_historico_vivo: item.es_historico_vivo,
        confianza: item.confianza,
      };
    })
    .sort(sortByRiskAndDate)
    .slice(0, 120);

const emailThreads = dedupeConversations(buildEmailThreads(operacionesBase));

const threadsByReference = new Map();
for (const thread of emailThreads) {
  for (const key of threadGroupKeys(thread)) {
    if (!key) continue;
    const list = threadsByReference.get(key) || [];
    list.push(thread);
    threadsByReference.set(key, list);
  }
}

operacionesBase.forEach((item) => {
  const related = uniqueMixed(threadGroupKeys(item).flatMap((key) => threadsByReference.get(key) || []));
  const sorted = [...related].sort((a, b) => chainRank(a) - chainRank(b) || dateValueLike(b.ultimo_movimiento_at) - dateValueLike(a.ultimo_movimiento_at));
  const selected = selectActionableConversation(sorted, chainRank);
  const chainAudit = auditConversationGroup(sorted, selected);
  item.cadenas_relacionadas_count = related.length;
  item.auditoria_cadenas = chainAudit;
  item.auditoria_cadenas_status = chainAudit.status;
  item.auditoria_cadenas_severity = chainAudit.severity;
  item.necesita_validar_cadena = chainAudit.needs_validation;
  item.cadenas_actores = chainAudit.actors;
  item.cadenas_alerta_count = chainAudit.alert_count;
  item.cadenas_por_validar_count = chainAudit.validate_count;
  item.cadenas_referencia_multiple_count = chainAudit.multiple_reference_count;
  item.cadenas_relacionadas = sorted.slice(0, 6).map((thread) => ({
    thread_key: thread.thread_key,
    thread_identity: thread.thread_identity,
    thread_display: thread.thread_display,
    reference_scope: thread.reference_scope,
    reference_scope_reason: thread.reference_scope_reason,
    chain_refs_count: thread.chain_refs_count,
    chain_has_multiple_refs: thread.chain_has_multiple_refs,
    chain_needs_reference_review: thread.chain_needs_reference_review,
    primary_operation_ref: thread.primary_operation_ref,
    int_origin_ref: thread.int_origin_ref,
    shipment_refs: thread.shipment_refs,
    actor_tipo: thread.actor_tipo,
    asunto: thread.asunto,
    lane_cadena: thread.lane_cadena,
    pelota: thread.pelota,
    accion_sugerida: thread.accion_sugerida,
    accion_tipo: thread.accion_tipo,
    accion_reason: thread.accion_reason,
    accion_confidence: thread.accion_confidence,
    ultimo_movimiento_at: thread.ultimo_movimiento_at,
  }));
  if (!selected) return;
  item.cadena_accionable = {
    thread_key: selected.thread_key,
    thread_identity: selected.thread_identity,
    thread_display: selected.thread_display,
    reference_scope: selected.reference_scope,
    reference_scope_reason: selected.reference_scope_reason,
    chain_refs_count: selected.chain_refs_count,
    chain_has_multiple_refs: selected.chain_has_multiple_refs,
    chain_needs_reference_review: selected.chain_needs_reference_review,
    primary_operation_ref: selected.primary_operation_ref,
    int_origin_ref: selected.int_origin_ref,
    shipment_refs: selected.shipment_refs,
    actor_tipo: selected.actor_tipo,
    asunto: selected.asunto,
    lane_cadena: selected.lane_cadena,
    lectura_cadena: selected.lectura_cadena,
    accion_sugerida: selected.accion_sugerida,
    accion_tipo: selected.accion_tipo,
    accion_reason: selected.accion_reason,
    accion_confidence: selected.accion_confidence,
    ultimo_movimiento_at: selected.ultimo_movimiento_at,
    evidencia: selected.evidencia || null,
  };
  item.actor_tipo_accionable = selected.actor_tipo;
  item.cadena_accionable_lane = selected.lane_cadena;
  item.accion_tipo = selected.accion_tipo;
  item.accion_reason = selected.accion_reason;
  item.accion_confidence = selected.accion_confidence;
  item.accion_sugerida = selected.accion_sugerida;
  item.accion_siguiente = selected.accion_sugerida;
  item.motivo_prioridad = `${item.motivo_prioridad || "Prioridad por operacion viva."} Cadena accionable: ${selected.actor_tipo} / ${selected.asunto}.`;
  if (chainAudit.needs_validation && item.decision_ejecutiva !== "atender_ahora") {
    item.decision_ejecutiva = "revisar_inconsistencia";
    item.cola_trabajo = "validacion";
    item.bandeja_ejecutiva = item.periodo_trabajo === "historico_vivo" ? "backlog_historico" : "por_validar";
    item.nivel_decision = decisionRank(item.decision_ejecutiva);
    item.motivo_prioridad = `${item.motivo_prioridad} Auditoria de cadenas: ${chainAudit.recommendation}`;
  }
  applyTrustProfile(item, "operacion");
});

const operaciones = dedupeExecutiveOperations(operacionesBase).slice(0, 80);

const completedDurations = tiempos.filter((item) => typeof item.duracion_min === "number");
const avg = (items) => (items.length ? Math.round(items.reduce((sum, item) => sum + item.duracion_min, 0) / items.length) : null);
const avgNumber = (items, getter) => {
  const values = items.map(getter).filter((value) => typeof value === "number" && Number.isFinite(value));
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
};
const decisionItems = [...operaciones, ...cotizaciones];
tiempos.forEach((item) => applyTrustProfile(item, "tiempo"));
tiempos = dedupeExecutiveTimeRows(tiempos);
const isCurrentPeriod = (item) => item.periodo_trabajo === "mes_actual";
const isHistoricalPeriod = (item) => item.periodo_trabajo === "historico_vivo";
const quoteEmailStatus = quoteEmailStatusKey;
const isQuoteStuck = (item) =>
  item.es_prioridad_reporte === true ||
  item.estado_cotizacion === "cliente_con_duda" ||
  item.estado_cotizacion === "pricing_respondio_falta_enviar" ||
  hasPricingReadyEvidence(item) ||
  hasClientDoubtEvidence(item);

cotizaciones.forEach((item) => {
  item.pricing_pendiente_real = isRealPricingPending(item);
  item.estado_cotizacion_ejecutivo = executiveQuoteStatus(item);
});

const referenceLabel = (item) => firstText(item.int_ref, item.referencia_int, item.referencia, item.referencia_id, item.id, "Sin referencia");
const actorLabel = (item) => firstText(item.pelota, item.quien_tiene_la_pelota, item.usuario_sheet, item.responsable_multi, item.actor_destino, "Actor incierto");
const itemAction = (item) => firstText(item.accion_sugerida, item.accion_siguiente, item.observacion, item.motivo_prioridad, "Definir siguiente accion.");

const target = (table, filters = {}, search = "") => ({ table, filters, search });

const compactItem = (item, table, kind) => ({
  id: referenceLabel(item),
  tipo: kind,
  cliente: firstText(item.cliente, item.cliente_actor, item.actor_origen, "Cliente incierto"),
  estado: firstText(item.decision_ejecutiva, item.estado_cotizacion, item.estado_operativo, item.semaforo),
  actor: actorLabel(item),
  accion: itemAction(item),
  at: firstText(item.ultimo_movimiento_at, item.ultima_evidencia_at, item.inicio_at, item.fecha_at),
  target: target(table, {}, referenceLabel(item)),
});

const topItems = (items, table, kind, limit = 5) =>
  [...items]
    .sort(sortByRiskAndDate)
    .slice(0, limit)
    .map((item) => compactItem(item, table, kind));

const reportItem = (item, table, kind) => {
  const evidencia = item.evidencia || item.evidencias?.[0] || {};
  const id = referenceLabel(item);
  return {
    id,
    tipo: kind,
    cliente: firstText(item.cliente, item.cliente_actor, item.actor_origen, "Cliente incierto"),
    criticidad: firstText(item.criticidad, item.semaforo, "sin_dato"),
    estado: firstText(item.estado_operativo, item.estado_cotizacion, item.estado_medicion, item.decision_ejecutiva, "sin_dato"),
    ultimo_movimiento_at: firstText(item.ultimo_movimiento_at, item.ultima_evidencia_at, item.inicio_at, item.fecha_at),
    ultimo_movimiento: firstText(
      item.ultimo_movimiento_resumen,
      item.ultimo_movimiento,
      item.ultima_evidencia,
      item.lectura_tiempo,
      item.observacion,
      "Sin evidencia resumida."
    ),
    por_que_importa: firstText(item.motivo_prioridad, item.lectura_tiempo, item.ultima_evidencia, item.ultimo_movimiento_resumen),
    pelota: actorLabel(item),
    accion: itemAction(item),
    lectura_confianza: firstText(item.lectura_confianza, "sin_evidencia_suficiente"),
    lectura_confianza_reason: firstText(item.lectura_confianza_reason),
    accion_confidence: firstText(item.accion_confidence, item.confianza),
    evidencia: {
      fuente: firstText(evidencia.fuente, item.fuente_principal, "memoria_local"),
      tipo: firstText(evidencia.tipo, "registro"),
      link: firstText(evidencia.link, item.link_correo, item.link, item.url),
      resumen: firstText(evidencia.resumen, item.ultima_evidencia, item.ultimo_movimiento_resumen),
    },
    target: target(table, {}, id),
  };
};

const reportItems = (items, table, kind, limit = 5) =>
  [...items]
    .sort(sortByRiskAndDate)
    .slice(0, limit)
    .map((item) => reportItem(item, table, kind));

const reportSection = (id, titulo, bullets, filters = {}, table = "operacion") => ({
  id,
  titulo,
  bullets: bullets.filter(Boolean),
  target: target(table, filters),
});

const trustLabel = (value) =>
  ({
    accion_confiable: "Accion confiable",
    accion_probable: "Accion probable",
    validar_antes: "Validar antes",
    sin_evidencia_suficiente: "Sin evidencia suficiente",
    monitoreo_controlado: "Monitoreo controlado",
  })[normalizedBucketKey(value, "")] || "Validar lectura";

const trustKey = (item) => normalizedBucketKey(item.lectura_confianza, "");

const isReadyAction = (item) => trustKey(item) === "accion_confiable" && item.accion_lista !== false;

const isProbableAction = (item) =>
  ["accion_probable", "monitoreo_controlado"].includes(trustKey(item)) && item.accion_lista !== false;

const isValidationAction = (item) =>
  ["validar_antes", "sin_evidencia_suficiente"].includes(trustKey(item)) ||
  item.accion_lista === false ||
  item.necesita_validar_cadena === true ||
  item.sheet_desfasado === true;

const buildExecutiveDigest = (summary, tabs, historyRows) => {
  const alerts = [
    {
      id: "accion-ahora",
      nivel: summary.prioridad_hoy > 0 ? "rojo" : "verde",
      titulo: "Prioridad real hoy",
      detalle: `${summary.prioridad_hoy || 0} registros tienen accion real para hoy.`,
      accion: "Abrir prioridades reales",
      target: target("operacion", { bandeja_ejecutiva: "prioridad_hoy" }),
      count: summary.prioridad_hoy || 0,
    },
    {
      id: "pricing-pendiente",
      nivel: summary.cotizaciones_pendientes_reales > 0 ? "amarillo" : "verde",
      titulo: "Pricing pendiente",
      detalle: `${summary.cotizaciones_pendientes_reales || 0} cotizaciones siguen como pendiente real de Pricing despues de cruzar Sheet/memoria con correo.`,
      accion: "Ver cotizaciones con Pricing",
      target: target("cotizaciones", { estado_cotizacion: "pendiente_pricing" }),
      count: summary.cotizaciones_pendientes_reales || 0,
    },
    {
      id: "pricing-listo",
      nivel: summary.pricing_respondio_falta_enviar > 0 ? "rojo" : "verde",
      titulo: "Listas para cerrar",
      detalle: `${summary.pricing_respondio_falta_enviar || 0} tienen pricing respondido y falta accion final.`,
      accion: "Ver pendientes de MULTI",
      target: target("cotizaciones", { estado_cotizacion: "pricing_respondio_falta_enviar" }),
      count: summary.pricing_respondio_falta_enviar || 0,
    },
    {
      id: "tiempos-rojos",
      nivel: summary.respuestas_rojas > 0 ? "rojo" : "verde",
      titulo: "Tiempos en rojo",
      detalle: `${summary.respuestas_rojas || 0} mediciones necesitan revision de respuesta o evidencia.`,
      accion: "Abrir tiempos rojos",
      target: target("tiempos", { semaforo: "rojo" }),
      count: summary.respuestas_rojas || 0,
    },
    {
      id: "validar-antes",
      nivel: summary.acciones_validar_antes > 0 ? "amarillo" : "verde",
      titulo: "Validar antes de actuar",
      detalle: `${summary.acciones_validar_antes || 0} registros tienen cadena, actor o evidencia que revisar antes de mover al equipo.`,
      accion: "Abrir validaciones",
      target: target("operacion", { lectura_confianza: "validar_antes" }),
      count: summary.acciones_validar_antes || 0,
    },
    {
      id: "historial-vivo",
      nivel: summary.cotizaciones_historicas_vivas + summary.operaciones_historicas_vivas > 0 ? "amarillo" : "verde",
      titulo: "Historico vivo",
      detalle: `${summary.operaciones_historicas_vivas || 0} operaciones y ${summary.cotizaciones_historicas_vivas || 0} cotizaciones de meses previos siguen visibles.`,
      accion: "Revisar arrastre",
      target: target("operacion", { periodo_trabajo: "historico_vivo" }),
      count: (summary.operaciones_historicas_vivas || 0) + (summary.cotizaciones_historicas_vivas || 0),
    },
  ].filter((alert) => alert.count > 0 || alert.id === "accion-ahora");

  const operationReportRows = operaciones.filter(
    (item) =>
      item.es_prioridad_reporte &&
      item.estado_operativo !== "cotizacion_activa" &&
      item.cola_trabajo !== "pelota_pricing" &&
      item.actor_tipo !== "pricing"
  );
  const quoteReportRows = cotizaciones.filter(isQuoteStuck);
  const timeReportRows = tiempos.filter((item) => item.semaforo === "rojo");
  const changeReportRows = historyRows.filter((item) =>
    ["riesgo_abierto", "movimiento_nuevo", "mejora_cierre", "por_validar"].includes(item.historial_lane)
  );

  const priorities = [
    ...topItems(operationReportRows, "operacion", "Operacion", 3),
    ...topItems(quoteReportRows, "cotizaciones", "Cotizacion", 3),
    ...topItems(timeReportRows, "tiempos", "Tiempo/calidad", 2),
  ].slice(0, 7);
  const actionDetails = [
    ...reportItems(operationReportRows, "operacion", "Operacion", 3),
    ...reportItems(quoteReportRows, "cotizaciones", "Cotizacion", 3),
    ...reportItems(timeReportRows, "tiempos", "Tiempo/calidad", 2),
  ].slice(0, 7);
  const actionReadyDetails = [
    ...reportItems(operationReportRows.filter(isReadyAction), "operacion", "Operacion", 8),
    ...reportItems(quoteReportRows.filter(isReadyAction), "cotizaciones", "Cotizacion", 8),
    ...reportItems(timeReportRows.filter(isReadyAction), "tiempos", "Tiempo/calidad", 6),
  ].slice(0, 8);
  const actionProbableDetails = [
    ...reportItems(operationReportRows.filter(isProbableAction), "operacion", "Operacion", 8),
    ...reportItems(quoteReportRows.filter(isProbableAction), "cotizaciones", "Cotizacion", 8),
    ...reportItems(timeReportRows.filter(isProbableAction), "tiempos", "Tiempo/calidad", 6),
  ].slice(0, 8);
  const validationDetails = [
    ...reportItems(operaciones.filter(isValidationAction), "operacion", "Operacion", 8),
    ...reportItems(cotizaciones.filter(isValidationAction), "cotizaciones", "Cotizacion", 10),
    ...reportItems(tiempos.filter(isValidationAction), "tiempos", "Tiempo/calidad", 8),
  ].slice(0, 12);
  const dataQuality = {
    acciones_listas: actionReadyDetails.length,
    acciones_probables: actionProbableDetails.length,
    validar_antes: validationDetails.length,
    registros_validar_total: summary.acciones_validar_antes || 0,
    sin_evidencia_suficiente: summary.acciones_sin_evidencia || 0,
    sheet_desfasado: summary.sheet_desfasado || 0,
    regla_reporte:
      "El reporte separa accion lista, accion probable y validar antes; los registros dudosos no deben tratarse como instruccion segura.",
  };

  const reportBullets = [
    `${summary.prioridad_hoy || 0} registros tienen accion real para hoy; ${summary.seguimiento_hoy || 0} quedan para seguimiento.`,
    `${summary.cotizaciones_vivas || 0} cotizaciones visibles para contexto; pendientes reales de pricing: ${summary.cotizaciones_pendientes_reales || 0} (${summary.cotizaciones_pendientes_mes_actual || 0} de ${activeMonthName} y ${summary.cotizaciones_pendientes_historicas || 0} historicas).`,
    `${summary.backlog_historico || 0} referencias de meses previos quedan como backlog vivo, separadas de prioridad del dia.`,
    `${summary.operaciones_excluidas_cotizacion || 0} cadenas INT/comerciales sin embarque se excluyeron de Operacion y se revisan en Cotizaciones.`,
    `${summary.respuestas_rojas || 0} alertas de tiempos/calidad en rojo; ${summary.acciones_validar_antes || 0} registros deben validarse antes de actuar.`,
  ];
  const risks = [
    summary.revisar_inconsistencia > 0
      ? `${summary.revisar_inconsistencia} inconsistencias activas necesitan validacion antes de tomar decision.`
      : "",
    summary.sheet_desfasado > 0 ? `${summary.sheet_desfasado} cotizaciones tienen desfase entre Sheet/memoria/correo.` : "",
    summary.tiempos_falta_evidencia > 0
      ? `${summary.tiempos_falta_evidencia} mediciones de tiempos no tienen evidencia suficiente para medir con confianza.`
      : "",
    summary.historial_riesgo_abierto > 0
      ? `${summary.historial_riesgo_abierto} eventos del historial siguen como riesgo abierto.`
      : "",
    summary.acciones_sin_evidencia > 0
      ? `${summary.acciones_sin_evidencia} registros no tienen evidencia suficiente para recomendacion segura.`
      : "",
  ].filter(Boolean);

  const sections = [
    {
      ...reportSection(
      "operacion",
      "Operacion",
      [
        `${summary.operaciones_frente_activo || 0} referencias estan en frente activo.`,
        `${summary.operaciones_espera_externa || 0} esperan cliente, agente o tercero.`,
        `${summary.operaciones_por_validar || 0} necesitan validar trazabilidad, SAM o evidencia.`,
        `${summary.operaciones_excluidas_cotizacion || 0} candidatas quedaron fuera por ser INT/cotizacion sin embarque ni senal operativa suficiente.`,
      ],
      { vista_operativa: "frente_activo" },
      "operacion"
      ),
      lectura: "Solo incluye operaciones/cadenas operativas; cotizaciones activas se reportan en el bloque comercial.",
      items: reportItems(operationReportRows, "operacion", "Operacion", 6),
    },
    {
      ...reportSection(
      "cotizaciones",
      "Cotizaciones",
      [
        `${summary.cotizaciones_pendientes_reales || 0} pendientes reales de Pricing.`,
        `${summary.pricing_respondio_falta_enviar || 0} con Pricing respondido y accion pendiente de MULTI.`,
        `${summary.cotizaciones_cotizadas || 0} ya cotizadas/en monitoreo de cliente.`,
      ],
      { estado_cotizacion: "pendiente_pricing" },
      "cotizaciones"
      ),
      lectura: "Separa pendientes reales de Pricing, respuestas listas para enviar, dudas de cliente y monitoreo.",
      items: reportItems(quoteReportRows, "cotizaciones", "Cotizacion", 8),
    },
    {
      ...reportSection(
      "tiempos",
      "Tiempos y calidad",
      [
        `${summary.tiempos_atraso_medido || 0} atrasos medidos contra objetivo.`,
        `${summary.tiempos_pricing_abierto || 0} tramos abiertos ligados a Pricing.`,
        `${summary.tiempos_falta_evidencia || 0} tramos requieren mejor evidencia para medir.`,
      ],
      { lane_tiempo: "atraso_medido" },
      "tiempos"
      ),
      lectura: "No es score formal: marca tramos atrasados, abiertos o sin evidencia suficiente.",
      items: reportItems(timeReportRows, "tiempos", "Tiempo/calidad", 6),
    },
    {
      ...reportSection(
      "memoria",
      "Memoria e historial",
      [
        `${summary.historial_riesgo_abierto || 0} eventos con riesgo abierto.`,
        `${summary.historial_arrastre_historico || 0} eventos de arrastre historico separados del frente de hoy.`,
        `${summary.historial_mejora_cierre || 0} eventos muestran mejora o avance visible.`,
      ],
      { historial_lane: "riesgo_abierto" },
      "historial"
      ),
      lectura: "Muestra cambios recientes y arrastre historico sin subirlos a prioridad si no hay accion actual.",
      items: reportItems(changeReportRows, "historial", "Cambio", 6),
    },
  ];

  const activeMonth = state.last_sheet_scan?.tab || activeMonthName;
  const reportType = firstText(state.last_report_type, "manual");
  const riskDetails = [
    {
      id: "validar-confianza",
      nivel: summary.acciones_validar_antes > 0 ? "amarillo" : "verde",
      titulo: "Confianza de lectura",
      detalle: `${summary.acciones_validar_antes || 0} registros deben validarse antes de actuar; ${summary.acciones_confiables || 0} estan listos para ejecucion.`,
      accion: "Separar accion segura de validacion.",
      count: summary.acciones_validar_antes || 0,
      target: target("operacion", { lectura_confianza: "validar_antes" }),
    },
    {
      id: "inconsistencias",
      nivel: summary.revisar_inconsistencia > 0 ? "amarillo" : "verde",
      titulo: "Inconsistencias",
      detalle: `${summary.revisar_inconsistencia || 0} registros activos requieren validar lectura antes de decidir.`,
      accion: "Revisar registros con decision revisar_inconsistencia.",
      count: summary.revisar_inconsistencia || 0,
      target: target("operacion", { decision_ejecutiva: "revisar_inconsistencia" }),
    },
    {
      id: "sheet-desfasado",
      nivel: summary.sheet_desfasado > 0 ? "amarillo" : "verde",
      titulo: "Sheet desfasado",
      detalle: `${summary.sheet_desfasado || 0} cotizaciones no cuadran entre Sheet, Outlook o memoria.`,
      accion: "Validar si ya se envio, si falta capturar SAM o si solo queda monitoreo.",
      count: summary.sheet_desfasado || 0,
      target: target("cotizaciones", { sheet_desfasado: true }),
    },
    {
      id: "evidencia-tiempos",
      nivel: summary.tiempos_falta_evidencia > 0 ? "gris" : "verde",
      titulo: "Evidencia incompleta",
      detalle: `${summary.tiempos_falta_evidencia || 0} mediciones no tienen hitos suficientes para medir calidad con confianza.`,
      accion: "Mejorar captura de primer correo, solicitud a Pricing, respuesta y envio al cliente.",
      count: summary.tiempos_falta_evidencia || 0,
      target: target("tiempos", { lane_tiempo: "falta_evidencia" }),
    },
  ].filter((risk) => risk.count > 0);

  const coberturaDetalle = {
    sheet: {
      spreadsheet: state.last_sheet_scan?.spreadsheet || "COTIZACIONES AGENTES 2026 MLTI",
      tab: activeMonth || "sin pestana registrada",
      range: state.last_sheet_scan?.range || "",
      scanned_at: state.last_sheet_scan?.scanned_at || "",
      real_rows: state.last_sheet_scan?.real_rows ?? null,
      partial_rows: state.last_sheet_scan?.partial_rows ?? null,
      placeholder_rows: state.last_sheet_scan?.placeholder_rows ?? null,
    },
    outlook: {
      last_import_at: state.last_outlook_deep_scan?.at || state.last_outlook_scan?.at || "",
      coverage_note: state.last_outlook_deep_scan?.window?.descripcion || "Memoria local y snapshot compacto de Outlook.",
    },
    dashboard: {
      operaciones: tabs.operacion.items.length,
      cotizaciones: tabs.cotizaciones.items.length,
      tiempos_calidad: tabs.tiempos_calidad.items.length,
      historial: historyRows.length,
    },
    privacidad: "Datos reales permanecen en work/ y dashboard/data/current.json; no subir a GitHub publico.",
  };

  return {
    headline: `${summary.prioridad_hoy || 0} prioridades reales, ${summary.revisar_inconsistencia || 0} inconsistencias y ${summary.respuestas_rojas || 0} alertas de tiempos.`,
    alertas: alerts,
    prioridades: priorities,
    reporte: {
      tipo: reportType,
      asunto_sugerido: `Reporte ejecutivo MLTI - ${activeMonth}`,
      resumen_corto: reportBullets.join(" "),
      bullets: reportBullets,
      riesgos: risks,
      secciones: sections,
      acciones_miguel: actionDetails
        .slice(0, 5)
        .map((item) => `${item.id}: ${item.lectura_confianza === "accion_confiable" ? "" : `[${trustLabel(item.lectura_confianza)}] `}${item.accion}`),
      acciones_miguel_detalle: actionDetails,
      acciones_listas_detalle: actionReadyDetails,
      acciones_probables_detalle: actionProbableDetails,
      validaciones_detalle: validationDetails,
      calidad_dato: dataQuality,
      riesgos_detalle: riskDetails,
      bloques: sections,
      cobertura: [
        `Sheet activo: ${activeMonth || "sin pestana registrada"}.`,
        `Operacion: ${tabs.operacion.items.length} registros visibles.`,
        `Cotizaciones: ${tabs.cotizaciones.items.length} registros visibles.`,
        `Tiempos/calidad: ${tabs.tiempos_calidad.items.length} mediciones visibles.`,
        `Historial: ${historyRows.length} eventos recientes.`,
      ],
      cobertura_detalle: coberturaDetalle,
      limitaciones: [
        "El reporte no modifica Outlook ni Google Sheet.",
        "Las acciones se basan en snapshots y memorias locales; si falta cuerpo completo de correo, se marca como evidencia incompleta.",
        "GitHub debe conservar solo codigo, documentacion y ejemplos anonimos.",
      ],
    },
  };
};

const sheetPendingQuotes = cotizaciones.filter((item) => item.pendiente_pricing_sheet);
const sheetPendingButReclassified = sheetPendingQuotes.filter((item) => !isRealPricingPending(item));
const sheetPendingReclassifiedCurrent = sheetPendingButReclassified.filter((item) => item.periodo_trabajo === "mes_actual");
const sheetProfilesWithPeriod = cotizacionesAllSheetProfiles.map(({ item, profile }) => ({
  ...profile,
  periodo_trabajo: monthContext(item, "sheet", quoteIdFor(item)).periodo_trabajo,
  mes_origen: monthContext(item, "sheet", quoteIdFor(item)).mes_origen,
}));

const summary = {
  operaciones_candidatas: operacionesCandidatas.length,
  operaciones_vivas: operaciones.length,
  operaciones_excluidas_cotizacion: operacionesExcluidasPorCotizacion.length,
  operaciones_inciertas_descartadas: operacionesInciertasDescartadas.length,
  operaciones_mes_actual: operaciones.filter(isCurrentPeriod).length,
  operaciones_historicas_vivas: operaciones.filter(isHistoricalPeriod).length,
  operaciones_criticas: operaciones.filter((item) => rankSeverity(item.criticidad) === 0).length,
  operaciones_altas: operaciones.filter((item) => rankSeverity(item.criticidad) === 1).length,
  operaciones_frente_activo: operaciones.filter((item) => item.vista_operativa === "frente_activo").length,
  operaciones_historico_en_radar: operaciones.filter((item) => item.vista_operativa === "historico_en_radar").length,
  operaciones_por_validar: operaciones.filter((item) => item.vista_operativa === "por_validar").length,
  operaciones_espera_externa: operaciones.filter((item) => item.vista_operativa === "espera_externa").length,
  cadenas_correo: emailThreads.length,
  cadenas_en_alerta: emailThreads.filter((item) => item.lane_cadena === "cadena_en_alerta").length,
  cadenas_por_validar: emailThreads.filter((item) => item.lane_cadena === "cadena_por_validar").length,
  cadenas_con_embarque: emailThreads.filter((item) => item.shipment_refs?.length).length,
  cadenas_int_provisional: emailThreads.filter((item) => item.operation_identity === "int_provisional").length,
  cadenas_referencia_multiple: emailThreads.filter((item) => item.chain_has_multiple_refs).length,
  operaciones_cadenas_mixtas: operaciones.filter((item) => item.auditoria_cadenas_status === "actores_mixtos").length,
  operaciones_cadenas_mixtas_alerta: operaciones.filter((item) => item.auditoria_cadenas_status === "actores_mixtos_en_alerta").length,
  operaciones_referencia_multiple: operaciones.filter((item) => item.auditoria_cadenas_status === "referencias_multiples_en_cadena").length,
  operaciones_validar_cadena: operaciones.filter((item) => item.necesita_validar_cadena).length,
  cotizaciones_vivas: cotizaciones.length,
  cotizaciones_sheet_total: cotizacionesAllRawItems.length,
  cotizaciones_sheet_cotizadas_total: sheetProfilesWithPeriod.filter((item) => item.cotizada_sheet).length,
  cotizaciones_sheet_pendientes_total: sheetProfilesWithPeriod.filter((item) => item.pendiente_pricing_sheet).length,
  cotizaciones_sheet_cerradas_total: sheetProfilesWithPeriod.filter((item) => item.cerrada_sheet).length,
  cotizaciones_sheet_canceladas_total: sheetProfilesWithPeriod.filter((item) => item.estado_sheet_canonico === "cancelada").length,
  cotizaciones_sheet_por_estado_total: bucketCount(sheetProfilesWithPeriod, "estado_sheet_canonico"),
  cotizaciones_mes_actual: cotizaciones.filter(isCurrentPeriod).length,
  cotizaciones_historicas_vivas: cotizaciones.filter(isHistoricalPeriod).length,
  pendientes_pricing: cotizaciones.filter(isRealPricingPending).length,
  cotizaciones_sheet_pendientes: sheetPendingQuotes.length,
  cotizaciones_sheet_pendientes_mes_actual: sheetPendingQuotes.filter((item) => item.periodo_trabajo === "mes_actual").length,
  cotizaciones_sheet_pendientes_historicas: sheetPendingQuotes.filter((item) => item.periodo_trabajo === "historico_vivo").length,
  cotizaciones_sheet_pendientes_reclasificadas: sheetPendingButReclassified.length,
  cotizaciones_sheet_pendientes_reclasificadas_mes_actual: sheetPendingReclassifiedCurrent.length,
  cotizaciones_pendientes_reales: cotizaciones.filter(isRealPricingPending).length,
  cotizaciones_pendientes_mes_actual: cotizaciones.filter((item) => isRealPricingPending(item) && item.periodo_trabajo === "mes_actual").length,
  cotizaciones_pendientes_historicas: cotizaciones.filter((item) => isRealPricingPending(item) && item.periodo_trabajo === "historico_vivo").length,
  cotizaciones_cotizadas: cotizaciones.filter((item) => item.estado_cotizacion === "cotizada" || item.estado_cotizacion === "enviada_cliente").length,
  cotizaciones_sheet_cotizadas: cotizaciones.filter((item) => item.cotizada_sheet).length,
  cotizaciones_por_validar: cotizaciones.filter((item) => item.estado_cotizacion === "por_validar").length,
  pricing_respondio_falta_enviar: cotizaciones.filter((item) => item.estado_cotizacion === "pricing_respondio_falta_enviar" || hasPricingReadyEvidence(item)).length,
  sheet_desfasado: cotizaciones.filter((item) => item.sheet_desfasado).length,
  respuestas_rojas: tiempos.filter((item) => item.semaforo === "rojo").length,
  tiempos_atraso_medido: tiempos.filter((item) => item.lane_tiempo === "atraso_medido").length,
  tiempos_pricing_abierto: tiempos.filter((item) => item.lane_tiempo === "pricing_abierto").length,
  tiempos_falta_evidencia: tiempos.filter((item) => item.lane_tiempo === "falta_evidencia").length,
  historicas_vivas: historicasRawItems.length,
  historial_riesgo_abierto: history.filter((item) => item.historial_lane === "riesgo_abierto").length,
  historial_arrastre_historico: history.filter((item) => item.historial_lane === "arrastre_historico").length,
  historial_cambio_pelota: history.filter((item) => item.historial_lane === "cambio_pelota").length,
  historial_mejora_cierre: history.filter((item) => item.historial_lane === "mejora_cierre").length,
  sam_pendiente: operaciones.filter((item) => !item.sam_refs?.length).length,
  evidencia_incierta: operaciones.filter((item) => item.confianza !== "alta").length,
  acciones_confiables: decisionItems.filter((item) => item.lectura_confianza === "accion_confiable").length,
  acciones_probables: decisionItems.filter((item) => item.lectura_confianza === "accion_probable").length,
  acciones_validar_antes: decisionItems.filter((item) => item.lectura_confianza === "validar_antes").length,
  acciones_sin_evidencia: decisionItems.filter((item) => item.lectura_confianza === "sin_evidencia_suficiente").length,
  acciones_monitoreo: decisionItems.filter((item) => item.lectura_confianza === "monitoreo_controlado").length,
  prioridad_hoy: decisionItems.filter((item) => item.es_prioridad_reporte).length,
  backlog_historico: decisionItems.filter((item) => item.bandeja_ejecutiva === "backlog_historico").length,
  por_validar: decisionItems.filter((item) => item.bandeja_ejecutiva === "por_validar").length,
  monitoreo_cliente: decisionItems.filter((item) => item.bandeja_ejecutiva === "monitoreo_cliente").length,
  atender_ahora: decisionItems.filter((item) => item.decision_ejecutiva === "atender_ahora" && item.es_prioridad_reporte).length,
  seguimiento_hoy: decisionItems.filter((item) => item.decision_ejecutiva === "seguimiento_hoy" && item.bandeja_ejecutiva !== "backlog_historico").length,
  revisar_inconsistencia: decisionItems.filter((item) => item.decision_ejecutiva === "revisar_inconsistencia" && item.bandeja_ejecutiva !== "backlog_historico").length,
};

const tabs = {
  operacion: {
    kpis: {
      candidatas: operacionesCandidatas.length,
      vivas: operaciones.length,
      excluidas_cotizacion: operacionesExcluidasPorCotizacion.length,
      inciertas_descartadas: operacionesInciertasDescartadas.length,
      criticas: operaciones.filter((item) => rankSeverity(item.criticidad) === 0).length,
      altas: operaciones.filter((item) => rankSeverity(item.criticidad) === 1).length,
      sam_pendiente: operaciones.filter((item) => !item.sam_refs?.length).length,
      evidencia_incierta: operaciones.filter((item) => item.confianza !== "alta").length,
      por_criticidad: bucketCount(operaciones, "criticidad"),
      por_estado: bucketCount(operaciones, "estado_operativo"),
      por_modalidad: bucketCount(operaciones, "modalidad"),
      por_mes_origen: bucketCount(operaciones, "mes_origen"),
      por_periodo_trabajo: bucketCount(operaciones, "periodo_trabajo"),
      por_equipo_responsable: bucketCount(operaciones, "responsable_equipo"),
      por_frescura: bucketCount(operaciones, "frescura"),
      por_decision: bucketCount(operaciones, "decision_ejecutiva"),
      por_cola_trabajo: bucketCount(operaciones, "cola_trabajo"),
      por_bandeja_ejecutiva: bucketCount(operaciones, "bandeja_ejecutiva"),
      por_vista_operativa: bucketCount(operaciones, "vista_operativa"),
      por_estado_tms_operacion: bucketCount(operaciones, "estado_tms_operacion"),
      por_auditoria_cadenas: bucketCount(operaciones, "auditoria_cadenas_status"),
      por_lectura_confianza: bucketCount(operaciones, "lectura_confianza"),
      cadenas_mixtas: operaciones.filter((item) => item.auditoria_cadenas_status === "actores_mixtos").length,
      cadenas_mixtas_alerta: operaciones.filter((item) => item.auditoria_cadenas_status === "actores_mixtos_en_alerta").length,
      referencias_multiples_en_cadena: operaciones.filter((item) => item.auditoria_cadenas_status === "referencias_multiples_en_cadena").length,
      validar_cadena: operaciones.filter((item) => item.necesita_validar_cadena).length,
    },
    items: operaciones,
  },
  email_threads: {
    kpis: {
      cadenas: emailThreads.length,
      en_alerta: emailThreads.filter((item) => item.lane_cadena === "cadena_en_alerta").length,
      por_validar: emailThreads.filter((item) => item.lane_cadena === "cadena_por_validar").length,
      espera_externa: emailThreads.filter((item) => item.lane_cadena === "cadena_espera_externa").length,
      pricing: emailThreads.filter((item) => item.lane_cadena === "cadena_pricing").length,
      con_embarque: emailThreads.filter((item) => item.shipment_refs?.length).length,
      int_provisional: emailThreads.filter((item) => item.operation_identity === "int_provisional").length,
      referencia_multiple: emailThreads.filter((item) => item.chain_has_multiple_refs).length,
      por_actor: bucketCount(emailThreads, "actor_tipo"),
      por_carril: bucketCount(emailThreads, "lane_cadena"),
      por_identidad: bucketCount(emailThreads, "operation_identity"),
      por_alcance_referencia: bucketCount(emailThreads, "reference_scope"),
      por_periodo: bucketCount(emailThreads, "periodo_trabajo"),
      por_mes: bucketCount(emailThreads, "mes_origen"),
    },
    items: emailThreads,
  },
  tiempos_calidad: {
    kpis: {
      registros: tiempos.length,
      promedio_min: avg(completedDurations),
      promedio_cliente_a_multi_min: avg(completedDurations.filter((item) => item.tipo === "cliente_a_multi")),
      promedio_pricing_min: avg(completedDurations.filter((item) => item.tipo === "multi_a_pricing")),
      por_semaforo: bucketCount(tiempos, "semaforo"),
      por_tipo: bucketCount(tiempos, "tipo"),
      por_estado_medicion: bucketCount(tiempos, "estado_medicion"),
      por_responsable: bucketCount(tiempos, "actor_destino"),
      por_equipo_responsable: bucketCount(tiempos, "responsable_equipo"),
      por_lane_tiempo: bucketCount(tiempos, "lane_tiempo"),
      por_dueno_atraso: bucketCount(tiempos, "dueno_atraso"),
      por_tipo_respuesta: bucketCount(tiempos, "tipo_respuesta"),
      por_riesgo_calidad: bucketCount(tiempos, "riesgo_calidad"),
      por_lectura_confianza: bucketCount(tiempos, "lectura_confianza"),
      respuestas_rojas: tiempos.filter((item) => item.semaforo === "rojo").length,
      atraso_medido: tiempos.filter((item) => item.lane_tiempo === "atraso_medido").length,
      pricing_abierto: tiempos.filter((item) => item.lane_tiempo === "pricing_abierto").length,
      falta_evidencia: tiempos.filter((item) => item.lane_tiempo === "falta_evidencia").length,
      abiertos_sin_fin: tiempos.filter((item) => item.estado_medicion === "abierto_sin_fin").length,
      sin_medicion: tiempos.filter((item) => item.estado_medicion === "sin_medicion").length,
      fuera_objetivo: tiempos.filter((item) => item.estado_medicion === "fuera_objetivo").length,
    },
    items: tiempos.sort(sortByRiskAndDate).slice(0, 100),
  },
  cotizaciones: {
    kpis: {
      vivas: cotizaciones.length,
      sheet_total: cotizacionesAllRawItems.length,
      sheet_cotizadas_total: sheetProfilesWithPeriod.filter((item) => item.cotizada_sheet).length,
      sheet_pendientes_total: sheetProfilesWithPeriod.filter((item) => item.pendiente_pricing_sheet).length,
      sheet_cerradas_total: sheetProfilesWithPeriod.filter((item) => item.cerrada_sheet).length,
      sheet_por_estado_total: bucketCount(sheetProfilesWithPeriod, "estado_sheet_canonico"),
      pendiente_pricing: cotizaciones.filter(isRealPricingPending).length,
      sheet_pendientes: sheetPendingQuotes.length,
      sheet_pendientes_mes_actual: sheetPendingQuotes.filter((item) => item.periodo_trabajo === "mes_actual").length,
      sheet_pendientes_historicas: sheetPendingQuotes.filter((item) => item.periodo_trabajo === "historico_vivo").length,
      sheet_pendientes_reclasificadas: sheetPendingButReclassified.length,
      sheet_pendientes_reclasificadas_mes_actual: sheetPendingReclassifiedCurrent.length,
      pendientes_reales: cotizaciones.filter(isRealPricingPending).length,
      pendientes_mes_actual: cotizaciones.filter((item) => isRealPricingPending(item) && item.periodo_trabajo === "mes_actual").length,
      pendientes_historicas: cotizaciones.filter((item) => isRealPricingPending(item) && item.periodo_trabajo === "historico_vivo").length,
      cotizadas: cotizaciones.filter((item) => item.estado_cotizacion === "cotizada" || item.estado_cotizacion === "enviada_cliente").length,
      cotizadas_sheet: cotizaciones.filter((item) => item.cotizada_sheet).length,
      por_validar: cotizaciones.filter((item) => item.estado_cotizacion === "por_validar").length,
      pricing_respondio_falta_enviar: cotizaciones.filter((item) => item.estado_cotizacion === "pricing_respondio_falta_enviar" || hasPricingReadyEvidence(item)).length,
      cliente_con_duda: cotizaciones.filter((item) => item.estado_cotizacion === "cliente_con_duda" || hasClientDoubtEvidence(item)).length,
      cerradas_con_sam: cotizaciones.filter((item) => item.estado_cotizacion === "cerrada_con_sam").length,
      por_estado: bucketCount(cotizaciones, "estado_cotizacion"),
      por_estado_sheet: bucketCount(cotizaciones, "estado_sheet_canonico"),
      por_estado_ejecutivo: bucketCount(cotizaciones, "estado_cotizacion_ejecutivo"),
      por_regla_status: bucketCount(cotizaciones, "status_rule"),
      por_semaforo: bucketCount(cotizaciones, "semaforo"),
      por_usuario: bucketCount(cotizaciones, "usuario_responsable"),
      por_mes_origen: bucketCount(cotizaciones, "mes_origen"),
      por_periodo_trabajo: bucketCount(cotizaciones, "periodo_trabajo"),
      por_equipo_responsable: bucketCount(cotizaciones, "responsable_equipo"),
      por_sincronizacion: bucketCount(cotizaciones, "estado_sincronizacion"),
      por_decision: bucketCount(cotizaciones, "decision_ejecutiva"),
      por_cola_trabajo: bucketCount(cotizaciones, "cola_trabajo"),
      por_bandeja_ejecutiva: bucketCount(cotizaciones, "bandeja_ejecutiva"),
      por_etapa_comercial: bucketCount(cotizaciones, "etapa_comercial"),
      por_lectura_confianza: bucketCount(cotizaciones, "lectura_confianza"),
      sheet_desfasado: cotizaciones.filter((item) => item.sheet_desfasado).length,
      atoradas: cotizaciones.filter(isQuoteStuck).length,
      antiguedad_promedio_dias: avgNumber(cotizaciones, (item) => item.antiguedad_dias),
    },
    items: cotizaciones,
  },
};

const dashboard = {
  version: "mini-tms-v1",
  generated_at: new Date().toISOString(),
  timezone: state.timezone || timezone,
  summary,
  executive_digest: buildExecutiveDigest(summary, tabs, history),
  tabs,
  history,
  history_summary: {
    registros: history.length,
    registros_crudos: cleanHistory.meta.raw_count,
    candidatos_conservados: cleanHistory.meta.kept_candidates,
    filtrados_sin_cambio: cleanHistory.meta.filtered_count,
    duplicados_filtrados: cleanHistory.meta.duplicate_count,
    limite_aplicado: cleanHistory.meta.limit,
    referencias: new Set(history.map((item) => item.referencia_id || item.referencia).filter(Boolean)).size,
    referencias_sin_sistema: history.filter((item) => item.historial_needs_reference === true).length,
    referencias_con_sistema: history.filter((item) => item.historial_has_system_ref === true).length,
    por_carril: bucketCount(history, "historial_lane"),
    por_riesgo: bucketCount(history, "riesgo_memoria"),
    por_tipo_registro: bucketCount(history, "tipo_registro"),
    por_cambio: bucketCount(history, "tipo_cambio"),
    por_periodo: bucketCount(history, "periodo_trabajo"),
    por_mes: bucketCount(history, "mes_origen"),
  },
  history_raw_summary: cleanHistory.meta,
  source_state: {
    configured_version: state.configured_version || "",
    last_morning_report: state.last_morning_report || "",
    last_midday_report: state.last_midday_report || "",
    last_closing_report: state.last_closing_report || "",
    last_successful_report: state.last_successful_report || "",
    last_report_type: state.last_report_type || "",
    last_sheet_scan: state.last_sheet_scan || null,
    month_policy: {
      active_month_code: activeMonthCode,
      active_month_name: activeMonthName,
      active_sheet_tab: state.last_sheet_scan?.tab || activeMonthName,
      rule: "El mes local actual es la fuente principal; meses anteriores aparecen solo como historicos vivos o inconsistencias.",
    },
    operation_classification: {
      rule: "Operacion requiere embarque SAM o senales operativas claras; INT comercial sin embarque vive en Cotizaciones.",
      candidatas: operacionesCandidatas.length,
      aceptadas_operacion: operaciones.length,
      excluidas_cotizacion: operacionesExcluidasPorCotizacion.length,
      inciertas_descartadas: operacionesInciertasDescartadas.length,
    },
    source_files: {
      outlook_pendientes: Boolean(pendientesRaw.pendientes_abiertos || pendientesRaw.pendientes),
      cotizaciones_metricas: Boolean(cotizacionesRaw.referencias),
      memoria_historica: Boolean(historicaRaw.watchlist || historicaRaw.referencias),
      catalogo_actores: Boolean(actorCatalog.actor_types),
      catalogo_actores_reglas: Object.values(actorCatalog.actor_types || {}).reduce(
        (sum, config) => sum + asArray(config.terms).length + asArray(config.domains).length,
        0
      ),
    },
  },
  warnings: [
    "Este archivo puede contener informacion operativa privada.",
    "No publicarlo en repositorios publicos sin sanitizar.",
    "Usar Cloudflare Access antes de publicar datos reales.",
  ],
};

const outDir = path.join(root, "dashboard", "data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "current.json"), JSON.stringify(dashboard, null, 2), "utf8");
console.log(`Dashboard data generated: ${path.join(outDir, "current.json")}`);
