// ==========================================================
// 📦 DASHBOARD DE VENTAS (MODO PRO - AGRUPADO POR PEDIDOS)
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

    // -------------------------------------------------------
    // NORMALIZAR ENCABEZADOS
    // -------------------------------------------------------
    const normalizado = data.map(row => {
      const limpio = {};
      for (let k of Object.keys(row)) {
        limpio[k.trim().toLowerCase().replace(/\s+/g, "_")] = row[k];
      }
      return limpio;
    });

    // -------------------------------------------------------
    // FUNCIÓN PARA PARSEAR FECHAS (sin hora)
    // -------------------------------------------------------
    function parseFecha(str) {
      if (!str || typeof str !== "string") return null;
      const [f] = str.split(" ");
      const [y, m, d] = f.split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }

    // -------------------------------------------------------
    // FILTRADO POR RANGO DE FECHAS
    // -------------------------------------------------------
    const inicio = rangoPrincipal?.[0] || null;
    const fin = rangoPrincipal?.[1] || null;

    const filtrados = normalizado.filter(r => {
      const fecha = parseFecha(r.fecha_y_hora);
      if (!fecha) return false;
      if (inicio && fin) return fecha >= inicio && fecha <= fin;
      return true;
    });

    if (filtrados.length === 0) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card"><p class="muted text-center">⚠️ No hay ventas en el rango seleccionado.</p></div>`;
      return;
    }

    // -------------------------------------------------------
    // AGRUPACIÓN REAL POR ID DE PEDIDO
    // -------------------------------------------------------
    const pedidosMap = {};

    filtrados.forEach(r => {
      const id = r.id_del_pedido || r.id_pedido;

      if (!pedidosMap[id]) {
        pedidosMap[id] = {
          id,
          fecha: r.fecha_y_hora,
          metodo_pago: r.metodo_de_pago || r.método_de_pago,
          cliente: r.id_del_cliente || r.id_cliente,
          total_pedido: Number(r.total || 0),
          transportista: r.transportista,
          productos: []
        };
      }

      // Obtener cantidad
      const cantidad = Number(r.cantidad_de_productos || r.cantidad || 1);

      // Obtener valor total de la línea
      const valorTotalLinea = Number(r.valor_del_producto || 0);

      // Calcular valor unitario
      const valorUnitario = cantidad > 0 ? valorTotalLinea / cantidad : 0;

      // Categorías
      const categorias = (r.categorías || r.categorias || r.categoria || "")
        .split(",")
        .map(c => c.trim())
        .filter(c => c.length > 0);

      pedidosMap[id].productos.push({
        sku: r.sku,
        nombre: r.nombre_del_producto,
        cantidad,
        valor_unitario: valorUnitario,
        categorias
      });
    });

    const pedidos = Object.values(pedidosMap);

    // -------------------------------------------------------
    // MÉTRICAS PRINCIPALES (YA CORREGIDAS)
    // -------------------------------------------------------
    const revenueTotal = pedidos.reduce((t, p) => t + p.total_pedido, 0);
    const pedidosUnicos = pedidos.length;

    const productosVendidos = pedidos.reduce(
      (t, p) => t + p.productos.reduce((a, prod) => a + prod.cantidad, 0),
      0
    );

    const ticketPromedio = pedidosUnicos ? revenueTotal / pedidosUnicos : 0;

    const clientesUnicos =
      new Set(pedidos.map(p => p.cliente)).size;

    const aovCliente = clientesUnicos ? revenueTotal / clientesUnicos : 0;

    // -------------------------------------------------------
    // REVENUE POR DÍA DEL MES
    // -------------------------------------------------------
    const revenuePorDia = {};
    pedidos.forEach(p => {
      const fecha = parseFecha(p.fecha);
      const dia = fecha.getDate();
      revenuePorDia[dia] = (revenuePorDia[dia] || 0) + p.total_pedido;
    });

    // -------------------------------------------------------
    // REVENUE POR HORA
    // -------------------------------------------------------
    const revenuePorHora = {};
    pedidos.forEach(p => {
      const h = Number(p.fecha.split(" ")[1].split(":")[0]);
      revenuePorHora[h] = (revenuePorHora[h] || 0) + p.total_pedido;
    });

    // -------------------------------------------------------
    // TOP PRODUCTOS
    // -------------------------------------------------------
    const productosMap = {};

    pedidos.forEach(p => {
      p.productos.forEach(prod => {
        if (!productosMap[prod.nombre]) {
          productosMap[prod.nombre] = {
            nombre: prod.nombre,
            cantidad: 0,
            revenue: 0
          };
        }
        productosMap[prod.nombre].cantidad += prod.cantidad;
        productosMap[prod.nombre].revenue += prod.valor_unitario * prod.cantidad;
      });
    });

    const topProductosPorRevenue = Object.values(productosMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topProductosPorCantidad = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    // -------------------------------------------------------
    // TOP CATEGORÍAS
    // -------------------------------------------------------
    const categoriasMap = {};

    pedidos.forEach(p => {
      p.productos.forEach(prod => {
        prod.categorias.forEach(cat => {
          if (!categoriasMap[cat]) {
            categoriasMap[cat] = { categoria: cat, cantidad: 0, revenue: 0 };
          }
          categoriasMap[cat].cantidad += prod.cantidad;
          categoriasMap[cat].revenue += prod.valor_unitario * prod.cantidad;
        });
      });
    });

    const topCategorias = Object.values(categoriasMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // -------------------------------------------------------
    // RENDER DASHBOARD
    // -------------------------------------------------------
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
