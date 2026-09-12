const test = require("node:test");
const assert = require("node:assert/strict");

const { buildTeamsHandoffMessage } = require("../scripts/lib/teams-handoff-message");

test("arma mensaje de Teams agrupado por responsable Mexico", () => {
  const result = buildTeamsHandoffMessage([
    {
      int_ref: "INT09-2026-183",
      cliente: "Loxson",
      servicio: "DAP maritimo",
      estatus_sheet: "Pendiente de Coti. Pricing",
      followup_mexico_required: true,
      followup_mexico_owner: "Luz",
    },
    {
      int_ref: "INT09-2026-185",
      cliente: "Torrestir",
      servicio: "EXW maritimo",
      estatus_sheet: "Pendiente de Coti. Pricing",
      followup_mexico_required: true,
      followup_mexico_owner: "Rodrigo",
    },
  ]);

  assert.equal(result.has_items, true);
  assert.equal(result.item_count, 2);
  assert.equal(result.owner_count, 2);
  assert.match(result.message, /Luz, estas cotizaciones quedaron para seguimiento hoy:/);
  assert.match(result.message, /INT09-2026-183 \/ LOXSON \/ DAP maritimo \/ Pendiente de Coti\. Pricing/);
  assert.match(result.message, /Rodrigo, estas cotizaciones quedaron para seguimiento hoy:/);
  assert.match(result.message, /Accion: dar seguimiento a Pricing y mandar al cliente cuando este lista\./);
  assert.ok(result.message_hash);
});

test("omite cotizaciones que no requieren handoff", () => {
  const result = buildTeamsHandoffMessage([
    {
      int_ref: "INT09-2026-190",
      cliente: "Cliente",
      followup_mexico_required: false,
      followup_mexico_owner: "Luz",
    },
  ]);

  assert.equal(result.has_items, false);
  assert.equal(result.item_count, 0);
  assert.equal(result.message, "");
  assert.equal(result.message_hash, "");
});
