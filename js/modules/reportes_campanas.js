// ===============================================================
// 📌 DASHBOARD DE CAMPAÑAS — versión completa
// ===============================================================

// Utilidad para limpiar gráficos anteriores
function limpiarDiv(id) {
  const el = document.querySelector(id);
  if (el) el.innerHTML = "";
}

// ===============================================================
// 📌 1. SELECTOR DE CAMPAÑAS
// ===============================================================
async function cargarSelectorCampanas() {
  try {
    const urlCampanas = localStorage.getItem("csv_campanas");
    if (!urlCampanas) return;

    const txt = await fetch(urlCampanas).then(r => r.text());
    const raw = Papa.parse(txt, { header: true, skipEmptyLines: true }).data;

    const select = document.getElementById("selectCampanas");
    select.innerHTML = `<option value="">Todas las campañas</option>`;

    raw.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.nombre} (${c.fecha_inicio} → ${c.fecha_fin})`;
      select.appendChild(opt);
    });

    // Restaurar campaña seleccionada
    const last = localStorage.getItem("campana_activa");
    if (last) select.value = last;

    select.addEventListener("change", () => {
      const val = select.value;
      localStorage.setItem("campana_activa", val);
      cargarDashboardCampanas();
    });

  } catch (err) {
    console.error("❌ Error cargando selector campañas:", err);
  }
}

window.cargarSelectorCampanas = cargarSelectorCampanas;



// ===============================================================
// 📌 2. DASHBOARD PRINCIPAL DE CAMPAÑAS
// ===============================================================
async function cargarDashboardCampanas() {
  try {
    console.log("⚡ Cargando dashboard campañas...");

    // -----------------------------
    //  A. Cargar CSV campañas
    // -----------------------------
    const urlCampanas = localStorage.getItem("csv_campanas");
    const txtCampanas = await fetch(urlCampanas).then(r => r.text());
    const campanasRaw = Papa.parse(txtCampanas, { header: true, skipEmptyLines: true }).data;

    const campanas = campanasRaw.map(c => ({
      id: c.id,
      nombre: c.nombre,
      cat: (c.categoria_principal || "").toLowerCase(),
      subcat: (c.subcategoria || "").toLowerCase(),
      etiquetas: (c.etiquetas || "").toLowerCase().split(",").map(e => e.trim()),
      inicio: c.fecha_inicio,
      fin: c.fecha_fin,
      notas: c.notas
    }));

    // -----------------------------
    //  B. Cargar CSV ventas OG
    // -----------------------------
    const urlVentas = localStorage.getItem("csv_ventas");
    const txtVentas = await fetch(urlVentas).then(r => r.text());
    const ventasRaw = Papa.parse(txtVentas, { header: true, skipEmptyLines: true }).data;

    const ventas = ventasRaw.map(v => ({
      fecha: v["Fecha y hora"]?.split(" ")[0],
      total: parseFloat(v["Total"] || 0),
      cantidad: parseInt(v["Cantidad de productos"] || 0),
      sku: v["SKU"] || "",
      producto: v["Nombre del producto"] || "",
      categorias: (v["Categorías."] || "").toLowerCase()
    }));


    // -----------------------------
    //  C. Determinar campaña seleccionada
    // -----------------------------
    const idCampana = document.getElementById("selectCampanas").value;
    const campana = campanas.find(c => c.id == idCampana);

    let filtradas = [];

    // ======================================================
    // ✔ MODO 1 — Campaña seleccionada → ignorar filtro padre
    // ======================================================
    if (campana) {
      console.log("📌 Modo campaña estricta:", campana.nombre);

      // 1. Filtrar por categorías / subcategoría / etiquetas
      filtradas = ventas.filter(v => {
        const cats = v.categorias;
        return (
          (campana.cat && cats.includes(campana.cat)) ||
          (campana.subcat && cats.includes(campana.subcat)) ||
          campana.etiquetas.some(e => e && cats.includes(e))
        );
      });

      // 2. Filtrar por fecha propia de campaña
      filtradas = filtradas.filter(v => {
        if (!v.fecha) return false;
        const f = new Date(v.fecha);
        return f >= new Date(campana.inicio) && f <= new Date(campana.fin);
      });

      console.log("📊 Ventas filtradas:", filtradas.slice(0, 10));
      window.__VENTAS_FILTRADAS = filtradas;


      // ======================================================
      //  D. Mostrar KPIs
      // ======================================================
      const totalRevenue = filtradas.reduce((s, v) => s + v.total, 0);
      const totalCantidad = filtradas.reduce((s, v) => s + v.cantidad, 0);
      const totalSKUs = new Set(filtradas.map(v => v.sku)).size;

      document.getElementById("campanasKPIs").innerHTML = `
        <div class="metricas-grid">
          <div class="card-metrica">
            <strong style="font-size:2rem;">${totalSKUs}</strong>
            <p>SKUs vendidos</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${totalCantidad}</strong>
            <p>Unidades</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">$${totalRevenue.toLocaleString("es-CL")}</strong>
            <p>Revenue</p>
          </div>
        </div>
      `;

      // ======================================================
      //  E. Gráficos
      // ======================================================
      limpiarDiv("#graficoDiasCampana");
      limpiarDiv("#graficoHistoricoCampana");
      limpiarDiv("#graficoSubcategoriasCampana");
      limpiarDiv("#graficoProductosCampana");

      generarGraficoDias(filtradas);
      generarGraficoHistorico(filtradas);
      generarGraficoSubcategorias(filtradas);
      generarGraficoProductos(filtradas);

      // ======================================================
      //  F. Tabla detalle
      // ======================================================
      const tbody = document.querySelector("#tablaDetalleCampana tbody");
      tbody.innerHTML = filtradas.map(v => `
        <tr>
          <td>${v.sku}</td>
          <td>${v.producto}</td>
          <td>${v.cantidad}</td>
          <td>$${v.total.toLocaleString("es-CL")}</td>
          <td>${campana.cat}</td>
          <td>${campana.subcat}</td>
          <td>${campana.etiquetas.join(", ")}</td>
        </tr>
      `).join("");

      return;
    }



    // ======================================================
    // ✔ MODO 2 — SIN campaña seleccionada → aplicar rango padre
    // ======================================================
    console.log("📌 Modo rango padre (sin campaña seleccionada)");

    const panel = document.getElementById("campanasKPIs");

    if (!Array.isArray(rangoPrincipal) || rangoPrincipal.length !== 2) {
      panel.innerHTML = `
        <div class="ios-card"><p class="muted">Selecciona un rango de fechas arriba.</p></div>
      `;
      return;
    }

    const [ini, fin] = rangoPrincipal;

    // Campañas activas en el rango
    const activas = campanas.filter(c => {
      const cIni = new Date(c.inicio);
      const cFin = new Date(c.fin);
      return cFin >= ini && cIni <= fin;
    });

    panel.innerHTML = `
      <div class="ios-card">
        <h4>Campañas activas en este período</h4>
        <ul>
          ${activas.map(a => `<li>${a.nombre} (${a.inicio} → ${a.fin})</li>`).join("")}
        </ul>
      </div>
    `;


  } catch (err) {
    console.error("❌ Error campañas:", err);
  }
}

window.cargarDashboardCampanas = cargarDashboardCampanas;



// ===============================================================
// 📌 3. GRÁFICOS (ApexCharts)
// ===============================================================

function generarGraficoDias(data) {
  limpiarDiv("#graficoDiasCampana");

  const porDia = {};
  data.forEach(v => {
    if (!v.fecha) return;
    if (!porDia[v.fecha]) porDia[v.fecha] = 0;
    porDia[v.fecha] += v.total;
  });

  const fechas = Object.keys(porDia).sort();
  const valores = fechas.map(f => porDia[f]);

  new ApexCharts(document.querySelector("#graficoDiasCampana"), {
    chart: { type: "line", height: 300 },
    series: [{ name: "Revenue", data: valores }],
    xaxis: { categories: fechas },
    stroke: { curve: "smooth", width: 3 }
  }).render();
}

function generarGraficoHistorico(data) {
  limpiarDiv("#graficoHistoricoCampana");

  const porDia = {};
  data.forEach(v => {
    if (!v.fecha) return;
    if (!porDia[v.fecha]) porDia[v.fecha] = 0;
    porDia[v.fecha] += v.total;
  });

  const fechas = Object.keys(porDia).sort();

  let acumulado = 0;
  const valores = fechas.map(f => (acumulado += porDia[f]));

  new ApexCharts(document.querySelector("#graficoHistoricoCampana"), {
    chart: { type: "area", height: 300 },
    series: [{ name: "Revenue acumulado", data: valores }],
    xaxis: { categories: fechas },
    stroke: { curve: "smooth" },
    fill: { opacity: 0.3 }
  }).render();
}

function generarGraficoSubcategorias(data) {
  limpiarDiv("#graficoSubcategoriasCampana");

  const mapa = {};
  data.forEach(v => {
    const cats = v.categorias.split(" ");
    cats.forEach(c => {
      if (!c) return;
      if (!mapa[c]) mapa[c] = 0;
      mapa[c] += v.total;
    });
  });

  const labels = Object.keys(mapa);
  const valores = labels.map(l => mapa[l]);

  new ApexCharts(document.querySelector("#graficoSubcategoriasCampana"), {
    chart: { type: "donut", height: 300 },
    labels,
    series: valores
  }).render();
}

function generarGraficoProductos(data) {
  limpiarDiv("#graficoProductosCampana");

  const mapa = {};
  data.forEach(v => {
    if (!v.producto) return;
    if (!mapa[v.producto]) mapa[v.producto] = 0;
    mapa[vproducto] += v.total;
  });

  const top = Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const labels = top.map(t => t[0]);
  const valores = top.map(t => t[1]);

  new ApexCharts(document.querySelector("#graficoProductosCampana"), {
    chart: { type: "bar", height: 300 },
    series: [{ name: "Revenue", data: valores }],
    xaxis: { categories: labels },
    plotOptions: { bar: { horizontal: true } }
  }).render();
}

