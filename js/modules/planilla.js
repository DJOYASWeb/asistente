// js/modules/planilla.js

let datosOriginales = [];
let datosCombinaciones = [];

// Reglas de categorización según Material
const categoriasPorMaterial = {
  "Plata": "Joyas de plata por mayor",
  "Enchape": "ENCHAPADO",
  "Accesorios": "ACCESORIOS",
  "Insumos": "Joyas de plata por mayor"
};

// Función para leer archivo Excel desde fila 3
function leerExcelDesdeFila3(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const opciones = { header: 1 };
    const todasLasFilas = XLSX.utils.sheet_to_json(worksheet, opciones);

    if (todasLasFilas.length < 3) {
      mostrarAlerta("El archivo no tiene suficientes filas.", "danger");
      return;
    }

    const headers = todasLasFilas[2];
    const filas = todasLasFilas.slice(3);
    const datos = filas.map(fila => {
      const obj = {};
      headers.forEach((col, i) => {
        obj[col?.toString().trim() || `Columna${i}`] = fila[i] ?? "";
      });
      return obj;
    });

    // Autocompletar columna "Categoría principal"
    datos.forEach(row => {
      const material = (row["Material"] || "").toString().trim();
      const categoria = categoriasPorMaterial[material] || "";
      row["Categoría principal"] = categoria;
    });

    datosOriginales = datos;
    renderizarTabla(datos);
  };
  reader.readAsArrayBuffer(file);
}

// Mostrar tabla en el div tablaPreview
function renderizarTabla(datos) {
  const tablaDiv = document.getElementById("tablaPreview");
  if (datos.length === 0) return (tablaDiv.innerHTML = "<p>No hay datos.</p>");

  const columnas = Object.keys(datos[0]);
  let html = `<table class="table table-bordered table-sm align-middle"><thead><tr>`;
  columnas.forEach(col => {
    html += `<th class="small">${col}</th>`;
  });
  html += `</tr></thead><tbody>`;
  datos.forEach(fila => {
    html += `<tr style="height: 36px;">`;
    columnas.forEach(col => {
      const contenido = fila[col]?.toString() || "";
      const previsual = contenido.length > 60 ? contenido.substring(0, 60) + "..." : contenido;
      html += `<td class="small text-truncate" title="${contenido}" style="max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${previsual}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  tablaDiv.innerHTML = html;
}

function mostrarAlerta(mensaje, tipo = "info") {
  const alertasDiv = document.getElementById("alertas");
  alertasDiv.innerHTML = `<div class="alert alert-${tipo}" role="alert">${mensaje}</div>`;
}

// Eventos
const inputArchivo = document.getElementById("excelFile");
inputArchivo.addEventListener("change", (e) => {
  const archivo = e.target.files[0];
  if (archivo) leerExcelDesdeFila3(archivo);
});
