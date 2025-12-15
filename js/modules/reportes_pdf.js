// =====================================================
// 📄 EXPORTAR TAB ACTUAL A PDF (TEXTO REAL)
// =====================================================

async function exportarTabActualAPDF() {
  const original = document.getElementById("contenidoReportesMain");
  if (!original) {
    alert("No se encontró el contenido a exportar");
    return;
  }

  // 1️⃣ Clonar contenido
  const clon = original.cloneNode(true);
  clon.classList.add("pdf-export");

  // 2️⃣ 🔥 AJUSTAR TABLAS (AQUÍ)
  ajustarTablasParaPDF(clon);

  // 3️⃣ Contenedor temporal
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.appendChild(clon);
  document.body.appendChild(wrapper);

  // 4️⃣ PDF horizontal
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4"
  });

  await pdf.html(clon, {
    x: 40,
    y: 40,
    width: 760,
    windowWidth: clon.scrollWidth,
    autoPaging: "text"
  });

  document.body.removeChild(wrapper);

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


function prepararTablasParaPDF(clon) {
  clon.querySelectorAll("table").forEach(tabla => {
    tabla.style.lineHeight = "1.1";
    tabla.style.transform = "scale(0.9)";
    tabla.style.transformOrigin = "top left";
    tabla.style.width = "111%";

    tabla.querySelectorAll("th, td").forEach(c => {
      c.style.padding = "3px 5px";
    });
  });
}
