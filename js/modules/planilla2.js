// js/modules/planilla.js

window.zipDescargando = false;
window.datosOriginales = [];
window.datosCombinaciones = [];
window.datosReposicion = [];
window.datosFiltrados = [];
window.datosCombinacionCantidades = [];
window.tipoSeleccionado = "todo";

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

function esAnillo(row) {
  const tipo = (
    row["producto_tipo"] ||
    row["PRODUCTO TIPO"] ||
    row["procucto_tipo"] || 
    ""
  ).toString().trim().toLowerCase();

  if (!tipo.includes("anillo")) return false;

  return true; // ⬅️ MIDI incluido
}

function esColganteLetra(row) {
  const tipo = (row["producto_tipo"] || row["PRODUCTO TIPO"] || "").toString().toLowerCase();
  if (!tipo.includes("colgante")) return false;

  const comb = (row["PRODUCTO COMBINACION"] || row["producto_combinación"] || "").toString().trim();
  const codigo = extraerCodigo(row);

  // a) si la columna producto_combinacion trae una sola letra A-Z
  if (/^[A-Z]$/i.test(comb)) return true;

  // b) si el SKU termina en una letra A-Z (PCLCC10055200A)
  if (/[A-Z]$/i.test(codigo)) return true;

  return false;
}


function ultimosDosDigitosDeCodigo(codigo) {
  const s = String(codigo ?? "");
  // Tomar el bloque numérico del final, luego quedarnos con sus últimos 2 dígitos
  const m = s.match(/(\d+)\s*$/);
  if (!m) return ""; // no hay dígitos al final
  const bloque = m[1];           // ej. "020"
  const d2 = bloque.slice(-2);   // -> "20"
  // Asegura que sean 1–2 dígitos (si solo hay 1, se usa tal cual)
  return d2;
}

function prefijoPadre(codigo) {
  const s = String(codigo ?? "");
  if (s.length < 4) return s;        // borde: códigos muy cortos
  return s.slice(0, -3);             // todo menos los últimos 3
}

function crearCodigoPadre(codigo) {
  const pref = prefijoPadre(codigo);
  return `${pref}000`;
}

/**
 * Recibe un array de productos (anillos) y devuelve un array de "padres" únicos.
 * - Toma el primer miembro del grupo como base para copiar datos.
 * - Ajusta: codigo_producto -> ...000
 * - Fuerza cantidad = 0
 * - Limpia prestashop_id (para que ID salga vacío al exportar)
 */
function agruparAnillosComoPadres(productos) {
  const grupos = new Map(); // key = prefijo (sin los últimos 3)

  productos.forEach(row => {
    const codigo = extraerCodigo(row);
    const key = prefijoPadre(codigo);
    if (!key) return;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(row);
  });

  const padres = [];
  grupos.forEach((miembros, key) => {
    const base = JSON.parse(JSON.stringify(miembros[0])); // ✅ CLON PROFUNDO
    const codigoPadre = `${key}000`;

    base["CODIGO PRODUCTO"] = codigoPadre;
    base["codigo_producto"] = codigoPadre;

    // ✅ stock 0 solo en el padre, no altera los hijos
    base["Cantidad"] = 0;
    base["cantidad"] = 0;

    // limpiar campos que no deben heredarse
    base["prestashop_id"] = "";
    base["Combinaciones"] = "";
    base["producto_combinacion"] = "";

    padres.push(base);
  });

  return padres;
}





function asNumericId(value) {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (!s) return "";
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? "" : n.toString();
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





// Código de producto con fallback
function extraerCodigo(row) {
  const posibles = ["codigo_producto", "CODIGO PRODUCTO", "Código", "CODIGO_PRODUCTO"];
  for (const key of posibles) {
    if (row[key]) return row[key].toString().trim();
  }
  return "";
}


// ¿Es “producto nuevo”? (heurística segura)
function esProductoNuevo(row) {
  if (!row || typeof row !== 'object') return false;
  const cand = ['es_nuevo','nuevo','producto_nuevo','esProductoNuevo','estado','Estado','tipo','Tipo'];
  for (const k of cand) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      const raw = row[k];
      const v = String(raw).toLowerCase().trim();
      if (raw === true) return true;
      if (v === '1' || v === 'true' || v.includes('nuevo')) return true;
    }
  }
  return false;
}

// Mostrar/ocultar botón según condición “1 fila activa y nueva”
function onAbrirModalProcesar() {
  const btnZip = document.getElementById('btncFotosZip');
  if (!btnZip) return;

  const filas = obtenerFilasActivas({
    tipoSeleccionado, datosFiltrados, datosOriginales, datosCombinaciones
  });

  // Mostrar el botón si hay al menos 1 fila activa
  const show = Array.isArray(filas) && filas.length > 0;

mostrarNotificacion(`ZIP: ${filas.length} filas activas.`, "exito");


  btnZip.style.display = show ? 'inline-block' : 'none';
}


// Normaliza URL de Google Drive a descarga directa
// Extrae fileId desde las variantes comunes de Drive
function driveIdFromUrl(url) {
  try {
    const u = new URL(url);
    if (!u.host.includes('drive.google.com')) return null;
    // /file/d/<ID>/view
    const m1 = u.pathname.match(/\/file\/d\/([^/]+)\/view/i);
    if (m1?.[1]) return m1[1];
    // ?id=<ID>
    const id = u.searchParams.get('id');
    if (id) return id;
    // /uc?id=<ID>&export=download
    if (u.pathname.includes('/uc')) {
      const id2 = u.searchParams.get('id');
      if (id2) return id2;
    }
    return null;
  } catch {
    return null;
  }
}


function driveToDownloadUrl(url) {
  if (!url) return "";
  url = url.trim().replace(/^"|"$/g, "");

  try {
    const u = new URL(url);

    if (u.host.includes("drive.google.com")) {
      const m = url.match(/\/d\/([^\/]+)/);
      const id = m ? m[1] : u.searchParams.get("id");

      if (id) {
        return `https://drive.google.com/uc?export=download&id=${id}`;
      }
    }

    return url;
  } catch {
    return url;
  }
}



// Extensión por Content-Type
function extPorContentType(ct) {
  if (!ct) return '';
  const t = ct.split(';')[0].trim().toLowerCase();
  if (t === 'image/jpeg' || t === 'image/jpg') return '.jpg';
  if (t === 'image/png') return '.png';
  if (t === 'image/webp') return '.webp';
  if (t === 'image/gif') return '.gif';
  if (t === 'image/bmp') return '.bmp';
  if (t === 'image/tiff') return '.tiff';
  if (t === 'image/heic') return '.heic';
  if (t === 'image/svg+xml') return '.svg';
  return '';
}

// filename desde Content-Disposition
function filenameDeContentDisposition(cd) {
  if (!cd) return '';
  const q = cd.match(/filename\*?=(?:UTF-8''|")(.*?)(?:"|$)/i);
  if (q?.[1]) {
    try { return q[0].includes('filename*=') ? decodeURIComponent(q[1]).trim() : q[1].trim(); }
    catch { return q[1].trim(); }
  }
  const u = cd.match(/filename=([^;]+)/i);
  return u?.[1]?.trim() || '';
}

function safeName(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|#%&{}$!'@+`|=]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 150);
}

