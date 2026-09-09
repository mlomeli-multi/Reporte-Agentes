const nf = new Intl.NumberFormat("es-MX");
const appTimezone = "America/Mexico_City";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: appTimezone,
  }).format(date);
};

const formatMinutes = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return "-";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

const valueText = (value) => {
  const clean = String(value || "").trim();
  return clean || "-";
};

const labelMap = {
  critico: "Critico",
  alta: "Alta",
  alto: "Alto",
  media: "Media",
  medio: "Medio",
  baja: "Baja",
  bajo: "Bajo",
  rojo: "Rojo",
  amarillo: "Amarillo",
  verde: "Verde",
  gris: "Gris",
  abierto: "Abierto",
  cotizacion_activa: "Cotizacion activa",
  cliente_con_duda: "Cliente con duda",
  documental: "Documental",
  en_transito: "En transito",
  pickup_programado: "Pickup programado",
  prealerta: "Prealerta",
  pendiente_pricing: "Pendiente pricing",
  pendiente_pricing_real: "Pendiente pricing real",
  pricing_respondio_falta_enviar: "Pricing respondio, falta enviar",
  enviada_cliente: "Enviada a cliente",
  aceptada_pasa_operacion: "Aceptada, pasa a operacion",
  cerrada_con_sam: "Cerrada con SAM",
  cerrada_sin_sam: "Cerrada sin SAM",
  activa_incierta: "Activa incierta",
  etapa_pricing: "Etapa pricing",
  etapa_multi: "Etapa MULTI",
  etapa_cliente: "Etapa cliente",
  etapa_sam: "Etapa SAM",
  etapa_inconsistencia: "Etapa inconsistencia",
  "true": "Si",
  "false": "No",
  etapa_monitoreo: "Etapa monitoreo",
  sheet_desfasado: "Sheet desfasado",
  sam_ligado: "SAM ligado",
  sin_sam: "Sin SAM",
  embarque: "Embarque",
  embarque_ligado: "Embarque ligado",
  int_provisional: "INT provisional",
  cotizacion_int: "Cotizacion INT",
  cadena_sin_ref: "Cadena sin ref.",
  cadena_en_alerta: "Cadena en alerta",
  cadena_por_validar: "Cadena por validar",
  cadena_espera_externa: "Espera externa",
  cadena_pricing: "Cadena pricing",
  cadena_monitoreo: "Cadena monitoreo",
  cadena_auditoria: "Cadena auditoria",
  cnee: "CNEE",
  shipper: "Shipper",
  proveedor: "Proveedor",
  agente: "Agente",
  cliente: "Cliente",
  multi: "MULTI",
  actor_externo: "Actor externo",
  actores_mixtos: "Actores mixtos",
  actores_mixtos_en_alerta: "Actores mixtos en alerta",
  multiples_alertas: "Multiples alertas",
  requiere_validacion: "Requiere validacion",
  sin_cadenas: "Sin cadenas",
  validacion: "Validacion",
  aereo: "Aereo",
  maritimo: "Maritimo",
  terrestre: "Terrestre",
  warehouse: "Warehouse",
  importacion: "Importacion",
  exportacion: "Exportacion",
  arrastre: "Arrastre",
  almacenaje: "Almacenaje",
  sam_pendiente: "SAM pendiente",
  ops_aereo: "Ops aereo",
  ops_maritimo: "Ops maritimo",
  ops_terrestre: "Ops terrestre",
  ops_warehouse: "Ops warehouse",
  pricing: "Pricing",
  pricing_aereo: "Pricing aereo",
  pricing_maritimo: "Pricing maritimo",
  pricing_terrestre: "Pricing terrestre",
  pricing_warehouse: "Pricing warehouse",
  pricing_general: "Pricing general",
  documental_sam: "Documental / SAM",
  responsable_area: "Area responsable",
  responsable_equipo_reason: "Criterio equipo",
  responsable_equipo_confidence: "Confianza equipo",
  chain_review: "Revision de cadenas",
  outlook_memoria: "Outlook/memoria",
  memoria_historica: "Memoria historica",
  sheet: "Sheet",
  fila: "Fila",
  correo: "Correo",
  sin_link_directo: "Sin link directo",
  decision_por_regla: "Decision por regla",
  explicabilidad: "Explicabilidad",
  multi: "MULTI",
  equipo_mi: "Equipo MI",
  externo: "Externo",
  incierto: "Incierto",
  sin_dato: "Sin dato",
  sin_fecha: "Sin fecha",
  cliente_a_multi: "Cliente a MULTI",
  multi_a_pricing: "MULTI a pricing",
  multi_a_cliente: "MULTI a cliente",
  primera_respuesta: "Primera respuesta",
  envio_cliente: "Envio cliente",
  seguimiento: "Seguimiento",
  atraso_medido: "Atraso medido",
  pricing_abierto: "Pricing abierto",
  respuesta_abierta: "Respuesta abierta",
  falta_evidencia: "Falta evidencia",
  dentro_objetivo: "Dentro objetivo",
  dueno_atraso: "Dueno atraso",
  evidencia: "Evidencia",
  requiere_revision: "Requiere revision",
  medicion_incompleta: "Medicion incompleta",
  vigilar: "Vigilar",
  saludable: "Saludable",
  pricing_a_multi: "Pricing a MULTI",
  lane_tiempo: "Vista tiempo",
  tipo_respuesta: "Tipo respuesta",
  riesgo_calidad: "Riesgo calidad",
  nota_calidad: "Nota calidad",
  tipo_registro: "Tipo",
  historial_lane: "Carril",
  riesgo_memoria: "Riesgo memoria",
  historial_has_system_ref: "Referencia sistema",
  historial_needs_reference: "Falta referencia",
  validar_referencia: "Validar referencia",
  evento_representativo_por_referencia: "Evento representativo",
  evento_sin_referencia_sistema_por_validar: "Sin INT/embarque",
  riesgo_abierto: "Riesgo abierto",
  arrastre_historico: "Arrastre historico",
  movimiento_nuevo: "Movimiento nuevo",
  mejora_cierre: "Mejora / cierre",
  por_validar: "Por validar",
  sin_cambio: "Sin cambio",
  cotizacion: "Cotizacion",
  operacion: "Operacion",
  abierto_sin_fin: "Abierto sin cierre",
  fuera_objetivo: "Fuera de objetivo",
  cerca_objetivo: "Cerca del objetivo",
  cumplido: "Cumplido",
  sin_medicion: "Sin medicion",
  sin_objetivo: "Sin objetivo",
  nuevo: "Nuevo",
  mejoro: "Mejoro",
  empeoro: "Empeoro",
  sigue_igual: "Sigue igual",
  cambio_pelota: "Cambio de pelota",
  parece_cerrado: "Parece cerrado",
  cerrado: "Cerrado",
  memoria_local: "Memoria local",
  google_sheet: "Google Sheet",
  outlook: "Outlook",
  enero: "Enero",
  febrero: "Febrero",
  marzo: "Marzo",
  abril: "Abril",
  mayo: "Mayo",
  junio: "Junio",
  julio: "Julio",
  agosto: "Agosto",
  septiembre: "Septiembre",
  octubre: "Octubre",
  noviembre: "Noviembre",
  diciembre: "Diciembre",
  mes_actual: "Mes actual",
  historico_vivo: "Historico vivo",
  sin_mes_claro: "Sin mes claro",
  frente_activo: "Frente activo",
  historico_en_radar: "Historico en radar",
  espera_externa: "Espera externa",
  monitoreo_operativo: "Monitoreo operativo",
  viva_accionable: "Viva accionable",
  viva_seguimiento: "Viva seguimiento",
  trazabilidad_incompleta: "Trazabilidad incompleta",
  esperando_tercero: "Esperando tercero",
  historico_revisar: "Historico a revisar",
  historico_contexto: "Historico contexto",
  monitoreo_sano: "Monitoreo sano",
  atender_ahora: "Atender ahora",
  revisar_inconsistencia: "Revisar inconsistencia",
  seguimiento_hoy: "Seguimiento hoy",
  actualizar_sheet: "Actualizar Sheet",
  esperar_respuesta: "Esperar respuesta",
  puede_esperar: "Puede esperar",
  mi_foco_ahora: "Mi foco ahora",
  pelota_multi: "Pelota MULTI",
  pelota_pricing: "Pelota pricing",
  pelota_cliente_agente: "Pelota cliente/agente",
  riesgo_documental: "Riesgo documental",
  urgencias_viejas: "Urgencias viejas",
  monitoreo: "Monitoreo",
  prioridad: "Prioridad",
  referencia: "Referencia",
  cliente: "Cliente",
  decision: "Decision",
  estado: "Estado",
  pelota: "Pelota",
  accion: "Accion",
  accion_tipo: "Tipo de accion",
  accion_reason: "Criterio accion",
  accion_confidence: "Confianza accion",
  lectura_confianza: "Lectura",
  lectura_confianza_reason: "Criterio lectura",
  accion_lista: "Accion lista",
  accion_confiable: "Accion confiable",
  accion_probable: "Accion probable",
  validar_antes: "Validar antes",
  sin_evidencia_suficiente: "Sin evidencia suficiente",
  monitoreo_controlado: "Monitoreo controlado",
  validar_cadena: "Validar cadena",
  validar_cierre: "Validar cierre",
  pedir_pod_evidencia: "Pedir POD/evidencia",
  enviar_tarifa_cliente: "Enviar tarifa",
  aclarar_con_pricing: "Aclarar con pricing",
  pedir_eta_pricing: "Pedir ETA pricing",
  responder_duda_cliente: "Responder duda cliente",
  convertir_a_operacion: "Convertir a operacion",
  responder_status_cliente: "Responder status cliente",
  revisar_cliente: "Revisar cliente",
  resolver_cnee_documental: "Resolver CNEE documental",
  seguimiento_cnee: "Seguimiento CNEE",
  confirmar_pickup_shipper: "Confirmar pickup shipper",
  seguimiento_shipper: "Seguimiento shipper",
  confirmar_tarifa_proveedor: "Confirmar tarifa proveedor",
  pedir_update_proveedor: "Pedir update proveedor",
  seguimiento_proveedor: "Seguimiento proveedor",
  validar_prealert_agente: "Validar prealert agente",
  pedir_update_agente: "Pedir update agente",
  seguimiento_agente: "Seguimiento agente",
  resolver_interno_multi: "Resolver interno MULTI",
  validar_actor: "Validar actor",
  actualizado: "Actualizado",
  usuario: "Usuario",
  sync: "Sync",
  duracion: "Duracion",
  responsable: "Responsable",
  ventana: "Ventana",
  observacion: "Observacion",
  fuente: "Fuente",
  cambio: "Cambio",
  asc: "Ascendente",
  desc: "Descendente",
  manana: "Manana",
  mediodia: "Mediodia",
  cierre: "Cierre",
  manual: "Manual",
};

const escapeHtml = (value) =>
  valueText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const labelText = (value) => labelMap[className(value)] || valueText(value).replaceAll("_", " ");

const className = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const setText = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
};

const setStatus = (message, mode) => {
  const node = document.getElementById("dataStatus");
  if (!node) return;
  node.textContent = message;
  node.className = `status-pill ${mode || ""}`.trim();
};

const countFrom = (bucket, ...keys) =>
  keys.reduce((sum, key) => sum + Number(bucket?.[key] || bucket?.[className(key)] || 0), 0);

const setActiveTab = (tabName, updateHash = true) => {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll("[data-panel]").forEach((panel) => {
    const isActive = panel.dataset.panel === tabName;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  if (updateHash) {
    history.replaceState(null, "", "#trabajo");
  }
};

const initializeTabs = () => {
  const buttons = [...document.querySelectorAll("[data-tab]")];
  if (!buttons.length) return;

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const lastIndex = buttons.length - 1;
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? lastIndex
            : event.key === "ArrowRight"
              ? Math.min(lastIndex, index + 1)
              : Math.max(0, index - 1);
      buttons[nextIndex].focus();
      setActiveTab(buttons[nextIndex].dataset.tab);
    });
  });

  setActiveTab("operacion", false);
};

const urgencyRank = (row) => {
  const decision = className(row.decision_ejecutiva);
  const decisionOrder = {
    atender_ahora: 0,
    revisar_inconsistencia: 1,
    seguimiento_hoy: 2,
    actualizar_sheet: 3,
    esperar_respuesta: 4,
    puede_esperar: 5,
  };
  if (decision in decisionOrder) return decisionOrder[decision];
  const criticidad = className(row.criticidad || row.semaforo);
  const state = className(row.estado_cotizacion || row.estado_operativo || row.evento);
  if (criticidad === "critico" || state === "cliente_con_duda" || state === "sheet_desfasado") return 0;
  if (criticidad === "alto" || row.pricing_pendiente_real === true) return 1;
  if (state === "pricing_respondio_falta_enviar") return 2;
  return 3;
};

const getTabs = (data) => ({
  operacion: data.tabs?.operacion?.items || [],
  tiempos: data.tabs?.tiempos_calidad?.items || [],
  cotizaciones: data.tabs?.cotizaciones?.items || [],
  emailThreads: data.tabs?.email_threads?.items || [],
  opKpis: data.tabs?.operacion?.kpis || {},
  timeKpis: data.tabs?.tiempos_calidad?.kpis || {},
  quoteKpis: data.tabs?.cotizaciones?.kpis || {},
});

let dashboardRows = {
  operacion: [],
  tiempos: [],
  cotizaciones: [],
};

let historyRows = [];
let emailThreadRows = [];
let filterEventsBound = false;
let historyEventsBound = false;
let densityEventsBound = false;
let sortEventsBound = false;
let commandEventsBound = false;
let activePresetId = "";
let currentReportText = "";

let tableColumns;

const viewStorageKey = "miniTmsWorkbenchViewsV1";
const defaultTableSort = {
  operacion: { key: "prioridad", direction: "asc" },
  tiempos: { key: "prioridad", direction: "asc" },
  cotizaciones: { key: "prioridad", direction: "asc" },
  historial: { key: "actualizado", direction: "desc" },
};

let tableSort = { ...defaultTableSort };

const readSavedViews = () => {
  try {
    return JSON.parse(localStorage.getItem(viewStorageKey) || "{}");
  } catch {
    return {};
  }
};

const writeSavedViews = (views) => {
  try {
    localStorage.setItem(viewStorageKey, JSON.stringify(views));
  } catch {
    // Ignore blocked browser storage.
  }
};

const savedViews = readSavedViews();

Object.entries(defaultTableSort).forEach(([tableName, fallback]) => {
  tableSort[tableName] = savedViews[tableName]?.sort || fallback;
});

