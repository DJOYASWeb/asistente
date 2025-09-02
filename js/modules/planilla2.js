// js/modules/planilla.js

let zipDescargando = false;
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

function esAnillo(row) {
  const tipo = (row["procucto_tipo"] || row["producto_tipo"] || "").toString().toLowerCase();
  return tipo.includes("anillo"); // matchea "Anillo" o "Anillos"
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
function agruparAnillosComoPadres(anillos) {
  const grupos = new Map(); // key = prefijo (sin los últimos 3)
  anillos.forEach(row => {
    const codigo = row["codigo_producto"] || row["Código"] || "";
    const key = prefijoPadre(codigo);
    if (!key) return;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(row);
  });

  const padres = [];
  grupos.forEach((miembros, key) => {
    const base = { ...miembros[0] };
    const codigoPadre = `${key}000`;
    base["codigo_producto"] = codigoPadre;
    base["Cantidad"] = 0;              // para la vista previa
    base["cantidad"] = 0;              // para el export
    base["prestashop_id"] = "";        // ID vacío (nuevo padre)
    // opcional: quitar combinaciones en el padre
    // base["Combinaciones"] = "";
    padres.push(base);
  });

  return padres;
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


// === ZIP FOTOS: utilidades ===

// Toma dataset activo según reglas acordadas
function obtenerFilasActivas({ tipoSeleccionado, datosFiltrados, datosOriginales, datosCombinaciones }) {
  if (tipoSeleccionado === 'combinacion_cantidades') {
    return Array.isArray(datosFiltrados) && datosFiltrados.length ? datosFiltrados : [];
  }
  if (Array.isArray(datosFiltrados) && datosFiltrados.length) return datosFiltrados;
  const base = [];
  if (Array.isArray(datosOriginales)) base.push(...datosOriginales);
  if (Array.isArray(datosCombinaciones)) base.push(...datosCombinaciones);
  return base;
}

// Extrae URL de foto contemplando variantes del header (¡incluye el espacio!)
function extraerUrlFoto(row) {
  let url = row?.['foto_link_individual '];         // exacto con espacio final
  if (!url) url = row?.['foto_link_individual'];    // sin espacio
  if (!url) {
    const k = detectarColumnaQueIncluye(row, 'foto_link_individual');
    if (k) url = row[k];
  }
  return (typeof url === 'string' ? url.trim() : '') || '';
}

// Código de producto con fallback
function extraerCodigo(row) {
  let codigo = row?.['codigo_producto'];
  if (!codigo) codigo = row?.['Código'];
  return (typeof codigo === 'string' ? codigo.trim() : `${codigo ?? ''}`) || '';
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
async function descargarFotosComoZip(ctx, concurrencia = 4) {
  const progressEl = document.getElementById('zipProgress');
  if (progressEl) { progressEl.style.display = 'inline'; progressEl.textContent = 'Preparando…'; }

  const filas = obtenerFilasActivas(ctx);
  const lista = [];
  let faltantesSinUrl = 0;

  for (const row of filas) {
    const codigo = extraerCodigo(row);
    const rawUrl = extraerUrlFoto(row);
    if (!codigo) continue;
    if (!rawUrl) { faltantesSinUrl++; continue; }
    const url = normalizarUrlDrive(rawUrl);
    lista.push({ codigo, url });
  }

  if (!lista.length) {
    if (progressEl) progressEl.style.display = 'none';
    alert('No se encontraron fotos para descargar en las filas activas.');
    return;
  }

  const usados = new Map(); // control de duplicados
  const zip = new JSZip();
  let exitosas = 0;

  const resultados = await procesaConConcurrencia(
    lista,
    async (item) => {
      const finalUrl = item.url;
      const resp = await fetch(finalUrl, { credentials: 'omit' });
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
    (done, total) => { if (progressEl) progressEl.textContent = `Descargando ${done}/${total}…`; }
  );

  const fallidas = resultados.filter(r => !r || !r.ok).length;

  if (progressEl) progressEl.textContent = 'Empaquetando…';
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const nombreZip = `fotos_${fechaDDMMYY()}.zip`;

  if (typeof saveAs === 'function') {
    saveAs(zipBlob, nombreZip);
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = nombreZip;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  if (progressEl) progressEl.style.display = 'none';

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
        obj[col || `Columna${i}`] = fila[i] ?? "";
      });
      return obj;
    });

    // --- Generar "Categoría principal" usando lógica por "incluye" + detección de columna material ---
datos.forEach(row => {
  const materialRaw = (
    row["producto_material"] || 
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
      row["procucto_tipo"] || 
      ""
    ).toString().trim().toLowerCase();

    if (tipoRaw.includes("Insumos de plata")) {
      categoria = "Joyas de plata por mayor";
    } else if (tipoRaw.includes("Insumos enchapados")) {
      categoria = "ENCHAPADO";
    }
  }

  row["Categoría principal"] = categoria;
});

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

  const modelo     = getField(["modelo", "Modelo"], "modelo");
  const material   = getField(["producto_material"], "material");
  const estilo     = getField(["procucto_estilo", "producto_estilo"], "estilo");
  const dimension  = getField(["dimension", "dimensiones", "Dimensión", "Dimensiones"], "dimension");
  const peso       = getField(["peso", "Peso"], "peso");

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
const cantidad = esAnillo(row) ? 0 : (row["Combinaciones"] ? 0 : (row["cantidad"] ?? row["WEB"] ?? 0));
    const resumen = row["descripcion_resumen"] ?? row["Resumen"] ?? "";
    const descripcion = row["descripcion_extensa"] ?? row["Descripción"] ?? "";

    // Precio: tomar desde 'precio_prestashop' (con IVA) y calcular sin IVA (19%)
    const precioConIVA = parsePrecioConIVA(row["precio_prestashop"]);
const precioSinIVA = precioConIVA === null 
  ? "0.00" 
  : (precioConIVA / 1.19).toFixed(2).replace(',', '.');

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

    // 👇 NUEVO: evaluar visibilidad del botón al abrir el modal
    onAbrirModalProcesar();
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

  // 👇 NUEVO: evaluar visibilidad del botón al abrir el modal
  onAbrirModalProcesar();
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

  // Base: todos los productos cargados (originales + con combinaciones)
  const todos = [...datosOriginales, ...datosCombinaciones];

  // Separar anillos y no anillos
  const anillos = todos.filter(esAnillo);
  const noAnillos = todos.filter(row => !esAnillo(row));

  // Agrupar anillos en "padres" con ...000 y stock 0
  const anillosPadres = agruparAnillosComoPadres(anillos);

  // Para la vista: no-anillos tal cual + padres agrupados de anillos
  datosFiltrados = [...noAnillos, ...anillosPadres];

  renderTablaConOrden(datosFiltrados);
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

  // 1) Tomar TODOS los productos (originales + con combinaciones) que sean Anillos/Anillo
  const todos = [...datosOriginales, ...datosCombinaciones];
  const anillos = todos.filter(esAnillo);

  if (!anillos.length) {
    tablaDiv.innerHTML = `<p class='text-muted'>No hay productos de tipo Anillo/Anillos.</p>`;
    procesarBtn.classList.add("d-none");
    datosCombinacionCantidades = [];
    return;
  }

  // 2) Mostrar en la vista previa esos productos (independiente de que tengan "Combinaciones")
  datosFiltrados = anillos;
  renderTablaConOrden(datosFiltrados);
  procesarBtn.classList.remove("d-none");

  // 3) Preparar el dataset de EXPORTACIÓN según tu mapeo (NO desde "Combinaciones")
  const resultado = [];
  anillos.forEach(row => {
    const codigo = row["codigo_producto"] || row["Código"] || "";
    const valueNum = ultimosDosDigitosDeCodigo(codigo); // ej. "20"
    if (!valueNum) return; // si no hay 1–2 dígitos al final, omitimos

    const idProducto = asNumericId(row["prestashop_id"]);
    const precioConIVA = parsePrecioConIVA(row["precio_prestashop"]);
    const precioSinIVA = precioConIVA === null ? 0 : +(precioConIVA / 1.19).toFixed(2);
    const cantidad = row["cantidad"] ?? 0;

    resultado.push({
      "ID": idProducto,
      "Attribute (Name:Type:Position)*": "Número:radio:0",
      "Value (Value:Position)*": `${valueNum}:0`,
      "Referencia": codigo,
      "Cantidad": cantidad,
      "Precio S/ IVA": precioSinIVA
    });
  });

  datosCombinacionCantidades = resultado; // <- el modal y la exportación usarán esto en esta vista
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

  if (zipDescargando) {
    console.warn('[zip] Descarga en curso; se ignora click adicional.');
    return;
  }

  console.log('[zip] click botón ZIP');
  try {
    if (typeof JSZip === 'undefined') {
      alert('Falta JSZip. Verifica que el CDN esté cargado.');
      return;
    }

    zipDescargando = true;
    btn.disabled = true;

    await descargarFotosComoZip({
      tipoSeleccionado,
      datosFiltrados,
      datosOriginales,
      datosCombinaciones
    }, 4);
  } catch (err) {
    console.error('[zip] No se pudo iniciar/completar la descarga ZIP:', err);
    alert('No se pudo iniciar/completar la descarga. Revisa la consola para más detalles.');
  } finally {
    zipDescargando = false;
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

//V 1.5