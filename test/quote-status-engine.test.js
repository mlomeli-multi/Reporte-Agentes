const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classifySheetQuoteStatus,
  executiveQuoteStatus,
  inferQuoteStatusFromItem,
  isRealPricingPending,
} = require("../scripts/lib/quote-status-engine");

test("solo Pendiente de Coti. Pricing cuenta como pendiente de Pricing del Sheet", () => {
  const profile = classifySheetQuoteStatus("Pendiente de Coti. Pricing");
  assert.equal(profile.estado_cotizacion, "pendiente_pricing");
  assert.equal(profile.pendiente_pricing_sheet, true);
  assert.equal(profile.status_rule, "sheet_pendiente_de_coti_pricing_exacta");
});

test("Cotizado Agentes y Cotizado Pricing ya son cotizadas, no pendientes", () => {
  for (const status of ["Cotizado Agentes", "Cotizado Pricing", "Cotizado Pricing Fuera de tiempo"]) {
    const profile = classifySheetQuoteStatus(status);
    assert.equal(profile.estado_cotizacion, "cotizada");
    assert.equal(profile.pendiente_pricing_sheet, false);
    assert.equal(profile.cotizada_sheet, true);
  }
});

test("No Cotizado por Pricing no se confunde con Cotizado Pricing", () => {
  const profile = classifySheetQuoteStatus("No Cotizado por Pricing");
  assert.equal(profile.estado_cotizacion, "no_cotizada");
  assert.equal(profile.pendiente_pricing_sheet, false);
  assert.equal(profile.cotizada_sheet, false);
});

test("un pendiente de Sheet deja de ser pendiente real si Outlook muestra respuesta de Pricing", () => {
  const item = {
    estatus_sheet: "Pendiente de Coti. Pricing",
    estado_cotizacion: "pendiente_pricing",
    estado_correo: "pricing_respondio_falta_enviar",
  };
  assert.equal(isRealPricingPending(item), false);
  assert.equal(executiveQuoteStatus(item), "pricing_respondio_falta_enviar");
});

test("un pendiente de Sheet sigue pendiente real cuando no hay evidencia contraria", () => {
  const item = {
    estatus_sheet: "Pendiente de Coti. Pricing",
    estado_cotizacion: "pendiente_pricing",
  };
  assert.equal(isRealPricingPending(item), true);
  assert.equal(executiveQuoteStatus(item), "pendiente_pricing_real");
});

test("estatus de texto libre no marcado como pendiente no infla pendientes", () => {
  const profile = inferQuoteStatusFromItem({
    estatus_sheet: "direccion_recibida_falta_cotizar_ddp",
    notas: "Falta cotizar DDP con direccion recibida.",
  });
  assert.equal(profile.estado_cotizacion, "activa_incierta");
  assert.equal(profile.pendiente_pricing_sheet, false);
});