function fechaDDMMYY(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

async function procesaConConcurrencia(items, handler, concurrency = 4, onProgress) {
  let index = 0, running = 0, done = 0;
  const results = new Array(items.length);
  return new Promise((resolve) => {
    const launch = () => {
      while (running < concurrency && index < items.length) {
        const i = index++;
        running++;
        handler(items[i], i)
          .then(v => { results[i] = { ok: true, value: v }; })
          .catch(e => { results[i] = { ok: false, error: e }; })
          .finally(() => {
            running--; done++;
            if (typeof onProgress === 'function') onProgress(done, items.length);
            if (done === items.length) resolve(results); else launch();
          });
      }
    };
    launch();
  });
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
        let valor = fila[i] ?? "";

        // 🚫 Si trae "NULL" (cualquier combinación de mayúsculas/minúsculas) → vacío
        if (typeof valor === "string" && valor.trim().toUpperCase() === "NULL") {
          valor = "";
        }

        obj[col || `Columna${i}`] = valor;
      });

      // ✅ GUARDAR STOCK ORIGINAL DESDE YA (campo protegido)
      if (obj["Cantidad"] !== undefined || obj["CANTIDAD"] !== undefined) {
        const stockOriginal = obj["Cantidad"] || obj["CANTIDAD"] || 0;
        obj["_stock_original"] = Number(stockOriginal);
      } else {
        obj["_stock_original"] = 0;
      }

      return obj;
    });

    // --- Generar "Categoría principal" ---
    datos.forEach(row => {
      // Buscar material (con typo y sin typo)
      const materialRaw = (
        row["producto_material"] ||
        row["PRODUCTO MATERIAL"] ||
        row["procucto_material"] ||
        ""
      ).toString().trim().toLowerCase();

      let categoria = "";

if (materialRaw.includes("enchape")) {
  categoria = "ENCHAPADO";
}
 else if (materialRaw.includes("accesorios")) {
        categoria = "ACCESORIOS";
      } else if (materialRaw.includes("plata")) {
        categoria = "Joyas de plata por mayor";
      }

      // Si no hay categoría por material, revisamos el tipo
      if (!categoria) {
        const tipoRaw = (
          row["producto_tipo"] ||
          row["PRODUCTO TIPO"] ||
          row["procucto_tipo"] ||
          ""
        ).toString().trim().toLowerCase();

        if (tipoRaw.includes("insumos de plata")) {
          categoria = "Joyas de plata por mayor";
        } else if (tipoRaw.includes("insumos enchapados")) {
          categoria = "ENCHAPADO";
        }
      }

      row["Categoría principal"] = categoria;
    });

    // Construimos el orden de columnas a mostrar en la vista:
    ordenColumnasVista = [...headers];
    if (!ordenColumnasVista.includes("Categoría principal")) {
      ordenColumnasVista.push("Categoría principal");
    }

    // Limpieza inicial de arrays
    datosCombinaciones = [];
    datosReposicion = [];
    datosOriginales = [];

    const errores = [];

    datos.forEach(row => {
      const salida = (row["Salida"] || "").toString().trim();
      const combinacion = (
        row["Combinaciones"] ||
        row["PRODUCTO COMBINACION"] ||
        row["producto_combinacion"] ||
        ""
      ).toString().trim();

      const sku = (
        row["codigo_producto"] ||
        row["CODIGO PRODUCTO"] ||
        row["Código"] ||
        "SKU no definido"
      ).toString().trim();

      const categoria = (row["Categoría principal"] || "").toString().trim();

      const esAnilloConValidacion = ["Anillos de Plata", "Anillos Enchapado"].includes(categoria);

      const combinacionRaw = (
  row["Combinaciones"] ||
  row["PRODUCTO COMBINACION"] ||
  row["producto_combinacion"] ||
  ""
).toString().trim().toLowerCase();

const esMidi = combinacionRaw === "midi";


// ⚠️ Anillo sin combinaciones SOLO es error si NO es MIDI
if (esAnilloConValidacion && combinacion === "" && !esMidi) {
  errores.push(`${sku} - combinaciones vacías (${categoria})`);
  return;
}

const combiValida =
  combinacion !== "" &&
  combinacion.toLowerCase() !== "sin valor" &&
  combinacion.toLowerCase() !== "null" &&
  combinacion.toLowerCase() !== "ninguno" &&
  combinacion.toLowerCase() !== "midi"; // ⬅️ CLAVE


      // 🧩 Si hay combinación válida → procesar
      if (combiValida) {
        const combinaciones = combinacion.split(",");
        let errorDetectado = false;

        combinaciones.forEach(c => {
          const valor = c.trim();

          // Acepta: #10-12, 10-12, Numeración 19, numeracion 10, 19, etc.
          const regex = /^#?\d+(-\d+)?$/i;
          const regexNumeracion = /^numeraci[oó]n\s*\d+$/i;

          if (!regex.test(valor) && !regexNumeracion.test(valor)) {
            errores.push(`${sku} - ${valor}`);
            errorDetectado = true;
          }
        });

        if (errorDetectado) return;


        // ✅ Registrar como combinación válida
        row["CANTIDAD"] = row["CANTIDAD"] || row["Cantidad"] || 0;
        datosCombinaciones.push(row);

      } else if (salida === "Reposición") {
        // 🔹 Producto de reposición sin combinaciones
        datosReposicion.push(row);

      } else {
        // 🔹 Producto nuevo sin combinaciones
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




// --- Características (con manejo especial de Dimensión) ---
function construirCaracteristicas(row) {
  const getField = (preferKeys, includeText) => {
    const valExact = firstNonEmpty(row, preferKeys);
    if (valExact) return valExact;
    const k = detectarColumnaQueIncluye(row, includeText);
    return k ? (row[k] ?? "").toString().trim() : "";
  };

  const limpiarSeparadores = (s) => s.replace(/\s*:\s*/g, " ").replace(/\s+/g, " ").trim();
  const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const normalizarEtiquetaYValor = (texto, etiquetaPorDefecto = "") => {
    let t = limpiarSeparadores(texto);
    t = t.replace(/\s*de\s*alargue\b/i, "").trim();

    const mEtiquetaPrimero = t.match(/^(largo|ancho|alto|di[aá]metro|circunferencia|alargue)\b\s*(.*)$/i);
    if (mEtiquetaPrimero) {
      const etiqueta = mEtiquetaPrimero[1];
      const valor = mEtiquetaPrimero[2].trim();
      return `${capitalizar(etiqueta)} ${valor}`;
    }
    if (etiquetaPorDefecto) return `${etiquetaPorDefecto} ${t}`;
    return t;
  };

  const modelo = getField(["modelo", "Modelo", "MODELO PRODUCTO"], "modelo");
  const material = getField(["producto_material", "PRODUCTO MATERIAL", "ID PRODUCTO MATERIAL"], "material");
  const estilo = getField(["producto_estilo", "PRODUCTO ESTILO", "ID PRODUCTO ESTILO"], "estilo");
  const dimension = getField(["dimension", "DIMENSION", "Dimensión", "Dimensiones"], "dimension");
  const peso = getField(["peso", "PESO"], "peso");
  const tipoProducto = getField(["producto_tipo", "PRODUCTO TIPO", "procucto_tipo"], "tipo");

  const partes = [];

  if (modelo) partes.push(`Modelo: ${modelo}`);

if (tipoProducto) {
  let tipo = tipoProducto.trim();

  // --- Normalización para "Enchapado" ---
  if (/enchapado$/i.test(tipo)) {
    const palabras = tipo.split(" ");        // ejemplo: ["Anillos", "Enchapado"]
    const base = palabras.slice(0, -1).join(" "); // "Anillos"
    const genero = base.toLowerCase().endsWith("as") ? "Enchapadas" : "Enchapados";

    tipo = `${base} ${genero}`;
  }

  partes.push(`Categoría: ${tipo}`);
  // ========== NUEVA CARACTERÍSTICA: Tipo de Producto ==========

const nombreProducto = (row["NOMBRE PRODUCTO"] || row["nombre_producto"] || "").toString();

// categoriaDetectada viene como: "Aros Enchapado"
// la normalizamos para obtener solo "aros"
let categoriaDetectada = (row["producto_tipo"] || row["PRODUCTO TIPO"] || "").toString().toLowerCase();

// 🔥 FIX: normalizar categoría para que coincida con las claves
categoriaDetectada = categoriaDetectada
  .replace(" enchapado", "")
  .replace(" enchapados", "")
  .trim();  // ahora "aros enchapado" → "aros"

const tipoProductoFinal = obtenerTipoDeProducto(
  nombreProducto,
  categoriaDetectada,
  row["PRODUCTO SUBTIPO"],
  row["PRODUCTO TIPO"]
);

partes.push(`Tipo de Producto: ${tipoProductoFinal}`);
}


  // ⬇️ Dimensión
  if (dimension) {
    String(dimension)
      .split(",")
      .map(p => p.trim())
      .filter(Boolean)
      .forEach(part => {
        if (part.includes("+")) {
          const trozos = part.split("+").map(x => x.trim());
          if (trozos[0]) partes.push(`Dimensión: ${normalizarEtiquetaYValor(trozos[0], "Largo")}`);
          if (trozos[1]) partes.push(`Dimensión: ${normalizarEtiquetaYValor(trozos[1], "Alargue")}`);
        } else {
          const ajustado = normalizarEtiquetaYValor(part);
          partes.push(`Dimensión: ${ajustado}`);
        }
      });
  }

  if (peso) partes.push(`Peso: ${peso}`);
if (material) {
  let mat = material.trim().toLowerCase();
  const nombreProd = (row["nombre_producto"] || row["NOMBRE PRODUCTO"] || "").toLowerCase();

  // 💎 Normalización inteligente
  if (mat === "plata") {
    mat = "Plata 925";
  } else if (mat === "enchape" || mat === "enchapado") {
    if (nombreProd.includes("oro")) {
      mat = "Enchapado en Oro";
    } else if (nombreProd.includes("plata")) {
      mat = "Enchapado en Plata";
    } else {
      mat = "Enchapado";
    }
  } else {
    // Capitalizar primera letra por consistencia
    mat = mat.charAt(0).toUpperCase() + mat.slice(1);
  }

  partes.push(`Material: ${mat}`);
}
  if (estilo) partes.push(`Estilo: ${estilo}`);

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
  const getVal = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) {
        const v = row[k].toString().trim();
        if (v && v.toLowerCase() !== "sin valor") return v;
      }
    }
    return "";
  };

  // 🔹 Buscar en todas las variantes posibles
  const categoriaPrincipal = getVal("Categoría principal", "categoria_principal", "CATEGORIA PRINCIPAL");
  const tipo = getVal("producto_tipo", "PRODUCTO TIPO", "procucto_tipo", "PRODUCTO_TIPO");
  const subtipo = getVal("producto_subtipo", "PRODUCTO SUBTIPO", "procucto_subtipo", "PRODUCTO_SUBTIPO");

  // 🔹 Orden jerárquico
  const categorias = [categoriaPrincipal, tipo, subtipo]
    .filter(v => v && v.toLowerCase() !== "sin valor");

  // 🔹 Eliminar duplicados (ignorando mayúsculas/minúsculas)
  const unicas = [];
  const vistos = new Set();
  for (const c of categorias) {
    const norm = c.toLowerCase();
    if (!vistos.has(norm)) {
      vistos.add(norm);
      unicas.push(c);
    }
  }
// 🧹 Si tiene ENCHAPADO como categoría principal, quitar "Enchapado en Oro" y "Enchapado en Plata"
if (categoriaPrincipal.toUpperCase() === "ENCHAPADO") {
  for (let i = unicas.length - 1; i >= 0; i--) {
    const cat = unicas[i].toLowerCase();
    if (cat.includes("enchapado en oro") || cat.includes("enchapado en plata")) {
      unicas.splice(i, 1);
    }
  }
}
// ➕ Agregar Categoría Adicional (si existe)
const categoriaAdicional = (row["Categoría Adicional"] || "").toString().trim();
if (categoriaAdicional) {
  unicas.push(categoriaAdicional);
}

  // 🔹 Devuelve separadas por coma (puedes usar "/" si prefieres jerarquía)
  return unicas.join(", ");
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
    const idProducto = asNumericId(row["PRESTASHOP ID"] || row["prestashop_id"]);
    const codigo = extraerCodigo(row);
    const nombre = row["NOMBRE PRODUCTO"] || row["nombre_producto"] || "";

    // 🧮 Detectar si tiene combinaciones
    const combinacionRaw = (
      row["Combinaciones"] ||
      row["PRODUCTO COMBINACION"] ||
      row["producto_combinacion"] ||
      ""
    ).toString().trim().toLowerCase();

    // 🧾 Obtener stock original
    const stockOriginal = Number(
      row["_stock_original"] ??
      row["cantidad"] ??
      row["CANTIDAD"] ??
      0
    );

// 🧠 Detectar si es anillo
const esAnilloProducto = esAnillo(row);

// 🧠 Detectar si es MIDI
const esMidi =
  combinacionRaw === "midi" ||
  combinacionRaw.includes("midi");

// 🧠 Detectar si NO tiene combinaciones reales
const sinCombinacion =
  combinacionRaw === "" ||
  combinacionRaw === "null" ||
  combinacionRaw === "sin valor" ||
  combinacionRaw === "ninguno" ||
  esMidi;

// ✅ LÓGICA FINAL DE STOCK
let cantidad;

if (!sinCombinacion) {
  cantidad = 0;
} else if (esAnilloProducto) {
  // ⬅️ TODOS los anillos sin combinaciones, incluidos MIDI
  cantidad = 0;
} else {
  cantidad = stockOriginal;
}



    const resumen =
      row["DESCRIPCION RESUMEN"] ||
      row["descripcion_resumen"] ||
      row["Resumen"] ||
      "";

    const descripcionRaw =
      row["DESCRIPCION EXTENSA"] ||
      row["descripcion_extensa"] ||
      row["Descripción"] ||
      "";

    const descripcion = formatearDescripcionHTML(descripcionRaw);

    const precioConIVA = parsePrecioConIVA(
      row["PRECIO PRESTASHOP"] || row["precio_prestashop"]
    );
    const precioSinIVA =
      precioConIVA === null
        ? "0.00"
        : (precioConIVA / 1.19).toFixed(2).replace(",", ".");

    const foto = codigo
      ? `https://distribuidoradejoyas.cl/img/prod/${codigo}.jpg`
      : "";

    return {
      "ID": idProducto || "",
      "Activo (0/1)": 0,
      "Nombre": nombre,
      "Categorias": construirCategorias(row),
      "Precio S/IVA": precioSinIVA,
      "Regla de Impuesto": 2,
      "Código Referencia SKU": codigo,
      "Marca": "DJOYAS",
      "Cantidad": cantidad, // ✅ correcto según tenga o no combinaciones
      "Resumen": resumen,
      "Descripción": descripcion,
      "Image URLs (x,y,z...)": foto,
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

  let html = `<table class="table table-bordered table-sm align-middle">
                <thead>
                  <tr>`;

  columnas.forEach(col => {
    html += `<th class="small">${col}</th>`;
  });

  html += `</tr></thead><tbody>`;

  datos.forEach(fila => {
    html += `<tr style="height: 36px;">`;

    columnas.forEach(col => {
      const contenido = (fila[col] ?? "").toString();
      const previsual = contenido.length > 60
        ? contenido.substring(0, 60) + "..."
        : contenido;

      html += `
        <td class="small text-truncate"
            title="${contenido}"
            style="max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${previsual}
        </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;
  tablaDiv.innerHTML = html;

  procesarBtn.classList.remove("d-none");

  // Mostrar el botón de procesar imágenes (aparte)
  const procesarImagenesBtn = document.getElementById("botonProcesarImagenes");
  if (procesarImagenesBtn) procesarImagenesBtn.classList.remove("d-none");
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
  case "nuevo":
    baseNombre = "productos_nuevos";
    break;

  case "combinacion":
    baseNombre = "combinaciones";
    break;

  case "reposición":
  case "reposicion": 
    baseNombre = "productos_reposicion";
    break;

  default:
    baseNombre = "exportacion_planilla";
    break;
}


  const nombre = `${baseNombre}_${fechaStr}.xlsx`;
  XLSX.writeFile(wb, nombre);
}

function inyectarPadresEnDataset(datos) {
  const anillos = datos.filter(esAnillo);
  const colgantesLetra = datos.filter(esColganteLetra);
  const padres = agruparAnillosComoPadres([...anillos, ...colgantesLetra]);

  if (!padres.length) return datos;

  // Evitar duplicados si ya existen filas con ...000
  const codPadres = new Set(padres.map(r => extraerCodigo(r)));
  const datosSinPadresPrevios = datos.filter(r => !codPadres.has(extraerCodigo(r)));

  return [...datosSinPadresPrevios, ...padres];
}


function esCodigoPadre(c) {
  return /000$/.test(String(c || ""));
}

function crearPadreDesdeHijo(row) {
  const codigoHijo = extraerCodigo(row);
  const pref = prefijoPadre(codigoHijo);
  const base = { ...row };

  const codigoPadre = `${pref}000`;
  base["codigo_producto"] = codigoPadre;
  base["CODIGO PRODUCTO"] = codigoPadre; // por si tu Excel usa esta columna
  base["prestashop_id"] = "";
  base["Combinaciones"] = "";
  base["producto_combinacion"] = "";
  base["Cantidad"] = 0;
  base["cantidad"] = 0;

  return base;
}

function agregarPadresSiFaltan(datos) {
  const porPrefijo = new Map();

  datos.forEach(r => {
    const cod = extraerCodigo(r);
    if (!cod) return;
    const pref = prefijoPadre(cod);
    if (!pref) return;
    if (!porPrefijo.has(pref)) porPrefijo.set(pref, []);
    porPrefijo.get(pref).push(r);
  });

  const padresExistentes = new Set(
    datos
      .map(r => extraerCodigo(r))
      .filter(c => c && esCodigoPadre(c))
  );

  const nuevosPadres = [];
  porPrefijo.forEach((arr, pref) => {
    const tieneHijos = arr.some(r => !esCodigoPadre(extraerCodigo(r)));
    const codPadre = `${pref}000`;
    if (tieneHijos && !padresExistentes.has(codPadre)) {
      nuevosPadres.push(crearPadreDesdeHijo(arr[0]));
    }
  });

  return nuevosPadres.length ? [...datos, ...nuevosPadres] : datos;
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

    // 👇 NUEVO: evaluar visibilidad del botón al abrir el modal
    onAbrirModalProcesar();
    return;
  }

// caso normal: transformar y previsualizar TODO lo cargado
let dataset = (Array.isArray(datosFiltrados) && datosFiltrados.length)
  ? datosFiltrados
  : [...datosOriginales, ...datosCombinaciones];

// ✅ inyectar padres (...000) antes de exportar/preview
dataset = inyectarPadresEnDataset(dataset);

const transformados = transformarDatosParaExportar(dataset);


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

  // 👇 NUEVO: evaluar visibilidad del botón al abrir el modal
  onAbrirModalProcesar();
}



function procesarExportacion() {
  if (tipoSeleccionado === "combinacion_cantidades") {
    exportarXLSXPersonalizado("combinacion_cantidades", datosCombinacionCantidades);
    return;
  }

  let dataset = (Array.isArray(datosFiltrados) && datosFiltrados.length)
    ? datosFiltrados
    : [...datosOriginales, ...datosCombinaciones];

  dataset = inyectarPadresEnDataset(dataset);

  // ⬅️ CORRECCIÓN: exporta según el tipo real
  exportarXLSX(tipoSeleccionado, dataset);
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
  tipoSeleccionado = "nuevo"; // <-- Mantenemos 'nuevo' para el tipo de exportación

  const todos = [...datosOriginales, ...datosCombinaciones, ...datosReposicion];

  // 🎯 FILTRO: Solo si NO tiene ID de PrestaShop asignado
  const productosSinID = todos.filter(row => {
    const id = row["PRESTASHOP ID"] || row["prestashop_id"];
    return !id || id.toString().trim() === "";
  });

  // 1) Separar tipos especiales (anillos y colgantes) SÓLO de los SIN ID
  const anillos = productosSinID.filter(esAnillo);
  const colgantesLetra = productosSinID.filter(esColganteLetra);

  // 2) El resto (no anillos y no colgantes de letra)
  const otros = productosSinID.filter(row => !anillos.includes(row) && !colgantesLetra.includes(row));

  // 3) Agrupar en padres (…000) anillos + colgantes de letra
  const anillosPadres = agruparAnillosComoPadres(anillos);
  const colgantesPadres = agruparAnillosComoPadres(colgantesLetra);

  // 4) Vista: solo padres y el resto de productos (TODO SIN ID)
  datosFiltrados = [...otros, ...anillosPadres, ...colgantesPadres];

  renderTablaConOrden(datosFiltrados);
}


function mostrarProductosConID() {
  tipoSeleccionado = "reposicion_id";

  // Combina todos los productos cargados
  const todos = [...datosOriginales, ...datosCombinaciones, ...datosReposicion];

  // Filtra solo los que tienen PRESTASHOP ID (o prestashop_id)
  datosFiltrados = todos.filter(row => {
    const id = row["PRESTASHOP ID"] || row["prestashop_id"];
    return id && id.toString().trim() !== "";
  });

  // Renderiza la tabla igual que los otros botones
  renderTablaConOrden(datosFiltrados);
}




// ** ---------- COMBINACIONES (tabla especial) ---------- **
function mostrarTablaCombinacionesCantidad() {
  tipoSeleccionado = "combinacion_cantidades";

  // 🔹 Ocultar elementos principales
  const formulario = document.querySelector(".formulario");
  if (formulario) formulario.classList.add("d-none");

  const botonesTipo = document.getElementById("botonesTipo");
  if (botonesTipo) botonesTipo.classList.add("d-none");

  const procesarBtn = document.getElementById("botonProcesar");
  if (procesarBtn) procesarBtn.classList.add("d-none");

  const procesarImagenesBtn = document.getElementById("botonProcesarImagenes");
  if (procesarImagenesBtn) procesarImagenesBtn.classList.add("d-none");

  const tablaDiv = document.getElementById("tablaPreview");

  // 🔹 Crear contenedor principal de vista combinaciones
  let vista = document.getElementById("vistaCombinaciones");
  if (!vista) {
    vista = document.createElement("div");
    vista.id = "vistaCombinaciones";
    vista.className = "container my-4";

    vista.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Vista de Combinaciones y Cantidades</h5>
        <button class="btn btn-secondary btn-sm" onclick="volverDeCombinaciones()">← Volver</button>
      </div>
      <div id="tablaCombinacionesContenido" class="table-responsive"></div>
    `;
    tablaDiv.parentNode.insertBefore(vista, tablaDiv);
  }

  // 🔹 Ocultar la tabla principal y mostrar vista combinaciones
  tablaDiv.classList.add("d-none");
  vista.classList.remove("d-none");

  // --- Generación de datos combinaciones ---
const todos = [...datosOriginales, ...datosCombinaciones].filter(row => {
  return esAnillo(row) || esColganteLetra(row);
});
  const resultado = [];

  // 🔹 Intentar cargar datos guardados
  const guardados = JSON.parse(localStorage.getItem("datosCombinacionCantidades") || "{}");

  todos.forEach(row => {
    const codigo = extraerCodigo(row);
const idProducto = asNumericId(
  row["prestashop_id"] ||
  row["PRESTASHOP ID"] ||
  row["ID"] ||
  row["id"] ||
  ""
);
    const nombre = row["NOMBRE PRODUCTO"] || row["nombre_producto"] || "";
    const combinaciones = row["Combinaciones"] || row["PRODUCTO COMBINACION"] || row["producto_combinacion"] || "";
    const cantidad = row["cantidad"] || row["CANTIDAD"] || 0;
    const precioConIVA = parsePrecioConIVA(row["precio_prestashop"] || row["PRECIO PRESTASHOP"]);
    const precioSinIVA = precioConIVA === null ? 0 : +(precioConIVA / 1.19).toFixed(2);

    // ✅ si hay datos guardados, restaurar el ID manual y detalle
    const dataPrev = guardados[codigo] || {};

    resultado.push({
      "ID": idProducto,
      "Nombre": nombre,
      "Referencia": codigo,
      "Combinaciones": combinaciones,
      "Cantidad": cantidad,
      "Precio S/ IVA": precioSinIVA,
      "Cantidad ingresada": dataPrev.cantidadIngresada || 0,
      "ID manual": dataPrev.idManual || "",   // ✅ restaurar ID manual guardado
      "Detalle": dataPrev.detalle || []        // ✅ restaurar combinaciones previas
    });
  });

  window.datosCombinacionCantidades = resultado;

  const contenedor = document.getElementById("tablaCombinacionesContenido");
  const encabezados = ["ID", "Nombre", "Referencia", "Combinaciones", "Cantidad", "Precio S/ IVA", "Cantidad ingresada"];

  let html = `<table class="table table-bordered table-sm align-middle" id="tablaCombinaciones">
    <thead><tr>${encabezados.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;

  resultado.forEach((r, idx) => {
    html += `
      <tr id="fila-${r["Referencia"]}" onclick="abrirModalDetalleProducto('${r["Referencia"]}', ${idx})" style="cursor:pointer;">
        <td>${r["ID"] ?? ""}</td>
        <td>${r["Nombre"] ?? ""}</td>
        <td>${r["Referencia"] ?? ""}</td>
        <td>${r["Combinaciones"] ?? ""}</td>
        <td>${r["Cantidad"] ?? ""}</td>
        <td>${r["Precio S/ IVA"] ?? ""}</td>
        <td class="cantidad-ingresada">${r["Cantidad ingresada"]}</td>
      </tr>`;
  });

  html += `</tbody></table>
    <div class="text-center mt-4">
     <button class="btn btn-success px-4" onclick="procesarCombinacionesFinal()">Procesar</button>
    </div>
    <div id="resultadoProcesado" class="mt-4"></div>`;

  contenedor.innerHTML = html;

}



function abrirModalDetalleProducto(codigo, index) {
  let modal = document.getElementById("modalDetalleProducto");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "modalDetalleProducto";
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Detalle del producto</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="modalDetalleBody"></div>
          <div class="modal-footer">
            <button class="btn btn-outline-success btn-sm" onclick="guardarCantidadIngresada(${index})">Guardar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const producto = window.datosCombinacionCantidades[index];
  const detalle = producto.Detalle && producto.Detalle.length
    ? producto.Detalle
    : Array.from({ length: 3 }).map(() => ({ numeracion: "", cantidad: 0 }));

  const body = modal.querySelector("#modalDetalleBody");
  body.innerHTML = `
    <div class="mb-3 d-flex align-items-center justify-content-between">
      <h6 class="text-primary mb-0">SKU: ${codigo}</h6>
      <div class="ms-3 flex-grow-1">
   <input type="text" id="idManualInput" class="form-control form-control-sm"
  placeholder="Ingresar ID del producto"
  value="${
    producto["ID manual"] ||
    producto["ID"] ||
    rowOriginalId(codigo) ||
    ""
  }">

      </div>
    </div>
    <table class="table table-bordered table-sm align-middle">
      <thead class="table-light">
        <tr><th>Numeración</th><th>Cantidad</th></tr>
      </thead>
      <tbody id="tablaNumeraciones">
        ${detalle
          .map(d => `
            <tr>
              <td><input type="text" class="form-control form-control-sm numeracion-input" value="${d.numeracion || ""}" placeholder="Ej: #10-12"></td>
              <td><input type="number" class="form-control form-control-sm cantidad-input" min="0" value="${d.cantidad || 0}"></td>
            </tr>
          `)
          .join("")}
      </tbody>
    </table>
    <div class="text-center">
      <button class="btn btn-link text-decoration-none" onclick="agregarFilaNumeracion()">+ Agregar fila</button>
    </div>
  `;

  modal.dataset.codigo = codigo;
  modal.dataset.index = index;

  const modalInst = new bootstrap.Modal(modal);
  modalInst.show();
}

function guardarCantidadIngresada(index) {
  const modal = document.getElementById("modalDetalleProducto");
  if (!modal) return;

  const codigo = modal.dataset.codigo;
  const inputsNumeracion = modal.querySelectorAll(".numeracion-input");
  const inputsCantidad = modal.querySelectorAll(".cantidad-input");
  const idManualInput = modal.querySelector("#idManualInput");
  const idManual = idManualInput ? idManualInput.value.trim() : "";

  const detalle = [];
  let suma = 0;

inputsNumeracion.forEach((nInput, i) => {
  const numeracion = nInput.value.trim();
  const cantidad = parseFloat(inputsCantidad[i].value) || 0;
  suma += cantidad;

  // 🔹 Ahora SIEMPRE guardaremos la fila, tenga o no datos
  detalle.push({ numeracion, cantidad });
});


  // 🔹 Actualizar dataset global
  if (window.datosCombinacionCantidades && window.datosCombinacionCantidades[index]) {
    const producto = window.datosCombinacionCantidades[index];
    producto["Cantidad ingresada"] = suma;
    producto["ID manual"] = idManual;
    producto["Detalle"] = detalle;
  }

  // 🔹 Actualizar o crear registro en localStorage
  const guardados = JSON.parse(localStorage.getItem("datosCombinacionCantidades") || "{}");
  guardados[codigo] = {
    cantidadIngresada: suma,
    idManual: idManual,
    detalle: detalle
  };
  localStorage.setItem("datosCombinacionCantidades", JSON.stringify(guardados));

  // 🔹 Refrescar en tabla visible
  const fila = document.getElementById(`fila-${codigo}`);
  if (fila) {
    const celda = fila.querySelector(".cantidad-ingresada");
    if (celda) celda.textContent = suma;
  }

  // 🔹 Cerrar modal
  const instancia = bootstrap.Modal.getInstance(modal);
  if (instancia) instancia.hide();
}


function procesarCombinacionesFinal() {
  const datos = window.datosCombinacionCantidades || [];
  if (!datos.length) {
    alert("No hay datos para procesar.");
    return;
  }

  const resultado = [];

  datos.forEach(prod => {
    const idManual = prod["ID manual"] || prod["ID"];
    const precio = prod["Precio S/ IVA"] || 0;
    const baseCodigo = prod["Referencia"] || "";
    const detalle = Array.isArray(prod["Detalle"]) ? prod["Detalle"] : [];

    detalle.forEach(d => {
      const combinacion = (d.numeracion || "").trim();
      const cantidad = d.cantidad || 0;
      if (!combinacion) return;

const referencia = baseCodigo.slice(0, -3) + combinacion.padStart(3, "0");

      resultado.push({
        "ID": idManual,
        "Attribute (Name:Type:Position)*": "Número:radio:0",
        "Value (Value:Position)*": `${combinacion}:0`,
        "Referencia": referencia,
        "Cantidad": cantidad,
        "Precio S/ IVA": precio
      });
    });
  });

  if (!resultado.length) {
    alert("No hay combinaciones válidas para procesar.");
    return;
  }

  // Guardamos para exportación posterior
  window.resultadoCombinacionesProcesado = resultado;

  // 👇👇👇 AQUI SE ABRE EL MODAL (tu versión buena)
  abrirModalPrevisualizacionProcesado(resultado);
}



function agregarFilaNumeracion() {
  const tbody = document.getElementById("tablaNumeraciones");
  if (!tbody) return;
  const tr = document.createElement("tr");
  // 🎯 CORRECCIÓN: Agregar las clases 'numeracion-input' y 'cantidad-input'
  tr.innerHTML = `
    <td><input type="text" class="form-control form-control-sm numeracion-input" placeholder="Ej: #10-12"></td>
    <td><input type="number" class="form-control form-control-sm cantidad-input" min="0" value="0"></td>
  `;
  tbody.appendChild(tr);
}


function volverDeCombinaciones() {
  // Ocultar vista combinaciones
  const vista = document.getElementById("vistaCombinaciones");
  if (vista) vista.classList.add("d-none");

  // Mostrar elementos principales
  const tablaDiv = document.getElementById("tablaPreview");
  if (tablaDiv) tablaDiv.classList.remove("d-none");

  const formulario = document.querySelector(".formulario");
  if (formulario) formulario.classList.remove("d-none");

  const botonesTipo = document.getElementById("botonesTipo");
  if (botonesTipo) botonesTipo.classList.remove("d-none");

  const procesarBtn = document.getElementById("botonProcesar");
  if (procesarBtn) procesarBtn.classList.remove("d-none");
}


// === ZIP FOTOS: eventos ===

// Mostrar/ocultar botón al abrir el modal
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.querySelector('#modalColumnas');
  if (modal) {
    modal.addEventListener('show.bs.modal', onAbrirModalProcesar);
  }
});



// === INGRESAR ID PADRES ===

// Detecta los códigos padres (terminados en ...000) a partir de TODOS los SKUs cargados
function obtenerPadresDesdeSKUs() {
  const padres = new Map();

  const todos = [...datosOriginales, ...datosCombinaciones];

  todos.forEach(row => {
    const codigo = extraerCodigo(row);
    if (!codigo) return;

    const prefijo = prefijoPadre(codigo);
    if (!prefijo) return;

    const codigoPadre = `${prefijo}000`;

    // ⚡ Verificamos si realmente hay hijos con este prefijo
    const tieneHijos = todos.some(r => {
      const codHijo = extraerCodigo(r);
      if (!codHijo) return false;
      return prefijoPadre(codHijo) === prefijo && !codHijo.endsWith("000");
    });

    if (tieneHijos) {
      padres.set(codigoPadre, codigoPadre);
    }
  });

  return Array.from(padres.values());
}


function abrirModalIngresarID() {
  const tbody = document.getElementById("tablaIngresarID");
  tbody.innerHTML = "";

  // 🔹 Tomamos todos los productos cargados
  const todos = [...datosOriginales, ...datosCombinaciones, ...datosReposicion];

  if (todos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-muted">No hay productos cargados.</td></tr>`;
    return;
  }

  todos.forEach(row => {
    const sku = extraerCodigo(row);
    if (!sku) return;

    // Detectar ID ya existente
    const idExistente =
      row["prestashop_id"] ||
      row["PRESTASHOP ID"] ||
      row["ID"] ||
      row["id"] ||
      "";

    // Crear fila
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="text-primary sku-copy" 
          style="cursor:pointer;" 
          data-sku="${sku}"
          title="Haz clic para copiar SKU">
          ${sku}
      </td>

      <td>
        <input type="text" class="form-control form-control-sm"
               data-sku="${sku}"
               value="${idExistente}"
               placeholder="Ej: 12345">
      </td>
    `;

    tbody.appendChild(tr);
  });
}



// Copiar código padre al hacer clic
document.addEventListener("click", e => {
  const td = e.target.closest(".codigo-padre");
  if (!td) return;

  const codigo = td.dataset.codigo;
  if (!codigo) return;

  // Copiar al portapapeles
  navigator.clipboard.writeText(codigo).then(() => {
    // Primero, limpiar estilos de otros
    document.querySelectorAll(".codigo-padre").forEach(el => {
      el.classList.remove("bg-success", "text-white");
    });

    // Marcar el actual
    td.classList.add("bg-success", "text-white");

mostrarNotificacion(`Código ${codigo} copiado al portapapeles`, "exito");

  }).catch(err => {
mostrarNotificacion("No se pudo copiar al portapapeles", "error");
    alert("No se pudo copiar al portapapeles");
  });
});

// Quitar el verde si haces clic fuera
document.addEventListener("click", e => {
  const inside = e.target.closest(".codigo-padre");
  if (!inside) {
    document.querySelectorAll(".codigo-padre").forEach(el => {
      el.classList.remove("bg-success", "text-white");
    });
  }
});


function guardarIDsAsignados() {
  const inputs = document.querySelectorAll("#tablaIngresarID input");

  inputs.forEach(input => {
    const id = input.value.trim();
    const sku = input.dataset.sku;
    if (!sku) return;

    // Buscar el producto EXACTO en todas las listas
    const listas = [datosOriginales, datosCombinaciones, datosReposicion];

    listas.forEach(lista => {
      lista.forEach(row => {
        const codigo = extraerCodigo(row);
        if (codigo === sku) {
          row["prestashop_id"] = id;
          row["PRESTASHOP ID"] = id;
          row["ID"] = id;
        }
      });
    });
  });

  mostrarNotificacion("IDs asignados correctamente", "exito");

  // refrescar vista actual
  renderTablaConOrden(
    datosFiltrados.length ? datosFiltrados : [...datosOriginales, ...datosCombinaciones]
  );
}





// Eventos
document.addEventListener("DOMContentLoaded", () => {
  const guardarBtn = document.getElementById("guardarIDs");
  if (guardarBtn) {
    guardarBtn.addEventListener("click", guardarIDsAsignados);
  }
});



function formatearDescripcionHTML(texto, baseCaracteres = 200) {
  if (!texto) return "";

  // 1) Limpieza básica
  let raw = String(texto)
    .replace(/<[^>]+>/g, " ") // quita HTML previo
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";

  // 2) Proteger tokens técnicos (no separar)
  const NBSP = "\u00A0";
  raw = raw.replace(/\b(Plata)\s+(9(?:25|50))\b/gi, (_, m1, m2) => `${m1}${NBSP}${m2}`);
  raw = raw.replace(/\b(\d+(?:[.,]\d+)?)\s+(cm|mm|m|gramos|grs?|g|kg)\b/gi,
    (_, num, unidad) => `${num}${NBSP}${unidad}`);
  raw = raw.replace(/\b(de)\s+(Alargue)\b/gi, (_, d, a) => `${d}${NBSP}${a}`);

  // 3) Particionado en párrafos: 200 chars y cortar en el siguiente punto
  const bloques = [];
  const n = raw.length;
  let i = 0;

  while (i < n) {
    // Si lo que queda es <= baseCaracteres, es el último párrafo
    if (n - i <= baseCaracteres) {
      bloques.push(raw.slice(i).trim());
      break;
    }

    const base = i + baseCaracteres;

    // Buscar el próximo punto desde 'base'
    let p = raw.indexOf(".", base);
    if (p === -1) {
      // No hay más puntos: empuja todo lo restante y termina
      bloques.push(raw.slice(i).trim());
      break;
    }

    // Incluye el punto
    p = p + 1;

    // Empuja bloque [i, p) y avanza
    bloques.push(raw.slice(i, p).trim());
    i = p;
  }

  // 4) Envolver en <p>...</p>
  return bloques.map(b => `<p>${b}</p>`).join("");
}


// === AGREGAR CATEGORÍA ADICIONAL (columna fija "Categoría Adicional") ===

function abrirModalAgregarCategoria() {
  const input = document.getElementById("nuevaCategoria");
  if (input) input.value = ""; // limpia el input antes de abrir el modal
}

function agregarCategoriaAdicional() {
  const input = document.getElementById("nuevaCategoria");
  if (!input) return;

  const nuevaCat = input.value.trim();
  if (!nuevaCat) {
    alert("Por favor ingresa una categoría antes de continuar.");
    return;
  }

  const nombreColumna = "Categoría Adicional";

  // Afectar todos los conjuntos principales
  const conjuntos = [window.datosOriginales, window.datosCombinaciones, window.datosReposicion];
  conjuntos.forEach(lista => {
    if (!Array.isArray(lista)) return;
    lista.forEach(row => {
      row[nombreColumna] = nuevaCat;
    });
  });

  // Añadir la nueva columna al orden de columnas de la vista si no está
  if (!ordenColumnasVista.includes(nombreColumna)) {
    ordenColumnasVista.push(nombreColumna);
  }

  // Cerrar el modal
  const modal = bootstrap.Modal.getInstance(document.getElementById("modalAgregarCategoria"));
  if (modal) modal.hide();

  // Refrescar la tabla visible
  renderTablaConOrden(window.datosFiltrados);

  alert(`Categoría "${nuevaCat}" agregada correctamente a toda la planilla ✅`);
}

function obtenerFilasActivas({ tipoSeleccionado, datosFiltrados, datosOriginales, datosCombinaciones }) {
  // Si estás viendo una tabla filtrada → usar esa
  if (Array.isArray(datosFiltrados) && datosFiltrados.length > 0) {
    return datosFiltrados;
  }

  // Si no hay filtro → usar todo lo cargado
  return [...datosOriginales, ...datosCombinaciones];
}

function extraerUrlFoto(row) {
  if (!row || typeof row !== "object") return "";
  const url = row["FOTO LINK INDIVIDUAL"];
  return typeof url === "string" ? url.trim() : "";
}



function normalizarUrlDrive(url) {
  if (!url) return "";

  url = url.trim().replace(/^"|"$/g, "");

  try {
    const u = new URL(url);

    // --- NO USAMOS PROXY, PROXY ROMPE TODO ---
    // Google Drive normal
    if (u.host.includes("drive.google.com")) {
      const id = driveIdFromUrl(url);
      if (id) {
        return `https://drive.google.com/uc?export=download&id=${id}`;
      }
      return url;
    }

    // Si es una imagen directa (JPG/PNG/etc.) → dejarla tal cual
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(u.pathname)) {
      return url;
    }

    return url; // dejar cualquier otra URL normal
  } catch {
    return url;
  }
}







