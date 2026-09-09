const test = require("node:test");
const assert = require("node:assert/strict");

const {
  auditConversationGroup,
  buildConversationKey,
  buildThreadIdentity,
  classifyRecordKind,
  dedupeConversations,
  inferChainAction,
  referenceKeys,
  selectActionableConversation,
  subjectFingerprint,
} = require("../scripts/lib/conversation-thread-engine");

test("normaliza conversationId de Outlook como llave prioritaria", () => {
  assert.equal(buildConversationKey({ conversationId: "  AAMk-ABC  " }, "cliente"), "outlook:aamk_abc");
});

test("construye identidad de cadena priorizando embarque y conservando INT origen", () => {
  const identity = buildThreadIdentity(
    {
      conversationId: "AAMk-UNO",
      asunto: "RE: INT09-2026-901 / EA-202609-9901 status Cliente Demo",
    },
    "cliente"
  );
  assert.equal(identity.thread_key, "outlook:aamk_uno");
  assert.equal(identity.reference_scope, "embarque_sam");
  assert.equal(identity.primary_operation_ref, "EA-202609-9901");
  assert.equal(identity.int_origin_ref, "INT09-2026-901");
  assert.equal(identity.thread_identity_reason, "conversation_id_outlook");
});

test("marca cadena con multiples embarques como revision de referencia", () => {
  const identity = buildThreadIdentity(
    {
      asunto: "INT07-2026-357 / DT-202607-0264 / AA-202607-0022 prealert",
    },
    "cnee"
  );
  assert.equal(identity.chain_has_multiple_refs, true);
  assert.equal(identity.chain_needs_reference_review, true);
  assert.equal(identity.reference_scope, "embarque_sam");
});

test("agrupa respuestas equivalentes sin conversationId y separa actores", () => {
  const base = { asunto: "RE: Status INT09-2026-042 / EA-202609-0001" };
  const reply = { asunto: "RES: RV: Status INT09-2026-042 / EA-202609-0001" };
  assert.equal(subjectFingerprint(base.asunto), subjectFingerprint(reply.asunto));
  assert.equal(buildConversationKey(base, "cliente"), buildConversationKey(reply, "cliente"));
  assert.notEqual(buildConversationKey(base, "cliente"), buildConversationKey(reply, "pricing"));
});

test("deduplica una cadena conservando movimiento mas reciente y referencias", () => {
  const threads = dedupeConversations([
    { thread_key: "outlook:uno", shipment_refs: ["EA-202609-0001"], ultimo_movimiento_at: "2026-09-02T10:00:00Z", pelota: "Cliente" },
    { thread_key: "outlook:uno", shipment_refs: [], ultimo_movimiento_at: "2026-09-02T11:00:00Z", pelota: "MULTI" },
  ]);
  assert.equal(threads.length, 1);
  assert.equal(threads[0].pelota, "MULTI");
  assert.deepEqual(threads[0].shipment_refs, ["EA-202609-0001"]);
});

test("liga por embarque e INT y selecciona carril antes que fecha", () => {
  assert.deepEqual(referenceKeys({ asunto: "INT09-2026-042 EA-202609-0001" }), ["EA-202609-0001", "INT09-2026-042"]);
  const selected = selectActionableConversation(
    [
      { thread_key: "espera", lane: 3, ultimo_movimiento_at: "2026-09-02T12:00:00Z" },
      { thread_key: "alerta", lane: 0, ultimo_movimiento_at: "2026-09-01T12:00:00Z" },
    ],
    (item) => item.lane
  );
  assert.equal(selected.thread_key, "alerta");
});

test("genera accion especifica cuando cliente pide aclaracion", () => {
  const action = inferChainAction({
    actor_tipo: "cliente",
    actor_confidence: "alta",
    primary_operation_ref: "INT09-2026-902",
    asunto: "4th order: urgent enquiry / INT09-2026-902",
    ultimo_movimiento_resumen: "Cliente pregunta por que sube tarifa y pide mantener quote original.",
  });
  assert.equal(action.accion_tipo, "responder_duda_cliente");
  assert.equal(action.accion_confidence, "alta");
});

test("genera accion operativa cuando cliente confirma proceed", () => {
  const action = inferChainAction({
    actor_tipo: "cliente",
    actor_confidence: "alta",
    int_origin_ref: "INT09-2026-042",
    asunto: "Client proceed INT09-2026-042",
    ultimo_movimiento_resumen: "Cliente confirma proceed.",
  });
  assert.equal(action.accion_tipo, "convertir_a_operacion");
});

test("pricing pendiente pide ETA sin mezclarlo con operacion", () => {
  const action = inferChainAction({
    actor_tipo: "pricing",
    actor_confidence: "alta",
    asunto: "Pricing / INT09-2026-042",
    ultimo_movimiento_resumen: "Pendiente de tarifa.",
  });
  assert.equal(action.accion_tipo, "pedir_eta_pricing");
});

