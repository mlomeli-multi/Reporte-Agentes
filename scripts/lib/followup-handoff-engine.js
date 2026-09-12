const MEXICO_TIMEZONE = "America/Mexico_City";
const MEXICO_TEAM = ["Luz", "Joss", "Rodrigo"];
const BRENDA_NAME = "brenda";
const HANDOFF_CUTOFF_MINUTES = 10 * 60;
const SHARED_ACCOUNT_OWNERS = [
  { owner: "Luz", terms: ["world cargo srl", "world cargo"] },
  { owner: "Luz", terms: ["loxson international logistics", "loxson"] },
  { owner: "Joss", terms: ["shanghai yiheng cargo service", "s group china"] },
  { owner: "Luz", terms: ["best services", "bsi"] },
  { owner: "Rodrigo", terms: ["ns global lojistik", "nsg log", "ns global"] },
  { owner: "Luz", terms: ["band supply chain logistics", "band supply chain"] },
  { owner: "Rodrigo", terms: ["torrestir transitarios lda", "torrestir"] },
  { owner: "Luz", terms: ["real logistics sp. z.o.o", "real logistics"] },
  { owner: "Rodrigo", terms: ["sky international logistics"] },
  { owner: "Joss", terms: ["brave international logistics", "brave international"] },
  { owner: "Rodrigo", terms: ["lkc logistics private limited", "lkc logistics"] },
  { owner: "Rodrigo", terms: ["time logistics co. ltd", "time logistics"] },
  { owner: "Luz", terms: ["airmax cargo budapest zrt", "airmax"] },
  { owner: "Rodrigo", terms: ["galaxy freight pvt. ltd.", "galaxy freight"] },
];

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const compact = (value) => String(value || "").trim().replace(/\s+/g, " ");

const splitUsers = (value) =>
  String(value || "")
    .split(/[,;/&+]| y | and |\|/i)
    .map(compact)
    .filter(Boolean);

const hasBrenda = (users) => users.some((user) => normalizeText(user).includes(BRENDA_NAME));

const isMexicoTeammate = (user) => {
  const normalized = normalizeText(user);
  return MEXICO_TEAM.some((name) => normalized.includes(normalizeText(name)));
};

const canonicalMexicoTeammate = (user) => {
  const normalized = normalizeText(user);
  return MEXICO_TEAM.find((name) => normalized.includes(normalizeText(name))) || "";
};

const minutesInTimezone = (now = new Date(), timezone = MEXICO_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const rawHour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  const hour = rawHour === 24 ? 0 : rawHour;
  return hour * 60 + minute;
};

const stableHash = (value) => {
  const text = normalizeText(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const fallbackOwnerFor = (item = {}) => {
  const seed = [
    item.int_ref,
    item.referencia_int,
    item.id,
    item.cliente,
    item.servicio,
    item.modalidad,
  ]
    .filter(Boolean)
    .join("|");
  return MEXICO_TEAM[stableHash(seed) % MEXICO_TEAM.length];
};

const sharedAccountOwnerFor = (item = {}) => {
  const haystack = normalizeText([item.cliente, item.cliente_actor, item.network, item.asunto].filter(Boolean).join(" "));
  if (!haystack) return "";
  const match = SHARED_ACCOUNT_OWNERS.find((entry) =>
    entry.terms.some((term) => {
      const normalizedTerm = normalizeText(term);
      return normalizedTerm && haystack.includes(normalizedTerm);
    })
  );
  return match?.owner || "";
};

const isPendingPricing = (item = {}) =>
  typeof item.pricing_pendiente_real === "boolean"
    ? item.pricing_pendiente_real
    : item.pendiente_pricing_sheet === true ||
      normalizeText(item.estado_cotizacion) === "pendiente_pricing" ||
      normalizeText(item.estatus_sheet) === "pendiente de coti. pricing";

const mexicoFollowupHandoff = (item = {}, options = {}) => {
  const timezone = options.timezone || MEXICO_TIMEZONE;
  const cutoffMinutes = Number.isFinite(Number(options.cutoffMinutes))
    ? Number(options.cutoffMinutes)
    : HANDOFF_CUTOFF_MINUTES;
  const now = options.now || new Date();
  const users = splitUsers(
    [
      item.usuario_sheet,
      item.usuario_responsable,
      item.responsable_multi,
      item.owner,
    ]
      .filter(Boolean)
      .join(",")
  );
  const currentMinute = minutesInTimezone(now, timezone);

  const base = {
    followup_mexico_required: false,
    followup_mexico_owner: "",
    followup_mexico_status: "no_aplica",
    followup_mexico_reason: "",
    followup_mexico_cutoff_local: "10:00 America/Mexico_City",
    followup_mexico_source: "",
  };

  if (!isPendingPricing(item)) {
    return {
      ...base,
      followup_mexico_reason: "La cotizacion no esta pendiente real de Pricing.",
    };
  }

  if (!hasBrenda(users)) {
    return {
      ...base,
      followup_mexico_reason: "El usuario asignado no es Brenda.",
    };
  }

  if (currentMinute < cutoffMinutes) {
    return {
      ...base,
      followup_mexico_status: "en_turno_brenda",
      followup_mexico_reason: "Brenda sigue dentro de su ventana activa antes de las 10:00 en Mexico.",
    };
  }

  const accountOwner = sharedAccountOwnerFor(item);
  const sharedOwner = users.map(canonicalMexicoTeammate).find(Boolean);
  const owner = accountOwner || sharedOwner || fallbackOwnerFor(item);

  return {
    ...base,
    followup_mexico_required: true,
    followup_mexico_owner: owner,
    followup_mexico_status: accountOwner || sharedOwner ? "compartida_mx" : "handoff_mexico_activo",
    followup_mexico_reason: accountOwner
      ? `Cuenta compartida por cliente; ${owner} toma follow-up en Mexico despues de las 10:00.`
      : sharedOwner
      ? `Cuenta compartida en usuario con ${owner}; toma follow-up en Mexico despues de las 10:00.`
      : `Brenda cerro turno Francia a las 10:00 Mexico; ${owner} toma follow-up diario.`,
    followup_mexico_source: accountOwner ? "cliente_compartido" : sharedOwner ? "usuario_sheet_compartido" : "rotacion_estable",
  };
};

module.exports = {
  BRENDA_NAME,
  HANDOFF_CUTOFF_MINUTES,
  MEXICO_TEAM,
  MEXICO_TIMEZONE,
  SHARED_ACCOUNT_OWNERS,
  fallbackOwnerFor,
  mexicoFollowupHandoff,
  sharedAccountOwnerFor,
  splitUsers,
};
