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

let tipoSeleccionado = "nuevo";

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
    datosOriginales = [];

    datos.forEach(row => {
      const salida = (row["Salida"] || "").toString().trim();
      const combinacion = (row["Combinaciones"] || "").toString().trim();

      const tieneCombinacion = combinacion !== "";

      if (tieneCombinacion) {
        const esValida = combinacion.split(",").every(c => /^#\d+-\d+$/.test(c.trim()));
        if (!esValida) {
          mostrarAlerta(`Formato inválido en Combinaciones: "${combinacion}"`, "warning");
          return; // descarta si no es válido
        }
        row["Cantidad"] = 0;
        datosCombinaciones.push(row);
      } else if (salida === "Reposición") {
        datosReposicion.push(row);
      } else {
        datosOriginales.push(row);
      }
    });

    document.getElementById("botonesTipo").classList.remove("d-none");
    mostrarTabla("nuevo");
  };
  reader.readAsArrayBuffer(file);
}

function construirCaracteristicas(row) {
  const campos = [
    { key: "Modelo", label: "Modelo" },
    { key: "Dimensión", label: "Dimensión" },
    { key: "Peso", label: "Peso" },
    { key: "Material", label: "Material" },
    { key: "Estilo", label: "Estilo" }
  ];

  let caracteristicas = campos
    .map(c => {
      const valor = (row[c.key] || "").toString().trim();
      return valor ? `${c.label}: ${valor}` : null;
    })
    .filter(Boolean);

  const ocasionRaw = (row["Ocasión"] || "").toString().trim();
  if (ocasionRaw) {
    const valores = ocasionRaw.split(",").map(o => o.trim()).filter(o => o);
    valores.forEach(valor => {
      caracteristicas.push(`Ocasión: ${valor}`);
    });
  }

  return caracteristicas.join(", ");
}

function construirCategorias(row) {
  const campos = ["Categoría principal", "CATEG. PRINCIPAL", "SUBCATEGORIA"];
  return campos
    .map(k => (row[k] || "").toString().trim())
    .filter(v => v && v.toLowerCase() !== "sin valor")
    .join(", ");
}

function transformarDatosParaExportar(datos) {
  return datos.map(row => {
    const codigo = row["Código"] || "";
    const idProducto = row["ID Producto"] || "";
    const precioConIVA = parseFloat(row["Precio WEB Con IVA"] || 0);
    const precioSinIVA = isNaN(precioConIVA) ? 0 : (precioConIVA / 1.19).toFixed(2);

    return {
      "ID": idProducto || "",
      "Activo (0/1)": 0,
      "Nombre": row["Nombre Producto"] || "",
      "Categorias": construirCategorias(row),
      "Precio S/IVA": precioSinIVA,
      "Regla de Impuesto": 2,
      "Código Referencia SKU": codigo,
      "Marca": "DJOYAS",
      "Cantidad": row["WEB"] || 0,
      "Resumen": row["Resumen"] || "",
      "Descripción": row["Descripción"] || "",
      "Image URLs (x,y,z...)": codigo ? `https://distribuidoradejoyas.cl/img/prod/${codigo}.jpg` : "",
      "Caracteristicas": construirCaracteristicas(row)
    };
  });
}

function mostrarTabla(tipo) {
  const tablaDiv = document.getElementById("tablaPreview");
  const procesarBtn = document.getElementById("botonProcesar");
  tipoSeleccionado = tipo;
  let datos = [];

  if (tipo === "nuevo") datos = datosOriginales;
  else if (tipo === "combinacion") datos = datosCombinaciones;
  else if (tipo === "reposicion") datos = datosReposicion;

  if (datos.length === 0) {
    tablaDiv.innerHTML = `<p class='text-muted'>No hay productos en esta categoría.</p>`;
    procesarBtn.classList.add("d-none");
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

  procesarBtn.classList.remove("d-none");
}

function exportarXLSX(tipo, datos) {
  const transformados = transformarDatosParaExportar(datos);
  const ws = XLSX.utils.json_to_sheet(transformados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  const nombre = tipo === "nuevo" ? "productos_nuevos.xlsx" : tipo === "combinacion" ? "combinaciones.xlsx" : "reposicion.xlsx";
  XLSX.writeFile(wb, nombre);
}

function mostrarAlerta(mensaje, tipo = "info") {
  const alertasDiv = document.getElementById("alertas");
  alertasDiv.innerHTML = `<div class="alert alert-${tipo}" role="alert">${mensaje}</div>`;
}

function prepararModal() {
  const modalBody = document.getElementById("columnasFinales");
  const datos = tipoSeleccionado === "nuevo" ? datosOriginales : tipoSeleccionado === "combinacion" ? datosCombinaciones : datosReposicion;
  const transformados = transformarDatosParaExportar(datos);

  let html = `<div style="overflow-x:auto"><table class="table table-bordered table-sm align-middle"><thead><tr>`;
  const columnas = Object.keys(transformados[0] || {});
  columnas.forEach(col => {
    html += `<th class="small">${col}</th>`;
  });
  html += `</tr></thead><tbody>`;
  transformados.forEach(fila => {
    html += `<tr style="height: 36px;">`;
    columnas.forEach(col => {
      const contenido = fila[col]?.toString() || "";
      const previsual = contenido.length > 60 ? contenido.substring(0, 60) + "..." : contenido;
      html += `<td class="small text-truncate" title="${contenido}" style="max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${previsual}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;

  modalBody.innerHTML = html;
}

function procesarExportacion() {
  const datos = tipoSeleccionado === "nuevo" ? datosOriginales : tipoSeleccionado === "combinacion" ? datosCombinaciones : datosReposicion;
  exportarXLSX(tipoSeleccionado, datos);
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
document.getElementById("botonProcesar").onclick = prepararModal;
document.getElementById("confirmarExportar").onclick = procesarExportacion;



// Last