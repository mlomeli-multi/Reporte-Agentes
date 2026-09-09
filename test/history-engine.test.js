const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cleanHistoryEvents,
  historyDedupeKey,
  historyHasSystemRef,
  historyPriority,
  shouldKeepHistoryEvent,
} = require("../scripts/lib/history-engine");

test("filtra eventos rutinarios sin cambio cuando no son historico vivo", () => {
  assert.equal(
    shouldKeepHistoryEvent({
      referencia_id: "AA-202609-0455",
      tipo_registro: "operacion",
      historial_lane: "sin_cambio",
      tipo_cambio: "sigue_igual",
      riesgo_memoria: "sin_cambio",
      periodo_trabajo: "mes_actual",
      resumen: "Sin cambio visible.",
    }),
    false
  );
});

test("conserva sin cambio cuando representa arrastre historico vivo", () => {
  assert.equal(
    shouldKeepHistoryEvent({
      referencia_id: "INT09-2026-901",
      tipo_registro: "cotizacion",
      historial_lane: "sin_cambio",
      tipo_cambio: "sigue_igual",
      riesgo_memoria: "sin_cambio",
      periodo_trabajo: "historico_vivo",
      resumen: "Sigue vivo en memoria historica.",
    }),
    true
  );
});

test("cotizaciones se deduplican por INT aunque ya tengan embarque ligado", () => {
  assert.equal(
    historyDedupeKey({
      tipo_registro: "cotizacion",
      referencia_id: "INT09-2026-901",
      primary_operation_ref: "EA-202609-9901",
    }),
    "cotizacion:int09_2026_901"
  );
});

test("operaciones se deduplican por embarque cuando ya existe referencia SAM", () => {
  assert.equal(
    historyDedupeKey({
      tipo_registro: "operacion",
      referencia_id: "INT09-2026-902",
      primary_operation_ref: "AM-202609-9902",
    }),
    "operacion:am_202609_9902"
  );
});

test("marca eventos sin INT ni embarque como referencia por validar", () => {
  const result = cleanHistoryEvents([
    {
      referencia_id: "RE: NFO TO CMN AIRPORT",
      tipo_registro: "cotizacion",
      historial_lane: "riesgo_abierto",
      tipo_cambio: "empeoro",
      riesgo_memoria: "riesgo_abierto",
      at: "2026-09-03T13:04:37Z",
      resumen: "Cliente pide cotizacion urgente sin INT visible.",
    },
  ]);

  assert.equal(historyHasSystemRef(result.rows[0]), false);
  assert.equal(result.rows[0].historial_needs_reference, true);
  assert.equal(result.rows[0].historial_clean_reason, "evento_sin_referencia_sistema_por_validar");
});

test("conserva el duplicado con mayor riesgo por referencia y tipo", () => {
  const result = cleanHistoryEvents([
    {
      referencia_id: "AA-202609-0455",
      tipo_registro: "operacion",
      historial_lane: "mejora_cierre",
      tipo_cambio: "mejoro",
      riesgo_memoria: "saludable",
      at: "2026-09-03T18:00:00Z",
      resumen: "Mejoro con evidencia parcial.",
    },
    {
      referencia_id: "AA-202609-0455",
      tipo_registro: "operacion",
      historial_lane: "riesgo_abierto",
      tipo_cambio: "empeoro",
      riesgo_memoria: "riesgo_abierto",
      at: "2026-09-03T10:00:00Z",
      resumen: "Riesgo documental abierto.",
    },
  ]);

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].historial_lane, "riesgo_abierto");
  assert.equal(result.meta.duplicate_count, 1);
});

test("ordena por prioridad antes que por fecha", () => {
  const result = cleanHistoryEvents([
    {
      referencia_id: "INT09-2026-001",
      tipo_registro: "cotizacion",
      historial_lane: "mejora_cierre",
      tipo_cambio: "mejoro",
      riesgo_memoria: "saludable",
      at: "2026-09-04T14:00:00Z",
      resumen: "Cotizacion enviada.",
    },
    {
      referencia_id: "INT09-2026-002",
      tipo_registro: "cotizacion",
      historial_lane: "riesgo_abierto",
      tipo_cambio: "empeoro",
      riesgo_memoria: "riesgo_abierto",
      at: "2026-09-04T09:00:00Z",
      resumen: "Pricing sigue pendiente.",
    },
  ]);

  assert.equal(result.rows[0].referencia_id, "INT09-2026-002");
  assert.equal(historyPriority(result.rows[0]), 0);
});

test("a igual prioridad muestra primero eventos con INT o embarque", () => {
  const result = cleanHistoryEvents([
    {
      referencia_id: "RE: NFO TO CMN AIRPORT",
      tipo_registro: "cotizacion",
      historial_lane: "riesgo_abierto",
      tipo_cambio: "empeoro",
      riesgo_memoria: "riesgo_abierto",
      at: "2026-09-04T14:00:00Z",
      resumen: "Solicitud sin INT.",
    },
    {
      referencia_id: "INT09-2026-002",
      tipo_registro: "cotizacion",
      historial_lane: "riesgo_abierto",
      tipo_cambio: "sheet_desfasado",
      riesgo_memoria: "riesgo_abierto",
      at: "2026-09-04T09:00:00Z",
      resumen: "Solicitud con INT.",
    },
  ]);

  assert.equal(result.rows[0].referencia_id, "INT09-2026-002");
  assert.equal(result.rows[0].historial_has_system_ref, true);
});