function registrarErrorImagen(codigo, img) {
  img.src = "https://dummyimage.com/200x200/cccccc/000000&text=Error";

  if (!window.erroresImagenes) window.erroresImagenes = new Set();

  window.erroresImagenes.add(codigo);

  document.getElementById("cantErrores").textContent =
    window.erroresImagenes.size;

  document.getElementById("erroresLinea").classList.remove("d-none");
}




function abrirModalErrores() {
  const listaUl = document.getElementById("listaErrores");
  listaUl.innerHTML = "";
  if (window.erroresImagenes && window.erroresImagenes.length) {
    window.erroresImagenes.forEach(codigo => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.textContent = codigo;
      listaUl.appendChild(li);
    });
  } else {
    listaUl.innerHTML = `<li class="list-group-item text-muted">No hay errores registrados</li>`;
  }
  const modal = new bootstrap.Modal(document.getElementById("modalErrores"));
  modal.show();
}


// === FUNCIÓN NUEVA: VOLVER A LA PLANILLA ===
function volverAVistaPrincipal() {
  document.getElementById("vistaImagenes").classList.add("d-none");
  document.getElementById("tablaPreview").classList.remove("d-none");
  document.getElementById("botonProcesar").classList.remove("d-none");
  document.getElementById("botonProcesarImagenes").classList.remove("d-none");
  const barraBotones = document.getElementById("botonesTipo");
  if (barraBotones) barraBotones.classList.remove("d-none");
  const formulario = document.querySelector(".formulario");
  if (formulario) formulario.classList.remove("d-none");
}







