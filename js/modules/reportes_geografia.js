// ==========================================================
// 🌍 DASHBOARD GEOGRÁFICO — FILTRADO POR FECHAS DESDE VENTAS
// ==========================================================
async function cargarDashboardGeografia() {
  try {
    const urlClientes = localStorage.getItem("csv_clientes");
    const urlVentas = localStorage.getItem("csv_ventas");

    if (!urlClientes || !urlVentas) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ Debes configurar CSV de Clientes y Ventas.</p>
        </div>`;
      return;
    }

    // =========================
    // 📥 CARGAR CSVs
    // =========================
    const [resClientes, resVentas] = await Promise.all([
      fetch(urlClientes),
      fetch(urlVentas)
    ]);

    const clientesRaw = Papa.parse(await resClientes.text(), { header: true, skipEmptyLines: true }).data;
    const ventasRaw = Papa.parse(await resVentas.text(), { header: true, skipEmptyLines: true }).data;

    // =========================
    // 🧹 NORMALIZAR
    // =========================
    const norm = row => {
      const o = {};
      Object.keys(row).forEach(k => {
        o[k.trim().toLowerCase().replace(/\s+/g, "_")] = row[k];
      });
      return o;
    };

    const clientes = clientesRaw.map(norm);
    const ventas = ventasRaw.map(norm);

    // =========================
    // 📅 RANGO NORMALIZADO
    // =========================
    let inicio = null;
    let fin = null;

    if (Array.isArray(rangoPrincipal) && rangoPrincipal.length === 2) {
      inicio = new Date(
        rangoPrincipal[0].getFullYear(),
        rangoPrincipal[0].getMonth(),
        rangoPrincipal[0].getDate()
      );
      fin = new Date(
        rangoPrincipal[1].getFullYear(),
        rangoPrincipal[1].getMonth(),
        rangoPrincipal[1].getDate()
      );
    }

    function parseFecha(str) {
      if (!str) return null;
      const [y, m, d] = str.split(" ")[0].split("-").map(Number);
      return y && m && d ? new Date(y, m - 1, d) : null;
    }

    // =========================
    // 🔍 FILTRAR VENTAS POR FECHA
    // =========================
    const ventasFiltradas = ventas.filter(v => {
      const f = parseFecha(v.fecha || v.fecha_pedido || v.fecha_y_hora);
      if (!f) return false;
      if (inicio && fin) return f >= inicio && f <= fin;
      return true;
    });

    if (ventasFiltradas.length === 0) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card">
          <p class="muted text-center">⚠️ No hay ventas en el rango seleccionado.</p>
        </div>`;
      return;
    }

    // =========================
    // 🔗 MAP CLIENTES
    // =========================
    const clientesMap = {};
    clientes.forEach(c => {
      const id = c.id_cliente || c.cliente || c.customer_id;
      if (!id) return;

      clientesMap[id] = {
        ciudad: c.ciudad || "Sin ciudad",
        pais: c.pais || "Sin región"
      };
    });

    // =========================
    // 🌍 AGRUPAR GEOGRAFÍA
    // =========================
    const ciudades = {};
    const paises = {};

    ventasFiltradas.forEach(v => {
      const idCliente = v.id_cliente || v.cliente || v.customer_id;
      const geo = clientesMap[idCliente];
      if (!geo) return;

      const ciudad = geo.ciudad.trim();
      const pais = geo.pais.trim();
      const total = parseFloat(v.total || v.total_gastado || 0);

      if (!ciudades[ciudad]) {
        ciudades[ciudad] = { ciudad, clientes: new Set(), total: 0, pedidos: 0 };
      }

      if (!paises[pais]) {
        paises[pais] = { pais, clientes: new Set(), total: 0, pedidos: 0 };
      }

      ciudades[ciudad].clientes.add(idCliente);
      ciudades[ciudad].total += total;
      ciudades[ciudad].pedidos++;

      paises[pais].clientes.add(idCliente);
      paises[pais].total += total;
      paises[pais].pedidos++;
    });

    // =========================
    // 📊 PREPARAR DATA
    // =========================
    const ciudadesArr = Object.values(ciudades).map(c => ({
      ciudad: c.ciudad,
      clientes: c.clientes.size,
      total: c.total,
      pedidos: c.pedidos
    }));

    const paisesArr = Object.values(paises).map(p => ({
      pais: p.pais,
      clientes: p.clientes.size,
      total: p.total,
      pedidos: p.pedidos
    }));

    const topCiudades = ciudadesArr.sort((a,b)=>b.clientes-a.clientes).slice(0,10);
    const topPaises = paisesArr.sort((a,b)=>b.clientes-a.clientes).slice(0,10);

    // =========================
    // 🧱 MÉTRICAS (BLOQUES GRISES)
    // =========================
    const totalCiudades = ciudadesArr.length;
    const totalPaises = paisesArr.length;

    const ciudadTop = topCiudades[0]?.ciudad || "-";
    const paisTop = topPaises[0]?.pais || "-";

    // =========================
    // 🖥️ RENDER
    // =========================
    const main = document.getElementById("contenidoReportesMain");
    main.innerHTML = `
      <div class="ios-card">
        <h2><i class="fa-solid fa-globe-americas"></i> Reporte Geográfico</h2>

        <div class="metricas-grid">
          <div class="card-metrica">
            <strong style="font-size:2rem;">${totalCiudades}</strong>
            <p>Ciudades activas</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${totalPaises}</strong>
            <p>Regiones activas</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:1.6rem;">${ciudadTop}</strong>
            <p>Ciudad top</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:1.6rem;">${paisTop}</strong>
            <p>Región top</p>
          </div>
        </div>

        <h4 style="margin-top:1rem;">Top 10 Ciudades</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>Ciudad</th>
              <th>Clientes</th>
              <th>Pedidos</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${topCiudades.map(c=>`
              <tr>
                <td>${c.ciudad}</td>
                <td>${c.clientes}</td>
                <td>${c.pedidos}</td>
                <td>$${c.total.toLocaleString("es-CL")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <h4 style="margin-top:2rem;">Top 10 Regiones</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>Región</th>
              <th>Clientes</th>
              <th>Pedidos</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${topPaises.map(p=>`
              <tr>
                <td>${p.pais}</td>
                <td>${p.clientes}</td>
                <td>${p.pedidos}</td>
                <td>$${p.total.toLocaleString("es-CL")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    inyectarBotonPDF(main);

  } catch (err) {
    console.error("❌ Error geografía:", err);
    document.getElementById("contenidoReportesMain").innerHTML = `
      <div class="ios-card">
        <p class="text-danger">❌ Error cargando geografía</p>
      </div>`;
  }
}
