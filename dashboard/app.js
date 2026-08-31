const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(date);
};

const text = (value) => String(value || "-");

const className = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const setText = (id, value) => {
  document.getElementById(id).textContent = value;
};

const renderBars = (id, data) => {
  const target = document.getElementById(id);
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  target.innerHTML = entries.length
    ? entries
        .map(([label, count]) => {
          const width = Math.max(4, Math.round((count / max) * 100));
          const clean = className(label);
          return `
            <div class="bar-row">
              <span>${label.replaceAll("_", " ")}</span>
              <div class="bar-track"><div class="bar-fill ${clean}" style="width:${width}%"></div></div>
              <strong>${count}</strong>
            </div>
          `;
        })
        .join("")
    : '<p class="empty">Sin datos.</p>';
};

const renderBrief = (summary, sourceState) => {
  const target = document.getElementById("executiveBrief");
  const critical = summary.pendientes_por_criticidad?.critico || 0;
  const high = summary.pendientes_por_criticidad?.alto || 0;
  const redQuotes = summary.cotizaciones_por_semaforo?.rojo || 0;
  const pendingPricing =
    summary.cotizaciones_por_estatus?.["pendiente_de_coti._pricing"] ||
    summary.cotizaciones_por_estatus?.pendiente_pricing ||
    0;
  const rows = [
    ["Prioridad inmediata", `${critical} criticos y ${high} altos en control.`],
    ["Cotizaciones", `${redQuotes} rojas; ${pendingPricing} pendientes de pricing.`],
    ["Ultima lectura", sourceState?.last_sheet_scan?.range || "Sin lectura de Sheet registrada."],
  ];
  target.innerHTML = rows
    .map(([title, detail]) => `<div class="brief-item"><strong>${title}</strong><span>${detail}</span></div>`)
    .join("");
};

const renderRows = (id, rows, columns) => {
  const target = document.getElementById(id);
  target.innerHTML = rows.length
    ? rows
        .map((row) => {
          return `<tr>${columns
            .map((column) => {
              const value = text(row[column.key]);
              if (column.tag) return `<td><span class="tag ${className(value)}">${value}</span></td>`;
              return `<td>${value}</td>`;
            })
            .join("")}</tr>`;
        })
        .join("")
    : `<tr><td colspan="${columns.length}" class="empty">Sin datos.</td></tr>`;
};

const renderHistorical = (rows) => {
  const target = document.getElementById("historicasList");
  target.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <article class="reference-card">
              <strong>${text(row.referencia)}</strong>
              <span>SAM: ${text(row.sam)}</span>
              <span>${text(row.cliente)}</span>
              <span>${text(row.estado)} / ${text(row.criticidad)}</span>
            </article>
          `
        )
        .join("")
    : '<p class="empty">Sin referencias historicas vivas.</p>';
};

const loadDashboard = async () => {
  let response = await fetch("data/current.json", { cache: "no-store" });
  if (!response.ok) {
    response = await fetch("data/current.sample.json", { cache: "no-store" });
    setText("dataStatus", "Datos de ejemplo");
  } else {
    setText("dataStatus", "Datos locales");
  }

  const data = await response.json();
  const summary = data.summary || {};
  const sections = data.sections || {};

  setText("generatedAt", `Generado: ${formatDate(data.generated_at)}`);
  setText("kpiPendientes", summary.pendientes_abiertos ?? "-");
  setText("kpiCotizaciones", summary.cotizaciones_monitoreadas ?? "-");
  setText("kpiHistoricas", summary.referencias_historicas_vivas ?? "-");
  setText("kpiUltimo", formatDate(data.source_state?.last_successful_report));
  setText("kpiSheet", data.source_state?.last_sheet_scan?.tab ? `Sheet ${data.source_state.last_sheet_scan.tab}` : "Sheet sin datos");

  renderBars("critChart", summary.pendientes_por_criticidad);
  renderBars("quoteChart", summary.cotizaciones_por_semaforo);
  renderBrief(summary, data.source_state || {});

  const pendientes = sections.pendientes || [];
  const cotizaciones = sections.cotizaciones || [];
  const historicas = sections.historicas || [];

  setText("pendientesCount", `${pendientes.length} visibles`);
  setText("cotizacionesCount", `${cotizaciones.length} visibles`);
  setText("historicasCount", `${historicas.length} visibles`);

  renderRows("pendientesRows", pendientes, [
    { key: "referencia" },
    { key: "cliente_actor" },
    { key: "criticidad", tag: true },
    { key: "pelota" },
    { key: "accion" },
  ]);

  renderRows("cotizacionesRows", cotizaciones, [
    { key: "referencia" },
    { key: "cliente" },
    { key: "servicio" },
    { key: "usuario" },
    { key: "estatus", tag: true },
    { key: "accion" },
  ]);

  renderHistorical(historicas);
};

loadDashboard().catch((error) => {
  setText("dataStatus", "Error al cargar");
  document.querySelector("main").insertAdjacentHTML(
    "afterbegin",
    `<section class="panel"><p class="empty">${String(error.message || error)}</p></section>`
  );
});