function rowOriginalId(codigo) {
  const all = [...datosOriginales, ...datosCombinaciones, ...datosReposicion];

  const fila = all.find(r => extraerCodigo(r) === codigo);
  if (!fila) return "";

  // Revisamos TODAS las formas en que podría llamarse la columna del ID
  const keys = [
    "prestashop_id",
    "PRESTASHOP ID",
    "ID PRODUCTO",
    "id_producto",
    "Producto ID",
    "ID",
    "id"
  ];

  for (const k of keys) {
    if (fila[k] && fila[k].toString().trim() !== "") {
      return fila[k].toString().trim();
    }
  }

  return "";
}



// === MOSTRAR MODAL DE PREVISUALIZACIÓN Y EXPORTAR ===
function abrirModalPrevisualizacionProcesado(resultado) {
  // crear modal si no existe
  let modal = document.getElementById("modalProcesarCombinaciones");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "modalProcesarCombinaciones";
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Previsualización combinaciones procesadas</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="bodyProcesarCombinaciones" style="max-height:70vh;overflow:auto;"></div>
          <div class="modal-footer">
            <button class="btn btn-success" onclick="exportarCombinacionesProcesadas()">Exportar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const body = modal.querySelector("#bodyProcesarCombinaciones");

  // generar tabla para previsualizar
  const encabezados = [
    "ID",
    "Attribute (Name:Type:Position)*",
    "Value (Value:Position)*",
    "Referencia",
    "Cantidad",
    "Precio S/ IVA"
  ];

  let html = `<div style="overflow-x:auto"><table class="table table-bordered table-sm align-middle">
    <thead class="table-light"><tr>${encabezados.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;

  resultado.forEach(r => {
    html += `<tr>
      <td>${r["ID"]}</td>
      <td>${r["Attribute (Name:Type:Position)*"]}</td>
      <td>${r["Value (Value:Position)*"]}</td>
      <td>${r["Referencia"]}</td>
      <td>${r["Cantidad"]}</td>
      <td>${r["Precio S/ IVA"]}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  body.innerHTML = html;

  const modalInst = new bootstrap.Modal(modal);
  modalInst.show();
}

