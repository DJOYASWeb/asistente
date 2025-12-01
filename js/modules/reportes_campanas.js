function agruparVentasPorPedido(data) {
  const mapa = {};

  data.forEach(v => {
    const id = v.id; // ✔ AHORA sí usamos la propiedad correcta
    if (!id) return;

    if (!mapa[id]) {
      mapa[id] = {
        id,
        fecha: v.fecha,
        total: v.total,
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
    const ventasRaw = Papa.parse(textVen, { header: true, skipEmptyLines: true }).data;

    // ==== Normalizar ventas ====
    const ventas = ventasRaw.map(v => {

      let fecha = null;
      if (v["Fecha y hora"]) {
        // formato: YYYY-MM-DD HH:MM:SS
        fecha = v["Fecha y hora"].split(" ")[0];
      }

      return {
        id: v["ID del pedido"],
        fecha,
        total: parseFloat(v["Total"]) || 0,
        sku: v["SKU"],
        producto: v["Nombre del producto"],
        cantidad: parseInt(v["Cantidad de productos"] || 0),
        categorias: v["Categorías"] || ""
      };
    });

    // ==== Detectar rango padre ====
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

      // si hay un rango global padre (calendario principal)
      if (inicio && fin) {
        // campaña activa si se cruza con el rango padre
        return ff >= inicio && fi <= fin;
      }

      return true;
    });

    // ==== Renderizar lista de campañas activas ====
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
      .map(c => `<li>${c.nombre} (${c.fecha_inicio} → ${c.fecha_fin})</li>`)
      .join("");

    cont.innerHTML = `
      <div class="ios-card" style="grid-column: 1 / -1;">
        <h4>Campañas activas en este período</h4>
        <ul>${items}</ul>
      </div>
    `;

    // ============================================================
    // 🔥 FILTRAR VENTAS POR RANGO PADRE
    // ============================================================
    const ventasFiltradas = ventas.filter(v => {
      if (!v.fecha) return false;
      const f = new Date(v.fecha);
      if (inicio && fin) return f >= inicio && f <= fin;
      return true;
    });

    // ============================================================
    // 🔥 AGRUPAR POR PEDIDO (fundamental para evitar duplicaciones)
    // ============================================================
    const pedidos = agruparVentasPorPedido(ventasFiltradas);

    // ============================================================
    // 🔥 GENERAR GRÁFICO COMPARATIVO
    // ============================================================
    generarGraficoComparacionCampanas(activas, pedidos);

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


function generarGraficoComparacionCampanas(campanas, pedidos) {
  const div = document.querySelector("#graficoComparacionCampanas");
  div.innerHTML = "";

  const mapa = {};

  campanas.forEach(c => {
    mapa[c.nombre] = 0;

    const fi = new Date(c.fecha_inicio);
    const ff = new Date(c.fecha_fin);

    pedidos.forEach(p => {
      const fp = new Date(p.fecha);
      if (fp >= fi && fp <= ff) {
        const cant = p.productos.reduce((s, pr) => s + pr.cantidad, 0);
        mapa[c.nombre] += cant;
      }
    });
  });

  const labels = Object.keys(mapa);
  const valores = labels.map(l => mapa[l]);

  new ApexCharts(div, {
    chart: { type: "bar", height: 350 },
    series: [{
      name: "Productos vendidos",
      data: valores
    }],
    xaxis: { categories: labels },
    plotOptions: { bar: { horizontal: true } },
    tooltip: { y: { formatter: v => formatoCL(v) } }
  }).render();
}
























function generarDatosSemanalCategorias(pedidos) {
  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  // estructura final:
  // {
  //   Aros: { Lun: 10, Mar: 5, ... },
  //   Conjuntos: { Lun: 0, Mar: 9, ... },
  // }
  const mapa = {};

  pedidos.forEach(p => {
    if (!p.fecha) return;

    const fecha = new Date(p.fecha);
    const dia = diasSemana[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1];

    // recorrer productos dentro del pedido
    p.productos.forEach(prod => {
      const categorias = prod.categorias.split(" ").filter(Boolean);
      if (categorias.length === 0) return;

      categorias.forEach(cat => {
        if (!mapa[cat]) {
          mapa[cat] = {
            Lun: 0, Mar: 0, Mié: 0,
            Jue: 0, Vie: 0, Sáb: 0, Dom: 0
          };
        }

        mapa[cat][dia] += prod.cantidad;
      });
    });
  });

  return mapa;
}
