// =============================================================
// 📊 DASHBOARD DE CAMPAÑAS — LEE CSV + FILTRA POR FECHAS
// =============================================================
async function cargarDashboardCampanas() {
  try {
    // 1. Obtener URL guardada
    const saved = localStorage.getItem("csv_campanas");

    if (!saved) {
      document.getElementById("campanasKPIs").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ No hay enlace CSV configurado para Campañas.</p>
        </div>`;
      return;
    }

    // 2. Cargar archivo CSV
    const response = await fetch(saved);
    if (!response.ok) throw new Error("No se pudo cargar el CSV de campañas.");

    const text = await response.text();
    let data = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

    // 3. Normalizar claves
    data = data.map(row => {
      const limpio = {};
      for (let k of Object.keys(row)) {
        limpio[k.trim().toLowerCase().replace(/\s+/g, "_")] = row[k];
      }
      return limpio;
    });

    // ---------------------------------
    // 4. Filtrar por rango principal
    // ---------------------------------
    const inicio = rangoPrincipal?.[0] || null;
    const fin = rangoPrincipal?.[1] || null;

    function parseFecha(str) {
      if (!str) return null;
      const [f] = str.split(" ");
      const [y,m,d] = f.split("-").map(Number);
      return new Date(y, m-1, d);
    }

    const filtrados = data.filter(c => {
      if (!c.fecha) return false;
      const f = parseFecha(c.fecha);
      if (!inicio || !fin) return true;
      return f >= inicio && f <= fin;
    });

    console.log("📊 Campañas filtradas:", filtrados.length);

    // ---------------------------------
    // 5. Métricas principales
    // ---------------------------------
    const totalVentas = filtrados.reduce((a,c) => a + (parseFloat(c.revenue)||0), 0);
    const totalSkus = filtrados.length;
    const totalCantidad = filtrados.reduce((a,c) => a + (parseInt(c.cantidad)||0), 0);

    // ---------------------------------
    // 6. Render métricas principales
    // ---------------------------------
    document.getElementById("campanasKPIs").innerHTML = `
      <div class="ios-card">
        <div class="metricas-grid">

          <div class="card-metrica">
            <strong style="font-size:2rem;">${totalSkus}</strong>
            <p>SKUs vendidos</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${totalCantidad}</strong>
            <p>Cantidad total</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">$${totalVentas.toLocaleString("es-CL")}</strong>
            <p>Revenue total</p>
          </div>

        </div>
      </div>
    `;

    // ---------------------------------
    // 7. Gráficos
    // ---------------------------------
    generarGraficoDias(filtrados);
    generarGraficoHistorico(filtrados);
    generarGraficoSubcategorias(filtrados);
    generarGraficoProductos(filtrados);

    // ---------------------------------
    // 8. Tabla detalle
    // ---------------------------------
    const tbody = document.querySelector("#tablaDetalleCampana tbody");

    tbody.innerHTML = filtrados.map(c => `
      <tr>
        <td>${c.sku}</td>
        <td>${c.producto}</td>
        <td>${c.cantidad}</td>
        <td>$${Number(c.revenue).toLocaleString("es-CL")}</td>
        <td>${c.categoria || "-"}</td>
        <td>${c.subcategoria || "-"}</td>
        <td>${c.etiquetas || "-"}</td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("❌ Error cargando campañas:", err);
    document.getElementById("campanasKPIs").innerHTML = `
      <div class="ios-card">
        <p class="text-danger">❌ Error: ${err.message}</p>
      </div>`;
  }
}