// === EXPORTAR A EXCEL ===
function exportarCombinacionesProcesadas() {
  if (!window.resultadoCombinacionesProcesado?.length) {
    alert("No hay datos procesados para exportar.");
    return;
  }
  exportarXLSXPersonalizado("combinacion_cantidades", window.resultadoCombinacionesProcesado);
}

async function fetchBlob(url) {
  const res = await fetch(url, { mode: "no-cors" });
  return await res.blob();
}

async function obtenerPesoDesdeImg(url) {
  const blob = await fetchBlob(url);
  return blob.size / 1024;
}

async function comprimirBlob(blobOriginal, maxKB = 120) {
  const img = await new Promise(resolve => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.src = URL.createObjectURL(blobOriginal);
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  let quality = 0.92;
  let blob;

  while (quality > 0.05) {
    blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
    if (blob.size / 1024 <= maxKB) return blob;
    quality -= 0.05;
  }

  return blob;
}

async function procesarImagen(url) {
  const blob = await fetchBlob(url);
  const kb = blob.size / 1024;

  if (kb <= 120) return blob;
  return await comprimirBlob(blob, 120);
}

async function comprimirImagenes() {
  const barra = document.getElementById("barraProgreso");
  const estado = document.getElementById("estadoProgreso");
  const btnComprimir = document.getElementById("btnComprimir");

  if (!window.imagenesProcesadas?.length) {
    alert("No hay imágenes procesadas.");
    return;
  }

  btnComprimir.disabled = true;
  barra.classList.remove("bg-success");
  barra.classList.add("progress-bar-animated");
  estado.textContent = "Comprimiendo imágenes...";

  const zip = new JSZip();
  const total = window.imagenesProcesadas.length;
  let completadas = 0;

  for (const { codigo, url } of window.imagenesProcesadas) {
    try {
      const blobFinal = await procesarImagen(url);
      zip.file(`${codigo}.jpg`, blobFinal);
    } catch (e) {
mostrarNotificacion(`Error procesando imagen ${codigo}`, "alerta");

    }

    completadas++;
    const pct = Math.round((completadas / total) * 100);
    barra.style.width = pct + "%";
    barra.textContent = pct + "%";
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `imagenes_${new Date().toISOString().slice(0,10)}.zip`);

  barra.classList.remove("progress-bar-animated");
  barra.classList.add("bg-success");
  barra.style.width = "100%";
  barra.textContent = "100%";
  estado.textContent = "✅ Archivo ZIP generado correctamente.";

  btnComprimir.disabled = false;
}



async function descargarImagenesZIP() {
  if (!window.imagenesProcesadas?.length) {
    alert("No hay imágenes para descargar.");
    return;
  }

  const zip = new JSZip();
  const total = window.imagenesProcesadas.length;
  let completadas = 0;

  for (const { codigo, url } of window.imagenesProcesadas) {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      zip.file(`${codigo}.jpg`, blob);
    } catch (e) {
      console.warn("Error descargando", codigo, e);
    }
    completadas++;
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `imagenes_${new Date().toISOString().slice(0,10)}.zip`);
}


