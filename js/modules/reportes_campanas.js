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
  subcategoria: v.subcategoria
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

    // ==========================
    // 1) Cargar campañas
    // ==========================
    const respCamp = await fetch(url);
    const textCamp = await respCamp.text();
    const campanas = Papa.parse(textCamp, { header: true, skipEmptyLines: true }).data;

    // ==========================
    // 2) Cargar ventas
    // ==========================
    const respVen = await fetch(urlVentas);
    const textVen = await respVen.text();
    const ventasRaw = Papa.parse(textVen, { header: true, skipEmptyLines: true }).data;

    // ==========================
    // 3) Normalizar ventas
    // ==========================
    const ventas = ventasRaw.map(v => {
      let fecha = null;
      if (v["Fecha y hora"]) fecha = v["Fecha y hora"].split(" ")[0];

      return {
        id: v["ID del pedido"],
        fecha,
        total: parseFloat(v["Total"]) || 0,
        sku: v["SKU"],
        producto: v["Nombre del producto"],
        cantidad: parseInt(v["Cantidad de productos"] || 0),
        subcategoria: v["Categorías"] || v["subcategoria"] || v["Subcategoria"] || ""

      };
    });

    // ==========================
    // 4) Determinar rango padre
    // ==========================
    const inicio = rangoPrincipal?.[0];
    const fin = rangoPrincipal?.[1];

    // ==========================
    // 5) Filtrar ventas por rango padre
    // ==========================
    const ventasFiltradas = ventas.filter(v => {
      if (!v.fecha) return false;
      const f = new Date(v.fecha);
      if (inicio && fin) return f >= inicio && f <= fin;
      return true;
    });

    // ==========================
    // 6) AGRUPAR PEDIDOS (ANTES DE FILTRAR CAMPAÑAS)
    // ==========================
    const pedidos = agruparVentasPorPedido(ventasFiltradas);

    // ==========================
    // 7) FILTRAR CAMPAÑAS ACTIVAS USANDO PEDIDOS
    // ==========================
    function parseFecha(str) {
      if (!str) return null;
      const [y, m, d] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    }

    const activas = campanas.filter(c => {
      const fi = parseFecha(c.fecha_inicio);
      const ff = parseFecha(c.fecha_fin);
      if (!fi || !ff) return false;

      // 1) Debe cruzar con rango padre
      const cruzaRango = inicio && fin ? ff >= inicio && fi <= fin : true;
      if (!cruzaRango) return false;

      // 2) Debe tener subcategoria válida
      const sub = (c.subcategoria || "").trim();
      if (!sub) return false;

      // 3) Debe tener ventas asociadas
      const tieneVentas = pedidos.some(p => {
        const fp = new Date(p.fecha);
        if (fp < fi || fp > ff) return false;

return p.productos.some(prod => {
  if (!prod.subcategoria) return false;

  // Normalizar
  const venta = prod.subcategoria
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const campania = sub
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Stopwords innecesarias
  const stopwords = new Set([
    "de", "del", "la", "el", "los", "las",
    "por", "para", "mayor", "en", "y",
    "joyas", "joya"
  ]);

  // Tokenizar
  const tVenta = venta.split(" ").filter(t => t && !stopwords.has(t));
  const tCamp = campania.split(" ").filter(t => t && !stopwords.has(t));

  // Intersección (cualquier palabra coincide)
  return tCamp.some(t => tVenta.includes(t));
});



      });

      return tieneVentas;
    });

    // ==========================
    // 8) Renderizar lista de campañas activas
    // ==========================
    const cont = document.getElementById("bloqueCampanasActivas");

    if (activas.length === 0) {
      cont.innerHTML = `
        <div class="ios-card" style="grid-column: 1 / -1;">
          <h4>Campañas activas en este período</h4>
          <p class="muted">No hay campañas activas con ventas.</p>
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

    // ==========================
    // 9) GENERAR TABLA Y GRÁFICOS
    // ==========================
    generarGraficoComparacionCampanas(activas, pedidos);
    generarTablaRendimientoSemanal(pedidos, activas);

    const categoriasCampanas = obtenerCategoriasCampanas(activas);
    generarGraficoSemanalCategoriasCampanas(pedidos, categoriasCampanas);

  } catch (err) {
    console.error("❌ Error campañas:", err);
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


function generarTablaRendimientoSemanal(pedidos, campanas) {
  const div = document.querySelector("#tablaRendimientoSemanal");
  div.innerHTML = "";

  if (!pedidos.length) {
    div.innerHTML = "<p class='muted'>No hay ventas en este período.</p>";
    return;
  }

  // --------------------------------------------
  // 1️⃣ AGRUPAR LOS PEDIDOS POR SEMANA
  // --------------------------------------------
  const semanas = {};

  pedidos.forEach(p => {
    const fecha = new Date(p.fecha);
    const semana = getSemanaDelAnio(fecha);

    if (!semanas[semana]) semanas[semana] = { pedidos: [], fechas: [] };
    semanas[semana].pedidos.push(p);
    semanas[semana].fechas.push(p.fecha);
  });

  // --------------------------------------------
  // 2️⃣ ARMAR RANGO DE FECHAS POR SEMANA (COLUMNA)
  // --------------------------------------------
  const columnas = [];

  Object.keys(semanas).forEach(sem => {
    const fechas = semanas[sem].fechas
      .map(f => new Date(f))
      .sort((a, b) => a - b);

    const ini = fechas[0];
    const fin = fechas[fechas.length - 1];

    const format = d =>
      `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${d.getFullYear()}`;

    columnas.push({
      semana: sem,
      titulo: `${format(ini)} / ${format(fin)}`,
      pedidos: semanas[sem].pedidos
    });
  });

  // --------------------------------------------
  // 3️⃣ ARMAR TABLA
  // --------------------------------------------

  let html = `
    <table class="tabla-ios">
      <thead>
        <tr>
          <th>Campaña</th>
  `;

  columnas.forEach(col => {
    html += `<th>${col.titulo}</th>`;
  });

  html += `</tr></thead><tbody>`;

  // --------------------------------------------
  // 4️⃣ FILAS POR CAMPAÑA
  // --------------------------------------------
  campanas.forEach(c => {
    html += `<tr><td><strong>${c.nombre}</strong></td>`;

    columnas.forEach(col => {
      let totalSemana = 0;
      let totalCampana = 0;

      col.pedidos.forEach(p => {
        const fechaPedido = new Date(p.fecha);
        const fi = new Date(c.fecha_inicio);
        const ff = new Date(c.fecha_fin);

        // Total semana
        totalSemana += p.productos.reduce((a, b) => a + b.cantidad, 0);

        // Solo sumamos productos si pertenecen a la campaña
        if (fechaPedido >= fi && fechaPedido <= ff) {
          p.productos.forEach(prod => {
            if (prod.subcategoria?.toLowerCase() === c.subcategoria?.toLowerCase()) {
              totalCampana += prod.cantidad;
            }
          });
        }
      });

      if (totalSemana === 0) {
        html += `<td>-</td>`;
      } else {
        const pct = ((totalCampana / totalSemana) * 100).toFixed(1);
        html += `<td>${pct}% (${totalCampana})</td>`;
      }
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;

  div.innerHTML = html;
}

function getSemanaDelAnio(fecha) {
  const f = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const diaSemana = f.getUTCDay() || 7;
  f.setUTCDate(f.getUTCDate() + 4 - diaSemana);
  const inicioAno = new Date(Date.UTC(f.getUTCFullYear(), 0, 1));
  return Math.ceil(((f - inicioAno) / 86400000 + 1) / 7);
}


















function generarGraficoSemanalCategorias(pedidos) {
  limpiarDiv("#graficoSemanalCategorias");

  const mapa = generarDatosSemanalCategorias(pedidos);

  const categorias = Object.keys(mapa);  
  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const series = categorias.map(cat => ({
    name: cat,
    data: dias.map(d => mapa[cat][d])
  }));

  new ApexCharts(document.querySelector("#graficoSemanalCategorias"), {
    chart: {
      type: "bar",
      stacked: true,
      height: 350
    },
    series,
    xaxis: {
      categories: dias
    },
    yaxis: {
      labels: {
        formatter: v => formatoCL(v)
      }
    },
    tooltip: {
      y: {
        formatter: v => formatoCL(v)
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 3
      }
    }
  }).render();
}



function generarDatosSemanalCategorias(pedidos) {
  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const mapa = {};

  pedidos.forEach(p => {
    if (!p.fecha) return;

    const fecha = new Date(p.fecha);
    const dia = diasSemana[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1];

    p.productos.forEach(prod => {
      if (!prod.subcategoria) return;

      // ✔ CATEGORÍAS CORRECTAS: separadas por coma
      const categorias = prod.subcategoria
        .split(",")
        .map(c => c.trim())
        .filter(c => c.length > 0);

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



function obtenerCategoriasCampanas(campanas) {
  const set = new Set();

  campanas.forEach(c => {
    if (c.subcategoria) set.add(c.subcategoria.trim());

    if (c.etiquetas) {
      c.etiquetas.split(" ").forEach(e => {
        if (e.trim()) set.add(e.trim());
      });
    }
  });

  return Array.from(set);
}

function generarDatosSemanalCategoriasCampanas(pedidos, categoriasPermitidas) {
  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const mapa = {};

  pedidos.forEach(p => {
    if (!p.fecha) return;

    const fecha = new Date(p.fecha);
    const dia = diasSemana[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1];

    p.productos.forEach(prod => {
      if (!prod.subcategoria) return;

      const categorias = prod.subcategoria
        .split(",")
        .map(c => c.trim())
        .filter(c => c.length > 0);

      categorias.forEach(cat => {
        const coincide = categoriasPermitidas.some(key =>
          key.toLowerCase() === cat.toLowerCase()
        );

        if (!coincide) return;

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


function generarGraficoSemanalCategoriasCampanas(pedidos, categoriasCampanas) {
  const div = document.querySelector("#graficoSemanalCategorias");
  if (!div) return;
  div.innerHTML = "";

  const mapa = generarDatosSemanalCategoriasCampanas(pedidos, categoriasCampanas);
  const categorias = Object.keys(mapa);

  if (categorias.length === 0) {
    div.innerHTML = "<p class='muted'>No hay ventas asociadas a campañas en este período.</p>";
    return;
  }

  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const series = categorias.map(cat => ({
    name: cat,
    data: dias.map(d => mapa[cat][d])
  }));

  new ApexCharts(div, {
    chart: { type: "bar", stacked: true, height: 380 },
    series,
    xaxis: { categories: dias },
    tooltip: { y: { formatter: v => formatoCL(v) }},
    plotOptions: { bar: { horizontal: false, borderRadius: 3 }},
    yaxis: { labels: { formatter: v => formatoCL(v) }}
  }).render();
}

function normalizarTexto(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^a-z0-9\s]/g, " ") // quitar símbolos
    .replace(/\s+/g, " ") // espacios dobles
    .trim();
}

const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "por", "para", "mayor",
  "joyas", "joya", "plata925", "925", "en", "y", "por"
]);

function tokensCategoria(str) {
  const limpio = normalizarTexto(str);
  return limpio
    .split(" ")
    .filter(tok => tok && !STOPWORDS.has(tok));
}

function coincideCategoria(campania, venta) {
  const tokCamp = tokensCategoria(campania);
  const tokVenta = tokensCategoria(venta);

  // Intersección
  return tokCamp.some(tok => tokVenta.includes(tok));
}

function obtenerSubcategoriasProducto(prod) {
  if (!prod.subcategoria) return [];

  return prod.subcategoria
    .split(",")       // ⭐ COMA EN VEZ DE ESPACIO
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

function generarRendimientoSemanal(pedidos, campanas, semanas) {
  const salida = {};

  campanas.forEach(c => {
    const nombre = c.nombre.trim();
    salida[nombre] = semanas.map(() => ({ cantidad: 0 }));
  });

  pedidos.forEach(p => {
    if (!p.fecha) return;

    const fecha = new Date(p.fecha);
    const semanaIndex = semanas.findIndex(
      s => fecha >= s.inicio && fecha <= s.fin
    );
    if (semanaIndex === -1) return;

    p.productos.forEach(prod => {
      const categorias = obtenerSubcategoriasProducto(prod);

      categorias.forEach(cat => {
        campanas.forEach(camp => {
          if (coincideCategoriaCampania(camp.subcategoria, cat) ||
              coincideCategoriaCampania(camp.etiquetas, cat) ||
              coincideCategoriaCampania(camp.nombre, cat)) 
          {
            salida[camp.nombre][semanaIndex].cantidad += prod.cantidad;
          }
        });
      });
    });

  });

  return salida;
}

function generarTablaRendimientoSemanal(pedidos, campanas, semanas) {
  const data = generarRendimientoSemanal(pedidos, campanas, semanas);

  let html = `
    <table class="tabla-ios">
      <thead>
        <tr>
          <th>Campaña</th>
          ${semanas.map(s => 
            `<th>${s.inicioTxt} / ${s.finTxt}</th>`
          ).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  Object.keys(data).forEach(nombre => {
    html += `<tr><td><strong>${nombre}</strong></td>`;

    data[nombre].forEach(item => {
      html += `<td>${item.cantidad}</td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;

  document.getElementById("tablaRendimientoSemanal").innerHTML = html;
}
