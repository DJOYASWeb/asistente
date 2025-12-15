// =====================================================
// 📄 EXPORTAR TAB ACTUAL A PDF (TEXTO REAL)
// =====================================================

async function exportarTabActualAPDF() {
  const contenedor = document.getElementById("contenidoReportesMain");

  if (!contenedor) {
    alert("No se encontró el contenido a exportar");
    return;
  }

  const { jsPDF } = window.jspdf;

const pdf = new jsPDF({
  orientation: "landscape",
  unit: "pt",
  format: "a4"
});

  await pdf.html(contenedor, {
    x: 40,
    y: 40,
    width: 515,               // ancho útil A4
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

// -----------------------------------------------------
// BOTÓN PDF (INYECTADO DESDE LOS DASHBOARDS)
// -----------------------------------------------------
function inyectarBotonPDF(contenedor) {
  if (!contenedor) return;
  if (contenedor.querySelector(".btn-pdf-global")) return;

  const btn = document.createElement("button");
  btn.className = "btn-ios btn-pdf-global";
  btn.textContent = "📄 Descargar PDF";
  btn.onclick = exportarTabActualAPDF;

  btn.style.marginBottom = "1rem";

  contenedor.prepend(btn);
}