test("clasifica INT comercial sin embarque como cotizacion", () => {
  assert.equal(
    classifyRecordKind({
      actor_tipo: "pricing",
      int_ref: "INT09-2026-042",
      asunto: "Pricing / INT09-2026-042",
      ultimo_movimiento_resumen: "Pendiente de Coti. Pricing para tarifa y costos.",
    }),
    "cotizacion"
  );
});

test("clasifica cadena con embarque como operacion aunque conserve INT", () => {
  assert.equal(
    classifyRecordKind({
      actor_tipo: "cliente",
      int_origin_ref: "INT09-2026-901",
      no_embarque: "EA-202609-9901",
      asunto: "INT09-2026-901 / EA-202609-9901 status",
      ultimo_movimiento_resumen: "Cliente pide ETA de arribo.",
    }),
    "operacion"
  );
});

test("clasifica cadena operativa de CNEE sin embarque visible como operacion", () => {
  assert.equal(
    classifyRecordKind({
      actor_tipo: "cnee",
      asunto: "CNEE documentos para despacho",
      ultimo_movimiento_resumen: "Falta factura y pedimento para liberacion.",
    }),
    "operacion"
  );
});

test("actor incierto obliga a validar cadena", () => {
  const action = inferChainAction({
    actor_tipo: "actor_externo",
    actor_confidence: "baja",
    primary_operation_ref: "AA-202609-0001",
    asunto: "Status AA-202609-0001",
  });
  assert.equal(action.accion_tipo, "validar_cadena");
  assert.equal(action.accion_confidence, "baja");
});

test("eta en revision no se confunde con duda de cliente", () => {
  const action = inferChainAction({
    actor_tipo: "cliente",
    actor_confidence: "alta",
    primary_operation_ref: "AM-202609-9902",
    asunto: "Proveedor Demo pre-alert AM-202609-9902",
    ultimo_movimiento_resumen: "Unidad detenida en descanso y ETA en revision.",
  });
  assert.equal(action.accion_tipo, "responder_status_cliente");
});

test("falta de POD pide evidencia y no cierre", () => {
  const action = inferChainAction({
    actor_tipo: "cliente",
    actor_confidence: "alta",
    asunto: "Entrega pendiente",
    ultimo_movimiento_resumen: "Falta confirmacion de entrega/POD/EIR.",
  });
  assert.equal(action.accion_tipo, "pedir_pod_evidencia");
});

test("audita actores mixtos sin forzar validacion si hay cadena accionable clara", () => {
  const selected = {
    thread_key: "cnee",
    actor_tipo: "cnee",
    lane_cadena: "cadena_en_alerta",
    actor_confidence: "alta",
    accion_confidence: "alta",
  };
  const audit = auditConversationGroup([
    selected,
    {
      thread_key: "cliente",
      actor_tipo: "cliente",
      lane_cadena: "cadena_espera_externa",
      actor_confidence: "alta",
      accion_confidence: "media",
    },
  ], selected);
  assert.equal(audit.status, "actores_mixtos");
  assert.equal(audit.needs_validation, false);
  assert.deepEqual(audit.actors, ["cnee", "cliente"]);
});

test("audita multiples actores en alerta como validacion requerida", () => {
  const selected = {
    thread_key: "shipper",
    actor_tipo: "shipper",
    lane_cadena: "cadena_en_alerta",
    actor_confidence: "alta",
    accion_confidence: "media",
  };
  const audit = auditConversationGroup([
    selected,
    {
      thread_key: "cliente",
      actor_tipo: "cliente",
      lane_cadena: "cadena_en_alerta",
      actor_confidence: "alta",
      accion_confidence: "media",
    },
  ], selected);
  assert.equal(audit.status, "actores_mixtos_en_alerta");
  assert.equal(audit.severity, "alto");
  assert.equal(audit.needs_validation, true);
});

test("audita multiples referencias en una cadena como validacion requerida", () => {
  const selected = {
    thread_key: "cnee",
    actor_tipo: "cnee",
    lane_cadena: "cadena_en_alerta",
    actor_confidence: "alta",
    accion_confidence: "alta",
    asunto: "INT07-2026-357 / DT-202607-0264 / AA-202607-0022",
    shipment_refs: ["DT-202607-0264", "AA-202607-0022"],
    int_origin_ref: "INT07-2026-357",
    chain_has_multiple_refs: true,
  };
  const audit = auditConversationGroup([selected], selected);
  assert.equal(audit.status, "referencias_multiples_en_cadena");
  assert.equal(audit.severity, "alto");
  assert.equal(audit.needs_validation, true);
  assert.equal(audit.multiple_reference_count, 1);
});
