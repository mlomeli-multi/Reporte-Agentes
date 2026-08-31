const nf = new Intl.NumberFormat("es-MX");

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

const valueText = (value) => {
  const clean = String(value || "").trim();
  return clean || "-";
};

const labelText = (value) => valueText(value).replaceAll("_", " ");

const className = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const setText = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
};

const setStatus = (message, mode) => {
  const node = document.getElementById("dataStatus");
  node.textContent = message;
  node.className = `status-pill ${mode || ""}`.trim();
};

const countFrom = (bucket, ...keys) =>
  keys.reduce((sum, key) => sum + Number(bucket?.[key] || bucket?.[className(key)] || 0), 0);

const renderBars = (id, data) => {
  const target = document.getElementById(id);
  const entries = Object.entries(data || {})
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const max = Math.max(1, ...entries.map(([, count]) => Number(count)));

  target.innerHTML = entries.length
    ? entries
        .map(([label, count]) => {
          const width = Math.max(4, Math.round((Number(count) / max) * 100));
          return `
            <div class="bar-row">
              <span>${labelText(label)}</span>
              <div class="bar-track"><div class="bar-fill ${className(label)}" style="width:${width}%"></div></div>
              <strong>${nf.format(count)}</strong>
            </div>
          `;
        })
        .join("")
    : '<p class="empty">Sin datos para graficar.</p>';
};

const renderBrief = (summary, sourceState) => {
  const target = document.getElementById("executiveBrief");
  const critical = countFrom(summary.pendientes_por_criticidad, "critico", "critica", "rojo");
  const high = countFrom(summary.pendientes_por_criticidad, "alto", "alta", "amarillo");
  const redQuotes = countFrom(summary.cotizaciones_por_semaforo, "rojo");
  const pendingPricing =
    summary.cotizaciones_por_estatus?.["pendiente_de_coti._pricing"] ||
    summary.cotizaciones_por_estatus?.pendiente_pricing ||
    summary.cotizaciones_por_estatus?.pendiente_de_pricing ||
    0;

  const rows = [
    ["Atencion inmediata", `${nf.format(critical)} criticos y ${nf.format(high)} altos en radar.`],
    ["Cotizaciones", `${nf.format(redQuotes)} rojas; ${nf.format(pendingPricing)} pendientes de pricing.`],
    ["Fuente", sourceState?.last_sheet_scan?.range || sourceState?.last_sheet_scan?.tab || "Sin lectura de Sheet registrada."],
  ];

  target.innerHTML = rows
    .map(([title, detail]) => `<div class="brief-item"><strong>${title}</strong><span>${detail}</span></div>`)
    .join("");
};

const renderRows = (id, rows, columns) => {
  const target = document.getElementById(id);
  target.innerHTML = rows.length
    ? rows
        .map(
          (row) => `<tr>${columns
            .map((column) => {
              const value = valueText(row[column.key]);
              if (column.tag) return `<td><span class="tag ${className(value)}">${value}</span></td>`;
              return `<td>${value}</td>`;
            })
            .join("")}</tr>`
        )
        .join("")
    : `<tr><td colspan="${columns.length}" class="empty">Sin registros visibles.</td></tr>`;
};

const renderHistorical = (rows) => {
  const target = document.getElementById("historicasList");
  target.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <article class="reference-card">
              <strong>${valueText(row.referencia)}</strong>
              <span>SAM: ${valueText(row.sam)}</span>
              <span>${valueText(row.cliente)}</span>
              <span>${valueText(row.estado)} / ${valueText(row.criticidad)}</span>
            </article>
          `
        )
        .join("")
    : '<p class="empty">Sin referencias historicas vivas.</p>';
};

const renderMissingData = () => {
  setStatus("Sin datos reales", "missing");
  setText("generatedAt", "Genera dashboard/data/current.json localmente");
  setText("privacyStatus", "No publicar datos reales sin Cloudflare Access");
  document.querySelector(".workspace").insertAdjacentHTML(
    "beforeend",
    `<section class="empty-state">
      <strong>Este entorno no tiene datos reales cargados.</strong>
      <span>Ejecuta el generador local y despliega a Cloudflare Pages solo despues de activar Cloudflare Access. El repositorio publico no debe contener current.json.</span>
    </section>`
  );
};

const loadDashboard = async () => {
  const response = await fetch("data/current.json", { cache: "no-store" });
  if (!response.ok) {
    renderMissingData();
    return;
  }

  const data = await response.json();
  const summary = data.summary || {};
  const sections = data.sections || {};
  const sourceState = data.source_state || {};
  const critical = countFrom(summary.pendientes_por_criticidad, "critico", "critica", "rojo");
  const high = countFrom(summary.pendientes_por_criticidad, "alto", "alta", "amarillo");

  setStatus("Datos reales cargados", "private");
  setText("privacyStatus", "Publicacion privada recomendada: Cloudflare Access");
  setText("generatedAt", `Generado: ${formatDate(data.generated_at)}`);
  setText("heroSummary", `${nf.format(critical + high)} prioridades sensibles, ${nf.format(summary.cotizaciones_monitoreadas || 0)} cotizaciones en seguimiento.`);
  setText("kpiPendientes", nf.format(summary.pendientes_abiertos || 0));
  setText("kpiUrgentes", `${nf.format(critical)} / ${nf.format(high)}`);
  setText("kpiCotizaciones", nf.format(summary.cotizaciones_monitoreadas || 0));
  setText("kpiHistoricas", nf.format(summary.referencias_historicas_vivas || 0));
  setText("kpiUltimo", `Ultimo reporte: ${formatDate(sourceState.last_successful_report)}`);
  setText("kpiSheet", sourceState.last_sheet_scan?.tab ? `Sheet ${sourceState.last_sheet_scan.tab}` : "Sheet sin datos");

  renderBars("critChart", summary.pendientes_por_criticidad);
  renderBars("quoteChart", summary.cotizaciones_por_semaforo);
  renderBrief(summary, sourceState);

  const pendientes = sections.pendientes || [];
  const cotizaciones = sections.cotizaciones || [];
  const historicas = sections.historicas || [];

  setText("pendientesCount", `${nf.format(pendientes.length)} visibles`);
  setText("cotizacionesCount", `${nf.format(cotizaciones.length)} visibles`);
  setText("historicasCount", `${nf.format(historicas.length)} visibles`);

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
  setStatus("Error al cargar", "missing");
  document.querySelector(".workspace").insertAdjacentHTML(
    "beforeend",
    `<section class="empty-state"><strong>Error al leer datos.</strong><span>${valueText(error.message || error)}</span></section>`
  );
});
