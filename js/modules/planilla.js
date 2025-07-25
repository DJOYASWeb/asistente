// js/modules/planilla.js

let datosOriginales = [];
let datosCombinaciones = [];
let datosReposicion = [];
let datosFiltrados = [];
let datosCombinacionCantidades = [];

const categoriasPorMaterial = {
  "Plata": "Joyas de plata por mayor",
  "Enchape": "ENCHAPADO",
  "Accesorios": "ACCESORIOS",
  "Insumos": "Joyas de plata por mayor"
};

let tipoSeleccionado = "nuevo";

document.addEventListener("DOMContentLoaded", function () {
  const botonProcesar = document.getElementById("botonProcesar");
  const confirmarExportar = document.getElementById("confirmarExportar");
  const inputArchivo = document.getElementById("excelFile");

  if (botonProcesar) botonProcesar.onclick = prepararModal;
  if (confirmarExportar) confirmarExportar.onclick = procesarExportacion;
  if (inputArchivo) {
    inputArchivo.addEventListener("change", (e) => {
      const archivo = e.target.files[0];
      if (archivo) leerExcelDesdeFila3(archivo);
    });
  }
});

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
          return;
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
let precioRaw = (row["Precio WEB Con IVA"] || "").toString().replace(/\$/g, "").replace(/\./g, "").replace(",", ".");
const precioConIVA = parseFloat(precioRaw);
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
"Cantidad": row["Combinaciones"] ? 0 : (row["WEB"] || 0),
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

  // Obtiene la fecha actual y la formatea como DD-MM-YY
  const ahora = new Date();
  const dia = String(ahora.getDate()).padStart(2, "0");
  const mes = String(ahora.getMonth() + 1).padStart(2, "0"); // meses empiezan en 0
  const anio = String(ahora.getFullYear()).slice(-2); // últimos 2 dígitos

  const fechaStr = `${dia}-${mes}-${anio}`;

  let baseNombre;
  switch (tipo) {
    case "nuevo":
      baseNombre = "productos_nuevos";
      break;
    case "combinacion":
      baseNombre = "combinaciones";
      break;
    default:
      baseNombre = "reposicion";
      break;
  }

  const nombre = `${baseNombre}_${fechaStr}.xlsx`;

  XLSX.writeFile(wb, nombre);
}


function mostrarAlerta(mensaje, tipo = "info") {
  const alertasDiv = document.getElementById("alertas");
  alertasDiv.innerHTML = `<div class="alert alert-${tipo}" role="alert">${mensaje}</div>`;
}

function prepararModal() {
  const modalBody = document.getElementById("columnasFinales");
  let transformados = [];

  if (tipoSeleccionado === "combinacion_cantidades") {
    transformados = datosCombinacionCantidades;
  } else {
    transformados = transformarDatosParaExportar(datosFiltrados);
  }

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
  let datos = [];

  if (tipoSeleccionado === "nuevo") {
    datos = datosFiltrados;
  } else if (tipoSeleccionado === "combinacion") {
    datos = datosCombinaciones;
  } else if (tipoSeleccionado === "reposicion") {
    datos = datosReposicion;
  } else if (tipoSeleccionado === "combinacion_cantidades") {
    exportarXLSXPersonalizado("combinacion_cantidades", datosCombinacionCantidades);
    return;
  }

  exportarXLSX(tipoSeleccionado, datos);
}


function filtrarProductos(tipo) {
  tipoSeleccionado = tipo;

  if (tipo === "nuevo") {
    datosFiltrados = datosOriginales.filter(p => !p["Combinaciones"]);
  } else if (tipo === "reposición") {
    datosFiltrados = datosReposicion.filter(p => !p["Combinaciones"]);
  }

  mostrarTablaFiltrada(datosFiltrados);
}

function filtrarCombinaciones(tipo) {
  tipoSeleccionado = "combinacion";

  if (tipo === "nuevo") {
    datosFiltrados = datosCombinaciones.filter(p => {
      const salida = (p["Salida"] || "").trim();
      return salida !== "Reposición";
    });
  } else if (tipo === "reposición") {
    datosFiltrados = datosCombinaciones.filter(p => {
      const salida = (p["Salida"] || "").trim();
      return salida === "Reposición";
    });
  }

  mostrarTablaFiltrada(datosFiltrados);
}


