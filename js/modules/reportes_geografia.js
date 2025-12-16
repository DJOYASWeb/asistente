// ==========================================================
// 📌 DASHBOARD GEOGRÁFICO — Basado en data filtrada por fechas
// ==========================================================
async function cargarDashboardGeografia() {
  try {
    const saved = localStorage.getItem("csv_clientes");

    if (!saved) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ No hay enlace configurado para Clientes.</p>
        </div>`;
      return;
    }

    // URL directa CSV
    const response = await fetch(saved);
    if (!response.ok) throw new Error("No se pudo cargar el CSV geográfico.");

    const text = await response.text();
    const data = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

// Normalizar claves
const normalizado = data.map(row => {
  const limpio = {};
  for (let k of Object.keys(row)) {
    limpio[k.trim().toLowerCase().replace(/\s+/g, "_")] = row[k];
  }
  return limpio;
});

// ================================
// NORMALIZAR CIUDAD Y PAÍS
// ================================
function normalizarTextoLugar(str) {
  if (!str) return "";
  str = str.trim().toLowerCase();

  return str
    .split(" ")
    .filter(p => p.length > 0)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// Aplicar normalización
normalizado.forEach(c => {
  if (c.ciudad) c.ciudad = normalizarTextoLugar(c.ciudad);
  if (c.pais) c.pais = normalizarTextoLugar(c.pais);
});


    // --- Aplicar el mismo filtro de fecha que clientes ---
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
      if (!str || typeof str !== "string") return null;
      const [fechaPart] = str.trim().split(" ");
      const [y,m,d] = fechaPart.split("-").map(Number);
      if (!y||!m||!d) return null;
      return new Date(y, m-1, d);
    }

    function obtenerFechaCampo(c) {
  // elegir UNA lógica clara
  return c.fecha_registro || c.primera_compra || null;
}


const filtrados = normalizado.filter(c => {
  const f = parseFecha(obtenerFechaCampo(c));
  if (!f) return false;

  if (inicio && fin) {
    return f >= inicio && f <= fin;
  }

  return true;
});

    // --------------------------------------
    //       🧠 MÉTRICAS GEOGRÁFICAS
    // --------------------------------------

    const ciudades = {};
    const paises = {};

    filtrados.forEach(c => {
const ciudad = (c.ciudad || "").trim();
if (!ciudad) return; // ⛔ omitir este registro en ciudades

      const pais = c.pais?.trim() || "Sin Región";
      const total = parseFloat(c.total_gastado || 0);
      const pedidos = parseInt(c.cantidad_pedidos || 0);

      if (!ciudades[ciudad]) {
        ciudades[ciudad] = { ciudad, clientes: 0, total: 0, pedidos: 0 };
      }

      if (!paises[pais]) {
        paises[pais] = { pais, clientes: 0, total: 0, pedidos: 0 };
      }

      ciudades[ciudad].clientes++;
      ciudades[ciudad].total += total;
      ciudades[ciudad].pedidos += pedidos;

      paises[pais].clientes++;
      paises[pais].total += total;
      paises[pais].pedidos += pedidos;
    });

    // TOP
    const topCiudades = Object.values(ciudades).sort((a,b) => b.clientes - a.clientes).slice(0,10);
    const topPaises = Object.values(paises).sort((a,b) => b.clientes - a.clientes).slice(0,10);

    // --- METRICAS PRINCIPALES ---
    const totalCiudades = Object.keys(ciudades).length;
    const totalPaises = Object.keys(paises).length;

    const ciudadTop = topCiudades[0]?.ciudad || "-";
    const paisTop = topPaises[0]?.pais || "-";

    const tickets = Object.values(ciudades)
      .filter(c => c.total > 0 && c.clientes > 0)
      .map(c => c.total / c.clientes);

    const ticketPromedioCiudad = tickets.length 
      ? tickets.reduce((a,b) => a+b,0) / tickets.length
      : 0;

    const pedidosPorCiudad = Object.values(ciudades)
      .map(c => c.pedidos);

    const promedioPedidosCiudad = pedidosPorCiudad.length
      ? (pedidosPorCiudad.reduce((a,b)=>a+b,0) / pedidosPorCiudad.length).toFixed(1)
      : 0;

    // -----------------------------------------------------------
    //   RENDER UI (similar formato a Clientes)
    // -----------------------------------------------------------
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
            <strong style="font-size:1.8rem;">${ciudadTop}</strong>
            <p>Ciudad con más clientes</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:1.8rem;">${paisTop}</strong>
            <p>Región con más clientes</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">$${ticketPromedioCiudad.toFixed(0)}</strong>
            <p>Ticket promedio por ciudad</p>
          </div>

        </div>

        <h4 style="margin-top:1rem;">Top 10 Ciudades</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>Ciudad</th>
              <th>Clientes</th>
              <th>Total gastado</th>
              <th>Pedidos</th>
            </tr>
          </thead>
          <tbody>
            ${topCiudades.map(c => `
              <tr>
                <td>${c.ciudad}</td>
                <td>${c.clientes}</td>
                <td>$${c.total.toLocaleString("es-CL")}</td>
                <td>${c.pedidos}</td>
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
              <th>Pedidos</th>
            </tr>
          </thead>
          <tbody>
            ${topPaises.map(p => `
              <tr>
                <td>${p.pais}</td>
                <td>${p.clientes}</td>
                <td>$${p.total.toLocaleString("es-CL")}</td>
                <td>${p.pedidos}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

      </div>
    `;
inyectarBotonPDF(main);

  } catch (err) {
    console.error("❌ Error cargando geografía:", err);
    document.getElementById("contenidoReportesMain").innerHTML = `
      <div class="ios-card">
        <p class="text-danger">❌ Error cargando geografía: ${err.message}</p>
      </div>`;
  }
}
