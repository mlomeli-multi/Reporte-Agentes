const fs = require("fs");
const path = require("path");
const { buildConversationKey, buildThreadIdentity, classifyRecordKind } = require("./lib/conversation-thread-engine");

const root = path.resolve(__dirname, "..");
const inputPath = path.resolve(root, process.argv[2] || "work/outlook-messages-snapshot.json");
const memoryPath = path.resolve(root, "work/outlook-pendientes-abiertos.json");
const cotizacionesMemoryPath = path.resolve(root, "work/cotizaciones-seguimiento-metricas.json");
const actorCatalogPath = path.resolve(root, "work/catalogo-actores-v1.json");
const timezone = "America/Mexico_City";

const clean = (value) => String(value || "").trim().replace(/\s+/g, " ");
const normalize = (value) =>
  clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const readJson = (file, fallback) => {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const actorCatalog = readJson(actorCatalogPath, { version: 1, actor_types: {} });

const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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
  const prefix = clean(ref).match(/^([A-Z]{2,3})-/i)?.[1]?.toUpperCase() || "";
  return { prefix, ...(shipmentCatalog[prefix] || { modalidad: "incierto", tipo: "por_validar", activa: true }) };
};

const monthCatalog = {
  "01": "Enero",
  "02": "Febrero",
  "03": "Marzo",
  "04": "Abril",
  "05": "Mayo",
  "06": "Junio",
  "07": "Julio",
  "08": "Agosto",
  "09": "Septiembre",
  "10": "Octubre",
  "11": "Noviembre",
  "12": "Diciembre",
};

const refsFrom = (...values) => {
  const text = values.map(clean).join(" ");
  const shipmentRefs = [...new Set(text.match(SHIPMENT_RE) || [])].map((ref) => ref.toUpperCase());
  return {
    intRefs: [...new Set(text.match(INT_RE) || [])].map((ref) => ref.toUpperCase()),
    shipmentRefs,
    samRefs: shipmentRefs,
  };
};

const firstText = (...values) => {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
};

const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value);
  return [value];
};