function mostrarTablaFiltrada(datos) {
  const tablaDiv = document.getElementById("tablaPreview");
  const procesarBtn = document.getElementById("botonProcesar");

  if (!datos.length) {
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

function mostrarTablaCombinacionesCantidad() {
  tipoSeleccionado = "combinacion_cantidades";
  const tablaDiv = document.getElementById("tablaPreview");
  const procesarBtn = document.getElementById("botonProcesar");

  if (!datosCombinaciones.length) {
    tablaDiv.innerHTML = `<p class='text-muted'>No hay productos con combinaciones.</p>`;
    procesarBtn.classList.add("d-none");
    return;
  }

  const resultado = [];

  datosCombinaciones.forEach(row => {
    const combinaciones = (row["Combinaciones"] || "").toString().trim();
    const codigoBase = (row["Código"] || "").substring(0, 12);
    const idProducto = row["ID Producto"] || "";
    const urlImagen = row["URL de Producto"] || "";
    const precioConIVA = parseFloat(row["Precio WEB Con IVA"] || 0);
    const precioSinIVA = isNaN(precioConIVA) ? 0 : (precioConIVA / 1.19).toFixed(2);

    combinaciones.split(",").forEach(comb => {
      const [num, cant] = comb.replace("#", "").split("-").map(s => s.trim());
      if (!num || !cant) return;

      resultado.push({
        "ID": idProducto,
        "Attribute (Name:Type:Position)*": "Número:radio:0",
"Value (Value:Position)*": `${num}:0`,
        "Referencia": `${codigoBase}${num}`,
        "Cantidad": cant,
        "Precio S/ IVA": precioSinIVA
      });
    });
  });

  if (!resultado.length) {
    tablaDiv.innerHTML = `<p class='text-muted'>No hay combinaciones válidas.</p>`;
    procesarBtn.classList.add("d-none");
    return;
  }

  const columnas = Object.keys(resultado[0]);
  let html = `<table class="table table-bordered table-sm align-middle"><thead><tr>`;
  columnas.forEach(col => {
    html += `<th class="small">${col}</th>`;
  });
  html += `</tr></thead><tbody>`;
  resultado.forEach(fila => {
    html += `<tr>`;
    columnas.forEach(col => {
      const contenido = fila[col]?.toString() || "";
      html += `<td class="small text-truncate" title="${contenido}" style="max-width: 240px;">${contenido}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  tablaDiv.innerHTML = html;

  procesarBtn.classList.remove("d-none");

  // Guardar resultado para exportación
  datosCombinacionCantidades = resultado;
}

function exportarXLSXPersonalizado(nombre, datos) {
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}


function mostrarProductosNuevos() {
  tipoSeleccionado = "nuevo";

  datosFiltrados = [];

  // Todos los productos nuevos sin combinaciones
  datosOriginales.forEach(row => {
    datosFiltrados.push({ ...row });
  });

  // Todos los productos nuevos con combinaciones
  datosCombinaciones.forEach(row => {
    const salida = (row["Salida"] || "").trim();
    if (salida !== "Reposición") {
      // Clonamos y forzamos cantidad a 0
      const nuevo = { ...row };
      nuevo["Cantidad"] = 0;
      datosFiltrados.push(nuevo);
    }
  });

  mostrarTablaFiltrada(datosFiltrados);
}


function mostrarProductosReposicion() {
  tipoSeleccionado = "reposicion";

  datosFiltrados = [];

  // Productos reposición sin combinaciones
  datosReposicion.forEach(row => {
    datosFiltrados.push({ ...row });
  });

  // Productos reposición con combinaciones (cantidad = 0)
  datosCombinaciones.forEach(row => {
    const salida = (row["Salida"] || "").trim();
    if (salida === "Reposición") {
      const nuevo = { ...row };
      nuevo["Cantidad"] = 0;
      datosFiltrados.push(nuevo);
    }
  });

  mostrarTablaFiltrada(datosFiltrados);
}



// upd v2 04-07