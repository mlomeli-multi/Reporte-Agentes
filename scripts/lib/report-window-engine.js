const DEFAULT_TIMEZONE = "America/Mexico_City";

const windows = {
  manana: {
    label: "manana",
    field: "last_morning_report",
    start: 7 * 60,
    end: 8 * 60 + 30,
    earlyUntil: null,
    lateAfter: 7 * 60 + 50,
    lateUsefulUntil: 11 * 60 + 29,
  },
  mediodia: {
    label: "mediodia",
    field: "last_midday_report",
    start: 11 * 60 + 30,
    end: 12 * 60 + 45,
    earlyUntil: 11 * 60 + 50,
    lateAfter: 12 * 60 + 20,
    lateUsefulUntil: 15 * 60 + 29,
  },
  cierre: {
    label: "cierre",
    field: "last_closing_report",
    start: 15 * 60 + 30,
    end: 16 * 60 + 15,
    earlyUntil: 15 * 60 + 50,
    lateAfter: 16 * 60 + 10,
    lateUsefulUntil: 18 * 60 + 30,
  },
};

const periodStateField = {
  manana: "last_morning_report",
  mediodia: "last_midday_report",
  cierre: "last_closing_report",
  manual: "last_manual_report",
};

const localParts = (date = new Date(), timezone = DEFAULT_TIMEZONE) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
};

const localDateKey = (date = new Date(), timezone = DEFAULT_TIMEZONE) => {
  const parts = localParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const localIso = (date = new Date(), timezone = DEFAULT_TIMEZONE) => {
  const parts = localParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}-06:00`;
};

const localMinutes = (date = new Date(), timezone = DEFAULT_TIMEZONE) => {
  const parts = localParts(date, timezone);
  return Number(parts.hour) * 60 + Number(parts.minute);
};

const hasReportToday = (state, period, dateKey) => {
  const field = periodStateField[period];
  return Boolean(field && String(state?.[field] || "").startsWith(dateKey));
};

const statusForWindow = (period, minute) => {
  const window = windows[period];
  if (!window) return "manual";
  if (window.earlyUntil != null && minute < window.earlyUntil) return "adelantado";
  if (window.lateAfter != null && minute > window.lateAfter) return "tardio";
  return "en_ventana";
};

const candidateInsideWindow = (minute) =>
  Object.entries(windows).find(([, window]) => minute >= window.start && minute <= window.end)?.[0] || "";

const lateCandidate = (minute, state, dateKey) => {
  if (minute > windows.manana.end && minute <= windows.manana.lateUsefulUntil && !hasReportToday(state, "manana", dateKey)) {
    return "manana";
  }
  if (minute > windows.mediodia.end && minute <= windows.mediodia.lateUsefulUntil && !hasReportToday(state, "mediodia", dateKey)) {
    return "mediodia";
  }
  if (minute > windows.cierre.end && minute <= windows.cierre.lateUsefulUntil && !hasReportToday(state, "cierre", dateKey)) {
    return "cierre";
  }
  return "";
};

const nextPendingPeriod = (minute, state, dateKey) => {
  if (minute < windows.manana.start) return "manana";
  if (minute < windows.mediodia.start && !hasReportToday(state, "manana", dateKey)) return "manana";
  if (minute < windows.cierre.start && !hasReportToday(state, "mediodia", dateKey)) return "mediodia";
  if (minute <= windows.cierre.lateUsefulUntil && !hasReportToday(state, "cierre", dateKey)) return "cierre";
  return "";
};

const decideReportRun = ({ requestedType = "auto", now = new Date(), state = {}, force = false, timezone = DEFAULT_TIMEZONE } = {}) => {
  const dateKey = localDateKey(now, timezone);
  const minute = localMinutes(now, timezone);

  if (requestedType !== "auto") {
    const period = periodStateField[requestedType] ? requestedType : "manual";
    return {
      shouldRun: true,
      decision: "RUN",
      type: period,
      dateKey,
      minute,
      field: periodStateField[period],
      status: period === "manual" ? "manual" : statusForWindow(period, minute),
      reason: period === "manual" ? "Corrida manual solicitada." : `Corrida ${period} solicitada manualmente.`,
    };
  }

  const inside = candidateInsideWindow(minute);
  const late = inside ? "" : lateCandidate(minute, state, dateKey);
  const period = inside || late;

  if (!period) {
    const pending = nextPendingPeriod(minute, state, dateKey);
    return {
      shouldRun: false,
      decision: "DONT_NOTIFY",
      type: pending,
      dateKey,
      minute,
      field: pending ? periodStateField[pending] : "",
      status: pending ? "esperando_ventana" : "fuera_de_ventana",
      reason: pending
        ? `Aun no toca generar ${pending}; esperar su ventana util.`
        : "No hay reporte pendiente dentro de una ventana util.",
    };
  }

  if (!force && hasReportToday(state, period, dateKey)) {
    return {
      shouldRun: false,
      decision: "DONT_NOTIFY",
      type: period,
      dateKey,
      minute,
      field: periodStateField[period],
      status: "duplicado",
      reason: `${period} ya fue generado hoy (${state[periodStateField[period]]}).`,
    };
  }

  return {
    shouldRun: true,
    decision: "RUN",
    type: period,
    dateKey,
    minute,
    field: periodStateField[period],
    status: late ? "tardio_fuera_de_ventana" : statusForWindow(period, minute),
    reason: late
      ? `Faltaba ${period}; se genera tarde porque todavia esta dentro de ventana util.`
      : `Dentro de ventana ${period}.`,
  };
};

module.exports = {
  DEFAULT_TIMEZONE,
  windows,
  periodStateField,
  localParts,
  localDateKey,
  localIso,
  localMinutes,
  decideReportRun,
  hasReportToday,
};
