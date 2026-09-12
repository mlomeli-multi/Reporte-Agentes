const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MEXICO_TEAM,
  mexicoFollowupHandoff,
  sharedAccountOwnerFor,
} = require("../scripts/lib/followup-handoff-engine");

const atMexicoLocal = (iso) => new Date(iso);

test("Brenda pendiente antes de las 10 sigue en turno Brenda", () => {
  const result = mexicoFollowupHandoff(
    {
      int_ref: "INT09-2026-101",
      usuario_sheet: "Brenda",
      estado_cotizacion: "pendiente_pricing",
    },
    { now: atMexicoLocal("2026-09-09T14:55:00Z") }
  );

  assert.equal(result.followup_mexico_required, false);
  assert.equal(result.followup_mexico_owner, "");
  assert.equal(result.followup_mexico_status, "en_turno_brenda");
});

test("Brenda pendiente despues de las 10 asigna responsable Mexico estable", () => {
  const item = {
    int_ref: "INT09-2026-102",
    usuario_sheet: "Brenda",
    estado_cotizacion: "pendiente_pricing",
    cliente: "Cliente A",
  };
  const options = { now: atMexicoLocal("2026-09-09T16:01:00Z") };

  const first = mexicoFollowupHandoff(item, options);
  const second = mexicoFollowupHandoff(item, options);

  assert.equal(first.followup_mexico_required, true);
  assert.ok(MEXICO_TEAM.includes(first.followup_mexico_owner));
  assert.equal(first.followup_mexico_owner, second.followup_mexico_owner);
  assert.equal(first.followup_mexico_status, "handoff_mexico_activo");
});

test("cuenta compartida con Luz asigna a Luz despues de las 10", () => {
  const result = mexicoFollowupHandoff(
    {
      int_ref: "INT09-2026-103",
      usuario_sheet: "Brenda / Luz",
      estado_cotizacion: "pendiente_pricing",
    },
    { now: atMexicoLocal("2026-09-09T16:30:00Z") }
  );

  assert.equal(result.followup_mexico_required, true);
  assert.equal(result.followup_mexico_owner, "Luz");
  assert.equal(result.followup_mexico_status, "compartida_mx");
});

test("cuenta compartida por cliente manda sobre rotacion", () => {
  const result = mexicoFollowupHandoff(
    {
      int_ref: "INT09-2026-106",
      cliente: "BSI",
      usuario_sheet: "Brenda",
      estado_cotizacion: "pendiente_pricing",
    },
    { now: atMexicoLocal("2026-09-09T16:30:00Z") }
  );

  assert.equal(result.followup_mexico_required, true);
  assert.equal(result.followup_mexico_owner, "Luz");
  assert.equal(result.followup_mexico_source, "cliente_compartido");
});

test("catalogo de cuentas compartidas reconoce alias operativos", () => {
  assert.equal(sharedAccountOwnerFor({ cliente: "WORLD CARGO" }), "Luz");
  assert.equal(sharedAccountOwnerFor({ cliente: "LOXSON" }), "Luz");
  assert.equal(sharedAccountOwnerFor({ cliente: "S GROUP CHINA" }), "Joss");
  assert.equal(sharedAccountOwnerFor({ cliente: "NSG LOG" }), "Rodrigo");
});

test("pendiente sin Brenda no genera handoff Mexico", () => {
  const result = mexicoFollowupHandoff(
    {
      int_ref: "INT09-2026-104",
      usuario_sheet: "Joss",
      estado_cotizacion: "pendiente_pricing",
    },
    { now: atMexicoLocal("2026-09-09T17:00:00Z") }
  );

  assert.equal(result.followup_mexico_required, false);
  assert.equal(result.followup_mexico_status, "no_aplica");
});

test("cotizacion ya cotizada no genera handoff aunque sea Brenda", () => {
  const result = mexicoFollowupHandoff(
    {
      int_ref: "INT09-2026-105",
      usuario_sheet: "Brenda",
      estado_cotizacion: "cotizada",
      estatus_sheet: "Cotizado Pricing",
    },
    { now: atMexicoLocal("2026-09-09T17:00:00Z") }
  );

  assert.equal(result.followup_mexico_required, false);
  assert.equal(result.followup_mexico_status, "no_aplica");
});
