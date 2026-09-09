const clean = (value) => String(value || "").trim().replace(/\s+/g, " ");

const normalizeKey = (value) =>
  clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const dateValue = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstText = (...values) => values.map(clean).find(Boolean) || "";

const historyKind = (row = {}) => normalizeKey(row.tipo_registro || row.tipo || "registro");

const SYSTEM_REF_RE =
  /\b(?:INT\d{2}-\d{4}-\d{3,4}|(?:AA|IA|EA|IH|EH|DH|DA|IC|EC|DC|EM|IM|AM|DT|ET|IT|WH|DPA|EPA|IPA|APM|EPM|IPM|DPT|EPT|IPT)-\d{6}-\d{4})\b/i;

const historyRef = (row = {}) => {
  if (historyKind(row) === "cotizacion") {
    return firstText(row.referencia_id, row.referencia, row.int_origin_ref, row.int_ref, row.primary_operation_ref, row.id);
  }
  return firstText(row.primary_operation_ref, row.referencia_id, row.referencia, row.int_origin_ref, row.int_ref, row.id);
};

const historyLane = (row = {}) => normalizeKey(row.historial_lane || row.tipo_cambio || row.evento || "sin_cambio");

const historyChange = (row = {}) => normalizeKey(row.tipo_cambio || row.evento || "sin_cambio");

const historyRisk = (row = {}) => normalizeKey(row.riesgo_memoria || row.historial_lane || row.tipo_cambio || "sin_cambio");

const historyDedupeKey = (row = {}) => {
  const ref = normalizeKey(historyRef(row) || "sin_ref");
  return `${historyKind(row)}:${ref}`;
};

const historyHasSystemRef = (row = {}) =>
  SYSTEM_REF_RE.test(
    [
      row.referencia_id,
      row.referencia,
      row.primary_operation_ref,
      row.int_origin_ref,
      row.int_ref,
      row.no_embarque,
      ...(Array.isArray(row.shipment_refs) ? row.shipment_refs : []),
      ...(Array.isArray(row.sam_refs) ? row.sam_refs : []),
    ]
      .map(clean)
      .filter(Boolean)
      .join(" ")
  );

const lanePriority = {
  riesgo_abierto: 0,
  por_validar: 1,
  cambio_pelota: 2,
  movimiento_nuevo: 3,
  arrastre_historico: 4,
  mejora_cierre: 5,
  sin_cambio: 7,
};

const changePriority = {
  empeoro: 0,
  sheet_desfasado: 0,
  cliente_con_duda: 0,
  incierto: 1,
  cambio_pelota: 2,
  nuevo: 3,
  sigue_igual: 5,
  mejoro: 6,
  parece_cerrado: 6,
  cerrado: 6,
};

const riskPriority = {
  riesgo_abierto: 0,
  vigilar: 2,
  arrastre_historico: 3,
  saludable: 5,
  sin_cambio: 7,
};

const historyPriority = (row = {}) =>
  Math.min(
    lanePriority[historyLane(row)] ?? 6,
    changePriority[historyChange(row)] ?? 6,
    riskPriority[historyRisk(row)] ?? 6
  );

const shouldKeepHistoryEvent = (row = {}) => {
  const lane = historyLane(row);
  const change = historyChange(row);
  const risk = historyRisk(row);
  const period = normalizeKey(row.periodo_trabajo || "");
  const hasSummary = Boolean(firstText(row.resumen, row.cambio, row.lectura_memoria));
  if (!historyRef(row) && !hasSummary) return false;
  if (lane === "sin_cambio" && change === "sigue_igual" && risk === "sin_cambio" && period !== "historico_vivo") {
    return false;
  }
  return true;
};

const compareHistoryEvents = (a = {}, b = {}) => {
  const priority = historyPriority(a) - historyPriority(b);
  if (priority !== 0) return priority;
  const refQuality = Number(historyHasSystemRef(b)) - Number(historyHasSystemRef(a));
  if (refQuality !== 0) return refQuality;
  const date = dateValue(b.at || b.fecha_at) - dateValue(a.at || a.fecha_at);
  if (date !== 0) return date;
  return clean(historyDedupeKey(a)).localeCompare(clean(historyDedupeKey(b)), "es");
};

const cleanHistoryEvents = (rows = [], options = {}) => {
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 60;
  const raw = rows.filter(Boolean);
  const keptCandidates = raw.filter(shouldKeepHistoryEvent);
  const byKey = new Map();

  for (const row of keptCandidates) {
    const key = historyDedupeKey(row);
    const enriched = {
      ...row,
      historial_dedupe_key: key,
      historial_priority: historyPriority(row),
      historial_has_system_ref: historyHasSystemRef(row),
      historial_needs_reference: !historyHasSystemRef(row),
      historial_clean_reason: historyHasSystemRef(row)
        ? "evento_representativo_por_referencia"
        : "evento_sin_referencia_sistema_por_validar",
    };
    const previous = byKey.get(key);
    if (!previous || compareHistoryEvents(enriched, previous) < 0) {
      byKey.set(key, enriched);
    }
  }

  const cleanRows = [...byKey.values()].sort(compareHistoryEvents).slice(0, limit);
  return {
    rows: cleanRows,
    meta: {
      raw_count: raw.length,
      kept_candidates: keptCandidates.length,
      clean_count: cleanRows.length,
      filtered_count: Math.max(0, raw.length - keptCandidates.length),
      duplicate_count: Math.max(0, keptCandidates.length - byKey.size),
      limit,
    },
  };
};

module.exports = {
  cleanHistoryEvents,
  compareHistoryEvents,
  historyDedupeKey,
  historyHasSystemRef,
  historyPriority,
  shouldKeepHistoryEvent,
};
