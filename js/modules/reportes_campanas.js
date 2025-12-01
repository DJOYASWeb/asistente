async function cargarDashboardCampanas() {
  try {

    // ===========================
    // 1) Cargar CSV campañas
    // ===========================
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


    // ===========================
    // 2) Cargar CSV ventas OG
    // ===========================
    const urlVentas = localStorage.getItem("csv_ventas");
    const txtVentas = await fetch(urlVentas).then(r => r.text());
    const ventasRaw = Papa.parse(txtVentas, { header: true, skipEmptyLines: true }).data;

    // Normalizar ventas
    const ventas = ventasRaw.map(v => ({
      fecha: v["Fecha y hora"]?.split(" ")[0],  // "2024-01-01"
      total: parseFloat(v["Total"] || 0),
      cantidad: parseInt(v["Cantidad de productos"] || 0),
      sku: v["SKU"] || "",
      producto: v["Nombre del producto"] || "",
      categorias: (v["Categorías."] || "").toLowerCase()
    }));


    // ===========================
    // 3) Detectar campaña seleccionada
    // ===========================
    const idSeleccionado = document.getElementById("selectCampanas").value;
    const campana = campanas.find(c => c.id == idSeleccionado);

    if (!campana) {
      document.getElementById("campanasKPIs").innerHTML = `
        <div class="ios-card"><p class="muted">Selecciona una campaña.</p></div>`;
      return;
    }


    // ===========================
    // 4) Filtrar ventas por campaña
    // ===========================
    const matchCampana = venta => {
      const cat = venta.categorias;

      return (
        (campana.cat && cat.includes(campana.cat)) ||
        (campana.subcat && cat.includes(campana.subcat)) ||
        campana.etiquetas.some(e => e && cat.includes(e))
      );
    };

    let filtradas = ventas.filter(matchCampana);


    // ===========================
    // 5) Filtrar por rango de fechas (global)
    // ===========================
    if (Array.isArray(rangoPrincipal) && rangoPrincipal.length === 2) {
      const [ini, fin] = rangoPrincipal.map(d =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate())
      );

      filtradas = filtradas.filter(v => {
        if (!v.fecha) return false;
        const f = new Date(v.fecha);
        return f >= ini && f <= fin;
      });
    }


    // ===========================
    // 6) MÉTRICAS
    // ===========================
    const totalRevenue = filtradas.reduce((s, v) => s + v.total, 0);
    const totalCantidad = filtradas.reduce((s, v) => s + v.cantidad, 0);
    const totalProductos = new Set(filtradas.map(v => v.sku)).size;


    document.getElementById("campanasKPIs").innerHTML = `
      <div class="metricas-grid">
        <div class="card-metrica">
          <strong style="font-size:2rem;">${totalProductos}</strong>
          <p>SKUs vendidos</p>
        </div>
        <div class="card-metrica">
          <strong style="font-size:2rem;">${totalCantidad}</strong>
          <p>Unidades</p>
        </div>
        <div class="card-metrica">
          <strong style="font-size:2rem;">$${totalRevenue.toLocaleString("es-CL")}</strong>
          <p>Revenue total</p>
        </div>
      </div>
    `;


    // ===========================
    // 7) Gráficos
    // ===========================
    generarGraficoDias(filtradas);
    generarGraficoHistorico(filtradas);
    generarGraficoSubcategorias(filtradas);
    generarGraficoProductos(filtradas);


    // ===========================
    // 8) Tabla detalle
    // ===========================
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

  } catch (err) {
    console.error("❌ Error campañas:", err);
  }
}

// Exponer función global
window.cargarDashboardCampanas = cargarDashboardCampanas;
