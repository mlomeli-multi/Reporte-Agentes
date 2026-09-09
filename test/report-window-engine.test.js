const assert = require("node:assert/strict");
const test = require("node:test");
const { decideReportRun } = require("../scripts/lib/report-window-engine");

const at = (iso) => new Date(iso);

test("genera manana dentro de ventana si no existe reporte del dia", () => {
  const decision = decideReportRun({
    requestedType: "auto",
    now: at("2026-09-09T13:20:00Z"),
    state: {},
  });

  assert.equal(decision.shouldRun, true);
  assert.equal(decision.type, "manana");
  assert.equal(decision.status, "en_ventana");
});

test("evita duplicar manana cuando ya se genero el mismo dia", () => {
  const decision = decideReportRun({
    requestedType: "auto",
    now: at("2026-09-09T13:45:00Z"),
    state: { last_morning_report: "2026-09-09T07:20:00-06:00" },
  });

  assert.equal(decision.shouldRun, false);
  assert.equal(decision.decision, "DONT_NOTIFY");
  assert.equal(decision.status, "duplicado");
});

test("genera manana tardio fuera de ventana si todavia es util", () => {
  const decision = decideReportRun({
    requestedType: "auto",
    now: at("2026-09-09T14:38:00Z"),
    state: {},
  });

  assert.equal(decision.shouldRun, true);
  assert.equal(decision.type, "manana");
  assert.equal(decision.status, "tardio_fuera_de_ventana");
});

test("no genera nada antes de que empiece la primera ventana", () => {
  const decision = decideReportRun({
    requestedType: "auto",
    now: at("2026-09-09T12:20:00Z"),
    state: {},
  });

  assert.equal(decision.shouldRun, false);
  assert.equal(decision.type, "manana");
  assert.equal(decision.status, "esperando_ventana");
});

test("marca mediodia adelantado al inicio de su ventana amplia", () => {
  const decision = decideReportRun({
    requestedType: "auto",
    now: at("2026-09-09T17:35:00Z"),
    state: { last_morning_report: "2026-09-09T07:20:00-06:00" },
  });

  assert.equal(decision.shouldRun, true);
  assert.equal(decision.type, "mediodia");
  assert.equal(decision.status, "adelantado");
});

test("genera mediodia tardio despues de su ventana si falta el corte", () => {
  const decision = decideReportRun({
    requestedType: "auto",
    now: at("2026-09-09T18:52:00Z"),
    state: { last_morning_report: "2026-09-09T07:20:00-06:00" },
  });

  assert.equal(decision.shouldRun, true);
  assert.equal(decision.type, "mediodia");
  assert.equal(decision.status, "tardio_fuera_de_ventana");
});

test("genera cierre dentro de ventana aunque mediodia ya exista", () => {
  const decision = decideReportRun({
    requestedType: "auto",
    now: at("2026-09-09T21:55:00Z"),
    state: {
      last_morning_report: "2026-09-09T07:20:00-06:00",
      last_midday_report: "2026-09-09T11:55:00-06:00",
    },
  });

  assert.equal(decision.shouldRun, true);
  assert.equal(decision.type, "cierre");
  assert.equal(decision.status, "en_ventana");
});

test("deja de reportar cierre cuando ya paso la ventana util", () => {
  const decision = decideReportRun({
    requestedType: "auto",
    now: at("2026-09-10T01:00:00Z"),
    state: {
      last_morning_report: "2026-09-09T07:20:00-06:00",
      last_midday_report: "2026-09-09T11:55:00-06:00",
    },
  });

  assert.equal(decision.shouldRun, false);
  assert.equal(decision.status, "fuera_de_ventana");
});
