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

  // 2️⃣ Contenedor temporal invisible
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.appendChild(clon);
  document.body.appendChild(wrapper);

  // 3️⃣ Crear PDF horizontal
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4"
  });

  // 4️⃣ Generar PDF desde el clon
  await pdf.html(clon, {
    x: 40,
    y: 40,
    width: 500,
    windowWidth: clon.scrollWidth,
    autoPaging: "text"
  });

  // 5️⃣ Limpiar DOM
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


function ajustarTablasParaPDF(contenedor) {
  const tablas = contenedor.querySelectorAll("table");

  tablas.forEach(tabla => {
    tabla.style.fontSize = "18px";
    tabla.style.lineHeight = "1.3";

    tabla.querySelectorAll("th").forEach(th => {
      th.style.fontSize = "22px";
      th.style.fontWeight = "600";
      th.style.padding = "4px 6px";
    });

    tabla.querySelectorAll("td").forEach(td => {
      td.style.fontSize = "22px";
      td.style.padding = "4px 6px";
    });
  });
}