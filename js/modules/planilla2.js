// js/modules/planilla.js

let datosOriginales = [];
let datosCombinaciones = [];
let datosReposicion = [];
let datosFiltrados = [];
let datosCombinacionCantidades = [];

// Orden de columnas para la vista (encabezados de Fila A + "Categoría principal" al final)
let ordenColumnasVista = [];

// --- Utilidades de texto ---
function normalizarTexto(valor) {
  return (valor ?? "")
    .toString()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // sin acentos
    .toLowerCase();
}

function asNumericId(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const n = Number(s);
  return Number.isFinite(n) ? s : "";
}

function firstNonEmpty(row, keys) {
  for (const k of keys) {
    const v = (row[k] ?? "").toString().trim();
    if (v) return v;
  }
  return "";
}

/**
 * Busca en las claves de la fila la primera que "incluya" el texto buscado
 * (insensible a mayúsculas/acentos).
 */
function detectarColumnaQueIncluye(row, textoBuscado) {
  const clave = normalizarTexto(textoBuscado);
  const keys = Object.keys(row);
  for (const k of keys) {
    const kn = normalizarTexto(k);
    if (kn.includes(clave)) return k; // devuelve la primera coincidencia
  }
  return null;
}

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
      if (archivo) leerExcelDesdeFilaA(archivo); // lee desde 1ª fila (encabezados)
    });
  }
});

/**
 * Lee el Excel usando la primera fila (Fila A) como encabezados,
 * mantiene su orden exacto y agrega "Categoría principal" al final.
 */
function leerExcelDesdeFilaA(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const opciones = { header: 1 };
    const todasLasFilas = XLSX.utils.sheet_to_json(worksheet, opciones);

    if (todasLasFilas.length < 2) {
      mostrarAlerta("El archivo no tiene suficientes filas.", "danger");
      return;
    }

    // Encabezados = primera fila (Fila A)
    const headers = (todasLasFilas[0] || []).map(h =>
      (h ?? "").toString().trim()
    );

    // Filas de datos desde la 2ª fila en adelante
    const filas = todasLasFilas.slice(1);

    // Construir objetos respetando los encabezados tal cual vienen
    const datos = filas.map(fila => {
      const obj = {};
      headers.forEach((col, i) => {
        obj[col || `Columna${i}`] = fila[i] ?? "";
      });
      return obj;
    });

    // --- Generar "Categoría principal" usando lógica por "incluye" + detección de columna material ---
    datos.forEach(row => {
      // intenta detectar cualquier encabezado que contenga "material"
      const keyMaterial =
        detectarColumnaQueIncluye(row, "material") ||
        "material"; // fallback si existe exacto

      const materialRaw = (row[keyMaterial] ?? "").toString();
      const normalizado = normalizarTexto(materialRaw);

      let categoria = "";
      if (normalizado.includes("enchape")) {
        categoria = "ENCHAPADO";
      } else if (normalizado.includes("accesorios")) {
        categoria = "ACCESORIOS";
      } else if (normalizado.includes("plata")) {
        categoria = "Joyas de plata por mayor";
      }

      row["Categoría principal"] = categoria;
    });

    // Construimos el orden de columnas a mostrar en la vista:
    // (1) Todas las que venían en el Excel, (2) + "Categoría principal" al final
    ordenColumnasVista = [...headers];
    if (!ordenColumnasVista.includes("Categoría principal")) {
      ordenColumnasVista.push("Categoría principal");
    }

    // Limpieza inicial de arrays
    datosCombinaciones = [];
    datosReposicion = [];
    datosOriginales = [];

    const errores = [];

    // Clasificación en nuevos, reposición y con combinaciones
    datos.forEach(row => {
      const salida = (row["Salida"] || "").toString().trim();
      const combinacion = (row["Combinaciones"] || "").toString().trim();
      const sku = (row["codigo_producto"] || row["Código"] || "SKU no definido").toString().trim();
      const categoria = (row["Categoría principal"] || "").toString().trim();

      // Validar combinaciones vacías solo en ciertos tipos de anillos (misma lógica existente)
      const esAnilloConValidacion = ["Anillos de Plata", "Anillos Enchapado"].includes(categoria);

      if (esAnilloConValidacion && "Combinaciones" in row && combinacion === "") {
        errores.push(`${sku} - combinaciones vacías (${categoria})`);
        return;
      }

      const tieneCombinacion = combinacion !== "";

      if (tieneCombinacion) {
        const combinaciones = combinacion.split(",");
        let errorDetectado = false;

        combinaciones.forEach(c => {
          const valor = c.trim();
          const regex = /^#\d+-\d+$/; // formato #NUM-CANT (1+ dígitos)
          if (!regex.test(valor)) {
            errores.push(`${sku} - ${valor}`);
            errorDetectado = true;
          }
        });

        if (errorDetectado) return;

        row["Cantidad"] = 0;
        datosCombinaciones.push(row);

      } else if (salida === "Reposición") {
        datosReposicion.push(row);

      } else {
        datosOriginales.push(row);
      }
    });

    // Mostrar errores acumulados si hay
    if (errores.length > 0) {
      const mensajes = errores.map(e => `<div class="alert alert-warning alert-dismissible fade show" role="alert">
        ${e}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
      </div>`).join("");
      document.getElementById("alertas").innerHTML = mensajes;
    } else {
      document.getElementById("alertas").innerHTML = "";
    }

// Mostrar TODO (nuevos + con combinaciones) por defecto
tipoSeleccionado = "todo";
datosFiltrados = [...datosOriginales, ...datosCombinaciones];
document.getElementById("botonesTipo").classList.remove("d-none");
renderTablaConOrden(datosFiltrados);
  };
  reader.readAsArrayBuffer(file);
}