const actorTypeConfig = (actorType) => actorCatalog.actor_types?.[actorType] || {};
const catalogValues = (actorType, field) => asArray(actorTypeConfig(actorType)[field]).map(normalize).filter(Boolean);
const readableCatalogHit = (value) => clean(value).slice(0, 42);
const matchActorCatalog = (actorType, text, senderDomain) => {
  const haystack = normalize(text);
  const term = catalogValues(actorType, "terms").find((value) => value && haystack.includes(value));
  if (term) {
    return {
      actor_tipo: actorType,
      actor_detection_reason: `catalogo_${actorType}: ${readableCatalogHit(term)}`,
      actor_confidence: "alta",
    };
  }

  const domain = normalize(senderDomain);
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

const actorFrom = (message) => {
  if (typeof message.sender === "string") return clean(message.sender);
  return firstText(message.sender?.emailAddress?.name, message.sender?.name, message.from?.emailAddress?.name, message.from?.name);
};

const emailFrom = (message) => {
  const direct = firstText(
    message.sender?.emailAddress?.address,
    message.sender?.address,
    message.from?.emailAddress?.address,
    message.from?.address,
    message.sender_email,
    message.from_email,
    message.email
  );
  const fallback = direct || actorFrom(message);
  return clean(fallback.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || direct).toLowerCase();
};

const domainFromEmail = (email) => clean(email).toLowerCase().split("@")[1] || "";

const receivedAt = (message) => firstText(message.receivedDateTime, message.received_at, message.date, message.createdDateTime);

const messageText = (message) => clean([message.subject, message.bodyPreview, message.preview, message.summary].join(" "));

const inferMonth = (id, dateText) => {
  const intMatch = clean(id).match(/\bINT(\d{2})-\d{4}-\d{3,4}\b/i);
  if (intMatch) return { code: intMatch[1], name: monthCatalog[intMatch[1]] || "Sin mes claro" };
  const shipmentMatch = clean(id).match(/\b[A-Z]{2,3}-\d{4}(\d{2})-\d{4}\b/i);
  if (shipmentMatch) return { code: shipmentMatch[1], name: monthCatalog[shipmentMatch[1]] || "Sin mes claro" };
  const dateMatch = clean(dateText).match(/\b\d{4}-(\d{2})-\d{2}\b/);
  if (dateMatch) return { code: dateMatch[1], name: monthCatalog[dateMatch[1]] || "Sin mes claro" };
  return { code: "", name: "Sin mes claro" };
};

const actorProfileFromMessage = (message) => {
  const subject = normalize(message.subject);
  const folder = normalize(message.folder_path || message.folder);
  const senderName = actorFrom(message);
  const sender = normalize(senderName);
  const senderEmail = emailFrom(message);
  const senderDomain = domainFromEmail(senderEmail);
  const text = normalize(messageText(message));
  const full = `${subject}_${folder}_${sender}_${text}`;
  const subjectFolder = `${subject}_${folder}`;
  const rawDomain = normalize(senderDomain);

  const knownCnee = matchActorCatalog("cnee", subjectFolder, senderDomain);
  if (knownCnee || /cnee|consignee/.test(`${subject}_${folder}_${text}`)) {
    const match = knownCnee || { actor_tipo: "cnee", actor_detection_reason: "keyword_cnee", actor_confidence: "alta" };
    return { ...match, actor_principal: firstText(senderName, "CNEE"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  const knownShipper = matchActorCatalog("shipper", subjectFolder, senderDomain);
  if (knownShipper || /shipper|pickup|recoleccion|proveedor_embarque/.test(`${subject}_${folder}_${text}`)) {
    const match = knownShipper || { actor_tipo: "shipper", actor_detection_reason: "keyword_shipper_pickup", actor_confidence: "alta" };
    return { ...match, actor_principal: firstText(senderName, "Shipper"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  const knownPricing = matchActorCatalog("pricing", subjectFolder, senderDomain);
  if (knownPricing || /pricing|cotiz|tarifa|rate|rates/.test(`${subject}_${folder}_${text}`)) {
    const match = knownPricing || { actor_tipo: "pricing", actor_detection_reason: "keyword_pricing_tarifa", actor_confidence: "alta" };
    return { ...match, actor_principal: firstText(senderName, "Pricing"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  const knownAgent = matchActorCatalog("agente", full, senderDomain);
  if (knownAgent || /quick|time_matters|versant|world_cargo|priority_freight/.test(full)) {
    const match = knownAgent || { actor_tipo: "agente", actor_detection_reason: "agente_conocido_en_cadena", actor_confidence: "alta" };
    return { ...match, actor_principal: firstText(senderName, "Agente"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  const knownProvider = matchActorCatalog("proveedor", full, senderDomain);
  if (knownProvider || /proveedor|carrier|transportista|trucker|trucking|naviera|aerolinea|airline|terminal|warehouse|almacen|costos_proveedor/.test(full)) {
    const match = knownProvider || { actor_tipo: "proveedor", actor_detection_reason: "keyword_proveedor_operativo", actor_confidence: "media" };
    return { ...match, actor_principal: firstText(senderName, "Proveedor"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  const knownMulti = matchActorCatalog("multi", sender, senderDomain);
  if (knownMulti || /mlti|multi|miguel|brenda|rodrigo|luz|joss|joselyn|erika|salma|uriel|carolina|susana|andrea/.test(sender) || /mlti|multilogistics|multi_logistics/.test(rawDomain)) {
    const match = knownMulti || { actor_tipo: "multi", actor_detection_reason: "remitente_multi", actor_confidence: "alta" };
    return { ...match, actor_principal: firstText(senderName, "MULTI"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  if (/agent|agente|forwarder|freight|shipping/.test(`${subject}_${folder}_${sender}_${rawDomain}`)) {
    return { actor_tipo: "agente", actor_principal: firstText(senderName, "Agente"), sender_email: senderEmail, sender_domain: senderDomain, actor_detection_reason: "keyword_agente_folder_sender", actor_confidence: "media" };
  }
  const knownClient = matchActorCatalog("cliente", full, senderDomain);
  if (knownClient) {
    return { ...knownClient, actor_principal: firstText(senderName, "Cliente"), sender_email: senderEmail, sender_domain: senderDomain };
  }
  if (senderEmail || senderDomain) {
    return { actor_tipo: "cliente", actor_principal: firstText(senderName, senderEmail, "Cliente"), sender_email: senderEmail, sender_domain: senderDomain, actor_detection_reason: "dominio_externo", actor_confidence: "media" };
  }
  return { actor_tipo: "actor_externo", actor_principal: firstText(senderName, "Actor no identificado"), sender_email: senderEmail, sender_domain: senderDomain, actor_detection_reason: "sin_senal_suficiente", actor_confidence: "baja" };
};

const inferActorType = (message) => actorProfileFromMessage(message).actor_tipo;

const labelForActor = (actorType) =>
  ({
    cnee: "CNEE",
    shipper: "Shipper",
    proveedor: "Proveedor",
    pricing: "Pricing",
    agente: "Agente",
    multi: "MULTI",
    cliente: "Cliente",
    actor_externo: "Actor externo",
  }[actorType] || "Actor externo");

const inferCriticidad = (message) => {
  const text = normalize(messageText(message));
  if (/urgent|urgente|critical|critico|liberacion|detenido|hold|atraso|demora|complaint|queja/.test(text)) return "critico";
  if (/please_confirm|status|update|pre_alert|prealert|pod|pickup|booking|maniobra|aduana|customs/.test(text)) return "alto";
  return "medio";
};

const inferEstado = (message) => {
  const text = normalize(messageText(message));
  if (/pod|descargad|delivered|entregad|cerrad|closed/.test(text)) return "cerrado";
  if (/pre_alert|prealert/.test(text)) return "prealerta";
  if (/document|invoice|factura|pedimento|awb|bl|guia|d_o|do release/.test(text)) return "documental";
  if (/pickup|recoleccion|unidad|maniobra|appointment|cita/.test(text)) return "pickup_programado";
  if (/eta|transit|transito|arrival|llego|arribo/.test(text)) return "en_transito";
  if (/quote|cotiz|pricing|rate|tarifa/.test(text)) return "cotizacion";
  return "abierto";
};

const inferPelota = (message, criticidad) => {
  const actor = actorFrom(message);
  const text = normalize(messageText(message));
  if (/pricing|rate|tarifa|cotiz/.test(text)) return "Pricing / MULTI";
  if (/please_confirm|favor_confirmar|confirmar|send|provide|status|update|pre_alert|pod/.test(text)) return "MULTI";
  if (/thanks|thank_you|proceed|ok|confirmed|confirmado/.test(text) && actor) return `${actor} / monitoreo`;
  return criticidad === "critico" ? "MULTI / validar hoy" : firstText(actor, "Actor incierto");
};

const inferAction = (message, estado, pelota) => {
  const subject = clean(message.subject);
  if (estado === "cerrado") return "Validar si ya puede cerrarse en memoria o si queda evidencia final pendiente.";
  if (estado === "cotizacion") return "Confirmar siguiente paso de cotizacion: pricing, envio a cliente, duda o cierre.";
  if (estado === "documental") return "Revisar documento/evidencia solicitada y responder con soporte claro.";
  if (estado === "prealerta") return "Confirmar pre-alert completo y siguiente hito operativo.";
  if (estado === "pickup_programado") return "Confirmar cita, unidad o maniobra y actualizar siguiente hito.";
  if (subject) return `Revisar correo y definir respuesta/siguiente hito con ${pelota}.`;
  return "Clasificar correo operativo y definir siguiente accion.";
};

const flattenMessages = (snapshot) => {
  if (Array.isArray(snapshot.messages)) return snapshot.messages;
  if (Array.isArray(snapshot.items)) return snapshot.items;
  if (!Array.isArray(snapshot.sources)) return [];
  return snapshot.sources.flatMap((source) =>
    (source.messages || source.items || []).map((message) => ({
      ...message,
      folder_path: message.folder_path || source.folder_path || source.folder || source.name,
    }))
  );
};

const flattenReferenciaMap = (referencias) => {
  if (!Array.isArray(referencias)) return {};
  return referencias.reduce((acc, entry) => {
    if (!entry || typeof entry !== "object") return acc;
    for (const [key, value] of Object.entries(entry)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        acc[key] = { id: key, ...value };
      }
    }
    return acc;
  }, {});
};

const keyFor = (item) => {
  const actorType = item.actor_tipo || inferActorType(item);
  return buildConversationKey(item, actorType);
};

const quoteIdFor = (refs, subject) => firstText(refs.intRefs[0], refs.shipmentRefs[0], clean(subject).slice(0, 80));

const inferQuoteEmailStatus = (message, actorTipo) => {
  const text = normalize(messageText(message));
  if (/proceed|go_ahead|confirmed|confirmado|aceptad|aprob/.test(text)) return "cliente_acepto";
  if (/duda|aclar|revised|revision|cambio|please_advise|why|porque|por_que/.test(text)) return "cliente_con_duda";
  if (/sent|enviad|shared_to_customer|quote_attached|cotizad(?:a|o)_cliente/.test(text)) return "cotizada_cliente";
  if (actorTipo === "pricing" && /respondio|compartio|costos|opciones|tarifa_lista|quote_ready|cotizad/.test(text)) {
    return "pricing_respondio_falta_enviar";
  }
  if (/pricing|pendiente_de_coti|cotiz|quote|quotation|rate|tarifa|costos|costo|charges|rfq|inquiry|enquiry/.test(text)) {
    return "pendiente_pricing";
  }
  return "activa_incierta";
};

const quoteProfile = (status, actorTipo) => {
  if (status === "pricing_respondio_falta_enviar") {
    return {
      semaforo: "rojo",
      pelota: "Miguel/MULTI",
      accion: "Validar costos recibidos de Pricing y enviar/confirmar respuesta al cliente.",
    };
  }
  if (status === "cliente_con_duda") {
    return {
      semaforo: "rojo",
      pelota: "Miguel/MULTI",
      accion: "Responder duda del cliente con explicacion puntual o pedir aclaracion a Pricing.",
    };
  }
  if (status === "cliente_acepto") {
    return {
      semaforo: "amarillo",
      pelota: "Miguel/MULTI",
      accion: "Validar si ya existe embarque SAM; si no, convertir cotizacion aceptada a operacion.",
    };
  }
  if (status === "cotizada_cliente") {
    return {
      semaforo: "verde",
      pelota: "Cliente / monitoreo",
      accion: "Monitorear respuesta del cliente; no contar como pendiente de Pricing.",
    };
  }
  return {
    semaforo: actorTipo === "pricing" ? "amarillo" : "verde",
    pelota: actorTipo === "pricing" ? "Pricing / validar ETA" : "Miguel/MULTI / validar etapa",
    accion: "Clasificar etapa comercial: falta Pricing, falta enviar, duda de cliente o monitoreo.",
  };
};

const snapshot = readJson(inputPath, null);
if (!snapshot) {
  throw new Error(`No se encontro foto de Outlook en ${inputPath}`);
}

const memory = readJson(memoryPath, {
  version: 1,
  descripcion: "Registro vivo de pendientes operativos de Outlook para los reportes diarios. No modifica Outlook; solo conserva seguimiento entre corridas.",
  pendientes_abiertos: [],
  pendientes: [],
});

const cotizacionesMemory = readJson(cotizacionesMemoryPath, {
  version: 1,
  descripcion: "Memoria V2 para medir tiempos de respuesta, seguimiento de cotizaciones y observaciones de calidad. No modifica Outlook ni Google Sheet.",
  timezone,
  referencias: [],
});

const importedAt = new Date().toISOString();
const existing = new Map((memory.pendientes_abiertos || []).map((item) => [keyFor(item), item]));
const quoteReferences = flattenReferenciaMap(cotizacionesMemory.referencias);
let importedOperations = 0;
let importedQuotes = 0;
let ignored = 0;
let ignoredByKind = 0;

for (const message of flattenMessages(snapshot)) {
  const subject = clean(message.subject);
  const preview = clean(message.bodyPreview || message.preview || message.summary);
  const refs = refsFrom(subject, preview);
  const hasOperationalSignal =
    refs.intRefs.length ||
    refs.samRefs.length ||
    /quote|cotiz|pricing|urgent|urgente|status|update|pre.?alert|pod|pickup|booking|maniobra|customs|aduana/i.test(
      `${subject} ${preview}`
    );

  if (!subject || !hasOperationalSignal) {
    ignored += 1;
    continue;
  }

  const primaryOperationRef = firstText(refs.shipmentRefs[0], refs.intRefs[0]);
  const reference = firstText(primaryOperationRef, [...refs.intRefs, ...refs.shipmentRefs].join(" / "), subject);
  const at = receivedAt(message);
  const month = inferMonth(reference, at);
  const criticidad = inferCriticidad(message);
  const estado = inferEstado(message);
  const pelota = inferPelota(message, criticidad);
  const actorProfile = actorProfileFromMessage(message);
  const actorTipo = actorProfile.actor_tipo;
  const shipmentInfo = shipmentProfile(refs.shipmentRefs[0]);
  const identity = buildThreadIdentity({
    referencia: reference,
    asunto: subject,
    no_embarque: refs.shipmentRefs[0],
    shipment_refs: refs.shipmentRefs,
    sam_refs: refs.shipmentRefs,
    int_ref: refs.intRefs[0],
    int_origin_ref: refs.intRefs[0],
    actor_tipo: actorTipo,
    conversationId: message.conversationId || message.conversation_id,
  }, actorTipo);
  const key = identity.thread_key || keyFor({
    referencia: reference,
    asunto: subject,
    no_embarque: refs.shipmentRefs[0],
    actor_tipo: actorTipo,
    conversationId: message.conversationId || message.conversation_id,
  });
  const previous = existing.get(key) || {};

  const operationRecord = {
    ...previous,
    fecha_detectado: previous.fecha_detectado || at || importedAt,
    ultima_revision: importedAt,
    ultimo_movimiento_at: at || previous.ultimo_movimiento_at || previous.ultima_revision,
    asunto: subject,
    referencia: reference,
    int_ref: refs.intRefs[0] || previous.int_ref || "",
    referencia_int: refs.intRefs[0] || previous.referencia_int || "",
    int_origin_ref: refs.intRefs[0] || previous.int_origin_ref || "",
    no_embarque: refs.shipmentRefs[0] || previous.no_embarque || "",
    shipment_refs: refs.shipmentRefs.length ? refs.shipmentRefs : previous.shipment_refs || [],
    sam_refs: refs.shipmentRefs.length ? refs.shipmentRefs : previous.sam_refs || [],
    referencias_sam: refs.shipmentRefs.length ? refs.shipmentRefs : previous.referencias_sam || [],
    primary_operation_ref: firstText(identity.primary_operation_ref, refs.shipmentRefs[0], refs.intRefs[0], previous.primary_operation_ref, reference),
    operation_identity: identity.operation_identity || (refs.shipmentRefs.length ? "embarque" : refs.intRefs.length ? "int_provisional" : "cadena_sin_ref"),
    reference_scope: identity.reference_scope,
    reference_scope_reason: identity.reference_scope_reason,
    thread_identity: identity.thread_identity,
    thread_identity_reason: identity.thread_identity_reason,
    thread_display: identity.thread_display,
    subject_display: identity.subject_display,
    subject_fingerprint: identity.subject_fingerprint,
    chain_refs_count: identity.chain_refs_count,
    chain_has_multiple_refs: identity.chain_has_multiple_refs,
    chain_needs_reference_review: identity.chain_needs_reference_review,
    shipment_prefix: shipmentInfo.prefix || previous.shipment_prefix || "",
    shipment_modalidad: shipmentInfo.modalidad || previous.shipment_modalidad || "",
    shipment_tipo: shipmentInfo.tipo || previous.shipment_tipo || "",
    shipment_clasificacion_activa: refs.shipmentRefs.length ? shipmentInfo.activa !== false : false,
    actor_tipo: actorTipo,
    actor_principal: actorProfile.actor_principal || previous.actor_principal || "",
    actor_detection_reason: actorProfile.actor_detection_reason,
    actor_confidence: actorProfile.actor_confidence,
    sender_email: actorProfile.sender_email || previous.sender_email || "",
    sender_domain: actorProfile.sender_domain || previous.sender_domain || "",
    actor_profile: actorProfile,
    cadena_correo: `${labelForActor(actorTipo)} / ${subject}`,
    email_thread_id: firstText(message.conversationId, message.conversation_id, message.thread_id, previous.email_thread_id, key),
    thread_key: key,
    cliente_actor: firstText(previous.cliente_actor, actorProfile.actor_principal, actorFrom(message), "Actor no identificado"),
    carpeta: firstText(message.folder_path, message.folder, previous.carpeta, "Outlook"),
    link_correo: firstText(message.webLink, message.web_link, message.display_url, message.link, previous.link_correo),
    criticidad: previous.criticidad === "critico" ? previous.criticidad : criticidad,
    quien_tiene_la_pelota: previous.quien_tiene_la_pelota || pelota,
    responsable_probable: previous.responsable_probable || pelota,
    accion_sugerida: previous.accion_sugerida || inferAction(message, estado, pelota),
    razon_del_pendiente: preview || previous.razon_del_pendiente || "Correo operativo detectado en snapshot de Outlook.",
    estado,
    mes_origen: month.name,
    mes_codigo: month.code,
    seguir_en_reportes_diarios: estado !== "cerrado",
    source_outlook_snapshot: {
      imported_at: importedAt,
      scanned_at: snapshot.scanned_at || "",
      message_id: firstText(message.id, message.message_id),
      received_at: at,
      folder_path: firstText(message.folder_path, message.folder),
    },
  };

  const recordKind = classifyRecordKind(operationRecord);
  if (recordKind === "operacion") {
    existing.set(key, operationRecord);
    importedOperations += 1;
    continue;
  }

  if (recordKind === "cotizacion") {
    const quoteId = quoteIdFor(refs, subject);
    const existingQuote = quoteReferences[quoteId] || {};
    const quoteStatus = inferQuoteEmailStatus(message, actorTipo);
    const profile = quoteProfile(quoteStatus, actorTipo);
    quoteReferences[quoteId] = {
      ...existingQuote,
      id: quoteId,
      referencia: quoteId,
      int_ref: refs.intRefs[0] || existingQuote.int_ref || "",
      referencia_int: refs.intRefs[0] || existingQuote.referencia_int || "",
      int_origin_ref: refs.intRefs[0] || existingQuote.int_origin_ref || "",
      no_embarque: refs.shipmentRefs[0] || existingQuote.no_embarque || "",
      shipment_refs: refs.shipmentRefs.length ? refs.shipmentRefs : existingQuote.shipment_refs || [],
      sam_refs: refs.shipmentRefs.length ? refs.shipmentRefs : existingQuote.sam_refs || [],
      referencias_sam: refs.shipmentRefs.length ? refs.shipmentRefs : existingQuote.referencias_sam || [],
      primary_operation_ref: identity.primary_operation_ref || refs.shipmentRefs[0] || existingQuote.primary_operation_ref || "",
      operation_identity: refs.shipmentRefs.length ? "embarque_ligado" : "cotizacion_int",
      reference_scope: identity.reference_scope,
      reference_scope_reason: identity.reference_scope_reason,
      thread_identity: identity.thread_identity,
      thread_identity_reason: identity.thread_identity_reason,
      thread_display: identity.thread_display,
      subject_display: identity.subject_display,
      subject_fingerprint: identity.subject_fingerprint,
      chain_refs_count: identity.chain_refs_count,
      chain_has_multiple_refs: identity.chain_has_multiple_refs,
      chain_needs_reference_review: identity.chain_needs_reference_review,
      cliente: existingQuote.cliente || (actorTipo === "cliente" ? actorProfile.actor_principal : ""),
      estado_correo: quoteStatus,
      estado_ejecutivo_correo: quoteStatus,
      semaforo: existingQuote.semaforo === "rojo" ? existingQuote.semaforo : profile.semaforo,
      quien_tiene_la_pelota: existingQuote.quien_tiene_la_pelota || profile.pelota,
      accion_reporte: existingQuote.accion_reporte || profile.accion,
      ultima_evidencia_at: at || existingQuote.ultima_evidencia_at || importedAt,
      ultima_evidencia: preview || existingQuote.ultima_evidencia || subject,
      notas: existingQuote.notas || `Evidencia comercial detectada en Outlook: ${subject}`,
      carpeta: firstText(message.folder_path, message.folder, existingQuote.carpeta, "Outlook"),
      link_correo: firstText(message.webLink, message.web_link, message.display_url, message.link, existingQuote.link_correo),
      mes_origen: existingQuote.mes_origen || month.name,
      mes_codigo: existingQuote.mes_codigo || month.code,
      source_outlook_snapshot: {
        imported_at: importedAt,
        scanned_at: snapshot.scanned_at || "",
        message_id: firstText(message.id, message.message_id),
        received_at: at,
        folder_path: firstText(message.folder_path, message.folder),
        actor_tipo: actorTipo,
        actor_detection_reason: actorProfile.actor_detection_reason,
        record_kind: recordKind,
      },
    };
    importedQuotes += 1;
    continue;
  }

  ignoredByKind += 1;
}

memory.pendientes_abiertos = [...existing.values()].filter((item) => normalize(item.estado) !== "cerrado");
memory.pendientes = memory.pendientes || [];
memory.ultima_actualizacion = importedAt;
memory.last_outlook_import = {
  imported_at: importedAt,
  scanned_at: snapshot.scanned_at || "",
  imported_messages: importedOperations + importedQuotes,
  imported_operations: importedOperations,
  imported_quotes: importedQuotes,
  ignored_messages: ignored,
  ignored_by_kind: ignoredByKind,
  source_count: snapshot.sources?.length || (snapshot.messages ? 1 : 0),
};

cotizacionesMemory.referencias = [Object.fromEntries(Object.entries(quoteReferences).sort(([a], [b]) => a.localeCompare(b, "es")))];
cotizacionesMemory.ultima_actualizacion = importedAt;
cotizacionesMemory.last_outlook_import = {
  imported_at: importedAt,
  scanned_at: snapshot.scanned_at || "",
  imported_quotes: importedQuotes,
  rule: "Outlook solo agrega evidencia comercial; no sobrescribe estatus del Sheet.",
};

writeJson(memoryPath, memory);
writeJson(cotizacionesMemoryPath, cotizacionesMemory);
console.log(`Imported ${importedOperations} Outlook operations and ${importedQuotes} quote signals; ignored ${ignored + ignoredByKind}.`);