async function descargarImagenesRenombradasZIP() {
  const JSZip = window.JSZip;
  const zip = new JSZip();

  const filas = obtenerFilasActivas({
    tipoSeleccionado,
    datosFiltrados,
    datosOriginales,
    datosCombinaciones
  });

  const items = filas.map(row => ({
    sku: extraerCodigo(row),
    url: row["FOTO LINK INDIVIDUAL"]
  }));

  for (let item of items) {
    let { sku, url } = item;
    if (!sku || !url) continue;

    // obtener ID del link de Drive
    const match = url.match(/\/d\/([^\/]+)/);
    if (!match) {
mostrarNotificacion(`No se pudo leer el ID de la imagen`, "alerta");

      continue;
    }

    const id = match[1];
    const direct = `https://drive.google.com/uc?export=download&id=${id}`;

    // 🔥 Proxy que sí funciona HOY:
    const proxied = `https://cors.isomorphic-git.org/${direct}`;

    try {
      const res = await fetch(proxied);
      const blob = await res.blob();

      zip.file(`${sku}.jpg`, blob);

    } catch (e) {
      console.error("Error con", sku, e);
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zipBlob);
  a.download = "imagenes_renombradas.zip";
  a.click();
}

function convertirDriveADescarga(url) {
  if (!url) return "";
  const id = driveIdFromUrl(url);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : "";
}


function descargarImagenesDrive() {
  const filas = obtenerFilasActivas({
    tipoSeleccionado,
    datosFiltrados,
    datosOriginales,
    datosCombinaciones
  });

  if (!Array.isArray(filas) || filas.length === 0) {
    alert("No hay filas para descargar imágenes.");
    return;
  }

  // Crear iframe oculto
  let frame = document.getElementById("frameDescargas");
  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = "frameDescargas";
    frame.style.display = "none";
    document.body.appendChild(frame);
  }

  let index = 0;

  function descargarSiguiente() {
    if (index >= filas.length) {
      alert("Descargas finalizadas.");
      return;
    }

    const original = filas[index]["FOTO LINK INDIVIDUAL"];
    index++;

    if (original) {
      const url = driveToDownloadUrl(original);
      frame.src = url;
    }

    // pequeña pausa entre descargas para evitar bloqueo
    setTimeout(descargarSiguiente, 800);
  }

  descargarSiguiente();
}


