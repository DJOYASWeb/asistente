// ==========================================================
// 📦 DASHBOARD DE VENTAS (MODO PRO)
// ==========================================================
async function cargarDashboardVentas() {
  try {
    const saved = localStorage.getItem("csv_ventas");

    if (!saved) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ No hay enlace configurado para Ventas.</p>
        </div>`;
      return;
    }

    // Cargar CSV
    const response = await fetch(saved);
    if (!response.ok) throw new Error("No se pudo cargar el CSV de ventas.");

    const text = await response.text();
    const data = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

    // ------------------------------------------
    // NORMALIZAR ENCABEZADOS
    // ------------------------------------------
    const normalizado = data.map(row => {
      const limpio = {};
      for (let k of Object.keys(row)) {
        limpio[k.trim().toLowerCase().replace(/\s+/g, "_")] = row[k];
      }
      return limpio;
    });

    // ------------------------------------------
    // NORMALIZAR CATEGORÍAS
    // ------------------------------------------
    function normalizarCategoria(str) {
      if (!str) return "";
      return str
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // ------------------------------------------
    // FILTRAR POR RANGO DE FECHAS (MISMO SISTEMA)
    // ------------------------------------------
function parseFecha(str) {
  if (!str || typeof str !== "string") return null;

  // str = "2025-11-27 14:24:47"
  const [fechaPart] = str.split(" ");

  const [y, m, d] = fechaPart.split("-").map(n => Number(n));
  if (!y || !m || !d) return null;

  // retornar fecha normalizada sin hora
  return new Date(y, m - 1, d, 0, 0, 0);
}


    const inicio = rangoPrincipal?.[0] || null;
    const fin = rangoPrincipal?.[1] || null;

    const filtrados = normalizado.filter(r => {
      const fecha = parseFecha(r.fecha_y_hora || r.fecha || r.date || "");
      if (!fecha) return false;
      if (inicio && fin) return fecha >= inicio && fecha <= fin;
      return true;
    });

    if (filtrados.length === 0) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card"><p class="muted text-center">⚠️ No hay ventas en el rango seleccionado.</p></div>`;
      return;
    }

    // ------------------------------------------
    // MÉTRICAS PRINCIPALES
    // ------------------------------------------
    const revenueTotal = filtrados.reduce((t, r) => t + Number(r.total || 0), 0);

    const pedidosUnicos =
      new Set(filtrados.map(r => r.id_del_pedido || r.id_pedido)).size;

    const productosVendidos = filtrados.reduce(
      (t, r) => t + Number(r.cantidad_de_productos || r.cantidad || 0),
      0
    );

    const ticketPromedio = pedidosUnicos ? revenueTotal / pedidosUnicos : 0;

    const clientesUnicos =
      new Set(filtrados.map(r => r.id_del_cliente || r.id_cliente)).size;

    const aovCliente = clientesUnicos ? revenueTotal / clientesUnicos : 0;

    // ------------------------------------------
    // REVENUE POR DÍA DEL MES
    // ------------------------------------------
    const revenuePorDia = {};
    filtrados.forEach(r => {
      const fecha = parseFecha(r.fecha_y_hora);
      if (!fecha) return;
      const dia = fecha.getDate();
      revenuePorDia[dia] = (revenuePorDia[dia] || 0) + Number(r.total || 0);
    });

    // ------------------------------------------
    // REVENUE POR HORA
    // ------------------------------------------
    const revenuePorHora = {};
    filtrados.forEach(r => {
      const partes = (r.fecha_y_hora || "").split(" ");
      const hora = partes[1] ? Number(partes[1].split(":")[0]) : null;
      if (hora === null) return;
      revenuePorHora[hora] = (revenuePorHora[hora] || 0) + Number(r.total || 0);
    });

    // ------------------------------------------
    // TOP PRODUCTOS
    // ------------------------------------------
    const productosMap = {};

    filtrados.forEach(r => {
      const nombre = r.nombre_del_producto || r.producto || "Sin nombre";
      if (!productosMap[nombre]) {
        productosMap[nombre] = { nombre, cantidad: 0, revenue: 0 };
      }
      productosMap[nombre].cantidad += Number(r.cantidad_de_productos || r.cantidad || 0);
      productosMap[nombre].revenue += Number(r.total || 0);
    });

    const topProductosPorRevenue = Object.values(productosMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topProductosPorCantidad = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    // ------------------------------------------
    // TOP CATEGORÍAS
    // ------------------------------------------
    const categoriasMap = {};

    filtrados.forEach(r => {
      const categorias = normalizarCategoria(r.categorías || r.categoria || r.categorias);
      categorias.forEach(cat => {
        if (!categoriasMap[cat]) categoriasMap[cat] = { categoria: cat, cantidad: 0, revenue: 0 };
        categoriasMap[cat].cantidad += Number(r.cantidad_de_productos || 1);
        categoriasMap[cat].revenue += Number(r.total || 0);
      });
    });

    const topCategorias = Object.values(categoriasMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ------------------------------------------
    // RENDER DASHBOARD
    // ------------------------------------------
    const main = document.getElementById("contenidoReportesMain");
    main.innerHTML = `
      <div class="ios-card">
        <h2><i class="fa-solid fa-cart-shopping"></i> Reporte de Ventas</h2>

        <div class="metricas-grid">

          <div class="card-metrica">
            <strong style="font-size:2rem;">$${revenueTotal.toLocaleString("es-CL")}</strong>
            <p>Revenue total</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${pedidosUnicos}</strong>
            <p>Pedidos únicos</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${productosVendidos}</strong>
            <p>Productos vendidos</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">$${ticketPromedio.toFixed(0)}</strong>
            <p>Ticket promedio</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">$${aovCliente.toFixed(0)}</strong>
            <p>AOV por cliente</p>
          </div>

        </div>

        <h4 style="margin-top:1rem;">Revenue por día del mes</h4>
        <table class="tabla-ios">
          <thead><tr><th>Día</th><th>Revenue</th></tr></thead>
          <tbody>
            ${Object.entries(revenuePorDia)
              .map(([dia, rev]) => `
                <tr><td>${dia}</td><td>$${rev.toLocaleString("es-CL")}</td></tr>
              `)
              .join("")}
          </tbody>
        </table>

        <h4 style="margin-top:1rem;">Revenue por hora</h4>
        <table class="tabla-ios">
          <thead><tr><th>Hora</th><th>Revenue</th></tr></thead>
          <tbody>
            ${Object.entries(revenuePorHora)
              .map(([h, rev]) => `
                <tr><td>${h}:00</td><td>$${rev.toLocaleString("es-CL")}</td></tr>
              `)
              .join("")}
          </tbody>
        </table>

        <h4 style="margin-top:1rem;">Top 10 productos por revenue</h4>
        <table class="tabla-ios">
          <thead><tr><th>Producto</th><th>Cantidad</th><th>Revenue</th></tr></thead>
          <tbody>
            ${topProductosPorRevenue
              .map(p => `
                <tr><td>${p.nombre}</td><td>${p.cantidad}</td><td>$${p.revenue.toLocaleString("es-CL")}</td></tr>
              `)
              .join("")}
          </tbody>
        </table>

        <h4 style="margin-top:1rem;">Top 10 productos por cantidad</h4>
        <table class="tabla-ios">
          <thead><tr><th>Producto</th><th>Cantidad</th><th>Revenue</th></tr></thead>
          <tbody>
            ${topProductosPorCantidad
              .map(p => `
                <tr><td>${p.nombre}</td><td>${p.cantidad}</td><td>$${p.revenue.toLocaleString("es-CL")}</td></tr>
              `)
              .join("")}
          </tbody>
        </table>

        <h4 style="margin-top:1rem;">Top 10 categorías</h4>
        <table class="tabla-ios">
          <thead><tr><th>Categoría</th><th>Cantidad</th><th>Revenue</th></tr></thead>
          <tbody>
            ${topCategorias
              .map(c => `
                <tr><td>${c.categoria}</td><td>${c.cantidad}</td><td>$${c.revenue.toLocaleString("es-CL")}</td></tr>
              `)
              .join("")}
          </tbody>
        </table>

      </div>
    `;

  } catch (err) {
    console.error("❌ Error ventas:", err);
    document.getElementById("contenidoReportesMain").innerHTML = `
      <div class="ios-card"><p class="text-danger">❌ Error cargando ventas: ${err.message}</p></div>`;
  }
}
