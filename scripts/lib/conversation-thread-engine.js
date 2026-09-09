const clean = (value) => String(value || "").trim().replace(/\s+/g, " ");

const normalize = (value) =>
  clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const INT_RE = /\bINT\d{2}-\d{4}-\d{3,4}\b/gi;
const SHIPMENT_RE =
  /\b(?:DPA|EPA|IPA|APM|EPM|IPM|DPT|EPT|IPT|AA|EA|IA|IM|EM|AM|DT|ET|IT|WH|DA|DH|EH|IH|EC|IC|DC)-\d{6}-\d{4}\b/gi;

const unique = (values) => [...new Set(values.map(clean).filter(Boolean))];

const extractConversationRefs = (...values) => {
  const text = values.flat().map(clean).join(" ");
  return {
    int_refs: unique(text.match(INT_RE) || []).map((ref) => ref.toUpperCase()),
    shipment_refs: unique(text.match(SHIPMENT_RE) || []).map((ref) => ref.toUpperCase()),
  };
};

const subjectFingerprint = (subject) =>
  normalize(subject)
    .replace(/^(?:(?:re|fw|fwd|rv|res|enc|aw|antwort)_)+/g, "")
    .replace(/\bint\d{2}_\d{4}_\d{3,4}\b/g, "")
    .replace(/\b(?:dpa|epa|ipa|apm|epm|ipm|dpt|ept|ipt|aa|ea|ia|im|em|am|dt|et|it|wh|da|dh|eh|ih|ec|ic|dc)_\d{6}_\d{4}\b/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const firstText = (...values) => values.map(clean).find(Boolean) || "";

const readableSubject = (subject) =>
  clean(subject)
    .replace(/^\s*(?:(?:re|fw|fwd|rv|res|enc|aw|antwort)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .trim();

const buildConversationKey = (item = {}, actorType = "actor_externo", fallbackIndex = 0) => {
  const conversationId = firstText(item.conversationId, item.conversation_id, item.thread_id, item.email_thread_id);
  if (conversationId) return `outlook:${normalize(conversationId)}`;

  const refs = extractConversationRefs(
    item.primary_operation_ref,
    item.no_embarque,
    item.shipment_refs,
    item.int_origin_ref,
    item.int_ref,
    item.referencia_int,
    item.referencia,
    item.asunto,
    item.subject
  );
  const reference = firstText(refs.shipment_refs[0], refs.int_refs[0], item.primary_operation_ref, item.referencia);
  const subject = subjectFingerprint(firstText(item.asunto, item.subject, item.cadena_correo));
  const actor = normalize(actorType || item.actor_tipo || "actor_externo");
  const stableParts = [normalize(reference), actor, subject].filter(Boolean);
  if (stableParts.length >= 2) return `fallback:${stableParts.join("::")}`;

  const messageId = firstText(item.message_id, item.id);
  if (messageId) return `message:${normalize(messageId)}`;
  return `unresolved:${actor || "actor_externo"}:${fallbackIndex}`;
};

const buildThreadIdentity = (item = {}, actorType = "actor_externo", fallbackIndex = 0) => {
  const actor = normalize(actorType || item.actor_tipo || "actor_externo") || "actor_externo";
  const subjectRaw = firstText(item.cadena_correo, item.asunto, item.subject);
  const subject = readableSubject(subjectRaw) || "cadena sin asunto";
  const refs = extractConversationRefs(
    item.primary_operation_ref,
    item.no_embarque,
    item.shipment_refs,
    item.sam_refs,
    item.referencias_sam,
    item.int_origin_ref,
    item.int_ref,
    item.referencia_int,
    item.referencia,
    item.id,
    item.asunto,
    item.subject,
    item.cadena_correo
  );
  const primaryOperationRef = firstText(refs.shipment_refs[0], refs.int_refs[0], item.primary_operation_ref, item.referencia);
  const intOriginRef = firstText(refs.int_refs[0], item.int_origin_ref, item.int_ref, item.referencia_int);
  const threadKey = firstText(item.thread_key, buildConversationKey(item, actor, fallbackIndex));
  const hasShipment = refs.shipment_refs.length > 0;
  const hasInt = refs.int_refs.length > 0;
  const chainHasMultipleRefs = refs.shipment_refs.length > 1 || refs.int_refs.length > 1;
  const referenceScope = hasShipment ? "embarque_sam" : hasInt ? "int_origen" : "sin_referencia";
  const operationIdentity = hasShipment ? "embarque" : hasInt ? "int_provisional" : "cadena_sin_ref";
  const identityReason = firstText(item.conversationId, item.conversation_id, item.thread_id, item.email_thread_id)
    ? "conversation_id_outlook"
    : hasShipment
      ? "embarque_sam_visible"
      : hasInt
        ? "int_origen_visible"
        : "asunto_actor_sin_ref";
  const referenceScopeReason = hasShipment
    ? "El embarque SAM manda sobre el INT; el INT queda como origen comercial."
    : hasInt
      ? "Solo hay INT visible; tratar como origen de cotizacion hasta ligar embarque."
      : "No hay referencia visible; requiere validar actor y asunto.";

  return {
    thread_key: threadKey,
    thread_identity: `${referenceScope}:${normalize(primaryOperationRef || subject) || "sin_ref"}:${actor}`,
    thread_identity_reason: identityReason,
    thread_display: [primaryOperationRef || "sin referencia", actor, subject].filter(Boolean).join(" | "),
    subject_display: subject,
    subject_fingerprint: subjectFingerprint(subjectRaw),
    reference_scope: referenceScope,
    reference_scope_reason: referenceScopeReason,
    primary_operation_ref: primaryOperationRef,
    int_origin_ref: intOriginRef,
    int_ref: intOriginRef,
    int_refs: refs.int_refs,
    shipment_refs: refs.shipment_refs,
    operation_identity: operationIdentity,
    chain_refs_count: refs.shipment_refs.length + refs.int_refs.length,
    chain_has_multiple_refs: chainHasMultipleRefs,
    chain_needs_reference_review: chainHasMultipleRefs,
  };
};

const referenceKeys = (item = {}) => {
  const refs = extractConversationRefs(
    item.primary_operation_ref,
    item.no_embarque,
    item.shipment_refs,
    item.sam_refs,
    item.referencias_sam,
    item.int_origin_ref,
    item.int_ref,
    item.referencia_int,
    item.referencia,
    item.id,
    item.asunto
  );
  return unique([...refs.shipment_refs, ...refs.int_refs]).map((ref) => ref.toUpperCase());
};

const dateValue = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};

const signalText = (item = {}) =>
  normalize(
    [
      item.asunto,
      item.subject,
      item.cadena_correo,
      item.primary_operation_ref,
      item.no_embarque,
      item.shipment_refs,
      item.sam_refs,
      item.referencias_sam,
      item.int_origin_ref,
      item.int_ref,
      item.referencia_int,
      item.referencia,
      item.estado_operativo,
      item.estado_cotizacion,
      item.estado_correo,
      item.estado_ejecutivo_correo,
      item.estatus_sheet,
      item.etapa_comercial,
      item.cola_trabajo,
      item.vista_operativa,
      item.bandeja_ejecutiva,
      item.proceso_actual,
      item.ultimo_movimiento_resumen,
      item.ultimo_movimiento,
      item.ultima_evidencia,
      item.razon_del_pendiente,
      item.notas,
      item.accion_previa,
      item.accion_sugerida,
      item.accion_siguiente,
    ].join(" ")
  );

const hasSignal = (text, pattern) => pattern.test(text);

const OPERATIONAL_SIGNAL_RE =
  /pre(?:_|\s)*alert|prealert|document|invoice|factura|pedimento|awb|bl|guia|d_o|do(?:_|\s)*release|liberacion|customs|aduana|pickup|recoleccion|ready|cita|appointment|unidad|maniobra|ventana|eta|arrival|arribo|transito|ruta|zarpe|salida|departure|entregad|delivered|descargad|pod|eir|warehouse|almacenaje|consignee/;
const COMMERCIAL_SIGNAL_RE =
  /pricing|pendiente(?:_|\s)*de(?:_|\s)*coti|cotiz|quote|quotation|rate|tarifa|costos|costo|charges|enquiry|inquiry|rfq|solicitud|vigencia|opciones|cotizado|enviad(?:a|o)(?:_|\s)*(?:a|al)?(?:_|\s)*cliente|cliente(?:_|\s)*con(?:_|\s)*duda|pricing(?:_|\s)*respondio|falta(?:_|\s)*enviar/;
const OPERATIONAL_STATE_RE =
  /prealerta|documental|pickup|recoleccion|en(?:_|\s)*transito|en(?:_|\s)*aduana|entrega(?:_|\s)*pendiente|entregado(?:_|\s)*sin(?:_|\s)*pod|frente(?:_|\s)*activo|historico(?:_|\s)*en(?:_|\s)*radar/;
const COMMERCIAL_STATE_RE =
  /cotizacion(?:_|\s)*activa|cotizacion(?:_|\s)*int|pendiente(?:_|\s)*pricing|pelota(?:_|\s)*pricing|pricing(?:_|\s)*respondio|pricing(?:_|\s)*respondio(?:_|\s)*falta(?:_|\s)*enviar|pricing(?:_|\s)*respondio(?:_|\s)*validar(?:_|\s)*envio|cotizada|enviada(?:_|\s)*cliente|cliente(?:_|\s)*con(?:_|\s)*duda|etapa(?:_|\s)*pricing|etapa(?:_|\s)*multi|sheet(?:_|\s)*desfasado/;

const classifyRecordKind = (item = {}) => {
  const refs = extractConversationRefs(
    item.primary_operation_ref,
    item.no_embarque,
    item.shipment_refs,
    item.sam_refs,
    item.referencias_sam,
    item.int_origin_ref,
    item.int_ref,
    item.referencia_int,
    item.referencia,
    item.id,
    item.asunto,
    item.subject,
    item.cadena_correo
  );
  const text = signalText(item);
  const actor = normalize(item.actor_tipo || "");
  const hasShipmentRef = refs.shipment_refs.length > 0;
  const hasIntRef = refs.int_refs.length > 0;
  const hasOperationalSignal = hasSignal(text, OPERATIONAL_SIGNAL_RE) || hasSignal(text, OPERATIONAL_STATE_RE);
  const hasCommercialSignal = hasSignal(text, COMMERCIAL_SIGNAL_RE) || hasSignal(text, COMMERCIAL_STATE_RE) || actor === "pricing";
  const operationalActor = ["cnee", "shipper", "proveedor", "agente"].includes(actor);

  if (hasShipmentRef) return "operacion";
  if (hasCommercialSignal) return "cotizacion";
  if (operationalActor && hasOperationalSignal) return "operacion";
  if (hasOperationalSignal) return "operacion";
  if (hasIntRef) return "cotizacion";
  return "incierto";
};

const chainAction = ({ accion_sugerida, accion_tipo, accion_reason, accion_confidence = "media" }) => ({
  accion_sugerida,
  accion_tipo,
  accion_reason,
  accion_confidence,
});

const inferChainAction = (item = {}) => {
  const text = signalText(item);
  const actor = normalize(item.actor_tipo || "actor_externo");
  const lane = normalize(item.lane_cadena || item.lane || "");
  const actorConfidence = normalize(item.actor_confidence || item.confianza_actor || "");
  const ref = firstText(item.primary_operation_ref, item.int_origin_ref, item.int_ref, item.id, "esta operacion");
  const subject = firstText(item.cadena_correo, item.asunto, item.subject, "cadena sin asunto");
  const owner = firstText(item.pelota, item.quien_tiene_la_pelota, item.responsable_probable, "pelota incierta");

  if (lane === "cadena_por_validar" || actorConfidence === "baja") {
    return chainAction({
      accion_sugerida: `Validar la cadena "${subject}" antes de accionar; confirmar actor, pelota y ultimo hito de ${ref}.`,
      accion_tipo: "validar_cadena",
      accion_reason: "cadena_o_actor_incierto",
      accion_confidence: "baja",
    });
  }

  if (hasSignal(text, /factura|invoice|portal|cobranza|billing/)) {
    return chainAction({
      accion_sugerida: `Resolver factura/portal en "${subject}": confirmar si MULTI debe cargar la factura, compartir soporte o responder a cobranza/proveedor.`,
      accion_tipo: "resolver_factura_portal",
      accion_reason: "proveedor_pide_factura_o_portal",
      accion_confidence: "alta",
    });
  }

  if (hasSignal(text, /falta(?:_|\s)*pod|sin(?:_|\s)*pod|pod(?:_|\s)*pendiente|pending(?:_|\s)*pod|entrega(?:_|\s)*pendiente|falta(?:_|\s)*confirmacion(?:_|\s)*de(?:_|\s)*entrega/)) {
    return chainAction({
      accion_sugerida: `Pedir evidencia final en la cadena "${subject}" y no cerrar memoria/SAM hasta tener entrega o POD claro.`,
      accion_tipo: "pedir_pod_evidencia",
      accion_reason: "falta_pod_o_entrega",
      accion_confidence: "alta",
    });
  }

  if (hasSignal(text, /delivered|entregad|descargad|closed|cerrad|pod(?:_|\s)*(recibid|adjunt|attached|compartid)/)) {
    return chainAction({
      accion_sugerida: `Confirmar evidencia final en la cadena "${subject}" y cerrar memoria/SAM solo si el soporte es claro.`,
      accion_tipo: "validar_cierre",
      accion_reason: "evidencia_cierre_o_pod",
      accion_confidence: "media",
    });
  }

  if (actor === "pricing") {
    if (hasSignal(text, /respondio|compartio|costos|opciones|tarifa_lista|quote_ready|cotizado/)) {
      return chainAction({
        accion_sugerida: `Validar la tarifa de "${subject}" y enviar/confirmar envio al cliente; si ya se envio, actualizar estado local.`,
        accion_tipo: "enviar_tarifa_cliente",
        accion_reason: "pricing_respondio",
        accion_confidence: "alta",
      });
    }
    if (hasSignal(text, /duda|aclar|cambio|revise|revisar/)) {
      return chainAction({
        accion_sugerida: `Aclarar con Pricing la duda o cambio de "${subject}" antes de responder al cliente.`,
        accion_tipo: "aclarar_con_pricing",
        accion_reason: "duda_o_cambio_tarifa",
        accion_confidence: "media",
      });
    }
    return chainAction({
      accion_sugerida: `Pedir ETA de tarifa en la cadena "${subject}" y dejar claro si falta costo, vigencia o proveedor.`,
      accion_tipo: "pedir_eta_pricing",
      accion_reason: "pricing_pendiente",
      accion_confidence: "media",
    });
  }

  if (actor === "cliente") {
    if (hasSignal(text, /duda|why|porque|por_que|sube|mantener|original|please_advise|aclar|revised(?:_|\s)*(quote|rate|tarifa|cotiz|cost|costo)/)) {
      return chainAction({
        accion_sugerida: `Responder la duda del cliente en "${subject}" con explicacion puntual y evidencia del ultimo cambio.`,
        accion_tipo: "responder_duda_cliente",
        accion_reason: "cliente_pide_aclaracion",
        accion_confidence: "alta",
      });
    }
    if (hasSignal(text, /proceed|go_ahead|ok|confirmed|confirmado|aceptad|aprob/)) {
      return chainAction({
        accion_sugerida: `Convertir el proceed de "${subject}" en siguiente hito operativo: ligar/validar embarque SAM y avisar responsable.`,
        accion_tipo: "convertir_a_operacion",
        accion_reason: "cliente_acepta_o_confirma",
        accion_confidence: "alta",
      });
    }
    if (hasSignal(text, /status|update|eta|urgente|urgent/)) {
      return chainAction({
        accion_sugerida: `Responder al cliente en "${subject}" con status, ETA y siguiente hito confirmado por la cadena correcta.`,
        accion_tipo: "responder_status_cliente",
        accion_reason: "cliente_pide_status",
        accion_confidence: "media",
      });
    }
    return chainAction({
      accion_sugerida: `Revisar la cadena cliente "${subject}" y responder solo el pendiente de ese hilo con evidencia del ultimo movimiento.`,
      accion_tipo: "revisar_cliente",
      accion_reason: "cliente_sin_senal_especifica",
      accion_confidence: "media",
    });
  }

  if (actor === "cnee") {
    if (hasSignal(text, /document|invoice|factura|pedimento|awb|bl|guia|d_o|do_release|liberacion|customs|aduana/)) {
      return chainAction({
        accion_sugerida: `Atender la cadena CNEE "${subject}": confirmar documento, instruccion, liberacion o aduana pendiente con ${owner}.`,
        accion_tipo: "resolver_cnee_documental",
        accion_reason: "cnee_documental_liberacion",
        accion_confidence: "alta",
      });
    }
    return chainAction({
      accion_sugerida: `Dar seguimiento puntual a CNEE en "${subject}" y confirmar el siguiente hito con ${owner}.`,
      accion_tipo: "seguimiento_cnee",
      accion_reason: "cnee_sin_senal_documental",
      accion_confidence: "media",
    });
  }

  if (actor === "shipper") {
    if (hasSignal(text, /pickup|recoleccion|ready|cita|appointment|unidad|maniobra|ventana/)) {
      return chainAction({
        accion_sugerida: `Confirmar con shipper en "${subject}" pickup, cita, unidad o ventana; dejar el hito fechado.`,
        accion_tipo: "confirmar_pickup_shipper",
        accion_reason: "shipper_pickup_cita",
        accion_confidence: "alta",
      });
    }
    return chainAction({
      accion_sugerida: `Revisar la cadena shipper "${subject}" y confirmar documentos o disponibilidad antes del siguiente movimiento.`,
      accion_tipo: "seguimiento_shipper",
      accion_reason: "shipper_sin_senal_especifica",
      accion_confidence: "media",
    });
  }

  if (actor === "proveedor") {
    if (hasSignal(text, /tarifa|rate|cost|costo|charges|vigencia|quote/)) {
      return chainAction({
        accion_sugerida: `Confirmar con proveedor en "${subject}" costo/tarifa, vigencia y condiciones antes de moverlo a cliente o Pricing.`,
        accion_tipo: "confirmar_tarifa_proveedor",
        accion_reason: "proveedor_tarifa_costos",
        accion_confidence: "alta",
      });
    }
    if (hasSignal(text, /pickup|recoleccion|cita|appointment|unidad|eta|arrival|arribo|liberacion/)) {
      return chainAction({
        accion_sugerida: `Pedir update operativo al proveedor en "${subject}" con ETA/cita/unidad/liberacion y responsable claro.`,
        accion_tipo: "pedir_update_proveedor",
        accion_reason: "proveedor_hito_operativo",
        accion_confidence: "media",
      });
    }
    return chainAction({
      accion_sugerida: `Revisar la cadena de proveedor "${subject}" y confirmar si falta tarifa, disponibilidad, cita, documento o update puntual con ${owner}.`,
      accion_tipo: "seguimiento_proveedor",
      accion_reason: "proveedor_sin_senal_especifica",
      accion_confidence: "media",
    });
  }

  if (actor === "agente") {
    if (hasSignal(text, /pre_alert|prealert|document|invoice|factura|awb|bl|guia/)) {
      return chainAction({
        accion_sugerida: `Revisar la cadena de agente "${subject}" y confirmar prealert/documentos antes del siguiente hito.`,
        accion_tipo: "validar_prealert_agente",
        accion_reason: "agente_prealert_documental",
        accion_confidence: "alta",
      });
    }
    if (hasSignal(text, /inspection|departure|salida|eta|impact|status|update|charges|final_charges/)) {
      return chainAction({
        accion_sugerida: `Pedir/confirmar update al agente en "${subject}" con impacto, ETA o cargos finales segun aplique.`,
        accion_tipo: "pedir_update_agente",
        accion_reason: "agente_pide_o_debe_update",
        accion_confidence: "media",
      });
    }
    return chainAction({
      accion_sugerida: `Dar seguimiento a la cadena de agente "${subject}" y pedir update claro si sigue abierta.`,
      accion_tipo: "seguimiento_agente",
      accion_reason: "agente_sin_senal_especifica",
      accion_confidence: "media",
    });
  }

  if (actor === "multi") {
    return chainAction({
      accion_sugerida: `Cerrar internamente la cadena "${subject}": definir responsable, ultimo hito y respuesta necesaria antes de reportarla como accion.`,
      accion_tipo: "resolver_interno_multi",
      accion_reason: "actor_multi",
      accion_confidence: "media",
    });
  }

  return chainAction({
    accion_sugerida: `Revisar la cadena "${subject}" y confirmar actor/pelota antes de decidir sobre ${ref}.`,
    accion_tipo: "validar_actor",
    accion_reason: "actor_no_clasificado",
    accion_confidence: "baja",
  });
};

const dedupeConversations = (items = []) => {
  const byKey = new Map();
  for (const item of items) {
    const key = item.thread_key || buildConversationKey(item, item.actor_tipo);
    const previous = byKey.get(key);
    if (!previous || dateValue(item.ultimo_movimiento_at) >= dateValue(previous.ultimo_movimiento_at)) {
      byKey.set(key, { ...previous, ...item, id: key, thread_key: key });
    }
    const current = byKey.get(key);
    current.shipment_refs = unique([...(previous?.shipment_refs || []), ...(item.shipment_refs || [])]);
    current.int_refs = unique([...(previous?.int_refs || []), item.int_origin_ref, item.int_ref, item.referencia_int]);
  }
  return [...byKey.values()];
};

const selectActionableConversation = (items = [], rank) =>
  [...items].sort(
    (a, b) => rank(a) - rank(b) || dateValue(b.ultimo_movimiento_at) - dateValue(a.ultimo_movimiento_at) || clean(a.thread_key).localeCompare(clean(b.thread_key))
  )[0] || null;

const auditConversationGroup = (items = [], selected = null) => {
  const chains = items.filter(Boolean);
  const actors = unique(chains.map((item) => item.actor_tipo || "actor_externo"));
  const lanes = unique(chains.map((item) => item.lane_cadena || item.lane || "cadena_monitoreo"));
  const refs = unique(chains.flatMap((item) => referenceKeys(item)));
  const multiReferenceChains = chains.filter((item) => {
    const chainRefs = extractConversationRefs(
      item.primary_operation_ref,
      item.no_embarque,
      item.shipment_refs,
      item.sam_refs,
      item.referencias_sam,
      item.int_origin_ref,
      item.int_ref,
      item.referencia_int,
      item.referencia,
      item.asunto,
      item.subject,
      item.cadena_correo
    );
    return item.chain_has_multiple_refs || chainRefs.shipment_refs.length > 1 || chainRefs.int_refs.length > 1;
  });
  const lowConfidence = chains.filter((item) => normalize(item.actor_confidence || item.accion_confidence) === "baja").length;
  const alertCount = chains.filter((item) => normalize(item.lane_cadena || item.lane) === "cadena_en_alerta").length;
  const validateCount = chains.filter((item) => normalize(item.lane_cadena || item.lane) === "cadena_por_validar").length;
  const pricingCount = chains.filter((item) => normalize(item.lane_cadena || item.lane) === "cadena_pricing").length;
  const mixedActors = actors.length > 1;
  const competingAlerts = alertCount > 1;

  let status = "ok";
  let severity = "bajo";
  let recommendation = "Cadena accionable suficiente; conservar separacion por actor.";

  if (!chains.length) {
    status = "sin_cadenas";
    severity = "medio";
    recommendation = "No hay cadena ligada; validar referencia antes de sugerir accion.";
  } else if (multiReferenceChains.length > 0) {
    status = "referencias_multiples_en_cadena";
    severity = "alto";
    recommendation = "Separar la cadena correcta antes de sugerir accion; el hilo mezcla varias referencias o embarques.";
  } else if (lowConfidence > 0 || validateCount > 0) {
    status = "requiere_validacion";
    severity = "alto";
    recommendation = "Validar actor, pelota y ultimo hito antes de actuar.";
  } else if (mixedActors && competingAlerts) {
    status = "actores_mixtos_en_alerta";
    severity = "alto";
    recommendation = "Revisar cadenas por separado; hay mas de un actor en alerta para la misma referencia.";
  } else if (mixedActors) {
    status = "actores_mixtos";
    severity = "medio";
    recommendation = "Mantener lectura por cadena; no usar una accion agregada sin revisar el actor elegido.";
  } else if (competingAlerts) {
    status = "multiples_alertas";
    severity = "medio";
    recommendation = "Confirmar que la cadena accionable elegida sea la que Miguel debe atender primero.";
  }

  return {
    status,
    severity,
    needs_validation: ["sin_cadenas", "referencias_multiples_en_cadena", "requiere_validacion", "actores_mixtos_en_alerta"].includes(status),
    chains_total: chains.length,
    actors,
    lanes,
    refs,
    alert_count: alertCount,
    validate_count: validateCount,
    pricing_count: pricingCount,
    multiple_reference_count: multiReferenceChains.length,
    low_confidence_count: lowConfidence,
    selected_thread_key: selected?.thread_key || "",
    selected_actor_tipo: selected?.actor_tipo || "",
    selected_lane_cadena: selected?.lane_cadena || selected?.lane || "",
    selected_action_confidence: selected?.accion_confidence || "",
    selected_reference_scope: selected?.reference_scope || "",
    selected_chain_has_multiple_refs: Boolean(selected?.chain_has_multiple_refs),
    recommendation,
  };
};

module.exports = {
  auditConversationGroup,
  buildConversationKey,
  buildThreadIdentity,
  classifyRecordKind,
  dedupeConversations,
  extractConversationRefs,
  inferChainAction,
  referenceKeys,
  selectActionableConversation,
  subjectFingerprint,
};
