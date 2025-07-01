// js/modules/planilla.js

let datosOriginales = [];
let datosCombinaciones = [];
let datosReposicion = [];

const categoriasPorMaterial = {
  "Plata": "Joyas de plata por mayor",
  "Enchape": "ENCHAPADO",
  "Accesorios": "ACCESORIOS",
  "Insumos": "Joyas de plata por mayor"
};

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

    datos.forEach(row => {
      const material = (row["Material"] || "").toString().trim();
      const categoria = categoriasPorMaterial[material] || "";
      row["Categoría principal"] = categoria;
    });

    datosCombinaciones = [];
    datosReposicion = [];

    const datosFiltrados = datos.filter(row => {
      const salida = (row["Salida"] || "").toString().trim().toLowerCase();
      const combinacion = (row["Combinaciones"] || "").toString().trim();

      if (salida === "producto reposicion") {
        datosReposicion.push(row);
        return false;
      }

      if (combinacion) {
        const esValida = combinacion.split(",").every(c => /^#\d+-\d+$/.test(c.trim()));
        if (!esValida) {
          mostrarAlerta(`Formato inválido en Combinaciones: "${combinacion}"`, "warning");
        }
        row["Cantidad"] = 0;
        datosCombinaciones.push(row);
        return false;
      }

      return true;
    });

    datosOriginales = datosFiltrados;

    document.getElementById("botonesTipo").classList.remove("d-none");
    mostrarTabla("nuevo");
  };
  reader.readAsArrayBuffer(file);
}

function mostrarTabla(tipo) {
  const tablaDiv = document.getElementById("tablaPreview");
  const exportBtn = document.getElementById("botonExportar");
  let datos = [];

  if (tipo === "nuevo") datos = datosOriginales;
  else if (tipo === "combinacion") datos = datosCombinaciones;
  else if (tipo === "reposicion") datos = datosReposicion;

  if (datos.length === 0) {
    tablaDiv.innerHTML = `<p class='text-muted'>No hay productos en esta categoría.</p>`;
    exportBtn.classList.add("d-none");
    return;
  }

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

  exportBtn.classList.remove("d-none");
  exportBtn.onclick = () => exportarXLSX(tipo, datos);
}

function exportarXLSX(tipo, datos) {
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  const nombre = tipo === "nuevo" ? "productos_nuevos.xlsx" : tipo === "combinacion" ? "combinaciones.xlsx" : "reposicion.xlsx";
  XLSX.writeFile(wb, nombre);
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

document.getElementById("btnNuevo").onclick = () => mostrarTabla("nuevo");
document.getElementById("btnCombinacion").onclick = () => mostrarTabla("combinacion");
document.getElementById("btnReposicion").onclick = () => mostrarTabla("reposicion");