// --- Características (misma lógica, soportando nombres nuevos y antiguos como fallback) ---
function construirCaracteristicas(row) {
  // Busca primero por claves exactas; si no, detecta por encabezado que "incluya" el texto
  const getField = (preferKeys, includeText) => {
    const valExact = firstNonEmpty(row, preferKeys);
    if (valExact) return valExact;
    const k = detectarColumnaQueIncluye(row, includeText);
    return k ? (row[k] ?? "").toString().trim() : "";
  };

  const modelo   = getField(["modelo", "Modelo"], "modelo");
  const material = getField(["material", "Material"], "material");
  const estilo   = getField(["estilo", "Estilo"], "estilo");
  const dimension = getField(["dimension", "dimensiones", "Dimensión", "Dimensiones"], "dimension");
  const peso      = getField(["peso", "Peso"], "peso");

  const partes = [];
  if (modelo)    partes.push(`Modelo: ${modelo}`);
  if (dimension) partes.push(`Dimensión: ${dimension}`);
  if (peso)      partes.push(`Peso: ${peso}`);
  if (material)  partes.push(`Material: ${material}`);
  if (estilo)    partes.push(`Estilo: ${estilo}`);

  const ocasionRaw =
    firstNonEmpty(row, ["ocasion", "Ocasión"]) ||
    (detectarColumnaQueIncluye(row, "ocasion") ? row[detectarColumnaQueIncluye(row, "ocasion")] : "");

  if (ocasionRaw) {
    String(ocasionRaw)
      .split(",")
      .map(o => o.trim())
      .filter(Boolean)
      .forEach(o => partes.push(`Ocasión: ${o}`));
  }

  return partes.join(", ");
}


// --- Categorías a exportar (con los nuevos nombres confirmados) ---
function construirCategorias(row) {
  const campos = ["Categoría principal", "procucto_tipo", "procucto_subtipo"];
  return campos
    .map(k => (row[k] || "").toString().trim())
    .filter(v => v && v.toLowerCase() !== "sin valor")
    .join(", ");
}

