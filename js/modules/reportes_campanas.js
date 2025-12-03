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










document.getElementById("btnExportarGrafico").onclick = () => {
  exportarProductosQueElGraficoCuenta(pedidos);
};



document.getElementById("btnReporteMarketing").onclick = () => {
  generarReporteMarketingPDF(pedidos, activas, semanas);
};














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
window.pedidos = agruparVentasPorPedido(ventasFiltradas);

    // Activar botón exportador
const btn = document.getElementById("btnExportarAros");
if (btn) {
  btn.onclick = () => exportarArosDePlataXLSX(pedidos);
}

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

// GRÁFICO 1
generarGraficoComparacionCampanas(activas, pedidos);
const semanas = generarColumnasPorCampaña(activas);



function generarColumnasPorCampaña(campanasActivas) {

  function parseFecha(str) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  return campanasActivas
    .map(c => ({
      nombre: c.nombre,
      inicio: parseFecha(c.fecha_inicio),
      fin: parseFecha(c.fecha_fin),
      inicioTxt: c.fecha_inicio,
      finTxt: c.fecha_fin
    }))
    .sort((a, b) => a.inicio - b.inicio);
}






// ==========================
// 9.2) Tabla rendimiento semanal
// ==========================
generarTablaRendimientoSemanal(pedidos, activas, semanas);