document.addEventListener("click", function(e) {
  const celda = e.target.closest(".sku-copy");
  if (!celda) return;

  const sku = celda.dataset.sku;
  if (!sku) return;

  navigator.clipboard.writeText(sku).then(() => {
    celda.classList.add("bg-success", "text-white");
    localStorage.setItem("sku_ok_" + sku, true);
  });
});

document.getElementById("botonProcesarImagenes").addEventListener("click", () => {
  renderTablaConOrden(datosFiltrados);
  alert("Vista actualizada con la columna de descarga.");
});


function generarTablaImagenes() {
  const contenedor = document.getElementById("tablaImagenes");
  contenedor.innerHTML = ""; // limpiar antes

  // obtener filas activas (ya tienes esta función hecha)
  const filas = obtenerFilasActivas({
    tipoSeleccionado,
    datosFiltrados,
    datosOriginales,
    datosCombinaciones
  });

  if (!filas.length) {
    contenedor.innerHTML = "<p class='text-muted'>No hay productos para procesar imágenes.</p>";
    return;
  }

  let html = `
    <h4 class="mt-4">Gestor de imágenes</h4>
    <table class="table table-bordered table-sm mt-2">
      <thead>
        <tr>
          <th>CODIGO PRODUCTO</th>
          <th>NOMBRE PRODUCTO</th>
          <th>Descargar</th>
        </tr>
      </thead>
      <tbody>
  `;

  filas.forEach(row => {
    const codigo = extraerCodigo(row);
    const nombre = row["NOMBRE PRODUCTO"] || row["nombre_producto"] || "";
    const urlOriginal = row["FOTO LINK INDIVIDUAL"] || "";

    const id = driveIdFromUrl(urlOriginal);
    const urlDescarga = id ? `https://drive.google.com/uc?export=download&id=${id}` : "";

    // verde si ya fue copiado antes
    const claseVerde = localStorage.getItem("sku_ok_" + codigo) ? "bg-success text-white" : "";

    html += `
      <tr>
        <td class="sku-copy ${claseVerde}" style="cursor:pointer;" data-sku="${codigo}">
          ${codigo}
        </td>
        <td>${nombre}</td>
        <td>
          ${
            urlDescarga
              ? `<a class="btn btn-primary btn-sm" href="${urlDescarga}" target="_blank">Descargar</a>`
              : `<span class="text-muted">Sin imagen</span>`
          }
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  contenedor.innerHTML = html;
}


document.addEventListener("click", function(e) {
  const celda = e.target.closest(".sku-copy");
  if (!celda) return;

  const sku = celda.dataset.sku;
  if (!sku) return;

  navigator.clipboard.writeText(sku).then(() => {
    celda.classList.add("bg-success", "text-white");
    localStorage.setItem("sku_ok_" + sku, true);
  });
});


function generarTablaImagenes() {
  // Ocultar vistas principales
  document.getElementById("tablaPreview")?.classList.add("d-none");
  document.getElementById("botonesTipo")?.classList.add("d-none");
  document.getElementById("botonProcesar")?.classList.add("d-none");
  document.querySelector(".formulario")?.classList.add("d-none");
  document.getElementById("botonProcesarImagenes")?.classList.add("d-none");

  // Mostrar vista de imágenes
  const vista = document.getElementById("vistaImagenes");
  vista.classList.remove("d-none");

  const filas = obtenerFilasActivas({
    tipoSeleccionado,
    datosFiltrados,
    datosOriginales,
    datosCombinaciones
  });

  if (!filas.length) {
    vista.innerHTML = "<p class='text-muted'>No hay productos para procesar imágenes.</p>";
    return;
  }

  // Construcción de la tabla
  let html = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4>Imágenes de productos</h4>
      <button class="btn btn-secondary" onclick="volverVistaPrincipal()">← Volver</button>
    </div>

    <table class="table table-bordered table-sm">
      <thead>
        <tr>
          <th>CODIGO PRODUCTO</th>
          <th>NOMBRE PRODUCTO</th>
          <th>Descargar imagen</th>
        </tr>
      </thead>
      <tbody>
  `;

  filas.forEach(row => {
    const codigo = extraerCodigo(row);
    const nombre = row["NOMBRE PRODUCTO"] || row["nombre_producto"] || "";
    const url = row["FOTO LINK INDIVIDUAL"] || "";

    const id = driveIdFromUrl(url);
    const urlDescarga = id ? `https://drive.google.com/uc?export=download&id=${id}` : "";

    const claseVerde = localStorage.getItem("sku_ok_" + codigo)
      ? "bg-success text-white"
      : "";

    html += `
      <tr>
        <td class="sku-copy ${claseVerde}" style="cursor:pointer;" data-sku="${codigo}">
          ${codigo}
        </td>
        <td>${nombre}</td>
        <td>
          ${
            urlDescarga
              ? `<a class="btn btn-primary btn-sm" href="${urlDescarga}" target="_blank">Descargar</a>`
              : `<span class="text-muted">Sin imagen</span>`
          }
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  vista.innerHTML = html;
}


function volverVistaPrincipal() {
  document.getElementById("vistaImagenes")?.classList.add("d-none");

  document.getElementById("tablaPreview")?.classList.remove("d-none");
  document.getElementById("botonesTipo")?.classList.remove("d-none");
  document.getElementById("botonProcesar")?.classList.remove("d-none");
  document.querySelector(".formulario")?.classList.remove("d-none");
  document.getElementById("botonProcesarImagenes")?.classList.remove("d-none");
}


document.addEventListener("click", function(e) {
  const celda = e.target.closest(".sku-copy");
  if (!celda) return;

  const sku = celda.dataset.sku;
  if (!sku) return;

  navigator.clipboard.writeText(sku).then(() => {
    celda.classList.add("bg-success", "text-white");
    localStorage.setItem("sku_ok_" + sku, true);
  });
});



function obtenerTipoDeProducto(nombre, categoriaBase, subtipoOriginal, categoriaPlata) {
  nombre = nombre.toLowerCase();

  // =====================================================
  // 1) DETECTAR SI ES ENCHAPADO
  // =====================================================
  const esEnchapado =
    nombre.includes("enchapad") ||
    nombre.includes("bañado") ||
    nombre.includes("bañada");

  // =====================================================
  // 2) LÓGICA COMPLETA PARA PLATA
  // =====================================================
  if (!esEnchapado) {

    // A) Si trae subtipo válido → usarlo tal cual
    if (
      subtipoOriginal &&
      subtipoOriginal.trim() !== "" &&
      subtipoOriginal.toLowerCase() !== "sin valor"
    ) {
      return subtipoOriginal.trim();
    }

    // B) Si NO trae subtipo → usar categoría de plata
    if (categoriaPlata && categoriaPlata.trim() !== "") {
      return categoriaPlata.trim();
    }

    // C) fallback (extremadamente raro)
    return categoriaBase;
  }

  // =====================================================
  // 3) LÓGICA PARA ENCHAPADO (Regla 1 - sinónimos)
  // =====================================================

  const subtiposPorCategoria = {
    aros: [
      { keys: ["circon", "circón", "circones", "cristal"], label: "Aros de Circón" },
      { keys: ["corazon", "corazón", "corazones"], label: "Aros de Corazón" },
      { keys: ["estrella"], label: "Aros Estrella" },
      { keys: ["perla"], label: "Aros Perla" },
      { keys: ["cuff", "trepador"], label: "Aros Cuff / Trepadores" },
      { keys: ["mariposa"], label: "Aros Mariposa" },
      { keys: ["flor", "trebol", "trébol"], label: "Aros Florales" },
      { keys: ["argolla"], label: "Aros Argolla" }
    ],

    collares: [
      { keys: ["corazon", "corazón"], label: "Collares con Corazón" },
      { keys: ["cruz"], label: "Collares Cruz" },
      { keys: ["circon", "circón", "cristal"], label: "Collares con Circón" },
      { keys: ["perla"], label: "Collares con Perla" },
      { keys: ["dije", "colgante"], label: "Collares con Dije" },
      { keys: ["placa"], label: "Collares Placa" }
    ],

    pulseras: [
      { keys: ["eslabon", "eslabón"], label: "Pulseras Eslabón" },
      { keys: ["circon", "circón"], label: "Pulseras con Circón" },
      { keys: ["piedra"], label: "Pulseras con Piedra" },
      { keys: ["macrame", "macramé"], label: "Pulseras Macramé" },
      { keys: ["cadena"], label: "Pulseras Cadena" }
    ],

    anillos: [
      { keys: ["circon", "circón"], label: "Anillos con Circón" },
      { keys: ["piedra"], label: "Anillos Piedra Natural" },
      { keys: ["falange", "midi"], label: "Anillos MIDI / Falange" },
      { keys: ["marquesita"], label: "Anillos Marquesita" },
      { keys: ["liso"], label: "Anillos Lisos" }
    ],

    colgantes: [
      { keys: ["inicial", "letra"], label: "Colgantes Inicial" },
      { keys: ["piedra"], label: "Colgantes Piedra Natural" },
      { keys: ["cruz"], label: "Colgantes Cruz" },
      { keys: ["placa"], label: "Colgantes Placa" },
      { keys: ["niño", "niña"], label: "Colgantes Niño/Niña" }
    ],

    cadenas: [
      { keys: ["cartier"], label: "Cadenas Cartier" },
      { keys: ["gucci"], label: "Cadenas Gucci" },
      { keys: ["rolo"], label: "Cadenas Rolo" },
      { keys: ["singapur"], label: "Cadenas Singapur" },
      { keys: ["veneciana"], label: "Cadenas Veneciana" },
      { keys: ["eslabon", "eslabón"], label: "Cadenas Eslabón" }
    ],

    tobilleras: [
      { keys: ["perla"], label: "Tobilleras con Perlas" },
      { keys: ["cadena"], label: "Tobilleras Cadena" },
      { keys: ["dije"], label: "Tobilleras con Dije" }
    ],

    conjuntos: [
      { keys: ["corazon", "corazón"], label: "Conjuntos Corazón" },
      { keys: ["circon", "circón"], label: "Conjuntos Circón" },
      { keys: ["perla"], label: "Conjuntos Perla" },
      { keys: ["cruz"], label: "Conjuntos Cruz" }
    ]
  };

  const lista = subtiposPorCategoria[categoriaBase] || [];

  for (const st of lista) {
    for (const k of st.keys) {
      if (nombre.includes(k)) return st.label;
    }
  }

  // =====================================================
  // 4) SI NO ENCUENTRA SUBTIPO → categoría enchapada final
  // =====================================================
  const nombresCategoriasEnchapado = {
    anillos: "Anillos Enchapados",
    aros: "Aros Enchapados",
    cadenas: "Cadenas Enchapadas",
    colgantes: "Colgantes Enchapados",
    pulseras: "Pulseras Enchapadas",
    tobilleras: "Tobilleras Enchapadas",
    collares: "Collares Enchapados",
    conjuntos: "Conjuntos Enchapados",
    infantil: "Infantil Enchapados"
  };

  return nombresCategoriasEnchapado[categoriaBase] || "Enchapados";
}











//V1