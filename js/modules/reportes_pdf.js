// =====================================================
// 📄 EXPORTADOR PDF GLOBAL — TODAS LAS SECCIONES
// =====================================================

const PDF_STYLE = {
  title: "#000000",
  text: "#6E6E73",
  line: "#E5E5EA",
  blue: "#007AFF"
};

// -----------------------------------------------------
// BASE PDF
// -----------------------------------------------------
function crearPDFBase(titulo, subtitulo = "") {
  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4"
  });

  pdf.setFont("helvetica", "normal");

  pdf.setFontSize(30);
  pdf.setTextColor(PDF_STYLE.title);
  pdf.text(titulo, 40, 60);

  if (subtitulo) {
    pdf.setFontSize(14);
    pdf.setTextColor(PDF_STYLE.text);
    pdf.text(subtitulo, 40, 85);
  }

  return pdf;
}

// -----------------------------------------------------
// CAPTURA VISUAL (GRÁFICOS / TABLAS)
// -----------------------------------------------------
async function capturarElemento(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: null
  });

  return canvas.toDataURL("image/png");
}


const PDF_SECCIONES = {

  clientes: {
    titulo: "Reporte de Clientes",
    data: () => window.__DATA_CLIENTES__,

    async render(pdf, data) {
      let y = 130;

      pdf.setFontSize(16);
      pdf.text("Métricas principales", 40, y);
      y += 24;

      pdf.setFontSize(12);
      pdf.text(`• Nuevos clientes: ${data.metricas.clientesNuevos}`, 40, y); y+=18;
      pdf.text(`• Recurrentes: ${data.metricas.recurrentes}`, 40, y); y+=18;
      pdf.text(`• Tasa repetición: ${data.metricas.tasaRepeticion}%`, 40, y); y+=18;
      pdf.text(`• Ticket promedio: $${Number(data.metricas.ticketPromedio).toLocaleString("es-CL")}`, 40, y);

      pdf.addPage();
      pdf.setFontSize(18);
      pdf.text("Top 10 clientes", 40, 60);

      y = 100;
      data.topClientes.forEach((c, i) => {
        pdf.setFontSize(11);
        pdf.text(`${i+1}. ${c.nombre} — $${c.total.toLocaleString("es-CL")}`, 40, y);
        y += 16;
      });
    }
  },

  ventas: {
    titulo: "Reporte de Ventas",
    data: () => window.__DATA_VENTAS__,

    async render(pdf, data) {
      let y = 130;

      pdf.setFontSize(14);
      pdf.text(`Revenue total: $${data.revenueTotal.toLocaleString("es-CL")}`, 40, y);
      y += 20;

      const img = await capturarElemento("#graficoRevenueDia");
      if (img) pdf.addImage(img, "PNG", 40, y, 700, 280);
    }
  },

  geografia: {
    titulo: "Reporte Geográfico",
    data: () => window.__DATA_GEO__,

    async render(pdf, data) {
      let y = 130;

      pdf.setFontSize(14);
      pdf.text(`Ciudades activas: ${data.totalCiudades}`, 40, y); y+=18;
      pdf.text(`Regiones activas: ${data.totalPaises}`, 40, y);

      pdf.addPage();
      pdf.setFontSize(18);
      pdf.text("Top ciudades", 40, 60);

      y = 100;
      data.topCiudades.forEach(c => {
        pdf.setFontSize(11);
        pdf.text(`${c.ciudad} — ${c.clientes} clientes`, 40, y);
        y += 16;
      });
    }
  },

  campanas: {
    titulo: "Reporte de Campañas",
    data: () => window.__DATA_CAMPANAS__,

    async render(pdf, data) {
      const img = await capturarElemento("#graficoComparacionCampanas");
      if (img) pdf.addImage(img, "PNG", 40, 120, 700, 300);
    }
  }

};


async function exportarPDFSeccion() {
  const seccion = localStorage.getItem("tab_activo_reportes");
  const cfg = PDF_SECCIONES[seccion];

  if (!cfg) {
    alert("Esta sección no tiene PDF");
    return;
  }

  const data = cfg.data();
  if (!data) {
    alert("No hay datos para exportar");
    return;
  }

  const pdf = crearPDFBase(
    cfg.titulo,
    "Datos filtrados según rango seleccionado"
  );

  await cfg.render(pdf, data);

  pdf.save(`reporte_${seccion}.pdf`);
}

function inyectarBotonPDF(contenedor) {
  if (!contenedor) return;

  // Evitar duplicados
  if (contenedor.querySelector(".btn-pdf-global")) return;

  const btn = document.createElement("button");
  btn.className = "btn-ios btn-pdf-global";
  btn.innerHTML = "📄 Descargar PDF";
  btn.onclick = exportarPDFSeccion;

  // Estilo inline mínimo (opcional)
  btn.style.marginTop = "1rem";

  contenedor.prepend(btn);
}


async function exportarTabActualAPDF() {
  const contenedor = document.getElementById("contenidoReportesMain");

  if (!contenedor) {
    alert("No se encontró el contenido a exportar");
    return;
  }

  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4"
  });

  await pdf.html(contenedor, {
    x: 40,
    y: 40,
    width: 515, // ancho útil A4
    windowWidth: contenedor.scrollWidth,
    autoPaging: "text",
    html2canvas: {
      scale: 1,
      useCORS: true
    }
  });

  const seccion = localStorage.getItem("tab_activo_reportes") || "reporte";
  pdf.save(`reporte_${seccion}.pdf`);
}