// ==========================
// 9.3) Gráfico subcategorías campañas
// ==========================
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

  function normalizarExacto(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const totalPorCampana = {};

  campanas.forEach(c => {
    totalPorCampana[c.nombre] = 0;
  });

  pedidos.forEach(p => {
    p.productos.forEach(prod => {

      const categorias = (prod.subcategoria || "")
        .split(",")
        .map(s => normalizarExacto(s.trim()))
        .filter(s => s.length > 0);

      campanas.forEach(c => {
        const sub = normalizarExacto(c.subcategoria || "");

        // Solo coincide si la subcategoría de campaña está en el producto
        if (categorias.includes(sub)) {
          totalPorCampana[c.nombre] += prod.cantidad;
        }
      });

    });
  });

  const labels = Object.keys(totalPorCampana);
  const valores = labels.map(l => totalPorCampana[l]);

  const div = document.querySelector("#graficoComparacionCampanas");
  div.innerHTML = "";

  new ApexCharts(div, {
    chart: { type: "bar", height: 350 },
    series: [{
      name: "Productos vendidos (según filtro de fecha)",
      data: valores
    }],
    xaxis: { categories: labels },
    plotOptions: { bar: { horizontal: true } },
    tooltip: { y: { formatter: v => formatoCL(v) } }
  }).render();
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


function normalizarExacto(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function coincideCategoria(camp, venta) {
  const c = normalizarExacto(camp);
  const v = normalizarExacto(venta);
  return c === v; // coincidencia exacta
}



function obtenerSubcategoriasProducto(prod) {
  if (!prod.subcategoria) return [];

  return prod.subcategoria
    .split(",")       // ⭐ COMA EN VEZ DE ESPACIO
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

function generarRendimientoSemanal(pedidos, campanas, semanas) {

  // Normalizador de texto para coincidencia exacta
  function normalizar(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g," ")
      .trim();
  }

  const salida = {};

  // Inicializar por campaña
  campanas.forEach(c => {
    salida[c.nombre] = semanas.map(() => 0);
  });

  // Procesar ventas
  pedidos.forEach(p => {
    const fecha = new Date(p.fecha);

    p.productos.forEach(prod => {

      const categoriasProd = (prod.subcategoria || "")
        .split(",")
        .map(s => normalizar(s.trim()));

      campanas.forEach((camp, campIndex) => {

        const catCamp = normalizar(camp.subcategoria);

        // Solo contar si pertenece a la campaña
if (!categoriasProd.includes(catCamp)) return;
        // Buscar semana
        const idxSemana = semanas.findIndex(s =>
          fecha >= s.inicio && fecha <= s.fin
        );
        if (idxSemana === -1) return;

        // Registrar cantidad
        salida[camp.nombre][idxSemana] += prod.cantidad;

      });

    });
  });

  return salida;
}


function generarTablaRendimientoSemanal(pedidos, campanas, semanas) {

  const data = generarRendimientoSemanal(pedidos, campanas, semanas);

  const totalesSemana = semanas.map(sem => {
    let total = 0;
    pedidos.forEach(p => {
      const f = new Date(p.fecha);
      if (f >= sem.inicio && f <= sem.fin) {
        p.productos.forEach(prod => total += prod.cantidad);
      }
    });
    return total;
  });

  let html = `
    <table class="tabla-ios">
      <thead>
        <tr>
          <th>Campaña</th>
          ${semanas.map(s => `<th>${s.inicioTxt} → ${s.finTxt}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  campanas.forEach(c => {

    html += `<tr><td><strong>${c.nombre}</strong></td>`;

    data[c.nombre].forEach((cantidad, i) => {

      const fi = new Date(c.fecha_inicio);
      const ff = new Date(c.fecha_fin);

      const totalSemana = totalesSemana[i];
      const pct = totalSemana > 0 ? (cantidad / totalSemana) * 100 : 0;

      const esSemanaActiva =
        !(semanas[i].fin < fi || semanas[i].inicio > ff);

      html += `
        <td style="font-weight:${esSemanaActiva ? 'bold' : 'normal'}">
          ${cantidad} (${pct.toFixed(1)}%)
        </td>`;
    });

    html += `</tr>`;
  });

  html += "</tbody></table>";

  document.getElementById("tablaRendimientoSemanal").innerHTML = html;
}




// ===============================================
// 📤 EXPORTADOR XLSX — SOLO "Aros de Plata"
// ===============================================
function exportarArosDePlataXLSX(pedidos) {

  function normalizarExacto(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const objetivo = normalizarExacto("Aros de Plata");
  const lista = [];

  pedidos.forEach(p => {
    p.productos.forEach(prod => {
      const subs = (prod.subcategoria || "")
        .split(",")
        .map(s => normalizarExacto(s.trim()))
        .filter(s => s.length > 0);

      if (subs.includes(objetivo)) {
        lista.push({
          ID_Pedido: p.id,
          Fecha: p.fecha,
          SKU: prod.sku,
          Producto: prod.producto,
          Subcategoria: prod.subcategoria,
          Cantidad: prod.cantidad
        });
      }
    });
  });

  // Generar XLSX — requiere SheetJS
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(lista);
  XLSX.utils.book_append_sheet(wb, ws, "Aros de Plata");

  XLSX.writeFile(wb, "aros_de_plata.xlsx");

  alert("Archivo generado: aros_de_plata.xlsx");
}


function obtenerProductosQueGraficoCuentaComoAros(pedidos) {
  const normalizar = str => (str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const objetivo = normalizar("Aros de Plata");
  const lista = [];

  pedidos.forEach(p => {
    p.productos.forEach(prod => {
      const subs = (prod.subcategoria || "")
        .split(",")
        .map(s => normalizar(s.trim()))
        .filter(s => s !== "");

      if (subs.includes(objetivo)) {
        lista.push({
          ID_Pedido: p.id,
          Fecha: p.fecha,
          SKU: prod.sku,
          Producto: prod.producto,
          Subcategoria: prod.subcategoria,
          Cantidad: prod.cantidad
        });
      }
    });
  });

  return lista;
}

function exportarProductosQueElGraficoCuenta(pedidos) {
  const lista = obtenerProductosQueGraficoCuentaComoAros(pedidos);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(lista);
  XLSX.utils.book_append_sheet(wb, ws, "Aros que cuenta el gráfico");

  XLSX.writeFile(wb, "aros_grafico.xlsx");
}














// ============================================================
// FUNCIÓN AUXILIAR PARA CAPTURAR GRÁFICOS COMO IMAGEN
// ============================================================
async function capturarGraficoAImagen(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;

  return await html2canvas(el, {
    backgroundColor: null,
    scale: 2
  }).then(canvas => canvas.toDataURL("image/png"));
}



// ============================================================
// GENERADOR PDF — ESTILO APPLE — PÁGINAS 1 A 4
// ============================================================
async function generarReporteMarketingPDF(pedidos, campanas, semanas) {

  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4"
  });

  // PALETA APPLE
  const COLOR_TITLE = "#000000";
  const COLOR_TEXT = "#6E6E73";
  const COLOR_GRAY_BG = "#F2F2F7";
  const COLOR_LINE = "#E5E5EA";
  const COLOR_BLUE = "#007AFF";

  pdf.setFont("helvetica", "normal");

  // =================================================================
  // PÁGINA 1 — PORTADA
  // =================================================================
  pdf.setFontSize(34);
  pdf.setTextColor(COLOR_TITLE);
  pdf.text("Reporte Mensual de Marketing", 40, 100);

  pdf.setFontSize(20);
  pdf.setTextColor(COLOR_TEXT);
  pdf.text("Análisis completo del desempeño mensual", 40, 140);

  pdf.setDrawColor(COLOR_LINE);
  pdf.setLineWidth(1);
  pdf.line(40, 160, 800, 160);

  // Caja gris de resumen
  pdf.setFillColor(COLOR_GRAY_BG);
  pdf.roundedRect(40, 180, 750, 160, 14, 14, "F");

  pdf.setFontSize(14);
  pdf.setTextColor(COLOR_TEXT);
  pdf.text("Resumen del mes", 60, 210);

  pdf.setFontSize(11);
  pdf.text(
    `Generado automáticamente: ${new Date().toLocaleDateString("es-CL")}`,
    60,
    240
  );



  // =================================================================
  // PÁGINA 2 — KPIs PRINCIPALES
  // =================================================================
  pdf.addPage();

  pdf.setFontSize(28);
  pdf.setTextColor(COLOR_TITLE);
  pdf.text("1. KPIs principales", 40, 80);

// =======================
// DATOS DESDE VENTAS
// =======================
const idsUnicos = new Set();
let totalVentas = 0;
let totalProductos = 0;

ventasRaw.forEach(v => {
  if (v["ID del pedido"]) idsUnicos.add(v["ID del pedido"]);
  totalVentas += parseFloat(v["Total"] || 0);
  totalProductos += parseInt(v["Cantidad de productos"] || 0);
});

const cantidadPedidos = idsUnicos.size;

const ticketPromedio = cantidadPedidos > 0
  ? totalVentas / cantidadPedidos
  : 0;

const ticketUnitario = totalProductos > 0
  ? totalVentas / totalProductos
  : 0;


// =======================
// DATOS DESDE CLIENTES
// =======================
let clientesNuevos = 0;
let clientesRecurrentes = 0;

clientesRaw.forEach(c => {

  // ⚠️ Aquí debes decirme cómo se llama esta columna:
  const esNuevo = c["Es nuevo"] || c["Cliente nuevo"] || c["First order"];

  if (esNuevo === "Si" || esNuevo === "sí" || esNuevo === "Yes" || esNuevo === "true") {
    clientesNuevos++;
  } else {
    clientesRecurrentes++;
  }
});

const KPIS = [
  { titulo: "Ventas totales", valor: "$" + totalVentas.toLocaleString("es-CL") },
  { titulo: "Pedidos realizados", valor: cantidadPedidos.toLocaleString("es-CL") },
  { titulo: "Productos vendidos", valor: totalProductos.toLocaleString("es-CL") },
  { titulo: "Ticket promedio", valor: "$" + ticketPromedio.toLocaleString("es-CL") },
  { titulo: "Clientes nuevos", valor: clientesNuevos.toString() },
  { titulo: "Clientes recurrentes", valor: clientesRecurrentes.toString() }
];


  let x = 40;
  let y = 130;

  KPIS.forEach((k, i) => {

    // Bloque gris Apple
    pdf.setFillColor(COLOR_GRAY_BG);
    pdf.roundedRect(x, y, 230, 120, 16, 16, "F");

    // Título KPI
    pdf.setFontSize(12);
    pdf.setTextColor(COLOR_TEXT);
    pdf.text(k.titulo, x + 20, y + 30);

    // Valor KPI
    pdf.setFontSize(26);
    pdf.setTextColor(COLOR_TITLE);
    pdf.text(k.valor, x + 20, y + 80);

    // Posición siguiente
    x += 250;
    if ((i + 1) % 3 === 0) {
      x = 40;
      y += 150;
    }
  });



  // =================================================================
  // PÁGINA 3 — GRÁFICO DE VENTAS DIARIAS
  // =================================================================
  pdf.addPage();

  pdf.setFontSize(28);
  pdf.setTextColor(COLOR_TITLE);
  pdf.text("2. Ventas diarias", 40, 80);

  const imgVentas = await capturarGraficoAImagen("#graficoVentasDiarias");

  if (imgVentas) {
    pdf.addImage(imgVentas, "PNG", 40, 120, 750, 300);
  } else {
    pdf.setFontSize(14);
    pdf.setTextColor("#ff0000");
    pdf.text("No se encontró el gráfico #graficoVentasDiarias", 40, 140);
  }



  // =================================================================
  // PÁGINA 4 — GRÁFICO DE PEDIDOS DIARIOS
  // =================================================================
  pdf.addPage();

  pdf.setFontSize(28);
  pdf.setTextColor(COLOR_TITLE);
  pdf.text("3. Pedidos diarios", 40, 80);

  const imgPedidos = await capturarGraficoAImagen("#graficoPedidosDiarios");

  if (imgPedidos) {
    pdf.addImage(imgPedidos, "PNG", 40, 120, 750, 300);
  } else {
    pdf.setFontSize(14);
    pdf.setTextColor("#ff0000");
    pdf.text("No se encontró el gráfico #graficoPedidosDiarios", 40, 140);
  }



  // =================================================================
  // EXPORTAR PDF
  // =================================================================
  pdf.save("reporte_marketing.pdf");
}
