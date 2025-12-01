function agruparVentasPorPedido(data) {
  const mapa = {};

  data.forEach(v => {
    const id = v["ID del pedido"];
    if (!id) return;

    if (!mapa[id]) {
      mapa[id] = {
        total: parseFloat(v["Total"] || 0),
        fecha: v.fecha,
        productos: []
      };
    }

    mapa[id].productos.push({
      sku: v.sku,
      producto: v.producto,
      cantidad: v.cantidad,
      categorias: v.categorias
    });
  });

  return Object.values(mapa);
}


// ===============================================================
// 📌 DASHBOARD DE CAMPAÑAS — versión completa y funcional
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

    // Restaurar selección
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
    const url = localStorage.getItem("csv_campanas");
    const urlVentas = localStorage.getItem("csv_ventas");

    if (!url || !urlVentas) {
      document.getElementById("bloqueCampanasActivas").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ Faltan enlaces CSV para cargar campañas o ventas.</p>
        </div>`;
      return;
    }

    // ==== Cargar campañas ====
    const respCamp = await fetch(url);
    const textCamp = await respCamp.text();
    const campanas = Papa.parse(textCamp, { header: true, skipEmptyLines: true }).data;

    // ==== Cargar ventas ====
    const respVen = await fetch(urlVentas);
    const textVen = await respVen.text();
    const ventas = Papa.parse(textVen, { header: true, skipEmptyLines: true }).data;

    // Detectar rango padre
    const inicio = rangoPrincipal?.[0];
    const fin = rangoPrincipal?.[1];

    // ==== Filtrar campañas activas ====
    function parseFecha(str) {
      if (!str) return null;
      const [y, m, d] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    }

    const activas = campanas.filter(c => {
      const fi = parseFecha(c.fecha_inicio);
      const ff = parseFecha(c.fecha_fin);
      if (!fi || !ff) return false;

      // Si hay selección global → filtrar
      if (inicio && fin) {
        return ff >= inicio && fi <= fin;
      }

      return true;
    });

    // ==== Renderizar lista de campañas ====
    const cont = document.getElementById("bloqueCampanasActivas");

    if (activas.length === 0) {
      cont.innerHTML = `
        <div class="ios-card" style="grid-column: 1 / -1;">
          <h4>Campañas activas en este período</h4>
          <p class="muted">No hay campañas en el rango seleccionado.</p>
        </div>`;
      return;
    }

    const items = activas
      .map(c => {
        return `<li>${c.nombre} (${c.fecha_inicio} → ${c.fecha_fin})</li>`;
      })
      .join("");

    cont.innerHTML = `
      <div class="ios-card" style="grid-column: 1 / -1;">
        <h4>Campañas activas en este período</h4>
        <ul>${items}</ul>
      </div>
    `;

  } catch (err) {
    console.error("❌ Error campañas:", err);
    document.getElementById("bloqueCampanasActivas").innerHTML = `
      <div class="ios-card">
        <p class="text-danger">Error cargando campañas: ${err.message}</p>
      </div>`;
  }
}


window.cargarDashboardCampanas = cargarDashboardCampanas;



// ===============================================================
// 📌 3. GRÁFICOS (ApexCharts)
// ===============================================================

function formatoCL(valor) {
  return Number(valor).toLocaleString("es-CL");
}



