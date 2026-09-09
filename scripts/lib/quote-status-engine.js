const clean = (value) => String(value || "").trim().replace(/\s+/g, " ");

const normalizeStatus = (value) =>
  clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const exactPendingPricingStatuses = new Set([
  "pendiente_de_coti_pricing",
  "pendiente_coti_pricing",
  "pendiente_de_cotizacion_pricing",
  "pendiente_cotizacion_pricing",
]);

const quoteEmailStatusKey = (item = {}) => normalizeStatus(item.estado_correo || item.estado_ejecutivo_correo);

const hasQuoteEmailStatus = (item = {}, ...statuses) => statuses.map(normalizeStatus).includes(quoteEmailStatusKey(item));

const hasPricingReadyEvidence = (item = {}) =>
  hasQuoteEmailStatus(item, "pricing_respondio_falta_enviar", "pricing_respondio_validar_envio");

const hasClientDoubtEvidence = (item = {}) => hasQuoteEmailStatus(item, "cliente_con_duda");

const hasNonPricingPendingEvidence = (item = {}) =>
  hasQuoteEmailStatus(
    item,
    "respuesta_enviada_validar_sheet",
    "esperando_cliente_agente",
    "cotizada_cliente",
    "cotizada_cliente_monitoreo"
  );

const classifySheetQuoteStatus = (status, options = {}) => {
  const key = normalizeStatus(status);
  const hasShipment = Boolean(options.hasShipment);

  if (!key) {
    return {
      estado_cotizacion: "activa_incierta",
      estado_sheet_canonico: "sin_estatus",
      sheet_status_key: "",
      pendiente_pricing_sheet: false,
      cotizada_sheet: false,
      cerrada_sheet: false,
      status_rule: "sheet_sin_estatus",
    };
  }

  if (exactPendingPricingStatuses.has(key)) {
    return {
      estado_cotizacion: "pendiente_pricing",
      estado_sheet_canonico: "pendiente_pricing",
      sheet_status_key: key,
      pendiente_pricing_sheet: true,
      cotizada_sheet: false,
      cerrada_sheet: false,
      status_rule: "sheet_pendiente_de_coti_pricing_exacta",
    };
  }

  if (key.includes("cancel")) {
    return {
      estado_cotizacion: "cancelada",
      estado_sheet_canonico: "cancelada",
      sheet_status_key: key,
      pendiente_pricing_sheet: false,
      cotizada_sheet: false,
      cerrada_sheet: false,
      status_rule: "sheet_cancelada",
    };
  }

  if (key.includes("no_cotiz")) {
    return {
      estado_cotizacion: "no_cotizada",
      estado_sheet_canonico: "no_cotizada",
      sheet_status_key: key,
      pendiente_pricing_sheet: false,
      cotizada_sheet: false,
      cerrada_sheet: false,
      status_rule: "sheet_no_cotizada",
    };
  }

  if (key.startsWith("cotizado_agentes") || key.startsWith("cotizado_pricing")) {
    return {
      estado_cotizacion: "cotizada",
      estado_sheet_canonico: "cotizada",
      sheet_status_key: key,
      pendiente_pricing_sheet: false,
      cotizada_sheet: true,
      cerrada_sheet: false,
      status_rule: key.startsWith("cotizado_agentes") ? "sheet_cotizado_agentes" : "sheet_cotizado_pricing",
    };
  }

  if (key.includes("cerrado")) {
    return {
      estado_cotizacion: hasShipment ? "cerrada_con_sam" : "cerrada_sin_sam",
      estado_sheet_canonico: "cerrada",
      sheet_status_key: key,
      pendiente_pricing_sheet: false,
      cotizada_sheet: false,
      cerrada_sheet: true,
      status_rule: hasShipment ? "sheet_cerrada_con_sam" : "sheet_cerrada_sin_sam",
    };
  }

  if (key.includes("no_localizado") || key.includes("no_validado") || key.includes("sin_estatus")) {
    return {
      estado_cotizacion: "por_validar",
      estado_sheet_canonico: "por_validar",
      sheet_status_key: key,
      pendiente_pricing_sheet: false,
      cotizada_sheet: false,
      cerrada_sheet: false,
      status_rule: "sheet_por_validar",
    };
  }

  return {
    estado_cotizacion: "activa_incierta",
    estado_sheet_canonico: "activa_incierta",
    sheet_status_key: key,
    pendiente_pricing_sheet: false,
    cotizada_sheet: false,
    cerrada_sheet: false,
    status_rule: "sheet_estatus_no_mapeado",
  };
};

const inferQuoteStatusFromItem = (item = {}, options = {}) => {
  const profile = classifySheetQuoteStatus(item.estatus_sheet || item.estado, options);
  if (profile.estado_cotizacion !== "activa_incierta") return profile;

  const text = normalizeStatus(
    [
      item.estado_cotizacion,
      item.estatus_sheet,
      item.estado,
      item.accion_reporte,
      item.accion_sugerida,
      item.notas,
    ].join(" ")
  );

  if (text.includes("duda") || text.includes("please_advise") || text.includes("revisar_cambio")) {
    return { ...profile, estado_cotizacion: "cliente_con_duda", status_rule: "correo_cliente_con_duda" };
  }
  if (text.includes("proceed") || text.includes("aceptad")) {
    return { ...profile, estado_cotizacion: "aceptada_pasa_operacion", status_rule: "correo_cliente_acepta" };
  }
  if (text.includes("pricing_respondio") || text.includes("pricing_compartio") || text.includes("costos")) {
    return { ...profile, estado_cotizacion: "pricing_respondio_falta_enviar", status_rule: "correo_pricing_respondio" };
  }
  if (text.includes("pendiente_de_coti") || text.includes("pendiente_pricing")) {
    return { ...profile, estado_cotizacion: "pendiente_pricing", status_rule: "correo_pendiente_pricing" };
  }

  return profile;
};

const isRealPricingPending = (item = {}) => {
  const hasSheetStatus = Boolean(clean(item.estatus_sheet));
  const sheetProfile = classifySheetQuoteStatus(item.estatus_sheet || "", {
    hasShipment: Boolean(item.no_embarque || item.primary_operation_ref || item.shipment_refs?.length || item.sam_refs?.length),
  });
  const sheetAllowsPending = hasSheetStatus ? sheetProfile.pendiente_pricing_sheet : item.estado_cotizacion === "pendiente_pricing";

  return (
    item.estado_cotizacion === "pendiente_pricing" &&
    sheetAllowsPending &&
    !item.sheet_desfasado &&
    !hasPricingReadyEvidence(item) &&
    !hasClientDoubtEvidence(item) &&
    !hasNonPricingPendingEvidence(item)
  );
};

const executiveQuoteStatus = (item = {}) => {
  if (isRealPricingPending(item)) return "pendiente_pricing_real";
  if (hasPricingReadyEvidence(item)) return "pricing_respondio_falta_enviar";
  if (hasClientDoubtEvidence(item)) return "cliente_con_duda";
  if (item.sheet_desfasado) return "sheet_desfasado";
  return item.estado_cotizacion || "activa_incierta";
};

module.exports = {
  classifySheetQuoteStatus,
  executiveQuoteStatus,
  hasClientDoubtEvidence,
  hasNonPricingPendingEvidence,
  hasPricingReadyEvidence,
  hasQuoteEmailStatus,
  inferQuoteStatusFromItem,
  isRealPricingPending,
  normalizeStatus,
  quoteEmailStatusKey,
};
