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
  const tipo = (row["procucto_tipo"] || row["PRODUCTO TIPO"] || "").toString().toLowerCase();
  const combi = (row["PRODUCTO COMBINACION"] || "").toString().trim().toLowerCase();

  // Es anillo solo si dice "anillo" y no es Midi
  return tipo.includes("anillo") && combi !== "midi";
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


// === ZIP FOTOS: utilidades ===

// Toma dataset activo según reglas acordadas
function obtenerFilasActivas({ tipoSeleccionado, datosFiltrados, datosOriginales, datosCombinaciones }) {
  // ✅ Prioridad: datos filtrados (si hay algo)
  if (Array.isArray(datosFiltrados) && datosFiltrados.length > 0) {
    return datosFiltrados;
  }

  // ✅ Combinar todo si no hay filtrado activo
  const base = [];
  if (Array.isArray(datosOriginales) && datosOriginales.length) base.push(...datosOriginales);
  if (Array.isArray(datosCombinaciones) && datosCombinaciones.length) base.push(...datosCombinaciones);

  // ✅ Fallback final: intenta tomar las globales directas
  if (base.length === 0 && Array.isArray(window.datosFiltrados) && window.datosFiltrados.length) {
    return window.datosFiltrados;
  }

  return base;
}

// Extrae URL de foto contemplando variantes del header (¡incluye el espacio!)
function extraerUrlFoto(row) {
  if (!row || typeof row !== "object") return "";
  const url = row["FOTO LINK INDIVIDUAL"];
  return typeof url === "string" ? url.trim() : "";
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
  const btnZip = document.getElementById('btnDescargarFotosZip');
  if (!btnZip) return;

  const filas = obtenerFilasActivas({
    tipoSeleccionado, datosFiltrados, datosOriginales, datosCombinaciones
  });

  // Mostrar el botón si hay al menos 1 fila activa
  const show = Array.isArray(filas) && filas.length > 0;

  console.log('[zip] evaluar botón →', {
    btnZip: !!btnZip,
    tipoSeleccionado,
    filas: Array.isArray(filas) ? filas.length : 0,
    show
  });

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

// Usa Google Drive API (CORS OK) cuando haya API key
function normalizarUrlDrive(url) {
  if (!url) return '';
  const id = driveIdFromUrl(url);
  if (!id) return url; // No es Drive: se usa tal cual

  if (window.DRIVE_API_KEY) {
    // Endpoint oficial con CORS para contenido público
    return `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${encodeURIComponent(window.DRIVE_API_KEY)}`;
  }

  // Fallback (puede fallar por CORS/403)
  return `https://drive.google.com/uc?export=download&id=${id}`;
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

// Deducción de extensión con prioridad: Content-Disposition > Content-Type > URL > .jpg
function deducirExtension({ response, finalUrl }) {
  const cd = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
  const fromCD = filenameDeContentDisposition(cd);
  if (fromCD && /\.[a-z0-9]{2,5}$/i.test(fromCD)) return '.' + fromCD.split('.').pop().toLowerCase();

  const ct = response.headers.get('Content-Type') || response.headers.get('content-type');
  const extCT = extPorContentType(ct);
  if (extCT) return extCT;

  try {
    const u = new URL(finalUrl);
    const path = u.pathname || '';
    const m1 = path.match(/\.(jpg|jpeg|png|webp|gif|bmp|tiff|heic|svg)(?:\?|$)/i);
    if (m1?.[1]) return (m1[1].toLowerCase() === 'jpeg') ? '.jpg' : `.${m1[1].toLowerCase()}`;
    const q = u.searchParams.toString();
    const m2 = q.match(/(?:type|format)=?(jpg|jpeg|png|webp|gif|bmp|tiff|heic|svg)/i);
    if (m2?.[1]) return (m2[1].toLowerCase() === 'jpeg') ? '.jpg' : `.${m2[1].toLowerCase()}`;
  } catch {}
  return '.jpg';
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


// === ZIP FOTOS: acción principal ===
async function descargarFotosComoZip(_ctx = {}, concurrencia = 4) {
  const progressEl = document.getElementById("zipProgress");
  if (progressEl) {
    progressEl.style.display = "inline";
    progressEl.textContent = "Preparando…";
  }

  // 🟢 Forzar uso de los datos actualmente visibles (datosFiltrados)
  const filas =
    (Array.isArray(window.datosFiltrados) && window.datosFiltrados.length
      ? window.datosFiltrados
      : (Array.isArray(window.datosOriginales) && window.datosOriginales.length
          ? window.datosOriginales
          : (Array.isArray(window.datosCombinaciones) && window.datosCombinaciones.length
              ? window.datosCombinaciones
              : [])));

  console.log("[ZIP] Filas obtenidas:", filas.length);
  console.log("[ZIP] Ejemplo FOTO LINK INDIVIDUAL:", filas[0]?.["FOTO LINK INDIVIDUAL"]);

  const lista = [];
  let faltantesSinUrl = 0;

  for (const row of filas) {
    const codigo = extraerCodigo(row);
    const rawUrl = extraerUrlFoto(row); // debe devolver la URL de 'FOTO LINK INDIVIDUAL'

    if (!codigo) continue;
    if (!rawUrl) {
      faltantesSinUrl++;
      continue;
    }

    const url = normalizarUrlDrive(rawUrl);
    lista.push({ codigo, url });
  }

  // ⚠️ Si no hay URLs válidas
  if (!lista.length) {
    if (progressEl) progressEl.style.display = "none";
    alert("No se encontraron fotos para descargar en las filas activas.");
    console.warn("[ZIP] Ninguna URL detectada. filas:", filas.length, "faltantes:", faltantesSinUrl);
    return;
  }

  // 🧩 Evitar duplicados
  const usados = new Map();
  const zip = new JSZip();
  let exitosas = 0;

  console.log("[ZIP] Iniciando descarga de", lista.length, "archivos…");

  const resultados = await procesaConConcurrencia(
    lista,
    async (item) => {
      const finalUrl = item.url;
      const resp = await fetch(finalUrl, { credentials: "omit" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();

      const ext = deducirExtension({ response: resp, finalUrl });
      const base = safeName(item.codigo);
      const n = (usados.get(base) || 0) + 1;
      usados.set(base, n);

      const filename = n === 1 ? `${base}${ext}` : `${base}_${n}${ext}`;
      zip.file(filename, blob);
      exitosas++;
    },
    concurrencia,
    (done, total) => {
      if (progressEl) progressEl.textContent = `Descargando ${done}/${total}…`;
    }
  );

  const fallidas = resultados.filter(r => !r || !r.ok).length;

  if (progressEl) progressEl.textContent = "Empaquetando…";
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const nombreZip = `fotos_${fechaDDMMYY()}.zip`;

  if (typeof saveAs === "function") {
    saveAs(zipBlob, nombreZip);
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = nombreZip;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  if (progressEl) progressEl.style.display = "none";

  const totalIntentadas = lista.length;
  const total = totalIntentadas + faltantesSinUrl;
  const msg = `Descarga finalizada. Incluidas: ${exitosas}/${total}. Fallidas: ${fallidas}. Sin URL: ${faltantesSinUrl}.`;
  console.warn(msg);
  alert(msg);
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
      } else if (materialRaw.includes("accesorios")) {
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

      // ⚠️ Si es un anillo y el campo combinaciones está vacío → error
      if (esAnilloConValidacion && combinacion === "") {
        errores.push(`${sku} - combinaciones vacías (${categoria})`);
        return;
      }

      // 🟢 Determinar si el campo de combinación tiene realmente algo útil
      const combiValida =
        combinacion !== "" &&
        combinacion.toLowerCase() !== "sin valor" &&
        combinacion.toLowerCase() !== "null" &&
        combinacion.toLowerCase() !== "ninguno";

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

        // ❌ Excluir si producto_combinacion = "midi"
        const combiTipo = (
          row["producto_combinacion"] ||
          row["PRODUCTO COMBINACION"] ||
          ""
        ).toString().trim().toLowerCase();
        if (combiTipo === "midi") return;

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




// --- Características (misma lógica, soportando nombres nuevos y antiguos como fallback) ---
// --- Características (con manejo especial de Dimensión) ---
function construirCaracteristicas(row) {
  const getField = (preferKeys, includeText) => {
    const valExact = firstNonEmpty(row, preferKeys);
    if (valExact) return valExact;
    const k = detectarColumnaQueIncluye(row, includeText);
    return k ? (row[k] ?? "").toString().trim() : "";
  };

  // Helpers para DIMENSIÓN
  const limpiarSeparadores = (s) => s.replace(/\s*:\s*/g, " ").replace(/\s+/g, " ").trim();

  const normalizarEtiquetaYValor = (texto, etiquetaPorDefecto = "") => {
    let t = limpiarSeparadores(texto);

    // Quitar "de Alargue" si aparece
    t = t.replace(/\s*de\s*alargue\b/i, "").trim();

    // Si ya viene con etiqueta conocida, la respetamos
    const mEtiquetaPrimero = t.match(/^(largo|ancho|alto|di[aá]metro|circunferencia|alargue)\b\s*(.*)$/i);
    if (mEtiquetaPrimero) {
      const etiqueta = mEtiquetaPrimero[1];
      const valor = mEtiquetaPrimero[2].trim();
      return `${capitalizar(etiqueta)} ${valor}`;
    }

    // Si viene solo el valor, aplicamos etiqueta por defecto (si existe)
    if (etiquetaPorDefecto) {
      return `${etiquetaPorDefecto} ${t}`;
    }

    // Sin etiqueta conocida ni por defecto → devolver como está, solo normalizado
    return t;
  };

  const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const modelo = getField(["modelo", "Modelo", "MODELO PRODUCTO"], "modelo");
const material = getField([
  "producto_material",
  "PRODUCTO MATERIAL",
  "ID PRODUCTO MATERIAL"
], "material");
const estilo = getField([
  "producto_estilo",
  "PRODUCTO ESTILO",
  "ID PRODUCTO ESTILO"
], "estilo");
const dimension = getField([
  "dimension", "DIMENSION", "Dimensión", "Dimensiones"
], "dimension");
const peso = getField(["peso", "PESO"], "peso");


  const partes = [];
  if (modelo)    partes.push(`Modelo: ${modelo}`);

  // ⬇️ DIMENSIÓN (sin "=" y con soporte para "X cm + Y cm de Alargue")
  if (dimension) {
    String(dimension)
      .split(",")
      .map(p => p.trim())
      .filter(Boolean)
      .forEach(part => {
        // Caso especial con "+"
        if (part.includes("+")) {
          const trozos = part.split("+").map(x => x.trim());

          if (trozos[0]) {
            const largoFmt = normalizarEtiquetaYValor(trozos[0], "Largo");
            partes.push(`Dimensión: ${largoFmt}`);
          }
          if (trozos[1]) {
            const alargueFmt = normalizarEtiquetaYValor(trozos[1], "Alargue");
            partes.push(`Dimensión: ${alargueFmt}`);
          }
          return;
        }

        // Caso normal: reemplazar ":" por espacio y nunca usar "="
        const ajustado = normalizarEtiquetaYValor(part);
        partes.push(`Dimensión: ${ajustado}`);
      });
  }

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

/// ✅ CANTIDAD FINAL (con stock original protegido)
let cantidad = row["_stock_original"] ?? row["cantidad"] ?? row["CANTIDAD"] ?? 0;

// Si es padre (...000) → stock 0
const codigoStr = String(codigo || "");
if (codigoStr.endsWith("000")) {
  cantidad = 0;
} else {
  // Si es un producto con combinaciones, dejamos su stock original
  // Si NO tiene combinaciones, también se mantiene igual
  // Solo los padres deben quedar en 0
  cantidad = cantidad || 0; // asegura número
}


    const resumen = row["DESCRIPCION RESUMEN"] || row["descripcion_resumen"] || row["Resumen"] || "";
    const descripcionRaw = row["DESCRIPCION EXTENSA"] || row["descripcion_extensa"] || row["Descripción"] || "";
    const descripcion = formatearDescripcionHTML(descripcionRaw);

    const precioConIVA = parsePrecioConIVA(row["PRECIO PRESTASHOP"] || row["precio_prestashop"]);
    const precioSinIVA = precioConIVA === null ? "0.00" : (precioConIVA / 1.19).toFixed(2).replace(",", ".");

    const foto = codigo ? `https://distribuidoradejoyas.cl/img/prod/${codigo}.jpg` : "";

    return {
      "ID": idProducto || "",
      "Activo (0/1)": 0,
      "Nombre": nombre,
      "Categorias": construirCategorias(row),
      "Precio S/IVA": precioSinIVA,
      "Regla de Impuesto": 2,
      "Código Referencia SKU": codigo,
      "Marca": "DJOYAS",
      "Cantidad": cantidad,
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

  // exportar TODO (inyectar padres para que el XLSX tenga los ...000)
  let dataset = (Array.isArray(datosFiltrados) && datosFiltrados.length)
    ? datosFiltrados
    : [...datosOriginales, ...datosCombinaciones];

  dataset = inyectarPadresEnDataset(dataset);

  exportarXLSX("todo", dataset);
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

  const todos = [...datosOriginales, ...datosCombinaciones];

  // 1) separar tipos especiales
  const anillos = todos.filter(esAnillo);
  const colgantesLetra = todos.filter(esColganteLetra);

  // 2) el resto (no anillos y no colgantes de letra)
  const otros = todos.filter(row => !anillos.includes(row) && !colgantesLetra.includes(row));

  // 3) agrupar en padres (…000) anillos + colgantes de letra
  const anillosPadres = agruparAnillosComoPadres(anillos);
  const colgantesPadres = agruparAnillosComoPadres(colgantesLetra);

  // 4) vista: solo padres y el resto de productos
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


/** ---------- COMBINACIONES (tabla especial) ---------- **/


function mostrarTablaCombinacionesCantidad() {
  tipoSeleccionado = "combinacion_cantidades";
  const tablaDiv = document.getElementById("tablaPreview");
  const procesarBtn = document.getElementById("botonProcesar");

  const todos = [...datosOriginales, ...datosCombinaciones];
  const resultado = [];

  todos.forEach(row => {
    const tipo = (row["producto_tipo"] || row["procucto_tipo"] || row["PRODUCTO TIPO"] || "").toString().toLowerCase();
    const idProducto = asNumericId(row["prestashop_id"] || row["PRESTASHOP ID"]);
    const codigo = extraerCodigo(row);
const cantidad = row["cantidad"] || row["CANTIDAD"] || 0;
    const precioConIVA = parsePrecioConIVA(row["precio_prestashop"] || row["PRECIO PRESTASHOP"] );
    const precioSinIVA = precioConIVA === null ? 0 : +(precioConIVA / 1.19).toFixed(2);

    // --- ANILLOS ---
    if (esAnillo(row)) {
      const valueNum = ultimosDosDigitosDeCodigo(codigo);
      if (!valueNum) return;

      resultado.push({
        "ID": idProducto,
        "Attribute (Name:Type:Position)*": "Número:radio:0",
        "Value (Value:Position)*": `${valueNum}:0`,
        "Referencia": codigo,
        "Cantidad": cantidad,
        "Precio S/ IVA": precioSinIVA
      });
      return;
    }

    // --- COLGANTES CON LETRAS (A–Z) ---
    if (esColganteLetra(row)) {
      // letra desde columna o desde el final del código
      let letra = (row["producto_combinacion"] || row["PRODUCTO COMBINACION"] || "").toString().trim().toUpperCase();
      if (!/^[A-Z]$/.test(letra)) {
        const m = codigo.match(/([A-Z])$/i);
        letra = m ? m[1].toUpperCase() : "";
      }
      if (!letra) return;

      const pos = letra.charCodeAt(0) - "A".charCodeAt(0);

      resultado.push({
        "ID": idProducto,
        "Attribute (Name:Type:Position)*": "Letras:select:0",
        "Value (Value:Position)*": `${letra}:${pos}`,
        "Referencia": codigo,
        "Cantidad": cantidad,
        "Precio S/ IVA": precioSinIVA
      });
      return;
    }
  });

  // --- SIN RESULTADOS ---
  if (!resultado.length) {
    tablaDiv.innerHTML = `<p class='text-muted'>No se encontraron combinaciones válidas (anillos o colgantes de letra).</p>`;
    procesarBtn.classList.add("d-none");
    datosCombinacionCantidades = [];
    return;
  }

  // --- GUARDAR Y MOSTRAR TABLA PREVIA ---
  datosCombinacionCantidades = resultado;

  // 🟢 Renderizado de tabla de previsualización corregido
  const encabezados = [
    "ID",
    "Attribute (Name:Type:Position)*",
    "Value (Value:Position)*",
    "Referencia",
    "Cantidad",
    "Precio S/ IVA"
  ];

  const html = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <strong>Mostrando ${resultado.length} combinaciones generadas</strong>
    </div>
    <div class="table-responsive">
      <table class="table table-bordered table-sm align-middle mb-3">
        <thead class="table-light">
          <tr>${encabezados.map(h => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${resultado.map(r => `
            <tr>
              <td>${r["ID"] ?? ""}</td>
              <td>${r["Attribute (Name:Type:Position)*"] ?? ""}</td>
              <td>${r["Value (Value:Position)*"] ?? ""}</td>
              <td>${r["Referencia"] ?? ""}</td>
              <td>${r["Cantidad"] ?? ""}</td>
              <td>${r["Precio S/ IVA"] ?? ""}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  tablaDiv.innerHTML = html;
  procesarBtn.classList.remove("d-none");
}




// === ZIP FOTOS: eventos ===

// Mostrar/ocultar botón al abrir el modal
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.querySelector('#modalColumnas');
  if (modal) {
    modal.addEventListener('show.bs.modal', onAbrirModalProcesar);
  }
});



//corte


// ========= DEBUG / AUTO-INTEGRACIÓN BOTÓN ZIP =========
(function () {
  const MODAL_ID = 'modalColumnas';
  const BTN_ID = 'btnDescargarFotosZip';
  const PROG_ID = 'zipProgress';

  // 0) Asegura que exista el botón (si no está en el HTML, lo inserta)
  document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) {
      console.warn('[zip] No se encontró #' + MODAL_ID + ' en el DOM.');
      return;
    }
    const footer = modal.querySelector('.modal-footer');
    if (!footer) {
      console.warn('[zip] No se encontró .modal-footer dentro del modal.');
      return;
    }
    let btn = document.getElementById(BTN_ID);
    let prog = document.getElementById(PROG_ID);

    if (!btn) {
      btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      btn.className = 'btn btn-outline-secondary';
      btn.style.display = 'none';
      btn.textContent = 'Descargar fotos (.zip)';
      // Inserta ANTES del botón Exportar, si existe:
      const exportBtn = footer.querySelector('#confirmarExportar');
      if (exportBtn) footer.insertBefore(btn, exportBtn);
      else footer.appendChild(btn);
      console.log('[zip] Botón ZIP inyectado en el modal.');
    }
    if (!prog) {
      prog = document.createElement('small');
      prog.id = PROG_ID;
      prog.className = 'text-muted ms-2';
      prog.style.display = 'none';
      prog.textContent = 'Descargando 0/0…';
      btn.after(prog);
      console.log('[zip] Indicador de progreso inyectado.');
    }
  });

  // 1) Envoltorio de diagnóstico para onAbrirModalProcesar
  const _orig_onAbrir = (typeof onAbrirModalProcesar === 'function') ? onAbrirModalProcesar : null;

window.onAbrirModalProcesar = function () {
  const btnZip = document.getElementById(BTN_ID);
  const filas = obtenerFilasActivas({ 
    tipoSeleccionado, datosFiltrados, datosOriginales, datosCombinaciones 
  });

  const show = Array.isArray(filas) && filas.length > 0;

  console.log('[zip] evaluar botón →', {
    btnZip: !!btnZip,
    tipoSeleccionado,
    filas: Array.isArray(filas) ? filas.length : 0,
    show
  });

  if (btnZip) btnZip.style.display = show ? 'inline-block' : 'none';
  if (_orig_onAbrir) try { _orig_onAbrir(); } catch (e) {}
};


  // 2) Forzar evaluación al preparar el modal (por si el evento de Bootstrap no corre)
  const _orig_preparar = (typeof prepararModal === 'function') ? prepararModal : null;
  window.prepararModal = function () {
    if (_orig_preparar) _orig_preparar.apply(this, arguments);
    // tras armar la tabla:
    try { window.onAbrirModalProcesar(); } catch (e) {
      console.error('[zip] onAbrirModalProcesar() falló al final de prepararModal:', e);
    }
  };

  // 3) Engancha ambos eventos de Bootstrap para cubrir todos los casos
  document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;

    // show: antes de que sea visible
    modal.addEventListener('show.bs.modal', () => {
      console.log('[zip] show.bs.modal');
      try { window.onAbrirModalProcesar(); } catch (e) {
        console.error('[zip] error en show.bs.modal:', e);
      }
    });

    // shown: ya visible en pantalla
    modal.addEventListener('shown.bs.modal', () => {
      console.log('[zip] shown.bs.modal');
      try { window.onAbrirModalProcesar(); } catch (e) {
        console.error('[zip] error en shown.bs.modal:', e);
      }
    });
  });

// 4) Click del botón (con guard para evitar descargas duplicadas)
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#' + BTN_ID);
  if (!btn) return;

  if (window.zipDescargando) {
    console.warn('[zip] Descarga en curso; se ignora click adicional.');
    return;
  }

  console.log('[zip] click botón ZIP');

  // ✅ Acceso a variables globales reales
  const tipoSel = window.tipoSeleccionado;
  const datosFilt = window.datosFiltrados || [];
  const datosOrig = window.datosOriginales || [];
  const datosComb = window.datosCombinaciones || [];

  console.log('[zip] Debug variables globales (forzadas):', {
    datosFiltrados: datosFilt.length,
    datosOriginales: datosOrig.length,
    datosCombinaciones: datosComb.length,
    tipoSeleccionado: tipoSel
  });

  try {
    if (typeof JSZip === 'undefined') {
      alert('Falta JSZip. Verifica que el CDN esté cargado.');
      return;
    }

    window.zipDescargando = true;
    btn.disabled = true;

    // 🔥 Usamos los datos reales del window
    await descargarFotosComoZip({
      tipoSeleccionado: tipoSel,
      datosFiltrados: datosFilt,
      datosOriginales: datosOrig,
      datosCombinaciones: datosComb
    }, 4);

  } catch (err) {
    console.error('[zip] No se pudo iniciar/completar la descarga ZIP:', err);
    alert('No se pudo iniciar/completar la descarga. Revisa la consola para más detalles.');
  } finally {
    window.zipDescargando = false;
    btn.disabled = false;
  }
});



})();


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


// Construye la tabla del modal (precargando IDs si ya existen)
function abrirModalIngresarID() {
  const padres = obtenerPadresDesdeSKUs();
  const tbody = document.getElementById("tablaIngresarID");
  tbody.innerHTML = "";

  if (padres.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-muted">No se encontraron padres en los SKUs cargados.</td></tr>`;
    return;
  }

  padres.forEach(codigoPadre => {
    let idExistente = "";

    // Buscar en padre e hijos si ya existe un prestashop_id
    [...datosOriginales, ...datosCombinaciones].forEach(row => {
      const codigoRow = extraerCodigo(row);
      if (!codigoRow) return;
      const prefijo = prefijoPadre(codigoRow);
      const padreEsperado = `${prefijo}000`;

      if (padreEsperado === codigoPadre || codigoRow === codigoPadre) {
        if (row["prestashop_id"]) {
          idExistente = row["prestashop_id"]; // siempre se queda con el último encontrado
        }
      }
    });

const tr = document.createElement("tr");
tr.innerHTML = `
  <td class="codigo-padre text-primary" 
      style="cursor:pointer;" 
      data-codigo="${codigoPadre}" 
      title="Haz clic para copiar">${codigoPadre}</td>
  <td>
    <input type="text" class="form-control form-control-sm"
           data-codigo="${codigoPadre}" 
           value="${idExistente}" 
           placeholder="Ej: 1234">
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

    console.log(`Código ${codigo} copiado al portapapeles ✅`);
  }).catch(err => {
    console.error("No se pudo copiar al portapapeles", err);
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


// Guarda IDs y los propaga a todos los hijos + padre
function guardarIDsAsignados() {
  const inputs = document.querySelectorAll("#tablaIngresarID input");
  inputs.forEach(input => {
    const id = input.value.trim();
    const codigoPadre = input.dataset.codigo;
    if (!id) return;

    // Asignamos en padre e hijos que compartan el prefijo
    [...datosOriginales, ...datosCombinaciones].forEach(row => {
      const codigo = extraerCodigo(row);
      if (!codigo) return;

      const prefijo = prefijoPadre(codigo);
      const padreEsperado = `${prefijo}000`;

      if (padreEsperado === codigoPadre || codigo === codigoPadre) {
        row["prestashop_id"] = id; // siempre sobrescribe
      }
    });
  });

  alert("IDs asignados/actualizados correctamente.");

  // 🔄 Refrescar la tabla de preview para ver cambios
  if (Array.isArray(datosFiltrados) && datosFiltrados.length > 0) {
    renderTablaConOrden(datosFiltrados);
  }
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



//V 1.5