const tableTargets = {
  operacion: "operacionRows",
  tiempos: "tiemposRows",
  cotizaciones: "cotizacionesRows",
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const fieldText = (value) => {
  if (Array.isArray(value)) return value.join(" ");
  if (value && typeof value === "object") return Object.values(value).map(fieldText).join(" ");
  return valueText(value);
};

const rowSearchText = (row) => Object.values(row || {}).map(fieldText).join(" ");

const dateValue = (value) => {
  const date = new Date(value || 0).getTime();
  return Number.isFinite(date) ? date : 0;
};

const sortAccessors = {
  operacion: {
    prioridad: (row) => urgencyRank(row),
    referencia: (row) => row.primary_operation_ref || row.no_embarque || row.shipment_refs?.[0] || row.int_ref || row.referencia_int || row.id,
    cliente: (row) => row.cliente || row.cliente_actor,
    decision: (row) => row.decision_ejecutiva,
    estado: (row) => row.estado_operativo,
    pelota: (row) => row.pelota || row.quien_tiene_la_pelota,
    accion: (row) => row.accion_sugerida || row.accion_siguiente,
    actualizado: (row) => dateValue(row.ultimo_movimiento_at || row.ultima_evidencia_at),
  },
  tiempos: {
    prioridad: (row) => urgencyRank(row),
    referencia: (row) => row.referencia_id || row.referencia,
    tipo: (row) => row.tipo,
    vista: (row) => row.lane_tiempo,
    dueno: (row) => row.dueno_atraso,
    calidad: (row) => row.riesgo_calidad,
    duracion: (row) => Number(row.duracion_min ?? -1),
    semaforo: (row) => row.semaforo,
    responsable: (row) => row.actor_destino || row.actor_responsable,
    ventana: (row) => dateValue(row.inicio_at),
    observacion: (row) => row.observacion,
  },
  cotizaciones: {
    prioridad: (row) => urgencyRank(row),
    referencia: (row) => row.int_ref || row.referencia_int || row.id,
    cliente: (row) => row.cliente || row.cliente_actor,
    usuario: (row) => row.usuario_sheet || row.usuario_responsable,
    decision: (row) => row.decision_ejecutiva,
    estado: (row) => row.estado_cotizacion,
    etapa: (row) => row.etapa_comercial,
    sync: (row) => row.estado_sincronizacion,
    accion: (row) => row.accion_sugerida || row.accion_siguiente,
    antiguedad: (row) => Number(row.antiguedad_dias ?? -1),
  },
  historial: {
    prioridad: (row) => historyLaneRank(row.historial_lane || historyChangeValue(row)),
    referencia: (row) => row.referencia_id || row.referencia,
    cambio: (row) => row.tipo_cambio || row.evento,
    carril: (row) => row.historial_lane,
    riesgo: (row) => row.riesgo_memoria,
    fuente: (row) => row.fuente,
    periodo_trabajo: (row) => row.periodo_trabajo,
    mes_origen: (row) => row.mes_origen,
    actualizado: (row) => dateValue(row.at || row.fecha_at),
  },
};

const completedTimeRows = (rows) => rows.filter((row) => typeof row.duracion_min === "number" && Number.isFinite(row.duracion_min));

const averageMinutes = (rows) => {
  const measured = completedTimeRows(rows);
  return measured.length ? Math.round(measured.reduce((sum, row) => sum + Number(row.duracion_min), 0) / measured.length) : null;
};

const compareSortValues = (left, right) => {
  const leftNumber = typeof left === "number" ? left : Number.NaN;
  const rightNumber = typeof right === "number" ? right : Number.NaN;
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
  return valueText(left).localeCompare(valueText(right), "es", { numeric: true, sensitivity: "base" });
};

const sortRows = (tableName, rows) => {
  const sort = tableSort[tableName] || defaultTableSort[tableName] || defaultTableSort.operacion;
  const accessor = sortAccessors[tableName]?.[sort.key] || sortAccessors[tableName]?.prioridad;
  const sorted = [...rows].sort((a, b) => {
    const bySelected = compareSortValues(accessor(a), accessor(b));
    const direction = sort.direction === "desc" ? -1 : 1;
    if (bySelected !== 0) return bySelected * direction;
    return sortByDecision([a, b])[0] === a ? -1 : 1;
  });
  return sorted;
};

const sortSummary = (tableName) => {
  const sort = tableSort[tableName] || defaultTableSort[tableName];
  return `${labelText(sort.key)} ${labelText(sort.direction)}`;
};

const saveTableView = (tableName) => {
  const search = document.querySelector(`[data-filter-search="${tableName}"]`)?.value || "";
  const filters = {};
  document.querySelectorAll(`[data-filter-table="${tableName}"]`).forEach((select) => {
    if (select.value) filters[select.dataset.filterField] = select.value;
  });
  const views = readSavedViews();
  views[tableName] = { search, filters, sort: tableSort[tableName] || defaultTableSort[tableName] };
  writeSavedViews(views);
};

const saveHistoryView = () => {
  const filters = {};
  document.querySelectorAll("[data-history-filter]").forEach((select) => {
    if (select.value) filters[select.dataset.historyFilter] = select.value;
  });
  const views = readSavedViews();
  views.historial = {
    search: document.querySelector("[data-history-search]")?.value || "",
    filters,
    sort: tableSort.historial || defaultTableSort.historial,
  };
  writeSavedViews(views);
};

const applySavedTableView = (tableName) => {
  const view = savedViews[tableName];
  if (!view) return;
  const search = document.querySelector(`[data-filter-search="${tableName}"]`);
  if (search && view.search) search.value = view.search;
  Object.entries(view.filters || {}).forEach(([field, value]) => setFilterValue(tableName, field, value));
};

const applySavedHistoryView = () => {
  const view = savedViews.historial;
  if (!view) return;
  const search = document.querySelector("[data-history-search]");
  if (search && view.search) search.value = view.search;
  document.querySelectorAll("[data-history-filter]").forEach((select) => {
    const value = view.filters?.[select.dataset.historyFilter];
    if (!value) return;
    const option = [...select.options].find((entry) => className(entry.value) === className(value));
    select.value = option?.value || "";
  });
};

const getColumnValue = (row, column) => {
  if (column.get) return column.get(row);
  const keys = Array.isArray(column.key) ? column.key : [column.key];
  for (const key of keys) {
    const value = row?.[key];
    if (Array.isArray(value) ? value.length : value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const renderTag = (value) => `<span class="tag ${className(value)}">${escapeHtml(labelText(value))}</span>`;

const renderStack = (main, sub = "", extra = "") => `
  <span class="cell-stack">
    <strong>${escapeHtml(main)}</strong>
    ${sub ? `<small>${escapeHtml(sub)}</small>` : ""}
    ${extra}
  </span>
`;

const renderMiniTags = (values) => {
  const tags = uniqueDetailTags(values);
  return tags.length ? `<span class="mini-tags">${tags.map(renderTag).join("")}</span>` : "";
};

const refsText = (row) => {
  const refs = row.shipment_refs || row.sam_refs || row.referencias_sam || [];
  if (Array.isArray(refs) && refs.length) return refs.join(" / ");
  return row.int_ref || row.referencia_int ? "INT provisional" : "Embarque pendiente";
};

const primaryReferenceText = (row) => row.primary_operation_ref || row.no_embarque || row.shipment_refs?.[0] || row.int_ref || row.referencia_int || row.id;

const renderReferenceCell = (row) => {
  const primary = primaryReferenceText(row);
  const shipmentRefs = row.shipment_refs || row.sam_refs || row.referencias_sam || [];
  const hasShipment = Array.isArray(shipmentRefs) && shipmentRefs.length > 0;
  const origin = row.int_origin_ref || row.int_ref || row.referencia_int;
  const sub = hasShipment
    ? primary === shipmentRefs[0] || primary === row.no_embarque
      ? `Origen INT: ${origin || "sin INT visible"}`
      : `Embarque: ${shipmentRefs.join(" / ")}`
    : refsText(row);
  return renderStack(
    primary,
    sub,
    renderMiniTags([row.operation_identity, row.periodo_trabajo, row.mes_origen, row.confianza || row.estado_sincronizacion])
  );
};

const renderClientCell = (row) =>
  renderStack(row.cliente || row.cliente_actor || "-", row.servicio || row.modalidad || row.usuario_sheet || "");

const renderDecisionCell = (row) => `
  <span class="decision-cell">
    ${renderTag(row.decision_ejecutiva)}
    ${renderTag(row.cola_trabajo)}
  </span>
`;

const renderStatusCell = (row, primary, secondary) => `
  <span class="status-cell">
    ${renderTag(row[primary])}
    ${secondary && row[secondary] ? renderTag(row[secondary]) : ""}
  </span>
`;

const renderActionCell = (row) =>
  renderStack(
    row.accion_sugerida || row.accion_siguiente || "-",
    row.motivo_prioridad || row.ultimo_movimiento_resumen || row.ultima_evidencia || "",
    renderMiniTags([row.lectura_confianza, row.accion_confidence])
  );

const renderDateCell = (row) => renderStack(formatDate(row.ultimo_movimiento_at || row.ultima_evidencia_at || row.inicio_at), row.frescura ? labelText(row.frescura) : "");

const renderDetailLine = (label, value, formatter = valueText) => {
  const clean = formatter(value);
  if (!clean || clean === "-") return "";
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(clean)}</dd></div>`;
};

const renderDetailTags = (row) => {
  const tags = uniqueDetailTags([
    row.decision_ejecutiva,
    row.cola_trabajo,
    row.criticidad || row.semaforo,
    row.estado_operativo || row.estado_cotizacion,
    row.operation_identity,
    row.shipment_modalidad,
    row.shipment_tipo,
    row.periodo_trabajo,
    row.mes_origen,
    row.frescura,
    row.confianza,
    row.lectura_confianza,
  ]);

  return tags.length ? `<div class="detail-tags">${tags.map(renderTag).join("")}</div>` : "";
};

const uniqueDetailTags = (values) => {
  const seen = new Set();
  const tags = [];
  values.forEach((value) => {
    const key = className(value);
    if (!key || seen.has(key) || key === "sin_dato") return;
    seen.add(key);
    tags.push(value);
  });
  return tags;
};

const renderEvidenceLink = (evidence) => {
  const link = evidence?.link;
  if (!link) return "";
  return `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Abrir evidencia</a>`;
};

const renderRelatedChains = (row) => {
  const chains = Array.isArray(row.cadenas_relacionadas) ? row.cadenas_relacionadas.slice(0, 5) : [];
  if (!chains.length) return "";
  return `
    <div class="related-chains">
      <strong>Cadenas relacionadas</strong>
      ${chains
        .map(
          (chain) => `
            <div class="related-chain">
              <span>${renderTag(chain.actor_tipo || "actor_externo")}${renderTag(chain.lane_cadena || "cadena_monitoreo")}</span>
              <p>${escapeHtml(chain.asunto || "Cadena sin asunto")}</p>
              <small>${escapeHtml(chain.accion_sugerida || "Sin accion calculada.")}</small>
            </div>
          `
        )
        .join("")}
    </div>
  `;
};

const renderChainAudit = (row) => {
  const audit = row.auditoria_cadenas;
  if (!audit) return "";
  const actors = Array.isArray(audit.actors) ? audit.actors.map(labelText).join(" / ") : "";
  const counts = [
    audit.chains_total != null ? `${audit.chains_total} cadenas` : "",
    audit.alert_count ? `${audit.alert_count} en alerta` : "",
    audit.validate_count ? `${audit.validate_count} por validar` : "",
    audit.pricing_count ? `${audit.pricing_count} pricing` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <div class="chain-audit chain-audit-${className(audit.severity || "bajo")}">
      <strong>Auditoria de cadenas</strong>
      <p>${renderTag(audit.status || "ok")}${renderTag(audit.severity || "bajo")}</p>
      <small>${escapeHtml([counts, actors].filter(Boolean).join(" · "))}</small>
      <small>${escapeHtml(audit.recommendation || "Sin recomendacion de auditoria.")}</small>
    </div>
  `;
};

const evidenceItems = (row) => {
  const items = [];
  if (row.evidencia) items.push(row.evidencia);
  if (Array.isArray(row.evidencias)) items.push(...row.evidencias);
  return items.filter(Boolean);
};

const uniqueTexts = (values) => {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const text = valueText(value);
    const key = className(text);
    if (!key || key === "sin_dato" || key === "-" || seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });
  return result;
};

const rowKindLabel = (kind) => {
  if (kind === "operacion") return "Operacion";
  if (kind === "cotizaciones") return "Cotizacion";
  if (kind === "tiempos") return "Tiempo/calidad";
  return "Registro";
};

const rowDisplayReference = (row, kind) => {
  if (kind === "tiempos") return row.referencia_id || row.referencia || row.id || "Sin referencia";
  return primaryReferenceText(row) || row.id || row.int_ref || row.referencia_int || "Sin referencia";
};

const sourceLabels = (row) =>
  uniqueTexts([
    row.fuente_principal,
    row.evidencia?.fuente,
    row.source_sheet_snapshot ? "google_sheet" : "",
    row.source_outlook_snapshot ? "outlook" : "",
    ...evidenceItems(row).map((item) => item.fuente),
  ]).map(labelText);

const hasEvidenceLink = (row) => evidenceItems(row).some((item) => valueText(item.link) !== "-");

const evidenceCount = (row) => evidenceItems(row).length;

const explainabilityRule = (row, kind) => {
  if (kind === "operacion" && className(row.operation_identity) === "embarque") {
    return "Embarque SAM manda; el INT queda como origen comercial.";
  }
  if (kind === "operacion" && className(row.operation_identity) === "int_provisional") {
    return "Operacion provisional por INT; falta confirmar embarque SAM.";
  }
  if (kind === "cotizaciones" && row.pricing_pendiente_real === true) {
    return "Pendiente real de Pricing por estatus Sheet/correo.";
  }
  if (kind === "cotizaciones" && className(row.estado_cotizacion) === "pricing_respondio_falta_enviar") {
    return "Pricing ya respondio; falta confirmar envio o siguiente paso.";
  }
  if (kind === "cotizaciones") {
    return "Cotizacion vive por estatus comercial, cliente, Pricing o sync.";
  }
  if (kind === "tiempos") {
    return "Medicion tomada de hitos visibles entre solicitud, respuesta y cierre.";
  }
  return "Decision por regla operativa V1.";
};

const explainabilityIssues = (row, kind) => {
  const issues = [];
  if (className(row.lectura_confianza) === "validar_antes") issues.push("Validar cadena, actor o sync antes de accionar.");
  if (className(row.lectura_confianza) === "sin_evidencia_suficiente") issues.push("Falta evidencia suficiente para recomendar accion segura.");
  if (className(row.estado_sincronizacion) === "sheet_desfasado" || row.sheet_desfasado === true) issues.push("Sheet y correo/memoria no cuentan la misma historia.");
  if (className(row.actor_confidence) === "baja") issues.push("Actor detectado con baja confianza.");
  if (className(row.responsable_equipo_confidence) === "baja") issues.push("Responsable asignado con baja confianza.");
  if (!hasEvidenceLink(row)) issues.push("Sin link directo a evidencia.");
  if (kind === "operacion" && className(row.operation_identity) !== "embarque") issues.push("Operacion sin embarque SAM confirmado.");
  if (kind === "tiempos" && className(row.estado_medicion) === "sin_medicion") issues.push("Medicion incompleta.");
  if (!evidenceCount(row)) issues.push("Sin evidencia estructurada.");
  return uniqueTexts(issues);
};

const qualityRisk = (row, kind) => {
  const trust = className(row.lectura_confianza);
  const issues = explainabilityIssues(row, kind);
  let score = issues.length;
  if (trust === "validar_antes") score += 3;
  if (trust === "sin_evidencia_suficiente") score += 4;
  if (className(row.decision_ejecutiva) === "revisar_inconsistencia") score += 2;
  if (className(row.semaforo) === "rojo" || className(row.criticidad) === "critico") score += 1;
  return score;
};

const renderExplainabilityCard = (row, kind) => {
  const sources = sourceLabels(row);
  const issues = explainabilityIssues(row, kind);
  const evidenceSummary = evidenceItems(row)
    .map((item) => item.resumen)
    .filter(Boolean)[0];

  return `
    <section class="explain-card status-${className(row.lectura_confianza || "sin_dato")}">
      <div>
        <strong>Por que aparece</strong>
        <span>${renderTag(row.lectura_confianza || "sin_dato")}${renderTag(row.accion_confidence || row.confianza || "sin_dato")}</span>
      </div>
      <p>${escapeHtml(row.motivo_prioridad || row.lectura_confianza_reason || explainabilityRule(row, kind))}</p>
      <dl>
        <div><dt>Fuente</dt><dd>${escapeHtml(sources.join(" / ") || "Sin fuente clara")}</dd></div>
        <div><dt>Regla</dt><dd>${escapeHtml(explainabilityRule(row, kind))}</dd></div>
        <div><dt>Evidencias</dt><dd>${escapeHtml(`${evidenceCount(row)} registro(s)${hasEvidenceLink(row) ? " con link" : " sin link directo"}`)}</dd></div>
        <div><dt>Falta revisar</dt><dd>${escapeHtml(issues.join(" / ") || "Nada critico con la lectura actual")}</dd></div>
      </dl>
      ${evidenceSummary ? `<small>${escapeHtml(evidenceSummary)}</small>` : ""}
    </section>
  `;
};

const renderRowDetails = (row, kind) => {
  const details = [
    renderDetailLine("Motivo", row.motivo_prioridad),
    renderDetailLine("Ultimo movimiento", row.ultimo_movimiento_resumen || row.ultimo_movimiento || row.ultima_evidencia),
    renderDetailLine("Proceso/estado", row.proceso_actual || row.estado_operativo || row.estado_cotizacion),
    renderDetailLine("Operacion real", row.primary_operation_ref || row.no_embarque),
    renderDetailLine("INT origen", row.int_origin_ref || row.int_ref),
    renderDetailLine("Cadena accionable", row.cadena_accionable?.asunto || row.cadena_correo),
    renderDetailLine("Actor accionable", row.actor_tipo_accionable || row.cadena_accionable?.actor_tipo || row.actor_tipo, labelText),
    renderDetailLine("Tipo de accion", row.accion_tipo || row.cadena_accionable?.accion_tipo, labelText),
    renderDetailLine("Confianza accion", row.accion_confidence || row.cadena_accionable?.accion_confidence, labelText),
    renderDetailLine("Criterio accion", row.accion_reason || row.cadena_accionable?.accion_reason, labelText),
    renderDetailLine("Lectura de confianza", row.lectura_confianza, labelText),
    renderDetailLine("Criterio de confianza", row.lectura_confianza_reason),
    renderDetailLine("Cadenas ligadas", row.cadenas_relacionadas_count != null ? `${row.cadenas_relacionadas_count}` : ""),
    renderDetailLine("Registros consolidados", row.duplicados_operacion_ocultos ? `${Number(row.duplicados_operacion_ocultos) + 1} registros locales en una fila ejecutiva` : ""),
    renderDetailLine("Tipo de cadena", row.actor_tipo, labelText),
    renderDetailLine("Actor principal", row.actor_principal),
    renderDetailLine("Confianza actor", row.actor_confidence, labelText),
    renderDetailLine("Criterio actor", row.actor_detection_reason),
    renderDetailLine("Dominio remitente", row.sender_domain),
    renderDetailLine("Cadena", row.cadena_correo),
    renderDetailLine("Clasificacion", [row.shipment_modalidad, row.shipment_tipo].filter(Boolean).map(labelText).join(" / ")),
    renderDetailLine("Vista operativa", row.vista_operativa, labelText),
    renderDetailLine("Salud TMS", row.estado_tms_operacion, labelText),
    renderDetailLine("Criterio TMS", row.razon_tms),
    renderDetailLine("Pelota", row.pelota || row.quien_tiene_la_pelota),
    renderDetailLine("Responsable", row.responsable_multi || row.usuario_sheet || row.responsable_equipo),
    renderDetailLine("Equipo responsable", row.responsable_equipo, labelText),
    renderDetailLine("Area responsable", row.responsable_area, labelText),
    renderDetailLine("Criterio equipo", row.responsable_equipo_reason),
    renderDetailLine("Confianza equipo", row.responsable_equipo_confidence, labelText),
    renderDetailLine("Periodo", row.periodo_trabajo ? `${labelText(row.periodo_trabajo)} · ${row.mes_origen || "Sin mes claro"}` : ""),
    renderDetailLine("Embarque", refsText(row)),
    renderDetailLine("Fuente", row.fuente_principal || row.evidencia?.fuente),
  ].filter(Boolean);

  if (kind === "tiempos") {
    details.splice(
      1,
      0,
      renderDetailLine("Inicio", row.inicio_at, formatDate),
      renderDetailLine("Fin", row.fin_at, formatDate),
      renderDetailLine("Objetivo", row.objetivo_min, formatMinutes),
      renderDetailLine("Brecha", row.brecha_min, formatMinutes),
      renderDetailLine("Estado medicion", row.estado_medicion, labelText),
      renderDetailLine("Vista tiempo", row.lane_tiempo, labelText),
      renderDetailLine("Dueno atraso", row.dueno_atraso, labelText),
      renderDetailLine("Riesgo calidad", row.riesgo_calidad, labelText),
      renderDetailLine("Lectura", row.lectura_tiempo),
      renderDetailLine("Equipo", row.responsable_equipo, labelText)
    );
  }

  if (kind === "cotizaciones") {
    details.splice(
      1,
      0,
      renderDetailLine("Etapa comercial", row.etapa_comercial, labelText),
      renderDetailLine("Antiguedad", row.antiguedad_dias != null ? `${row.antiguedad_dias} dias` : ""),
      renderDetailLine("Solicitud", row.solicitud_cliente_at, formatDate),
      renderDetailLine("Pricing responde", row.pricing_responde_at, formatDate),
      renderDetailLine("Enviada cliente", row.tarifa_enviada_cliente_at, formatDate)
    );
  }

  return `
    <div class="row-detail-panel">
      ${renderDetailTags(row)}
      ${renderExplainabilityCard(row, kind)}
      <dl>${details.join("")}</dl>
      ${kind === "operacion" ? renderChainAudit(row) : ""}
      ${kind === "operacion" ? renderRelatedChains(row) : ""}
      ${renderEvidenceLink(row.evidencia)}
    </div>
  `;
};

const renderDetailButton = (rowId) => `
  <button class="detail-toggle" type="button" data-row-detail-toggle="${escapeHtml(rowId)}" aria-expanded="false" aria-label="Ver detalle" title="Ver detalle">
    <span aria-hidden="true">+</span>
  </button>
`;

tableColumns = {
  operacion: [
    { render: renderReferenceCell, className: "col-ref" },
    { render: renderClientCell, className: "col-client" },
    { render: renderDecisionCell, className: "col-decision" },
    { render: (row) => renderStatusCell(row, "estado_operativo", "criticidad"), className: "col-status" },
    { key: ["pelota", "quien_tiene_la_pelota"], className: "col-owner" },
    { render: renderActionCell, className: "col-action" },
    { render: renderDateCell, className: "col-date" },
    { detail: true, className: "col-detail" },
  ],
  tiempos: [
    { render: (row) => renderStack(row.referencia_id || row.referencia, row.lane_tiempo ? labelText(row.lane_tiempo) : ""), className: "col-ref" },
    { render: (row) => `<span class="status-cell">${renderTag(row.tipo)}${row.tipo_respuesta ? renderTag(row.tipo_respuesta) : ""}</span>`, className: "col-status" },
    { key: "duracion_min", format: formatMinutes, className: "col-date" },
    { render: (row) => `<span class="status-cell">${renderTag(row.semaforo)}${row.riesgo_calidad ? renderTag(row.riesgo_calidad) : ""}</span>`, className: "col-status" },
    { key: ["actor_destino", "actor_responsable"], className: "col-owner" },
    { render: (row) => renderStack(formatDate(row.inicio_at), row.fin_at ? `Fin: ${formatDate(row.fin_at)}` : "Abierto / sin fin visible"), className: "col-date-wide" },
    { key: "observacion", className: "col-action" },
    { detail: true, className: "col-detail" },
  ],
  cotizaciones: [
    { render: renderReferenceCell, className: "col-ref" },
    { render: renderClientCell, className: "col-client" },
    { key: ["usuario_sheet", "usuario_responsable"], className: "col-owner" },
    { render: renderDecisionCell, className: "col-decision" },
    { render: (row) => renderStatusCell(row, "estado_cotizacion", "semaforo"), className: "col-status" },
    { render: (row) => renderStatusCell(row, "estado_sincronizacion", ""), className: "col-status" },
    { render: renderActionCell, className: "col-action" },
    { detail: true, className: "col-detail" },
  ],
};

const rowIncludes = (row, ...terms) => {
  const text = normalizeText(rowSearchText(row));
  return terms.some((term) => text.includes(normalizeText(term)));
};

const quickViews = [
  {
    id: "atender-ahora",
    table: "operacion",
    filters: { vista_operativa: "frente_activo", decision_ejecutiva: "atender_ahora" },
    count: (rows) =>
      rows.operacion.filter((row) => className(row.vista_operativa) === "frente_activo" && className(row.decision_ejecutiva) === "atender_ahora")
        .length,
  },
  {
    id: "seguimiento-hoy",
    table: "operacion",
    filters: { vista_operativa: "frente_activo", decision_ejecutiva: "seguimiento_hoy" },
    count: (rows) =>
      rows.operacion.filter((row) => className(row.vista_operativa) === "frente_activo" && className(row.decision_ejecutiva) === "seguimiento_hoy")
        .length,
  },
  {
    id: "criticos",
    table: "operacion",
    filters: { criticidad: "critico" },
    count: (rows) => rows.operacion.filter((row) => className(row.criticidad) === "critico").length,
  },
  {
    id: "mes-actual",
    table: "cotizaciones",
    filters: { periodo_trabajo: "mes_actual" },
    count: (rows) => rows.cotizaciones.filter((row) => className(row.periodo_trabajo) === "mes_actual").length,
  },
  {
    id: "historico-vivo",
    table: "operacion",
    filters: { vista_operativa: "historico_en_radar" },
    count: (rows) => rows.operacion.filter((row) => className(row.vista_operativa) === "historico_en_radar").length,
  },
  {
    id: "pricing-pendiente",
    table: "cotizaciones",
    filters: { pricing_pendiente_real: true },
    count: (rows) => rows.cotizaciones.filter((row) => row.pricing_pendiente_real === true).length,
  },
  {
    id: "pricing-falta-enviar",
    table: "cotizaciones",
    filters: { estado_cotizacion: "pricing_respondio_falta_enviar" },
    count: (rows) => rows.cotizaciones.filter((row) => className(row.estado_cotizacion) === "pricing_respondio_falta_enviar").length,
  },
  {
    id: "cliente-dudas",
    table: "cotizaciones",
    filters: { estado_cotizacion: "cliente_con_duda" },
    count: (rows) => rows.cotizaciones.filter((row) => className(row.estado_cotizacion) === "cliente_con_duda").length,
  },
  {
    id: "revisar-inconsistencia",
    table: "cotizaciones",
    filters: { decision_ejecutiva: "revisar_inconsistencia" },
    count: (rows) => rows.cotizaciones.filter((row) => className(row.decision_ejecutiva) === "revisar_inconsistencia").length,
  },
  {
    id: "validar-antes",
    table: "operacion",
    filters: { lectura_confianza: "validar_antes" },
    count: (rows) => rows.operacion.filter((row) => className(row.lectura_confianza) === "validar_antes").length,
  },
  {
    id: "sheet-desfasado",
    table: "cotizaciones",
    filters: { estado_sincronizacion: "sheet_desfasado" },
    count: (rows) => rows.cotizaciones.filter((row) => className(row.estado_sincronizacion) === "sheet_desfasado").length,
  },
  {
    id: "respuestas-rojas",
    table: "tiempos",
    filters: { semaforo: "rojo" },
    count: (rows) => rows.tiempos.filter((row) => className(row.semaforo) === "rojo").length,
  },
  {
    id: "pendiente-miguel",
    table: "operacion",
    search: "Miguel",
    count: (rows) => rows.operacion.filter((row) => rowIncludes(row, "Miguel")).length,
  },
  {
    id: "pendiente-cliente",
    table: "operacion",
    search: "cliente",
    count: (rows) => rows.operacion.filter((row) => rowIncludes(row, "cliente")).length,
  },
];

const optionLabel = (value) => {
  const text = labelText(value);
  return text === "-" ? "Sin dato" : text;
};

const getFieldValues = (rows, field) => {
  const values = new Map();
  rows.forEach((row) => {
    const raw = row?.[field];
    const list = Array.isArray(raw) ? raw : [raw];
    list.forEach((value) => {
      const text = valueText(value);
      if (text !== "-") values.set(text, optionLabel(text));
    });
  });
  return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
};

const populateFilters = (tableName, rows) => {
  document.querySelectorAll(`[data-filter-table="${tableName}"]`).forEach((select) => {
    const current = select.value;
    const field = select.dataset.filterField;
    const options = getFieldValues(rows, field);
    select.innerHTML = [
      `<option value="">Todos</option>`,
      ...options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`),
    ].join("");
    if (options.some(([value]) => value === current)) select.value = current;
  });
};

const clearFilterValues = (tableName) => {
  const search = document.querySelector(`[data-filter-search="${tableName}"]`);
  if (search) search.value = "";
  document.querySelectorAll(`[data-filter-table="${tableName}"]`).forEach((select) => {
    select.value = "";
  });
};

const setFilterValue = (tableName, field, value) => {
  const select = document.querySelector(`[data-filter-table="${tableName}"][data-filter-field="${field}"]`);
  if (!select) return;
  const option = [...select.options].find((entry) => className(entry.value) === className(value));
  select.value = option?.value || "";
};

const setHistoryFilterValue = (field, value) => {
  const select = document.querySelector(`[data-history-filter="${field}"]`);
  if (!select) return;
  const option = [...select.options].find((entry) => className(entry.value) === className(value));
  select.value = option?.value || "";
};

const applyCommandTarget = (commandTarget) => {
  if (commandTarget?.table === "historial") {
    const search = document.querySelector("[data-history-search]");
    if (search) search.value = commandTarget.search || "";
    document.querySelectorAll("[data-history-filter]").forEach((select) => {
      select.value = "";
    });
    Object.entries(commandTarget.filters || {}).forEach(([field, value]) => setHistoryFilterValue(field, value));
    saveHistoryView();
    applyHistoryFilters();
    document.getElementById("historial")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (!commandTarget?.table || !dashboardRows[commandTarget.table]) return;
  const tableName = commandTarget.table;
  activePresetId = "";
  setActiveTab(tableName);
  Object.keys(dashboardRows).forEach(clearFilterValues);

  if (commandTarget.search) {
    const search = document.querySelector(`[data-filter-search="${tableName}"]`);
    if (search) search.value = commandTarget.search;
  }
  Object.entries(commandTarget.filters || {}).forEach(([field, value]) => setFilterValue(tableName, field, value));

  saveTableView(tableName);
  updateQuickViewState();
  renderFilteredTables();
  document.getElementById("trabajo")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const initializeExecutiveActions = () => {
  if (commandEventsBound) return;
  document.addEventListener("click", async (event) => {
    const targetButton = event.target.closest("[data-command-target]");
    if (targetButton) {
      try {
        applyCommandTarget(JSON.parse(targetButton.dataset.commandTarget || "{}"));
      } catch {
        // Ignore malformed local action payloads.
      }
      return;
    }

    const copyButton = event.target.closest("#copyReportText");
    if (!copyButton) return;
    try {
      await navigator.clipboard.writeText(currentReportText);
      copyButton.textContent = "Copiado";
      window.setTimeout(() => {
        copyButton.textContent = "Copiar reporte";
      }, 1400);
    } catch {
      copyButton.textContent = "No se pudo copiar";
      window.setTimeout(() => {
        copyButton.textContent = "Copiar reporte";
      }, 1800);
    }
  });
  commandEventsBound = true;
};

const getActiveFilters = (tableName) => {
  const search = document.querySelector(`[data-filter-search="${tableName}"]`)?.value || "";
  const selects = [...document.querySelectorAll(`[data-filter-table="${tableName}"]`)].map((select) => ({
    field: select.dataset.filterField,
    value: select.value,
  }));
  return { search, selects };
};

const fieldMatches = (rowValue, selectedValue) => {
  if (!selectedValue) return true;
  const values = Array.isArray(rowValue) ? rowValue : [rowValue];
  return values.some((value) => normalizeText(valueText(value)) === normalizeText(selectedValue));
};

const applyRowFilters = (tableName, rows) => {
  const { search, selects } = getActiveFilters(tableName);
  const normalizedSearch = normalizeText(search);
  return rows.filter((row) => {
    const matchesSearch = !normalizedSearch || normalizeText(rowSearchText(row)).includes(normalizedSearch);
    const matchesSelects = selects.every((filter) => fieldMatches(row?.[filter.field], filter.value));
    return matchesSearch && matchesSelects;
  });
};

const activeFilterCount = (tableName) => {
  const { search, selects } = getActiveFilters(tableName);
  return Number(Boolean(search.trim())) + selects.filter((filter) => Boolean(filter.value)).length;
};

const renderActiveFilterChips = (tableName) => {
  const target = document.querySelector(`[data-active-filters="${tableName}"]`);
  if (!target) return;

  const { search, selects } = getActiveFilters(tableName);
  const chips = [];
  if (search.trim()) chips.push({ field: "__search", label: "Busqueda", value: search.trim() });
  selects
    .filter((filter) => filter.value)
    .forEach((filter) => chips.push({ field: filter.field, label: labelText(filter.field), value: labelText(filter.value) }));
  chips.push({ field: "__sort", label: "Orden", value: sortSummary(tableName), readonly: true });

  target.innerHTML = chips.length
    ? chips
        .map((chip) =>
          chip.readonly
            ? `
              <span class="filter-chip readonly">
                <strong>${escapeHtml(chip.label)}</strong>
                ${escapeHtml(chip.value)}
              </span>
            `
            : `
              <button type="button" class="filter-chip removable" data-filter-remove="${escapeHtml(tableName)}" data-filter-field="${escapeHtml(chip.field)}" aria-label="Quitar filtro ${escapeHtml(chip.label)}">
                <strong>${escapeHtml(chip.label)}</strong>
                <span>${escapeHtml(chip.value)}</span>
                <em aria-hidden="true">x</em>
              </button>
            `
        )
        .join("")
    : '<span class="filter-chip muted">Vista completa</span>';
};

const sortByDecision = (rows) =>
  [...rows].sort((a, b) => {
    const byUrgency = urgencyRank(a) - urgencyRank(b);
    if (byUrgency !== 0) return byUrgency;
    const aDate = new Date(a.ultimo_movimiento_at || a.ultima_evidencia_at || a.at || a.fecha_at || 0).getTime();
    const bDate = new Date(b.ultimo_movimiento_at || b.ultima_evidencia_at || b.at || b.fecha_at || 0).getTime();
    return bDate - aDate;
  });

const updateQuickViewState = () => {
  document.querySelectorAll("[data-view-preset]").forEach((button) => {
    button.classList.toggle("active", button.dataset.viewPreset === activePresetId);
  });
};

const renderQuickViews = () => {
  quickViews.forEach((preset) => {
    const button = document.querySelector(`[data-view-preset="${preset.id}"]`);
    const countTarget = document.getElementById(`preset-${preset.id}`);
    const count = preset.count(dashboardRows);
    if (countTarget) countTarget.textContent = nf.format(count);
    if (button) button.disabled = count === 0;
  });
  updateQuickViewState();
};

const operationLaneDefinitions = [
  {
    id: "frente_activo",
    title: "Frente activo",
    detail: "Accion y seguimiento real para hoy",
  },
  {
    id: "historico_en_radar",
    title: "Historico en radar",
    detail: "Arrastre vivo separado de la prioridad",
  },
  {
    id: "por_validar",
    title: "Por validar",
    detail: "Falta trazabilidad o evidencia clara",
  },
  {
    id: "espera_externa",
    title: "Espera externa",
    detail: "Cliente, agente o tercero con la pelota",
  },
  {
    id: "monitoreo_operativo",
    title: "Monitoreo",
    detail: "Abierta sin bloqueo inmediato",
  },
];

const currentOperationView = () =>
  document.querySelector('[data-filter-table="operacion"][data-filter-field="vista_operativa"]')?.value || "";

const renderOperationInsights = (visibleRows, allRows) => {
  const lanesTarget = document.getElementById("operationLanes");
  const all = allRows || [];
  const activeView = className(currentOperationView());
  const counts = countBy(all, (row) => row.vista_operativa || "por_validar");

  if (lanesTarget) {
    lanesTarget.innerHTML = operationLaneDefinitions
      .map((lane) => {
        const count = Number(counts[lane.id] || 0);
        return `
          <button type="button" class="${activeView === lane.id ? "active" : ""}" data-operation-lane="${escapeHtml(lane.id)}">
            <span>
              <strong>${escapeHtml(lane.title)}</strong>
              <small>${escapeHtml(lane.detail)}</small>
            </span>
            <em>${nf.format(count)}</em>
          </button>
        `;
      })
      .join("");
  }

  setText("opsActiveFront", nf.format(visibleRows.filter((row) => className(row.vista_operativa) === "frente_activo").length));
  setText("opsHistoricalRadar", nf.format(visibleRows.filter((row) => className(row.vista_operativa) === "historico_en_radar").length));
  setText("opsValidate", nf.format(visibleRows.filter((row) => className(row.vista_operativa) === "por_validar").length));
  setText("opsExternalWait", nf.format(visibleRows.filter((row) => className(row.vista_operativa) === "espera_externa").length));
};

const rowReferenceForReview = (row) =>
  row.primary_operation_ref || row.no_embarque || row.shipment_refs?.[0] || row.int_origin_ref || row.int_ref || row.id || "";

const operationNeedsChainReview = (row) => {
  const auditStatus = className(row.auditoria_cadenas_status || row.auditoria_cadenas?.status);
  const trust = className(row.lectura_confianza);
  return (
    row.necesita_validar_cadena === true ||
    trust === "validar_antes" ||
    auditStatus === "requiere_validacion" ||
    auditStatus === "actores_mixtos_en_alerta" ||
    auditStatus === "multiples_alertas" ||
    className(row.cadena_accionable_lane) === "cadena_por_validar" ||
    className(row.accion_confidence || row.cadena_accionable?.accion_confidence) === "baja"
  );
};

const chainReviewTarget = (row) => ({
  table: "operacion",
  filters: {},
  search: rowReferenceForReview(row),
});

const dedupeReviewRows = (rows) => {
  const byKey = new Map();
  rows.forEach((row) => {
    const chain = row.cadena_accionable || row.cadenas_relacionadas?.[0] || {};
    const key = [
      rowReferenceForReview(row),
      chain.asunto || row.cadena_correo || row.id,
      chain.actor_tipo || row.actor_tipo_accionable || row.actor_tipo,
    ]
      .map(className)
      .join("|");
    const current = byKey.get(key);
    if (!current || dateValue(row.ultimo_movimiento_at) > dateValue(current.ultimo_movimiento_at)) {
      byKey.set(key, row);
    }
  });
  return [...byKey.values()];
};

const renderMetricCard = (label, value, detail, filter = {}) => `
  <button type="button" class="chain-metric-card" data-command-target="${escapeHtml(JSON.stringify({ table: "operacion", filters: filter, search: "" }))}">
    <span>${escapeHtml(label)}</span>
    <strong>${nf.format(value)}</strong>
    <small>${escapeHtml(detail)}</small>
  </button>
`;

const renderChainReviewBoard = (visibleRows, allRows, threads) => {
  const metricsTarget = document.getElementById("chainReviewMetrics");
  const queueTarget = document.getElementById("chainReviewQueue");
  if (!metricsTarget && !queueTarget) return;

  const allOps = allRows || [];
  const allThreads = threads || [];
  const visibleReview = dedupeReviewRows(visibleRows.filter(operationNeedsChainReview));
  const allReview = dedupeReviewRows(allOps.filter(operationNeedsChainReview));
  const mixedAlert = dedupeReviewRows(allOps.filter((row) => className(row.auditoria_cadenas_status) === "actores_mixtos_en_alerta"));
  const multipleAlerts = dedupeReviewRows(allOps.filter((row) => className(row.auditoria_cadenas_status) === "multiples_alertas"));
  const lowTrust = dedupeReviewRows(allOps.filter((row) => className(row.lectura_confianza) === "validar_antes"));
  const chainAlerts = allThreads.filter((row) => ["cadena_en_alerta", "cadena_por_validar"].includes(className(row.lane_cadena)));

  setText("chainReviewCount", `${nf.format(visibleReview.length)} visibles`);
  setText("chainReviewVisible", `${nf.format(allReview.length)} total`);

  if (metricsTarget) {
    metricsTarget.innerHTML = [
      renderMetricCard("Validar antes", lowTrust.length, "Accion degradada por confianza", { lectura_confianza: "validar_antes" }),
      renderMetricCard("Actores en alerta", mixedAlert.length, "Varias cadenas con actor delicado", { auditoria_cadenas_status: "actores_mixtos_en_alerta" }),
      renderMetricCard("Multiples alertas", multipleAlerts.length, "Mas de una cadena pide atencion", { auditoria_cadenas_status: "multiples_alertas" }),
      renderMetricCard("Cadenas activas", chainAlerts.length, "Correos en alerta o por validar", {}),
    ].join("");
  }

  if (!queueTarget) return;
  const rows = visibleReview
    .sort((a, b) => urgencyRank(a) - urgencyRank(b) || dateValue(b.ultimo_movimiento_at) - dateValue(a.ultimo_movimiento_at))
    .slice(0, 8);

  queueTarget.innerHTML = rows.length
    ? rows
        .map((row) => {
          const chain = row.cadena_accionable || row.cadenas_relacionadas?.[0] || {};
          const ref = rowReferenceForReview(row);
          return `
            <button type="button" class="chain-review-card status-${className(row.auditoria_cadenas_status || row.lectura_confianza)}" data-command-target="${escapeHtml(
              JSON.stringify(chainReviewTarget(row))
            )}">
              <span class="mini-tags">
                ${renderTag(row.lectura_confianza)}
                ${renderTag(row.auditoria_cadenas_status || row.cadena_accionable_lane || "cadena_auditoria")}
                ${renderTag(chain.actor_tipo || row.actor_tipo_accionable || row.actor_tipo)}
              </span>
              <strong>${escapeHtml(ref || "Sin referencia clara")}</strong>
              <p>${escapeHtml(chain.asunto || row.cadena_correo || row.lectura_confianza_reason || "Cadena sin asunto visible.")}</p>
              <small>${escapeHtml(row.accion_sugerida || chain.accion_sugerida || "Primero validar cadena y actor.")}</small>
            </button>
          `;
        })
        .join("")
    : '<p class="empty">Sin cadenas delicadas en la vista actual.</p>';
};

const tableRowsForQuality = (tabs) => [
  ...(tabs.operacion || []).map((row) => ({ row, table: "operacion" })),
  ...(tabs.tiempos || []).map((row) => ({ row, table: "tiempos" })),
  ...(tabs.cotizaciones || []).map((row) => ({ row, table: "cotizaciones" })),
];

const qualityCommandTarget = (entry) => ({
  table: entry.table,
  filters: {},
  search: rowDisplayReference(entry.row, entry.table),
});

const renderQualityMetric = (label, value, detail, commandTarget) => `
  <${commandTarget?.table ? "button" : "article"} ${commandTarget?.table ? `type="button" data-command-target="${escapeHtml(JSON.stringify(commandTarget))}"` : ""} class="quality-metric-card">
    <span>${escapeHtml(label)}</span>
    <strong>${nf.format(value)}</strong>
    <small>${escapeHtml(detail)}</small>
  </${commandTarget?.table ? "button" : "article"}>
`;

const renderQualityBoard = (tabs) => {
  const metricsTarget = document.getElementById("qualityMetrics");
  const queueTarget = document.getElementById("qualityQueue");
  if (!metricsTarget && !queueTarget) return;

  const entries = tableRowsForQuality(tabs || {});
  const safe = entries.filter((entry) => className(entry.row.lectura_confianza) === "accion_confiable").length;
  const probable = entries.filter((entry) => className(entry.row.lectura_confianza) === "accion_probable").length;
  const validate = entries.filter((entry) => className(entry.row.lectura_confianza) === "validar_antes").length;
  const noLink = entries.filter((entry) => !hasEvidenceLink(entry.row)).length;
  const syncLag = entries.filter((entry) => className(entry.row.estado_sincronizacion) === "sheet_desfasado" || entry.row.sheet_desfasado === true).length;

  setText("qualityVisible", `${nf.format(entries.length)} registros`);

  if (metricsTarget) {
    metricsTarget.innerHTML = [
      renderQualityMetric("Confiables", safe, "Listos para accionar"),
      renderQualityMetric("Probables", probable, "Utiles, pero leer detalle"),
      renderQualityMetric("Validar antes", validate, "No convertir en instruccion segura", { table: "operacion", filters: { lectura_confianza: "validar_antes" }, search: "" }),
      renderQualityMetric("Sin link directo", noLink, "Evidencia resumida o memoria"),
      renderQualityMetric("Sheet desfasado", syncLag, "Fuente comercial contra correo", { table: "cotizaciones", filters: { estado_sincronizacion: "sheet_desfasado" }, search: "" }),
    ].join("");
  }

  if (!queueTarget) return;
  const queue = entries
    .map((entry) => ({ ...entry, score: qualityRisk(entry.row, entry.table), issues: explainabilityIssues(entry.row, entry.table) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        urgencyRank(a.row) - urgencyRank(b.row) ||
        dateValue(b.row.ultimo_movimiento_at || b.row.ultima_evidencia_at || b.row.inicio_at) -
          dateValue(a.row.ultimo_movimiento_at || a.row.ultima_evidencia_at || a.row.inicio_at)
    )
    .slice(0, 8);

  setText("qualityQueueCount", `${nf.format(queue.length)} visibles`);

  queueTarget.innerHTML = queue.length
    ? queue
        .map((entry) => {
          const ref = rowDisplayReference(entry.row, entry.table);
          const issues = entry.issues.slice(0, 2).join(" / ") || "Revisar evidencia antes de accionar.";
          return `
            <button type="button" class="quality-card status-${className(entry.row.lectura_confianza || entry.row.semaforo)}" data-command-target="${escapeHtml(
              JSON.stringify(qualityCommandTarget(entry))
            )}">
              <span class="mini-tags">
                ${renderTag(rowKindLabel(entry.table))}
                ${renderTag(entry.row.lectura_confianza || "sin_dato")}
                ${renderTag(entry.row.decision_ejecutiva || entry.row.semaforo || "sin_dato")}
              </span>
              <strong>${escapeHtml(ref)}</strong>
              <p>${escapeHtml(entry.row.motivo_prioridad || entry.row.observacion || entry.row.ultima_evidencia || "Sin lectura explicita.")}</p>
              <small>${escapeHtml(issues)}</small>
            </button>
          `;
        })
        .join("")
    : '<p class="empty">Sin registros delicados con la lectura actual.</p>';
};

const updateSortIndicators = () => {
  document.querySelectorAll("[data-sort-table][data-sort-key]").forEach((button) => {
    const sort = tableSort[button.dataset.sortTable] || {};
    const isActive = sort.key === button.dataset.sortKey;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-sort", isActive ? (sort.direction === "desc" ? "descending" : "ascending") : "none");
    const indicator = button.querySelector("[data-sort-indicator]");
    if (indicator) indicator.textContent = isActive ? (sort.direction === "desc" ? "↓" : "↑") : "";
  });
};

const firstSortDirection = (key) => (["actualizado", "ventana", "duracion"].includes(key) ? "desc" : "asc");

const setTableSort = (tableName, key) => {
  const current = tableSort[tableName] || defaultTableSort[tableName] || defaultTableSort.operacion;
  tableSort[tableName] = {
    key,
    direction: current.key === key ? (current.direction === "asc" ? "desc" : "asc") : firstSortDirection(key),
  };
  if (tableName === "historial") {
    saveHistoryView();
    applyHistoryFilters();
  } else {
    saveTableView(tableName);
    renderFilteredTables();
  }
  updateSortIndicators();
};

const initializeSortControls = () => {
  updateSortIndicators();
  if (sortEventsBound) return;
  document.querySelectorAll("[data-sort-table][data-sort-key]").forEach((button) => {
    button.addEventListener("click", () => setTableSort(button.dataset.sortTable, button.dataset.sortKey));
  });
  sortEventsBound = true;
};

const renderFilteredTables = () => {
  const filtered = {
    operacion: sortRows("operacion", applyRowFilters("operacion", dashboardRows.operacion)),
    tiempos: sortRows("tiempos", applyRowFilters("tiempos", dashboardRows.tiempos)),
    cotizaciones: sortRows("cotizaciones", applyRowFilters("cotizaciones", dashboardRows.cotizaciones)),
  };

  Object.entries(filtered).forEach(([tableName, rows]) => {
    renderRows(tableTargets[tableName], rows, tableColumns[tableName], tableName);
    setText(tableName === "tiempos" ? "tiemposCount" : tableName === "cotizaciones" ? "cotizacionesCount" : "operacionCount", nf.format(rows.length));
  });

  setText(
    "workbenchCount",
    `${nf.format(filtered.operacion.length + filtered.tiempos.length + filtered.cotizaciones.length)} de ${nf.format(
      dashboardRows.operacion.length + dashboardRows.tiempos.length + dashboardRows.cotizaciones.length
    )} registros`
  );
  setText(
    "operacionViewMeta",
    `Mostrando ${nf.format(filtered.operacion.length)} de ${nf.format(dashboardRows.operacion.length)} · ${nf.format(
      activeFilterCount("operacion")
    )} filtros activos · ${sortSummary("operacion")}`
  );
  setText(
    "tiemposViewMeta",
    `Mostrando ${nf.format(filtered.tiempos.length)} de ${nf.format(dashboardRows.tiempos.length)} · ${nf.format(
      activeFilterCount("tiempos")
    )} filtros activos · ${sortSummary("tiempos")}`
  );
  setText(
    "cotizacionesViewMeta",
    `Mostrando ${nf.format(filtered.cotizaciones.length)} de ${nf.format(dashboardRows.cotizaciones.length)} · ${nf.format(
      activeFilterCount("cotizaciones")
    )} filtros activos · ${sortSummary("cotizaciones")}`
  );

  ["operacion", "tiempos", "cotizaciones"].forEach(renderActiveFilterChips);
  renderOperationInsights(filtered.operacion, dashboardRows.operacion);
  renderChainReviewBoard(filtered.operacion, dashboardRows.operacion, emailThreadRows);
  renderTimeInsights(filtered.tiempos);
  renderQuoteInsights(filtered.cotizaciones);
  updateSortIndicators();
};

const initializeFilters = (tabs) => {
  dashboardRows = {
    operacion: tabs.operacion,
    tiempos: tabs.tiempos,
    cotizaciones: tabs.cotizaciones,
  };
  emailThreadRows = tabs.emailThreads || [];

  Object.entries(dashboardRows).forEach(([tableName, rows]) => populateFilters(tableName, rows));
  Object.keys(dashboardRows).forEach(applySavedTableView);
  const savedOperationFilters = savedViews.operacion?.filters || {};
  if (!savedViews.operacion || (!savedViews.operacion.search && Object.keys(savedOperationFilters).length === 0)) {
    setFilterValue("operacion", "vista_operativa", "frente_activo");
  }

  if (!filterEventsBound) {
    document.querySelectorAll("[data-filter-search], [data-filter-table]").forEach((control) => {
      const tableName = control.dataset.filterSearch || control.dataset.filterTable;
      control.addEventListener("input", () => {
        activePresetId = "";
        if (tableName) saveTableView(tableName);
        updateQuickViewState();
        renderFilteredTables();
      });
      control.addEventListener("change", () => {
        activePresetId = "";
        if (tableName) saveTableView(tableName);
        updateQuickViewState();
        renderFilteredTables();
      });
    });
    document.querySelectorAll("[data-filter-clear]").forEach((button) => {
      button.addEventListener("click", () => {
        const tableName = button.dataset.filterClear;
        activePresetId = "";
        clearFilterValues(tableName);
        saveTableView(tableName);
        updateQuickViewState();
        renderFilteredTables();
      });
    });
    document.querySelectorAll("[data-view-preset]").forEach((button) => {
      button.addEventListener("click", () => {
        const preset = quickViews.find((entry) => entry.id === button.dataset.viewPreset);
        if (!preset) return;
        activePresetId = preset.id;
        setActiveTab(preset.table);
        Object.keys(dashboardRows).forEach(clearFilterValues);
        if (preset.search) {
          const search = document.querySelector(`[data-filter-search="${preset.table}"]`);
          if (search) search.value = preset.search;
        }
        Object.entries(preset.filters || {}).forEach(([field, value]) => setFilterValue(preset.table, field, value));
        saveTableView(preset.table);
        updateQuickViewState();
        renderFilteredTables();
        document.getElementById("trabajo")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    document.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-filter-remove]");
      if (!chip) return;
      const tableName = chip.dataset.filterRemove;
      const field = chip.dataset.filterField;
      activePresetId = "";
      if (field === "__search") {
        const search = document.querySelector(`[data-filter-search="${tableName}"]`);
        if (search) search.value = "";
      } else {
        setFilterValue(tableName, field, "");
      }
      saveTableView(tableName);
      updateQuickViewState();
      renderFilteredTables();
    });
    document.getElementById("operationLanes")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-operation-lane]");
      if (!button) return;
      activePresetId = "";
      setActiveTab("operacion");
      setFilterValue("operacion", "vista_operativa", button.dataset.operationLane || "");
      saveTableView("operacion");
      updateQuickViewState();
      renderFilteredTables();
    });
    document.getElementById("timeLanes")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-time-lane]");
      if (!button) return;
      activePresetId = "";
      setActiveTab("tiempos");
      setFilterValue("tiempos", "lane_tiempo", button.dataset.timeLane || "");
      saveTableView("tiempos");
      updateQuickViewState();
      renderFilteredTables();
    });
    document.getElementById("timeActors")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-time-actor]");
      if (!button) return;
      activePresetId = "";
      setActiveTab("tiempos");
      setFilterValue("tiempos", "actor_destino", button.dataset.timeActor || "");
      saveTableView("tiempos");
      updateQuickViewState();
      renderFilteredTables();
    });
    document.getElementById("quotePipelineBoard")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quote-stage]");
      if (!button) return;
      activePresetId = "";
      setActiveTab("cotizaciones");
      setFilterValue("cotizaciones", "etapa_comercial", button.dataset.quoteStage || "");
      saveTableView("cotizaciones");
      updateQuickViewState();
      renderFilteredTables();
    });
    document.getElementById("quoteUsers")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quote-user]");
      if (!button) return;
      activePresetId = "";
      setActiveTab("cotizaciones");
      setFilterValue("cotizaciones", "usuario_sheet", button.dataset.quoteUser || "");
      saveTableView("cotizaciones");
      updateQuickViewState();
      renderFilteredTables();
    });
    filterEventsBound = true;
  }

  renderQuickViews();
  renderFilteredTables();
};

const initializeRowDetails = () => {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-row-detail-toggle]");
    if (!button) return;
    const target = document.getElementById(button.dataset.rowDetailToggle);
    if (!target) return;
    const willOpen = target.hidden;
    target.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
    button.setAttribute("aria-label", willOpen ? "Ocultar detalle" : "Ver detalle");
    button.setAttribute("title", willOpen ? "Ocultar detalle" : "Ver detalle");
    button.innerHTML = `<span aria-hidden="true">${willOpen ? "-" : "+"}</span>`;
  });
};

const getRowClass = (row) => {
  const decision = className(row.decision_ejecutiva);
  const freshness = className(row.frescura);
  const sync = className(row.estado_sincronizacion);
  return ["data-row", decision ? `decision-${decision}` : "", freshness === "rojo" ? "freshness-red" : "", sync === "sheet_desfasado" ? "sync-lag" : ""]
    .filter(Boolean)
    .join(" ");
};

const applyDensity = (density) => {
  const normalized = density === "compact" ? "compact" : "comfortable";
  document.body.dataset.tableDensity = normalized;
  try {
    localStorage.setItem("miniTmsTableDensity", normalized);
  } catch {
    // Ignore blocked browser storage.
  }
  document.querySelectorAll("[data-density-option]").forEach((button) => {
    button.classList.toggle("active", button.dataset.densityOption === normalized);
  });
};

const initializeDensityControls = () => {
  let saved = "comfortable";
  try {
    saved = localStorage.getItem("miniTmsTableDensity") || saved;
  } catch {
    saved = "comfortable";
  }
  applyDensity(saved);

  if (densityEventsBound) return;
  document.querySelectorAll("[data-density-option]").forEach((button) => {
    button.addEventListener("click", () => applyDensity(button.dataset.densityOption));
  });
  densityEventsBound = true;
};

const renderBars = (id, data) => {
  const target = document.getElementById(id);
  if (!target) return;

  const entries = Object.entries(data || {})
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const max = Math.max(1, ...entries.map(([, count]) => Number(count)));

  target.innerHTML = entries.length
    ? entries
        .map(([label, count]) => {
          const width = Math.max(4, Math.round((Number(count) / max) * 100));
          return `
            <div class="bar-row">
              <span>${escapeHtml(labelText(label))}</span>
              <div class="bar-track"><div class="bar-fill ${className(label)}" style="width:${width}%"></div></div>
              <strong>${nf.format(count)}</strong>
            </div>
          `;
        })
        .join("")
    : '<p class="empty">Sin datos para graficar.</p>';
};

const renderBrief = (summary, tabs, sourceState) => {
  const target = document.getElementById("executiveBrief");
  if (!target) return;

  const rows = [
    [
      "Operacion",
      `${nf.format(summary.atender_ahora || 0)} para atender ahora; ${nf.format(summary.seguimiento_hoy || 0)} para seguimiento hoy.`,
    ],
    [
      "Cotizaciones",
      `${nf.format(summary.pendientes_pricing || 0)} pendientes de pricing; ${nf.format(summary.pricing_respondio_falta_enviar || 0)} con pricing respondido y falta accion final.`,
    ],
    [
      "Mes activo",
      `${sourceState?.month_policy?.active_month_name || sourceState?.last_sheet_scan?.tab || "Mes actual"} como frente principal; ${nf.format(
        summary.cotizaciones_historicas_vivas || 0
      )} cotizaciones historicas vivas siguen en radar.`,
    ],
    [
      "Tiempos y calidad",
      `${nf.format(summary.respuestas_rojas || 0)} mediciones rojas. Promedio disponible: ${formatMinutes(tabs.timeKpis.promedio_min)}.`,
    ],
    [
      "Fuente",
      sourceState?.last_sheet_scan?.range || sourceState?.last_sheet_scan?.tab || "Sin lectura de Sheet registrada.",
    ],
  ];

  target.innerHTML = rows
    .map(([title, detail]) => `<div class="brief-item"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`)
    .join("");
};

const buildReportText = (digest) => {
  const report = digest?.reporte || {};
  const lines = [
    report.asunto_sugerido || "Reporte ejecutivo MLTI",
    "",
    "Resumen ejecutivo:",
    ...(report.bullets?.length ? report.bullets.map((line) => `- ${line}`) : [`- ${report.resumen_corto || digest?.headline || "Sin resumen disponible."}`]),
    "",
    "Prioridades:",
    ...(report.acciones_miguel || []).map((line) => `- ${line}`),
    "",
    "Riesgos a cuidar:",
    ...(report.riesgos?.length ? report.riesgos.map((line) => `- ${line}`) : ["- Sin riesgos adicionales detectados con la regla actual."]),
    "",
    "Lectura por bloque:",
    ...(report.secciones || []).flatMap((section) => [
      `${section.titulo}:`,
      ...(section.bullets || []).map((line) => `- ${line}`),
    ]),
    "",
    "Cobertura:",
    ...(report.cobertura || []).map((line) => `- ${line}`),
  ];
  return lines.filter((line, index, list) => line || list[index - 1]).join("\n");
};

const renderExecutiveDigest = (digest) => {
  const alertsTarget = document.getElementById("executiveAlerts");
  const reportTarget = document.getElementById("reportDraft");
  const report = digest?.reporte || {};
  const alerts = digest?.alertas || [];
  const priorities = digest?.prioridades || [];
  currentReportText = buildReportText(digest);

  setText("commandAlertCount", `${nf.format(alerts.length)} alertas`);
  setText("reportDraftTitle", report.asunto_sugerido || "Resumen ejecutivo");

  if (alertsTarget) {
    alertsTarget.innerHTML = alerts.length
      ? alerts
          .map((alert) => {
            const encodedTarget = escapeHtml(JSON.stringify(alert.target || {}));
            return `
              <button type="button" class="alert-card level-${className(alert.nivel)}" data-command-target="${encodedTarget}">
                <span>${escapeHtml(alert.titulo)}</span>
                <strong>${escapeHtml(alert.detalle)}</strong>
                <em>${escapeHtml(alert.accion || "Abrir vista")}</em>
              </button>
            `;
          })
          .join("")
      : '<p class="empty">Sin alertas ejecutivas con la regla actual.</p>';
  }

  if (reportTarget) {
    const bulletList = (report.bullets || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    const actionList = (report.acciones_miguel || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    const riskList = (report.riesgos || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    const sectionBoard = (report.secciones || [])
      .map((section) => {
        const encodedTarget = escapeHtml(JSON.stringify(section.target || {}));
        const bullets = (section.bullets || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
        return `
          <button type="button" class="report-section-card" data-command-target="${encodedTarget}">
            <span>${escapeHtml(section.titulo)}</span>
            <ul>${bullets || "<li>Sin lectura disponible.</li>"}</ul>
          </button>
        `;
      })
      .join("");
    const priorityList = priorities
      .map(
        (item) => `
          <button type="button" class="priority-link" data-command-target="${escapeHtml(JSON.stringify(item.target || {}))}">
            <span>${escapeHtml(item.tipo)}</span>
            <strong>${escapeHtml(item.id)}</strong>
            <em>${escapeHtml(item.actor)}</em>
          </button>
        `
      )
      .join("");

    reportTarget.innerHTML = `
      <p>${escapeHtml(report.resumen_corto || digest?.headline || "Sin resumen disponible.")}</p>
      <div class="report-columns">
        <section>
          <h3>Lectura</h3>
          <ul>${bulletList || "<li>Sin bullets ejecutivos disponibles.</li>"}</ul>
        </section>
        <section>
          <h3>Acciones</h3>
          <ul>${actionList || "<li>Sin acciones sugeridas disponibles.</li>"}</ul>
        </section>
        <section>
          <h3>Riesgos</h3>
          <ul>${riskList || "<li>Sin riesgos adicionales con la regla actual.</li>"}</ul>
        </section>
        <section>
          <h3>Cobertura</h3>
          <ul>${(report.cobertura || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("") || "<li>Sin cobertura registrada.</li>"}</ul>
        </section>
      </div>
      <div class="report-section-board">${sectionBoard || '<span class="empty">Sin bloques de reporte disponibles.</span>'}</div>
      <div class="priority-strip">${priorityList || '<span class="empty">Sin prioridades destacadas.</span>'}</div>
    `;
  }
};

const renderHealth = (summary, tabs, history) => {
  const sizes = [
    tabs.operacion.length,
    tabs.tiempos.length,
    tabs.cotizaciones.length,
    history.length,
  ];
  const dominantState = Object.entries(tabs.opKpis.por_estado || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const criteria = dominantState
    ? `${labelText(dominantState[0])} ${nf.format(dominantState[1])}`
    : "Sin criterio";

  setText("healthTables", sizes.map((value) => nf.format(value)).join(" / "));
  setText("healthEvidence", nf.format(summary.evidencia_incierta || 0));
  setText("healthSync", nf.format(summary.sheet_desfasado || 0));
  setText("healthCriteria", criteria);
};

const renderTrustOverview = (summary) => {
  setText("trustSafe", nf.format(summary.acciones_confiables || 0));
  setText("trustProbable", nf.format(summary.acciones_probables || 0));
  setText("trustValidate", nf.format(summary.acciones_validar_antes || 0));
  setText("trustNoEvidence", nf.format(summary.acciones_sin_evidencia || 0));
};

const tableTargetForRows = (candidates) => {
  const ordered = [...candidates].sort((a, b) => Number(b.rows?.length || 0) - Number(a.rows?.length || 0));
  const selected = ordered.find((entry) => entry.rows?.length) || ordered[0] || {};
  return {
    table: selected.table,
    filters: selected.filters || {},
    search: selected.search || "",
  };
};

const cockpitItemLabel = (entry) => {
  const row = entry.row || {};
  const table = entry.table;
  const ref = rowDisplayReference(row, table);
  const actor = row.pelota || row.actor_destino || row.usuario_sheet || row.cliente || row.actor_principal || "Sin actor";
  const state = row.decision_ejecutiva || row.estado_cotizacion || row.estado_medicion || row.historial_lane || row.semaforo;
  return `${rowKindLabel(table)} · ${ref} · ${labelText(actor)} · ${labelText(state)}`;
};

const sortCockpitEntries = (entries) =>
  [...entries].sort((a, b) => {
    const byUrgency = urgencyRank(a.row) - urgencyRank(b.row);
    if (byUrgency !== 0) return byUrgency;
    return dateValue(b.row?.ultimo_movimiento_at || b.row?.inicio_at || b.row?.at) - dateValue(a.row?.ultimo_movimiento_at || a.row?.inicio_at || a.row?.at);
  });

const isExecutiveFrontRow = (row) =>
  row?.es_prioridad_reporte === true ||
  className(row?.periodo_trabajo) === "mes_actual" ||
  className(row?.vista_operativa) === "frente_activo" ||
  className(row?.decision_ejecutiva) === "atender_ahora";

const renderCockpitCard = (config) => {
  const rows = config.rows || [];
  const target = config.target || {};
  const items = rows.slice(0, 3).map(cockpitItemLabel);
  const disabled = !target.table || rows.length === 0;
  return `
    <button type="button" class="cockpit-card tone-${className(config.tone || "neutral")}" ${
      disabled ? "disabled" : `data-command-target="${escapeHtml(JSON.stringify(target))}"`
    }>
      <span>${escapeHtml(config.label)}</span>
      <strong>${nf.format(rows.length)}</strong>
      <small>${escapeHtml(config.detail)}</small>
      <ul>${items.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>Sin registros visibles.</li>"}</ul>
    </button>
  `;
};

const renderExecutiveCockpit = (summary, tabs, historySummary, history) => {
  const target = document.getElementById("cockpitQueues");
  if (!target) return;

  const operations = tabs.operacion || [];
  const quotes = tabs.cotizaciones || [];
  const times = tabs.tiempos || [];
  const operationsFront = operations.filter(isExecutiveFrontRow);
  const quotesFront = quotes.filter(isExecutiveFrontRow);
  const timesFront = times.filter(isExecutiveFrontRow);

  const readyOps = operationsFront.filter(
    (row) =>
      row.accion_lista === true &&
      className(row.vista_operativa) === "frente_activo" &&
      (className(row.decision_ejecutiva) === "atender_ahora" || ["critico", "alto"].includes(className(row.criticidad)))
  );
  const readyQuotes = quotesFront.filter(
    (row) =>
      row.accion_lista === true &&
      (className(row.decision_ejecutiva) === "atender_ahora" ||
        ["pricing_respondio_falta_enviar", "cliente_con_duda"].includes(className(row.estado_cotizacion_ejecutivo || row.estado_cotizacion)))
  );
  const readyOpsNow = readyOps.filter((row) => className(row.decision_ejecutiva) === "atender_ahora");
  const readyQuotesNow = readyQuotes.filter((row) => className(row.decision_ejecutiva) === "atender_ahora");
  const readyOpsToday = readyOps.filter((row) => className(row.decision_ejecutiva) === "seguimiento_hoy");
  const readyQuotesToday = readyQuotes.filter((row) => className(row.decision_ejecutiva) === "seguimiento_hoy");
  const validationOps = operationsFront.filter((row) => ["validar_antes", "sin_evidencia_suficiente"].includes(className(row.lectura_confianza)));
  const validationQuotes = quotesFront.filter((row) => ["validar_antes", "sin_evidencia_suficiente"].includes(className(row.lectura_confianza)));
  const validationOpsChain = validationOps.filter((row) => className(row.lectura_confianza) === "validar_antes");
  const validationQuotesChain = validationQuotes.filter((row) => className(row.lectura_confianza) === "validar_antes");
  const validationOpsEvidence = validationOps.filter((row) => className(row.lectura_confianza) === "sin_evidencia_suficiente");
  const validationQuotesEvidence = validationQuotes.filter((row) => className(row.lectura_confianza) === "sin_evidencia_suficiente");
  const blockedQuotes = quotesFront.filter((row) =>
    row.pricing_pendiente_real === true ||
    ["pricing_respondio_falta_enviar", "cliente_con_duda"].includes(className(row.estado_cotizacion_ejecutivo || row.estado_cotizacion)) ||
    ["atender_ahora", "revisar_inconsistencia"].includes(className(row.decision_ejecutiva))
  );
  const blockedPricing = blockedQuotes.filter((row) => row.pricing_pendiente_real === true);
  const blockedReady = blockedQuotes.filter((row) => className(row.estado_cotizacion_ejecutivo || row.estado_cotizacion) === "pricing_respondio_falta_enviar");
  const blockedDoubts = blockedQuotes.filter((row) => className(row.estado_cotizacion_ejecutivo || row.estado_cotizacion) === "cliente_con_duda");
  const blockedInconsistency = blockedQuotes.filter((row) => className(row.decision_ejecutiva) === "revisar_inconsistencia");
  const timeRisk = timesFront.filter((row) => className(row.semaforo) === "rojo" || ["fuera_objetivo", "abierto_sin_fin"].includes(className(row.estado_medicion)));
  const timeRed = timeRisk.filter((row) => className(row.semaforo) === "rojo");
  const timeOutside = timeRisk.filter((row) => className(row.estado_medicion) === "fuera_objetivo");
  const timeOpen = timeRisk.filter((row) => className(row.estado_medicion) === "abierto_sin_fin");
  const timeNoMeasure = timeRisk.filter((row) => className(row.estado_medicion) === "sin_medicion");

  const readyRows = sortCockpitEntries([
    ...readyOps.map((row) => ({ table: "operacion", row })),
    ...readyQuotes.map((row) => ({ table: "cotizaciones", row })),
  ]);
  const validationRows = sortCockpitEntries([
    ...validationOps.map((row) => ({ table: "operacion", row })),
    ...validationQuotes.map((row) => ({ table: "cotizaciones", row })),
  ]);
  const blockedQuoteRows = sortCockpitEntries(blockedQuotes.map((row) => ({ table: "cotizaciones", row })));
  const timeRiskRows = sortCockpitEntries(timeRisk.map((row) => ({ table: "tiempos", row })));

  const cards = [
    {
      label: "Acciones listas",
      detail: "Mover sin validar otra cadena.",
      tone: "ready",
      rows: readyRows,
      target: tableTargetForRows([
        { table: "operacion", rows: readyOpsNow, filters: { decision_ejecutiva: "atender_ahora" } },
        { table: "cotizaciones", rows: readyQuotesNow, filters: { decision_ejecutiva: "atender_ahora" } },
        { table: "operacion", rows: readyOpsToday, filters: { decision_ejecutiva: "seguimiento_hoy" } },
        { table: "cotizaciones", rows: readyQuotesToday, filters: { decision_ejecutiva: "seguimiento_hoy" } },
      ]),
    },
    {
      label: "Validar antes",
      detail: "No convertir en instruccion segura.",
      tone: "validate",
      rows: validationRows,
      target: tableTargetForRows([
        { table: "operacion", rows: validationOpsChain, filters: { lectura_confianza: "validar_antes" } },
        { table: "cotizaciones", rows: validationQuotesChain, filters: { lectura_confianza: "validar_antes" } },
        { table: "operacion", rows: validationOpsEvidence, filters: { lectura_confianza: "sin_evidencia_suficiente" } },
        { table: "cotizaciones", rows: validationQuotesEvidence, filters: { lectura_confianza: "sin_evidencia_suficiente" } },
      ]),
    },
    {
      label: "Cotizaciones bloqueadas",
      detail: "Pricing, cliente o sync detenido.",
      tone: "quote",
      rows: blockedQuoteRows,
      target: tableTargetForRows([
        { table: "cotizaciones", rows: blockedPricing, filters: { pricing_pendiente_real: "true" } },
        { table: "cotizaciones", rows: blockedReady, filters: { estado_cotizacion: "pricing_respondio_falta_enviar" } },
        { table: "cotizaciones", rows: blockedDoubts, filters: { estado_cotizacion: "cliente_con_duda" } },
        { table: "cotizaciones", rows: blockedInconsistency, filters: { decision_ejecutiva: "revisar_inconsistencia" } },
      ]),
    },
    {
      label: "Respuesta y calidad",
      detail: "Tiempos rojos o sin evidencia.",
      tone: "time",
      rows: timeRiskRows,
      target: tableTargetForRows([
        { table: "tiempos", rows: timeRed, filters: { semaforo: "rojo" } },
        { table: "tiempos", rows: timeOutside, filters: { estado_medicion: "fuera_objetivo" } },
        { table: "tiempos", rows: timeOpen, filters: { estado_medicion: "abierto_sin_fin" } },
        { table: "tiempos", rows: timeNoMeasure, filters: { estado_medicion: "sin_medicion" } },
      ]),
    },
  ];

  setText("cockpitTotal", `${nf.format(cards.reduce((sum, card) => sum + card.rows.length, 0))} senales de frente`);
  target.innerHTML = cards.map(renderCockpitCard).join("");

  const raw = Number(historySummary?.registros_crudos || historySummary?.raw_count || 0);
  const clean = Number(historySummary?.registros || historySummary?.clean_count || 0);
  const duplicates = Number(historySummary?.duplicados_filtrados || historySummary?.duplicate_count || 0);
  const filtered = Number(historySummary?.filtrados_sin_cambio || historySummary?.filtered_count || 0);
  const needsRef = Number(historySummary?.referencias_sin_sistema || (history || []).filter((row) => row.historial_needs_reference === true).length || 0);
  const cleanPct = raw ? Math.round((clean / raw) * 100) : 0;

  setText("memoryCleanScore", raw ? `${cleanPct}% visible` : "-");
  const memoryStats = document.getElementById("memoryCleanStats");
  if (memoryStats) {
    memoryStats.innerHTML = [
      ["Eventos visibles", clean, "Despues de limpieza"],
      ["Eventos crudos", raw, "Antes de limpieza"],
      ["Duplicados fuera", duplicates, "No repiten referencia"],
      ["Sin cambio fuera", filtered, "Ruido rutinario"],
      ["Falta referencia", needsRef, "Validar INT/embarque"],
    ]
      .map(
        ([label, value, detail]) => `
          <article>
            <span>${escapeHtml(label)}</span>
            <strong>${nf.format(value)}</strong>
            <small>${escapeHtml(detail)}</small>
          </article>
        `
      )
      .join("");
  }
  setText(
    "memoryCleanNote",
    raw
      ? `El historial limpio conserva ${nf.format(clean)} de ${nf.format(raw)} eventos; lo demas queda fuera por duplicado o ruido operativo.`
      : "Sin resumen de historial limpio disponible."
  );
};

const renderFocus = (operacionRows, quoteRows) => {
  const target = document.getElementById("focusList");
  if (!target) return;

  const ops = operacionRows
    .filter((row) => className(row.vista_operativa) === "frente_activo")
    .map((row) => ({
      type: "Operacion",
      id: row.id,
      status: row.decision_ejecutiva || row.criticidad,
      actor: row.pelota || row.quien_tiene_la_pelota || row.responsable_multi,
      detail: row.motivo_prioridad || row.ultimo_movimiento_resumen || row.ultimo_movimiento || row.proceso_actual,
      action: row.accion_sugerida || row.accion_siguiente,
      rank: urgencyRank(row),
      date: row.ultimo_movimiento_at,
    }));

  const quotes = quoteRows.map((row) => ({
    type: "Cotizacion",
    id: row.id,
    status: row.decision_ejecutiva || row.estado_cotizacion || row.semaforo,
    actor: row.pelota || row.quien_tiene_la_pelota || row.usuario_sheet || row.usuario_responsable,
    detail: row.motivo_prioridad || row.ultimo_movimiento || row.cliente || row.servicio,
    action: row.accion_sugerida || row.accion_siguiente,
    rank: urgencyRank(row),
    date: row.ultimo_movimiento_at || row.fecha_at,
  }));

  const rows = [...ops, ...quotes]
    .filter((row) => row.rank <= 2)
    .sort((a, b) => a.rank - b.rank || new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 8);

  setText("focusCount", `${nf.format(rows.length)} focos`);

  target.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <article class="focus-card rank-${row.rank}">
              <div class="focus-title">
                <span>${escapeHtml(row.type)}</span>
                <strong>${escapeHtml(row.id)}</strong>
                <em class="tag ${className(row.status)}">${escapeHtml(labelText(row.status))}</em>
              </div>
              <p>${escapeHtml(row.detail)}</p>
              <dl>
                <div><dt>Pelota</dt><dd>${escapeHtml(row.actor)}</dd></div>
                <div><dt>Siguiente</dt><dd>${escapeHtml(row.action)}</dd></div>
              </dl>
            </article>
          `
        )
        .join("")
    : '<p class="empty">Sin focos inmediatos con la regla actual.</p>';
};

const renderStageGrid = (id, data) => {
  const target = document.getElementById(id);
  if (!target) return;

  const entries = Object.entries(data || {})
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  target.innerHTML = entries.length
    ? entries
        .map(
          ([label, count]) => `
            <article class="stage-card">
              <span>${escapeHtml(labelText(label))}</span>
              <strong>${nf.format(count)}</strong>
            </article>
          `
        )
        .join("")
    : '<p class="empty">Sin etapas operativas visibles.</p>';
};

const renderRows = (id, rows, columns, tableName) => {
  const target = document.getElementById(id);
  if (!target) return;

  target.innerHTML = rows.length
    ? rows
        .map((row, index) => {
          const rowId = `${id}-detail-${index}`;
          const mainRow = `<tr class="${getRowClass(row)}">${columns
            .map((column) => {
              if (column.detail) return `<td class="${column.className || ""}">${renderDetailButton(rowId)}</td>`;
              if (column.render) return `<td class="${column.className || ""}">${column.render(row)}</td>`;
              const columnValue = getColumnValue(row, column);
              const raw = column.format ? column.format(columnValue, row) : columnValue;
              const value = escapeHtml(raw);
              if (column.tag) return `<td class="${column.className || ""}"><span class="tag ${className(raw)}">${value}</span></td>`;
              return `<td class="${column.className || ""}" title="${value}"><span class="cell-text">${value}</span></td>`;
            })
            .join("")}</tr>`;
          const detailRow = `<tr id="${rowId}" class="row-detail-row" hidden><td colspan="${columns.length}">${renderRowDetails(row, tableName)}</td></tr>`;
          return `${mainRow}${detailRow}`;
        })
        .join("")
    : `<tr><td colspan="${columns.length}" class="empty">Sin registros visibles.</td></tr>`;
};

const historyChangeValue = (row) => row.tipo_cambio || row.evento || "sin_dato";

const changeRiskRank = (value) => {
  const key = className(value);
  if (["empeoro", "sheet_desfasado", "cliente_con_duda"].includes(key)) return 0;
  if (["cambio_pelota", "nuevo", "sigue_igual", "incierto"].includes(key)) return 1;
  if (["mejoro", "parece_cerrado", "cerrado"].includes(key)) return 2;
  return 3;
};

const historyLaneDefinitions = [
  {
    id: "riesgo_abierto",
    title: "Riesgo abierto",
    detail: "Empeoro, duda o desfase",
  },
  {
    id: "cambio_pelota",
    title: "Cambio de pelota",
    detail: "Responsable o siguiente accion cambio",
  },
  {
    id: "movimiento_nuevo",
    title: "Movimiento nuevo",
    detail: "Aparecio actividad reciente",
  },
  {
    id: "arrastre_historico",
    title: "Arrastre historico",
    detail: "Mes previo todavia vivo",
  },
  {
    id: "mejora_cierre",
    title: "Mejora / cierre",
    detail: "Avance visible o parece cerrado",
  },
  {
    id: "sin_cambio",
    title: "Sin cambio",
    detail: "Contexto sin urgencia nueva",
  },
];

const historyLaneRank = (value) => {
  const key = className(value);
  const order = {
    riesgo_abierto: 0,
    cambio_pelota: 1,
    movimiento_nuevo: 2,
    por_validar: 3,
    arrastre_historico: 4,
    sin_cambio: 5,
    mejora_cierre: 6,
  };
  return order[key] ?? 7;
};

const currentHistoryLane = () => document.querySelector('[data-history-filter="historial_lane"]')?.value || "";

const renderHistoryLanes = (visibleRows, allRows) => {
  const target = document.getElementById("historyLanes");
  if (!target) return;
  const counts = countBy(allRows || [], (row) => row.historial_lane || "sin_cambio");
  const activeLane = className(currentHistoryLane());

  target.innerHTML = historyLaneDefinitions
    .map((lane) => {
      const count = Number(counts[lane.id] || 0);
      const visible = visibleRows.filter((row) => className(row.historial_lane) === lane.id).length;
      return `
        <button type="button" class="${activeLane === lane.id ? "active" : ""}" data-history-lane="${escapeHtml(lane.id)}">
          <span>
            <strong>${escapeHtml(lane.title)}</strong>
            <small>${escapeHtml(lane.detail)}</small>
          </span>
          <em>${nf.format(activeLane ? visible : count)}</em>
        </button>
      `;
    })
    .join("");
};

const countBy = (rows, getter) =>
  rows.reduce((acc, row) => {
    const key = valueText(typeof getter === "function" ? getter(row) : row?.[getter]);
    if (key === "-") return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const timeStatusRank = (row) => {
  const status = className(row.estado_medicion);
  if (status === "fuera_objetivo" || status === "abierto_sin_fin") return 0;
  if (className(row.semaforo) === "rojo") return 0;
  if (status === "sin_medicion" || className(row.semaforo) === "gris") return 1;
  if (status === "cerca_objetivo" || className(row.semaforo) === "amarillo") return 2;
  return 3;
};

const timeLaneDefinitions = [
  {
    id: "atraso_medido",
    title: "Atraso medido",
    detail: "Ya hay duracion contra objetivo",
  },
  {
    id: "pricing_abierto",
    title: "Pricing abierto",
    detail: "Falta respuesta o cierre de Pricing",
  },
  {
    id: "respuesta_abierta",
    title: "Respuesta abierta",
    detail: "Tramo sin fin visible",
  },
  {
    id: "falta_evidencia",
    title: "Falta evidencia",
    detail: "No se puede medir con confianza",
  },
  {
    id: "cerca_objetivo",
    title: "Cerca objetivo",
    detail: "Conviene vigilar antes de rojo",
  },
  {
    id: "dentro_objetivo",
    title: "Dentro objetivo",
    detail: "Tramos medidos en verde",
  },
];

const currentTimeLane = () =>
  document.querySelector('[data-filter-table="tiempos"][data-filter-field="lane_tiempo"]')?.value || "";

const renderTimeLanes = (visibleRows, allRows) => {
  const target = document.getElementById("timeLanes");
  if (!target) return;
  const counts = countBy(allRows || [], (row) => row.lane_tiempo || "falta_evidencia");
  const activeLane = className(currentTimeLane());

  target.innerHTML = timeLaneDefinitions
    .map((lane) => {
      const count = Number(counts[lane.id] || 0);
      const visible = visibleRows.filter((row) => className(row.lane_tiempo) === lane.id).length;
      return `
        <button type="button" class="${activeLane === lane.id ? "active" : ""}" data-time-lane="${escapeHtml(lane.id)}">
          <span>
            <strong>${escapeHtml(lane.title)}</strong>
            <small>${escapeHtml(lane.detail)}</small>
          </span>
          <em>${nf.format(activeLane ? visible : count)}</em>
        </button>
      `;
    })
    .join("");
};

const renderTimeSlaMix = (rows) => {
  const target = document.getElementById("timeSlaMix");
  if (!target) return;
  const entries = Object.entries(countBy(rows, (row) => row.semaforo || "gris")).sort(
    (a, b) => timeStatusRank({ semaforo: a[0] }) - timeStatusRank({ semaforo: b[0] }) || Number(b[1]) - Number(a[1])
  );
  const total = Math.max(1, rows.length);

  target.innerHTML = entries.length
    ? entries
        .map(([status, count]) => {
          const width = Math.max(6, Math.round((Number(count) / total) * 100));
          return `
            <div class="time-mix-row">
              <span>${renderTag(status)}</span>
              <div class="bar-track"><div class="bar-fill ${className(status)}" style="width:${width}%"></div></div>
              <strong>${nf.format(count)}</strong>
            </div>
          `;
        })
        .join("")
    : '<p class="empty">Sin mediciones visibles.</p>';
};

const renderTimeActors = (rows) => {
  const target = document.getElementById("timeActors");
  if (!target) return;
  const byActor = new Map();
  rows.forEach((row) => {
    const actor = row.actor_destino || row.actor_responsable || "Responsable incierto";
    const current = byActor.get(actor) || { actor, count: 0, red: 0, gray: 0, measuredDelay: 0, latest: "" };
    current.count += 1;
    if (className(row.semaforo) === "rojo") current.red += 1;
    if (className(row.semaforo) === "gris") current.gray += 1;
    if (className(row.lane_tiempo) === "atraso_medido") current.measuredDelay += 1;
    if (dateValue(row.inicio_at || row.fin_at) >= dateValue(current.latest)) current.latest = row.inicio_at || row.fin_at || current.latest;
    byActor.set(actor, current);
  });

  const actors = [...byActor.values()]
    .sort((a, b) => b.measuredDelay - a.measuredDelay || b.red - a.red || b.gray - a.gray || b.count - a.count || dateValue(b.latest) - dateValue(a.latest))
    .slice(0, 7);

  target.innerHTML = actors.length
    ? actors
        .map(
          (actor) => `
            <button type="button" class="time-actor-button" data-time-actor="${escapeHtml(actor.actor)}">
              <span>
                <strong>${escapeHtml(actor.actor)}</strong>
                <small>${nf.format(actor.measuredDelay)} atrasos · ${nf.format(actor.red)} rojos · ${nf.format(actor.gray)} sin evidencia</small>
              </span>
              <em>${nf.format(actor.count)}</em>
            </button>
          `
        )
        .join("")
    : '<p class="empty">Sin responsables visibles.</p>';
};

const renderTimeQualityQueue = (rows) => {
  const target = document.getElementById("timeQualityQueue");
  if (!target) return;
  const queue = [...rows]
    .filter((row) => timeStatusRank(row) <= 1)
    .sort((a, b) => timeStatusRank(a) - timeStatusRank(b) || dateValue(b.inicio_at || b.fin_at) - dateValue(a.inicio_at || a.fin_at))
    .slice(0, 8);

  target.innerHTML = queue.length
    ? queue
        .map(
          (row) => `
            <article class="time-quality-card status-${className(row.semaforo)}">
              <div>
                <strong>${escapeHtml(row.referencia_id || row.referencia)}</strong>
                ${renderTag(row.estado_medicion || row.semaforo)}
              </div>
              <p>${escapeHtml(row.lectura_tiempo || row.observacion || "Sin observacion registrada.")}</p>
              <small>${escapeHtml(labelText(row.tipo_respuesta || row.tipo))} · ${escapeHtml(labelText(row.dueno_atraso || row.responsable_equipo))} · ${escapeHtml(formatMinutes(row.duracion_min))}</small>
            </article>
          `
        )
        .join("")
    : '<p class="empty">Sin cola roja o gris en esta vista.</p>';
};

const renderTimeInsights = (rows) => {
  const redOpen = rows.filter((row) => className(row.semaforo) === "rojo" || className(row.estado_medicion) === "abierto_sin_fin").length;
  const gray = rows.filter((row) => className(row.semaforo) === "gris" || className(row.estado_medicion) === "sin_medicion").length;
  const clientRows = rows.filter((row) => className(row.tipo) === "cliente_a_multi");
  const pricingRows = rows.filter((row) => className(row.tipo) === "multi_a_pricing" || className(row.actor_destino) === "pricing");

  setText("timeAvgClient", formatMinutes(averageMinutes(clientRows)));
  setText("timeAvgPricing", formatMinutes(averageMinutes(pricingRows)));
  setText("timeRedOpen", nf.format(redOpen));
  setText("timeGray", nf.format(gray));
  renderTimeLanes(rows, dashboardRows.tiempos);
  renderTimeSlaMix(rows);
  renderTimeActors(rows);
  renderTimeQualityQueue(rows);
};

const quoteIsStuck = (row) => {
  const estado = className(row.estado_cotizacion);
  const decision = className(row.decision_ejecutiva);
  const sync = className(row.estado_sincronizacion);
  const semaforo = className(row.semaforo);
  const queue = className(row.cola_trabajo);
  return (
    semaforo === "rojo" ||
    sync === "sheet_desfasado" ||
    decision === "atender_ahora" ||
    decision === "revisar_inconsistencia" ||
    estado === "cliente_con_duda" ||
    estado === "pricing_respondio_falta_enviar" ||
    queue === "pelota_multi"
  );
};

const quoteStageRank = (value) => {
  const key = className(value);
  const order = {
    etapa_inconsistencia: 0,
    etapa_multi: 1,
    etapa_pricing: 2,
    etapa_cliente: 3,
    etapa_sam: 4,
    etapa_monitoreo: 5,
  };
  return order[key] ?? 9;
};

const renderQuotePipelineBoard = (rows) => {
  const target = document.getElementById("quotePipelineBoard");
  if (!target) return;
  const entries = Object.entries(countBy(rows, (row) => row.etapa_comercial || row.estado_cotizacion)).sort(
    (a, b) => quoteStageRank(a[0]) - quoteStageRank(b[0]) || Number(b[1]) - Number(a[1])
  );
  const total = Math.max(1, rows.length);

  target.innerHTML = entries.length
    ? entries
        .map(([stage, count]) => {
          const width = Math.max(6, Math.round((Number(count) / total) * 100));
          return `
            <button type="button" class="quote-stage-button" data-quote-stage="${escapeHtml(stage)}">
              <span>${renderTag(stage)}</span>
              <div class="bar-track"><div class="bar-fill ${className(stage)}" style="width:${width}%"></div></div>
              <strong>${nf.format(count)}</strong>
            </button>
          `;
        })
        .join("")
    : '<p class="empty">Sin pipeline visible.</p>';
};

const renderQuoteUsers = (rows) => {
  const target = document.getElementById("quoteUsers");
  if (!target) return;
  const byUser = new Map();
  rows.forEach((row) => {
    const user = row.usuario_sheet || row.usuario_responsable || "Usuario incierto";
    const current = byUser.get(user) || { user, count: 0, stuck: 0, pricing: 0, ready: 0 };
    current.count += 1;
    if (quoteIsStuck(row)) current.stuck += 1;
    if (row.pricing_pendiente_real === true) current.pricing += 1;
    if (className(row.estado_cotizacion) === "pricing_respondio_falta_enviar") current.ready += 1;
    byUser.set(user, current);
  });

  const users = [...byUser.values()]
    .sort((a, b) => b.stuck - a.stuck || b.ready - a.ready || b.pricing - a.pricing || b.count - a.count)
    .slice(0, 8);

  target.innerHTML = users.length
    ? users
        .map(
          (user) => `
            <button type="button" class="quote-user-button" data-quote-user="${escapeHtml(user.user)}">
              <span>
                <strong>${escapeHtml(user.user)}</strong>
                <small>${nf.format(user.stuck)} atoradas · ${nf.format(user.ready)} listas · ${nf.format(user.pricing)} pricing</small>
              </span>
              <em>${nf.format(user.count)}</em>
            </button>
          `
        )
        .join("")
    : '<p class="empty">Sin usuarios visibles.</p>';
};

const renderQuoteCloseQueue = (rows) => {
  const target = document.getElementById("quoteCloseQueue");
  if (!target) return;
  const queue = [...rows]
    .filter(quoteIsStuck)
    .sort((a, b) => urgencyRank(a) - urgencyRank(b) || Number(b.antiguedad_dias || 0) - Number(a.antiguedad_dias || 0))
    .slice(0, 9);

  target.innerHTML = queue.length
    ? queue
        .map(
          (row) => `
            <article class="quote-close-card status-${className(row.estado_cotizacion)}">
              <div>
                <strong>${escapeHtml(row.int_ref || row.referencia_int || row.id)}</strong>
                ${renderTag(row.estado_cotizacion)}
              </div>
              <p>${escapeHtml(row.accion_sugerida || row.accion_siguiente || "Definir siguiente accion.")}</p>
              <small>${escapeHtml(row.cliente || "Cliente incierto")} · ${escapeHtml(row.usuario_sheet || "Usuario incierto")} · ${escapeHtml(labelText(row.cola_trabajo))}</small>
            </article>
          `
        )
        .join("")
    : '<p class="empty">Sin cotizaciones atoradas en esta vista.</p>';
};

const renderQuoteInsights = (rows) => {
  const pending = rows.filter((row) => row.pricing_pendiente_real === true).length;
  const ready = rows.filter((row) => className(row.estado_cotizacion) === "pricing_respondio_falta_enviar").length;
  const doubts = rows.filter((row) => className(row.estado_cotizacion) === "cliente_con_duda").length;
  const stuck = rows.filter(quoteIsStuck).length;

  setText("quotePendingPricing", nf.format(pending));
  setText("quoteReadyToSend", nf.format(ready));
  setText("quoteClientDoubts", nf.format(doubts));
  setText("quoteStuck", nf.format(stuck));
  renderQuotePipelineBoard(rows);
  renderQuoteUsers(rows);
  renderQuoteCloseQueue(rows);
};

const historyRefId = (row) => row.referencia_id || row.referencia || "Sin referencia";

const latestHistoryDate = (rows) => {
  const latest = rows
    .map((row) => row.at || row.fecha_at)
    .filter(Boolean)
    .sort((a, b) => dateValue(b) - dateValue(a))[0];
  return latest ? formatDate(latest) : "-";
};

const renderHistoryMix = (rows) => {
  const target = document.getElementById("historyChangeMix");
  if (!target) return;
  const entries = Object.entries(countBy(rows, historyChangeValue)).sort(
    (a, b) => changeRiskRank(a[0]) - changeRiskRank(b[0]) || Number(b[1]) - Number(a[1])
  );
  const total = Math.max(1, rows.length);

  target.innerHTML = entries.length
    ? entries
        .map(([change, count]) => {
          const width = Math.max(6, Math.round((Number(count) / total) * 100));
          return `
            <div class="history-mix-row">
              <span>${renderTag(change)}</span>
              <div class="bar-track"><div class="bar-fill ${className(change)}" style="width:${width}%"></div></div>
              <strong>${nf.format(count)}</strong>
            </div>
          `;
        })
        .join("")
    : '<p class="empty">Sin mezcla visible.</p>';
};

const renderHistoryTopRefs = (rows) => {
  const target = document.getElementById("historyTopRefs");
  if (!target) return;
  const byRef = new Map();
  rows.forEach((row) => {
    const ref = historyRefId(row);
    const current = byRef.get(ref) || { ref, count: 0, risk: 7, latest: "", actor: "", summary: "", lane: "" };
    current.count += 1;
    current.risk = Math.min(current.risk, historyLaneRank(row.historial_lane || historyChangeValue(row)));
    if (dateValue(row.at || row.fecha_at) >= dateValue(current.latest)) {
      current.latest = row.at || row.fecha_at || current.latest;
      current.actor = row.actor || row.fuente || current.actor;
      current.summary = row.resumen || row.cambio || current.summary;
      current.lane = row.historial_lane || current.lane;
    }
    byRef.set(ref, current);
  });

  const entries = [...byRef.values()]
    .sort((a, b) => a.risk - b.risk || b.count - a.count || dateValue(b.latest) - dateValue(a.latest))
    .slice(0, 8);

  target.innerHTML = entries.length
    ? entries
        .map(
          (entry) => `
            <button type="button" class="history-ref-button" data-history-ref="${escapeHtml(entry.ref)}">
              <span>
                <strong>${escapeHtml(entry.ref)}</strong>
                <small>${escapeHtml(labelText(entry.lane || "sin_cambio"))} · ${escapeHtml(entry.actor || "Actor incierto")}</small>
              </span>
              <em>${nf.format(entry.count)}</em>
            </button>
          `
        )
        .join("")
    : '<p class="empty">Sin referencias visibles.</p>';
};

const renderHistoryTimeline = (rows) => {
  const target = document.getElementById("historyTimeline");
  if (!target) return;
  const latest = [...rows].sort((a, b) => dateValue(b.at || b.fecha_at) - dateValue(a.at || a.fecha_at)).slice(0, 12);

  target.innerHTML = latest.length
    ? latest
        .map(
          (row) => `
            <article class="timeline-item ${className(row.historial_lane || historyChangeValue(row))}">
              <time>${escapeHtml(formatDate(row.at || row.fecha_at))}</time>
              <strong>${escapeHtml(historyRefId(row))}</strong>
              <span>${escapeHtml(labelText(row.historial_lane || historyChangeValue(row)))} · ${escapeHtml(row.actor || row.fuente || "Actor incierto")}</span>
            </article>
          `
        )
        .join("")
    : '<p class="empty">Sin timeline visible.</p>';
};

const renderHistoryInsights = (rows) => {
  const uniqueRefs = new Set(rows.map(historyRefId).filter((ref) => ref !== "Sin referencia"));
  const risky = rows.filter((row) => className(row.historial_lane) === "riesgo_abierto" || changeRiskRank(historyChangeValue(row)) === 0).length;
  const handoffs = rows.filter((row) => className(historyChangeValue(row)) === "cambio_pelota").length;
  const historical = rows.filter((row) => className(row.historial_lane) === "arrastre_historico").length;
  const needsReference = rows.filter((row) => row.historial_needs_reference === true).length;

  setText("historyRefs", nf.format(uniqueRefs.size));
  setText("historyRisk", nf.format(risky));
  setText("historyHandoff", nf.format(handoffs));
  setText("historyHistorical", nf.format(historical));
  setText("historyNeedsRef", nf.format(needsReference));
  setText("historyLatest", latestHistoryDate(rows));
  renderHistoryLanes(rows, historyRows);
  renderHistoryMix(rows);
  renderHistoryTopRefs(rows);
  renderHistoryTimeline(rows);
};

const renderHistory = (rows) => {
  const target = document.getElementById("historialList");
  if (!target) return;

  setText("historialCount", `${nf.format(rows.length)} eventos`);
  target.innerHTML = rows.length
    ? rows
        .slice(0, 48)
        .map(
          (row) => `
            <article class="history-card change-${className(historyChangeValue(row))} lane-${className(row.historial_lane)}">
              <div class="history-card-head">
                <strong>${escapeHtml(historyRefId(row))}</strong>
                <span class="mini-tags">${renderTag(row.historial_lane || historyChangeValue(row))}${renderTag(row.riesgo_memoria || historyChangeValue(row))}${
                  row.historial_needs_reference ? renderTag("validar_referencia") : ""
                }</span>
              </div>
              <p>${escapeHtml(row.lectura_memoria || row.resumen || row.cambio)}</p>
              <dl>
                <div><dt>Actor</dt><dd>${escapeHtml(row.actor || "Incierto")}</dd></div>
                <div><dt>Fuente</dt><dd>${escapeHtml(labelText(row.fuente))}</dd></div>
                <div><dt>Edad</dt><dd>${escapeHtml(row.antiguedad_dias != null ? `${row.antiguedad_dias} dias` : "Sin fecha")}</dd></div>
              </dl>
              <small>${escapeHtml(formatDate(row.at || row.fecha_at))}</small>
            </article>
          `
        )
        .join("")
    : '<p class="empty">Sin historial local generado.</p>';
};

const getHistoryFilters = () => ({
  search: document.querySelector("[data-history-search]")?.value || "",
  selects: [...document.querySelectorAll("[data-history-filter]")].map((select) => ({
    field: select.dataset.historyFilter,
    value: select.value,
  })),
});

const renderHistoryFilterChips = () => {
  const target = document.querySelector('[data-active-filters="historial"]');
  if (!target) return;
  const { search, selects } = getHistoryFilters();
  const chips = [];
  if (search.trim()) chips.push({ field: "__search", label: "Busqueda", value: search.trim() });
  selects
    .filter((filter) => filter.value)
    .forEach((filter) => chips.push({ field: filter.field, label: labelText(filter.field), value: labelText(filter.value) }));
  chips.push({ field: "__sort", label: "Orden", value: sortSummary("historial"), readonly: true });
  target.innerHTML = chips.length
    ? chips
        .map((chip) =>
          chip.readonly
            ? `<span class="filter-chip readonly"><strong>${escapeHtml(chip.label)}</strong>${escapeHtml(chip.value)}</span>`
            : `
              <button type="button" class="filter-chip removable" data-history-filter-remove="${escapeHtml(chip.field)}" aria-label="Quitar filtro ${escapeHtml(chip.label)}">
                <strong>${escapeHtml(chip.label)}</strong>
                <span>${escapeHtml(chip.value)}</span>
                <em aria-hidden="true">x</em>
              </button>
            `
        )
        .join("")
    : '<span class="filter-chip muted">Memoria completa</span>';
};

const applyHistoryFilters = () => {
  const { search, selects } = getHistoryFilters();
  const normalizedSearch = normalizeText(search);
  const filtered = sortRows(
    "historial",
    historyRows.filter((row) => {
    const text = normalizeText(rowSearchText(row));
    const matchesSearch = !normalizedSearch || text.includes(normalizedSearch);
    const matchesSelects = selects.every((filter) => fieldMatches(row?.[filter.field], filter.value));
    return matchesSearch && matchesSelects;
    })
  );
  renderHistoryInsights(filtered);
  renderHistory(filtered);
  renderHistoryFilterChips();
  updateSortIndicators();
};

const initializeHistoryFilters = (rows) => {
  historyRows = sortByDecision(rows || []);
  ["historial_lane", "riesgo_memoria", "historial_needs_reference", "tipo_registro", "tipo_cambio", "fuente", "periodo_trabajo", "mes_origen"].forEach((field) => {
    document.querySelectorAll(`[data-history-filter="${field}"]`).forEach((select) => {
      const current = select.value;
      const options = getFieldValues(historyRows, field);
      select.innerHTML = [
        `<option value="">Todos</option>`,
        ...options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`),
      ].join("");
      if (options.some(([value]) => value === current)) select.value = current;
    });
  });
  applySavedHistoryView();

  if (!historyEventsBound) {
    document.querySelectorAll("[data-history-search], [data-history-filter]").forEach((control) => {
      control.addEventListener("input", () => {
        saveHistoryView();
        applyHistoryFilters();
      });
      control.addEventListener("change", () => {
        saveHistoryView();
        applyHistoryFilters();
      });
    });
    document.querySelector("[data-history-clear]")?.addEventListener("click", () => {
      const search = document.querySelector("[data-history-search]");
      if (search) search.value = "";
      document.querySelectorAll("[data-history-filter]").forEach((select) => {
        select.value = "";
      });
      saveHistoryView();
      applyHistoryFilters();
    });
    document.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-history-filter-remove]");
      if (!chip) return;
      const field = chip.dataset.historyFilterRemove;
      if (field === "__search") {
        const search = document.querySelector("[data-history-search]");
        if (search) search.value = "";
      } else {
        setHistoryFilterValue(field, "");
      }
      saveHistoryView();
      applyHistoryFilters();
    });
    document.getElementById("historyTopRefs")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-history-ref]");
      if (!button) return;
      const search = document.querySelector("[data-history-search]");
      if (search) search.value = button.dataset.historyRef || "";
      saveHistoryView();
      applyHistoryFilters();
    });
    document.getElementById("historyLanes")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-history-lane]");
      if (!button) return;
      const search = document.querySelector("[data-history-search]");
      if (search) search.value = "";
      const lane = document.querySelector('[data-history-filter="historial_lane"]');
      if (lane) lane.value = button.dataset.historyLane || "";
      saveHistoryView();
      applyHistoryFilters();
    });
    historyEventsBound = true;
  }

  applyHistoryFilters();
};

const renderMissingData = () => {
  setStatus("Sin datos reales", "missing");
  setText("generatedAt", "Genera dashboard/data/current.json localmente");
  setText("privacyStatus", "No publicar datos reales sin Cloudflare Access");
  document.querySelector(".workspace").insertAdjacentHTML(
    "beforeend",
    `<section class="empty-state">
      <strong>Este entorno no tiene datos reales cargados.</strong>
      <span>Genera el archivo local de datos y despliega a Cloudflare Pages solo despues de activar Cloudflare Access. El repositorio publico no debe contener current.json.</span>
    </section>`
  );
};

const loadDashboard = async () => {
  const response = await fetch("data/current.json", { cache: "no-store" });
  if (!response.ok) {
    renderMissingData();
    return;
  }

  const data = await response.json();
  const summary = data.summary || {};
  const sourceState = data.source_state || {};
  const tabs = getTabs(data);

  setStatus(data.version === "mini-tms-v1" ? "Datos V1 cargados" : "Datos cargados", "private");
  setText("privacyStatus", "Privado: Cloudflare Access requerido");
  setText("generatedAt", `Generado: ${formatDate(data.generated_at)}`);
  setText(
    "heroSummary",
    `${nf.format(summary.operaciones_frente_activo || 0)} operaciones en frente activo, ${nf.format(summary.revisar_inconsistencia || 0)} inconsistencias y ${nf.format(summary.cotizaciones_pendientes_reales || 0)} pendientes reales de pricing.`
  );
  setText("kpiOperaciones", `${nf.format(summary.operaciones_frente_activo || 0)} / ${nf.format(summary.operaciones_vivas || 0)}`);
  setText("kpiUrgentes", `${nf.format(summary.operaciones_criticas || 0)} / ${nf.format(summary.operaciones_altas || 0)}`);
  setText("kpiCotizaciones", nf.format(summary.cotizaciones_vivas || 0));
  setText("kpiTiempos", nf.format(summary.respuestas_rojas || 0));
  setText("kpiUltimo", `Ultimo reporte: ${formatDate(sourceState.last_successful_report)}`);
  setText(
    "kpiSheet",
    sourceState.month_policy?.active_month_name
      ? `Sheet ${sourceState.month_policy.active_month_name} · ${nf.format(summary.cotizaciones_historicas_vivas || 0)} historicas vivas`
      : sourceState.last_sheet_scan?.tab
        ? `Sheet ${sourceState.last_sheet_scan.tab}`
        : "Sheet sin datos"
  );
  setText("reportWindow", sourceState.last_report_type ? `Ultimo corte: ${labelText(sourceState.last_report_type)}` : "Control privado");

  renderBars("critChart", tabs.opKpis.por_criticidad);
  renderBars("quoteChart", tabs.quoteKpis.por_estado);
  renderBrief(summary, tabs, sourceState);
  renderExecutiveDigest(data.executive_digest || {});
  renderExecutiveCockpit(summary, tabs, data.history_summary || data.history_raw_summary || {}, data.history || []);
  renderHealth(summary, tabs, data.history || []);
  renderTrustOverview(summary);
  renderQualityBoard(tabs);
  renderFocus(tabs.operacion, tabs.cotizaciones);
  renderStageGrid("opsPipeline", tabs.opKpis.por_decision);

  initializeFilters(tabs);
  initializeHistoryFilters(data.history || []);
};

initializeTabs();
initializeRowDetails();
initializeDensityControls();
initializeSortControls();
initializeExecutiveActions();
loadDashboard().catch((error) => {
  setStatus("Error al cargar", "missing");
  document.querySelector(".workspace").insertAdjacentHTML(
    "beforeend",
    `<section class="empty-state"><strong>Error al leer datos.</strong><span>${escapeHtml(error.message || error)}</span></section>`
  );
});
