const crypto = require("crypto");

const DEFAULT_CHAT_NAME = "Agents team <3";

const clean = (value) => String(value || "").trim();

const compact = (value) => clean(value).replace(/\s+/g, " ");

const titleCase = (value) =>
  compact(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const referenceLabel = (item) =>
  compact(item.int_ref || item.referencia_int || item.referencia_id || item.referencia || item.id || "SIN REFERENCIA");

const clientLabel = (item) => compact(item.cliente || item.cliente_actor || item.actor_origen || "CLIENTE POR VALIDAR").toUpperCase();

const serviceLabel = (item) =>
  compact(item.servicio || item.servicio_sheet || item.modalidad || item.tipo_servicio || "servicio por validar");

const statusLabel = (item) =>
  compact(item.estatus_sheet || item.estado_cotizacion_ejecutivo || item.estado_cotizacion || "Pendiente de Coti. Pricing");

const quoteLine = (item) => `- ${referenceLabel(item)} / ${clientLabel(item)} / ${serviceLabel(item)} / ${statusLabel(item)}`;

const eligibleItems = (items) =>
  (items || [])
    .filter((item) => item && item.followup_mexico_required === true && clean(item.followup_mexico_owner))
    .sort((a, b) => {
      const ownerCompare = clean(a.followup_mexico_owner).localeCompare(clean(b.followup_mexico_owner), "es-MX");
      if (ownerCompare !== 0) return ownerCompare;
      return referenceLabel(a).localeCompare(referenceLabel(b), "es-MX");
    });

const stableHash = (value) => crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);

const buildTeamsHandoffMessage = (items, options = {}) => {
  const chatName = clean(options.chatName) || DEFAULT_CHAT_NAME;
  const grouped = new Map();

  for (const item of eligibleItems(items)) {
    const owner = titleCase(item.followup_mexico_owner);
    if (!grouped.has(owner)) grouped.set(owner, []);
    grouped.get(owner).push(item);
  }

  const groups = [...grouped.entries()].map(([owner, ownerItems]) => ({
    owner,
    item_count: ownerItems.length,
    references: ownerItems.map(referenceLabel),
    items: ownerItems.map((item) => ({
      referencia: referenceLabel(item),
      cliente: clientLabel(item),
      servicio: serviceLabel(item),
      estado: statusLabel(item),
      razon: compact(item.followup_mexico_reason),
      source: compact(item.followup_mexico_source),
    })),
  }));

  const lines = [];
  for (const group of groups) {
    if (lines.length) lines.push("");
    lines.push(`${group.owner}, estas cotizaciones quedaron para seguimiento hoy:`);
    lines.push("");
    group.items.forEach((item) => {
      lines.push(`- ${item.referencia} / ${item.cliente} / ${item.servicio} / ${item.estado}`);
    });
    lines.push("");
    lines.push("Accion: dar seguimiento a Pricing y mandar al cliente cuando este lista.");
  }

  const message = lines.join("\n");

  return {
    chat_name: chatName,
    has_items: groups.length > 0,
    item_count: groups.reduce((sum, group) => sum + group.item_count, 0),
    owner_count: groups.length,
    groups,
    message,
    message_hash: message ? stableHash(message) : "",
    delivery_policy:
      "Enviar al chat del equipo a las 10:00 America/Mexico_City cuando Brenda siga como responsable y Pricing siga pendiente.",
  };
};

module.exports = {
  DEFAULT_CHAT_NAME,
  buildTeamsHandoffMessage,
};
