// ==========================================================
// 📌 DASHBOARD GEOGRÁFICO — CORRECTO (ventas + clientes)
// ==========================================================
async function cargarDashboardGeografia() {
  try {
    const urlClientes = localStorage.getItem("csv_clientes");
    const urlVentas = localStorage.getItem("csv_ventas");

    if (!urlClientes || !urlVentas) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ Faltan CSV de clientes o ventas.</p>
        </div>`;
      return;
    }

    // ==========================
    // 📥 Cargar ambos CSV
    // ==========================
    const [resClientes, resVentas] = await Promise.all([
      fetch(urlClientes),
      fetch(urlVentas)
    ]);

    const clientesRaw = Papa.parse(await resClientes.text(), { header: true, skipEmptyLines: true }).data;
    const ventasRaw   = Papa.parse(await resVentas.text(),   { header: true, skipEmptyLines: true }).data;

    // ==========================
    // 🧹 Normalizar
    // ==========================
    const clientes = clientesRaw.map(r => {
      const o = {};
      Object.keys(r).forEach(k => o[k.trim().toLowerCase().replace(/\s+/g, "_")] = r[k]);
      return o;
    });

    const ventas = ventasRaw.map(r => {
      const o = {};
      Object.keys(r).forEach(k => o[k.trim().toLowerCase().replace(/\s+/g, "_")] = r[k]);
      return o;
    });

    // ==========================
    // 📅 Rango normalizado
    // ==========================
    let inicio = null, fin = null;
    if (Array.isArray(rangoPrincipal) && rangoPrincipal.length === 2) {
      inicio = new Date(rangoPrincipal[0].getFullYear(), rangoPrincipal[0].getMonth(), rangoPrincipal[0].getDate());
      fin    = new Date(rangoPrincipal[1].getFullYear(), rangoPrincipal[1].getMonth(), rangoPrincipal[1].getDate());
    }

    function parseFecha(str) {
      if (!str) return null;
      const [y,m,d] = str.split(" ")[0].split("-").map(Number);
      if (!y||!m||!d) return null;
      return new Date(y, m-1, d);
    }

    // ==========================
    // 🔍 Filtrar ventas por rango
    // ==========================
    const ventasFiltradas = ventas.filter(v => {
      const f = parseFecha(v.fecha || v.fecha_y_hora || v.created_at);
      if (!f) return false;
      if (inicio && fin) return f >= inicio && f <= fin;
      return true;
    });

    // ==========================
    // 🔗 IDs de clientes activos
    // ==========================
    const clientesActivos = new Set(
      ventasFiltradas.map(v => v.id_cliente || v.id_del_cliente).filter(Boolean)
    );

    // ==========================
    // 🧭 Clientes activos con ubicación
    // ==========================
    const clientesGeo = clientes.filter(c =>
      clientesActivos.has(c.id_cliente || c.id)
    );

    if (clientesGeo.length === 0) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card">
          <p class="muted text-center">⚠️ No hay actividad geográfica en el rango.</p>
        </div>`;
      return;
    }

    // ==========================
    // 📊 AGRUPACIÓN
    // ==========================
    const ciudades = {};
    const paises = {};

    clientesGeo.forEach(c => {
      const ciudad = (c.ciudad || "").trim();
      const pais = (c.pais || "Sin región").trim();
      if (!ciudad) return;

      if (!ciudades[ciudad]) ciudades[ciudad] = { ciudad, clientes: 0 };
      if (!paises[pais]) paises[pais] = { pais, clientes: 0 };

      ciudades[ciudad].clientes++;
      paises[pais].clientes++;
    });

    const topCiudades = Object.values(ciudades).sort((a,b)=>b.clientes-a.clientes).slice(0,10);
    const topPaises = Object.values(paises).sort((a,b)=>b.clientes-a.clientes).slice(0,10);

    // ==========================
    // 🖥️ RENDER (BLOQUES VUELVEN)
    // ==========================
    const main = document.getElementById("contenidoReportesMain");
    main.innerHTML = `
      <div class="ios-card">
        <h2><i class="fa-solid fa-globe-americas"></i> Reporte Geográfico</h2>

        <div class="metricas-grid">
          <div class="card-metrica">
            <strong style="font-size:2rem;">${Object.keys(ciudades).length}</strong>
            <p>Ciudades activas</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${Object.keys(paises).length}</strong>
            <p>Regiones activas</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:1.5rem;">${topCiudades[0]?.ciudad || "-"}</strong>
            <p>Ciudad top</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:1.5rem;">${topPaises[0]?.pais || "-"}</strong>
            <p>Región top</p>
          </div>
        </div>

        <h4>Top ciudades</h4>
        <table class="tabla-ios">
          <tbody>
            ${topCiudades.map(c=>`
              <tr>
                <td>${c.ciudad}</td>
                <td>${c.clientes}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;

    inyectarBotonPDF(main);

  } catch (err) {
    console.error("❌ Geografía:", err);
    document.getElementById("contenidoReportesMain").innerHTML = `
      <div class="ios-card"><p class="text-danger">❌ Error geografía</p></div>`;
  }
}