// --- Precio ---
function parsePrecioConIVA(valor) {
  const limpio = (valor ?? "")
    .toString()
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "."); // coma decimal -> punto
  const n = parseFloat(limpio);
  return isNaN(n) ? null : n;
}

function transformarDatosParaExportar(datos) {
  return datos.map(row => {
    // Nuevos nombres confirmados (con fallback a antiguos si aplica)
   const idProducto = asNumericId(row["prestashop_id"]);
    const codigo = row["codigo_producto"] || row["Código"] || "";
    const nombre = row["nombre_producto"] || row["Nombre Producto"] || "";
    const cantidad = row["Combinaciones"] ? 0 : (row["cantidad"] ?? row["WEB"] ?? 0);
    const resumen = row["descripcion_resumen"] ?? row["Resumen"] ?? "";
    const descripcion = row["descripcion_extensa"] ?? row["Descripción"] ?? "";

    // Precio: tomar desde 'precio_prestashop' (con IVA) y calcular sin IVA (19%)
    const precioConIVA = parsePrecioConIVA(row["precio_prestashop"]);
    const precioSinIVA = precioConIVA === null ? 0 : +(precioConIVA / 1.19).toFixed(2);

    return {
      "ID": idProducto || "",
      "Activo (0/1)": 0, // confirmado
      "Nombre": nombre,
      "Categorias": construirCategorias(row),
      "Precio S/IVA": precioSinIVA,
      "Regla de Impuesto": 2, // confirmado
      "Código Referencia SKU": codigo,
      "Marca": "DJOYAS", // confirmado
      "Cantidad": cantidad,
      "Resumen": resumen,
      "Descripción": descripcion,
      "Image URLs (x,y,z...)": codigo ? `https://distribuidoradejoyas.cl/img/prod/${codigo}.jpg` : "",
      "Caracteristicas": construirCaracteristicas(row)
    };
  });
}

/** ---------- RENDER DE TABLAS (respeta ordenColumnasVista) ---------- **/

