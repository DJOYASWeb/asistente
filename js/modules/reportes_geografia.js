// ==========================================================
// 📌 DASHBOARD GEOGRÁFICO — FILTRADO POR FECHA DE VENTAS
// ==========================================================
async function cargarDashboardGeografia() {
  try {
    const csvClientes = localStorage.getItem("csv_clientes");
    const csvVentas = localStorage.getItem("csv_ventas");

    if (!csvClientes || !csvVentas) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ Faltan CSV de clientes o ventas.</p>
        </div>`;
      return;
    }

    // ==================================================
    // 📥 Cargar CLIENTES
    // ==================================================
    const resClientes = await fetch(csvClientes);
    const txtClientes = await resClientes.text();
    const clientesRaw = Papa.parse(txtClientes, { header: true, skipEmptyLines: true }).data;

    const clientes = clientesRaw.map(r => {
      const o = {};
      Object.keys(r).forEach(k => {
        o[k.trim().toLowerCase().replace(/\s+/g, "_")] = r[k];
      });
      return o;
    });

    // Mapa clientes por ID
    const clientesMap = {};
    clientes.forEach(c => {
      if (!c.id_cliente) return;
      clientesMap[c.id_cliente] = c;
    });

    // ==================================================
    // 📥 Cargar VENTAS
    // ==================================================
    const resVentas = await fetch(csvVentas);
    const txtVentas = await resVentas.text();
    const ventasRaw = Papa.parse(txtVentas, { header: true, skipEmptyLines: true }).data;

    const ventas = ventasRaw.map(r => {
      const o = {};
      Object.keys(r).forEach(k => {
        o[k.trim().toLowerCase().replace(/\s+/g, "_")] = r[k];
      });
      return o;
    });

    // ==================================================
    // 📅 Normalizar rango
    // ==================================================
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
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }

    // ==================================================
    // 🔍 Filtrar VENTAS por rango
    // ==================================================
    const ventasFiltradas = ventas.filter(v => {
      const f = parseFecha(v.fecha_y_hora);
      if (!f) return false;
      if (inicio && fin) return f >= inicio && f <= fin;
      return true;
    });

    // ==================================================
    // 🌍 AGRUPAR GEOGRAFÍA
    // ==================================================
    const ciudades = {};
    const paises = {};

    ventasFiltradas.forEach(v => {
      const cliente = clientesMap[v.id_cliente];
      if (!cliente) return;

      const ciudad = (cliente.ciudad || "").trim();
      const pais = (cliente.pais || "Sin Región").trim();
      if (!ciudad) return;

      const total = parseFloat(v.total_gastado || 0);

      if (!ciudades[ciudad]) {
        ciudades[ciudad] = { ciudad, clientes: new Set(), total: 0 };
      }
      if (!paises[pais]) {
        paises[pais] = { pais, clientes: new Set(), total: 0 };
      }

      ciudades[ciudad].clientes.add(v.id_cliente);
      ciudades[ciudad].total += total;

      paises[pais].clientes.add(v.id_cliente);
      paises[pais].total += total;
    });

    // Convertir Set → número
    const topCiudades = Object.values(ciudades)
      .map(c => ({ ...c, clientes: c.clientes.size }))
      .sort((a, b) => b.clientes - a.clientes)
      .slice(0, 10);

    const topPaises = Object.values(paises)
      .map(p => ({ ...p, clientes: p.clientes.size }))
      .sort((a, b) => b.clientes - a.clientes)
      .slice(0, 10);

    // ==================================================
    // 🖥️ RENDER
    // ==================================================
    const main = document.getElementById("contenidoReportesMain");
    main.innerHTML = `
      <div class="ios-card">
        <h2><i class="fa-solid fa-globe-americas"></i> Reporte Geográfico</h2>

        <h4>Top 10 Ciudades</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>Ciudad</th>
              <th>Clientes</th>
              <th>Total gastado</th>
            </tr>
          </thead>
          <tbody>
            ${topCiudades.map(c => `
              <tr>
                <td>${c.ciudad}</td>
                <td>${c.clientes}</td>
                <td>$${c.total.toLocaleString("es-CL")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <h4 style="margin-top:2rem;">Top 10 Regiones</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>País</th>
              <th>Clientes</th>
              <th>Total gastado</th>
            </tr>
          </thead>
          <tbody>
            ${topPaises.map(p => `
              <tr>
                <td>${p.pais}</td>
                <td>${p.clientes}</td>
                <td>$${p.total.toLocaleString("es-CL")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error("❌ Error geografía:", err);
    document.getElementById("contenidoReportesMain").innerHTML = `
      <div class="ios-card">
        <p class="text-danger">❌ Error cargando geografía</p>
      </div>`;
  }
}