function renderTablaConOrden(datos) {
  const tablaDiv = document.getElementById("tablaPreview");
  const procesarBtn = document.getElementById("botonProcesar");

  if (!datos.length) {
    tablaDiv.innerHTML = `<p class='text-muted'>No hay productos en esta categoría.</p>`;
    procesarBtn.classList.add("d-none");
    return;
  }

  // Si no hay orden definido (edge case), usar keys del primer registro
  const columnas = ordenColumnasVista.length
    ? ordenColumnasVista
    : Object.keys(datos[0]);

  let html = `<table class="table table-bordered table-sm align-middle"><thead><tr>`;
  columnas.forEach(col => {
    html += `<th class="small">${col}</th>`;
  });
  html += `</tr></thead><tbody>`;

  datos.forEach(fila => {
    html += `<tr style="height: 36px;">`;
    columnas.forEach(col => {
      const contenido = (fila[col] ?? "").toString();
      const previsual = contenido.length > 60 ? contenido.substring(0, 60) + "..." : contenido;
      html += `<td class="small text-truncate" title="${contenido}" style="max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${previsual}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  tablaDiv.innerHTML = html;

  procesarBtn.classList.remove("d-none");
}

function mostrarTabla() {
  // siempre mostramos lo filtrado actual; por defecto es TODO
  if (!Array.isArray(datosFiltrados) || datosFiltrados.length === 0) {
    datosFiltrados = [...datosOriginales, ...datosCombinaciones];
  }
  tipoSeleccionado = "todo";
  renderTablaConOrden(datosFiltrados);
}

function mostrarTablaFiltrada(datos) {
  renderTablaConOrden(datos);
}

/** ---------- EXPORTACIONES ---------- **/

function exportarXLSX(tipo, datos) {
  const transformados = transformarDatosParaExportar(datos);
  const ws = XLSX.utils.json_to_sheet(transformados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");

  // Fecha actual DD-MM-YY
  const ahora = new Date();
  const dia = String(ahora.getDate()).padStart(2, "0");
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const anio = String(ahora.getFullYear()).slice(-2);

  const fechaStr = `${dia}-${mes}-${anio}`;

  let baseNombre;
  switch (tipo) {
    case "todo":
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

function prepararModal() {
  const modalBody = document.getElementById("columnasFinales");

  // si es la tabla especial de combinaciones con cantidad, usa ese dataset
  if (tipoSeleccionado === "combinacion_cantidades" && datosCombinacionCantidades.length) {
    const columnas = Object.keys(datosCombinacionCantidades[0] || {});
    let html = `<div style="overflow-x:auto"><table class="table table-bordered table-sm align-middle"><thead><tr>`;
    columnas.forEach(col => html += `<th class="small">${col}</th>`);
    html += `</tr></thead><tbody>`;
    datosCombinacionCantidades.forEach(fila => {
      html += `<tr style="height: 36px;">`;
      columnas.forEach(col => {
        const contenido = (fila[col] ?? "").toString();
        const previsual = contenido.length > 60 ? contenido.substring(0, 60) + "..." : contenido;
        html += `<td class="small text-truncate" title="${contenido}" style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${previsual}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    modalBody.innerHTML = html;
    return;
  }

  // caso normal: transformar y previsualizar TODO lo cargado
  if (!Array.isArray(datosFiltrados) || datosFiltrados.length === 0) {
    datosFiltrados = [...datosOriginales, ...datosCombinaciones];
  }
  const transformados = transformarDatosParaExportar(datosFiltrados);

  const columnas = Object.keys(transformados[0] || {});
  let html = `<div style="overflow-x:auto"><table class="table table-bordered table-sm align-middle"><thead><tr>`;
  columnas.forEach(col => html += `<th class="small">${col}</th>`);
  html += `</tr></thead><tbody>`;
  transformados.forEach(fila => {
    html += `<tr style="height: 36px;">`;
    columnas.forEach(col => {
      const contenido = (fila[col] ?? "").toString();
      const previsual = contenido.length > 60 ? contenido.substring(0, 60) + "..." : contenido;
      html += `<td class="small text-truncate" title="${contenido}" style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${previsual}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  modalBody.innerHTML = html;
}


function procesarExportacion() {
  if (tipoSeleccionado === "combinacion_cantidades") {
    exportarXLSXPersonalizado("combinacion_cantidades", datosCombinacionCantidades);
    return;
  }

  // exportar TODO
  if (!Array.isArray(datosFiltrados) || datosFiltrados.length === 0) {
    datosFiltrados = [...datosOriginales, ...datosCombinaciones];
  }
  exportarXLSX("todo", datosFiltrados);
}


function exportarXLSXPersonalizado(nombre, datos) {
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}

/** ---------- FILTROS Y VISTAS ---------- **/

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

function mostrarProductosNuevos() {
  tipoSeleccionado = "nuevo";
  datosFiltrados = [];

  // Todos los productos nuevos sin combinaciones
  datosOriginales.forEach(row => {
    datosFiltrados.push({ ...row });
  });

  // Todos los productos nuevos con combinaciones (cantidad = 0 si no reposición)
  datosCombinaciones.forEach(row => {
    const salida = (row["Salida"] || "").trim();
    if (salida !== "Reposición") {
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

/** ---------- COMBINACIONES (tabla especial) ---------- **/

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
    const codigoBase = (row["codigo_producto"] || row["Código"] || "").substring(0, 12);
const idProducto = asNumericId(row["prestashop_id"]);
    const precioConIVA = parsePrecioConIVA(row["precio_prestashop"]);
    const precioSinIVA = precioConIVA === null ? 0 : +(precioConIVA / 1.19).toFixed(2);

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
      const contenido = (fila[col] ?? "").toString();
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

//V3.7