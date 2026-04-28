// js/modules/planilla2.js

window.zipDescargando = false;
window.datosOriginales = [];
window.datosCombinaciones = [];
window.datosReposicion = [];
window.datosFiltrados = [];
window.datosCombinacionCantidades = [];
window.tipoSeleccionado = "sin_seleccion";

let ordenColumnasVista = [];

// =============================================
// UTILIDADES DE TEXTO
// =============================================

function normalizarTexto(valor) {
  return (valor ?? "").toString().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function esAnillo(row) {
  const tipo = (row["producto_tipo"] || row["PRODUCTO TIPO"] || row["procucto_tipo"] || "")
    .toString().trim().toLowerCase();
  return tipo.includes("anillo");
}

function esColganteLetra(row) {
  const tipo   = (row["producto_tipo"] || row["PRODUCTO TIPO"] || "").toString().toLowerCase();
  const nombre = (row["NOMBRE PRODUCTO"] || row["nombre_producto"] || "").toString().toLowerCase();
  const esColganteOCollar = tipo.includes("colgante") || tipo.includes("collar") ||
                            nombre.includes("colgante") || nombre.includes("collar");
  if (!esColganteOCollar) return false;
  if (nombre.includes("letra")) return true;
  const comb   = (row["PRODUCTO COMBINACION"] || row["producto_combinación"] || "").toString().trim();
  const codigo = extraerCodigo(row);
  if (/^[A-Z]$/i.test(comb)) return true;
  if (/[A-Z]$/i.test(codigo)) return true;
  return false;
}

function prefijoPadre(codigo) {
  const s = String(codigo ?? "");
  if (s.length < 4) return s;
  return s.slice(0, -3);
}

function agruparAnillosComoPadres(productos) {
  const grupos = new Map();
  productos.forEach(row => {
    const codigo = extraerCodigo(row);
    const key = prefijoPadre(codigo);
    if (!key) return;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(row);
  });
  const padres = [];
  grupos.forEach((miembros, key) => {
    const base = JSON.parse(JSON.stringify(miembros[0]));
    const codigoPadre = `${key}000`;
    base["CODIGO PRODUCTO"] = codigoPadre;
    base["codigo_producto"] = codigoPadre;
    base["Cantidad"] = 0; base["cantidad"] = 0; base["CANTIDAD"] = 0;
    base["_stock_original"] = 0;
    base["prestashop_id"] = "";
    base["Combinaciones"] = ""; base["producto_combinacion"] = "";
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

function detectarColumnaQueIncluye(row, textoBuscado) {
  const clave = normalizarTexto(textoBuscado);
  for (const k of Object.keys(row)) {
    if (normalizarTexto(k).includes(clave)) return k;
  }
  return null;
}

function extraerCodigo(row) {
  for (const key of ["codigo_producto","CODIGO PRODUCTO","Código","CODIGO_PRODUCTO"]) {
    if (row[key]) return row[key].toString().trim();
  }
  return "";
}

function esProductoNuevo(row) {
  if (!row || typeof row !== 'object') return false;
  for (const k of ['es_nuevo','nuevo','producto_nuevo','esProductoNuevo','estado','Estado','tipo','Tipo']) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      const raw = row[k]; const v = String(raw).toLowerCase().trim();
      if (raw === true) return true;
      if (v === '1' || v === 'true' || v.includes('nuevo')) return true;
    }
  }
  return false;
}

function onAbrirModalProcesar() {
  const btnZip = document.getElementById('btncFotosZip');
  if (!btnZip) return;
  const filas = obtenerFilasActivas({ tipoSeleccionado, datosFiltrados, datosOriginales, datosCombinaciones });
  const show = Array.isArray(filas) && filas.length > 0;
  mostrarNotificacion(`ZIP: ${filas.length} filas activas.`, "exito");
  btnZip.style.display = show ? 'inline-block' : 'none';
}

function driveIdFromUrl(url) {
  try {
    const u = new URL(url);
    if (!u.host.includes('drive.google.com')) return null;
    const m1 = u.pathname.match(/\/file\/d\/([^/]+)\/view/i);
    if (m1?.[1]) return m1[1];
    const id = u.searchParams.get('id');
    if (id) return id;
    if (u.pathname.includes('/uc')) { const id2 = u.searchParams.get('id'); if (id2) return id2; }
    return null;
  } catch { return null; }
}

function driveToDownloadUrl(url) {
  if (!url) return "";
  url = url.trim().replace(/^"|"$/g, "");
  try {
    const u = new URL(url);
    if (u.host.includes("drive.google.com")) {
      const m = url.match(/\/d\/([^\/]+)/);
      const id = m ? m[1] : u.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    return url;
  } catch { return url; }
}

function extPorContentType(ct) {
  if (!ct) return '';
  const t = ct.split(';')[0].trim().toLowerCase();
  if (t === 'image/jpeg' || t === 'image/jpg') return '.jpg';
  if (t === 'image/png') return '.png';
  if (t === 'image/webp') return '.webp';
  if (t === 'image/gif') return '.gif';
  return '';
}

function safeName(name) {
  return String(name || '').replace(/[\\/:*?"<>|#%&{}$!'@+`|=]/g, '_').replace(/\s+/g, '_').slice(0, 150);
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
        const i = index++; running++;
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

window.tipoSeleccionado = "sin_seleccion";

document.addEventListener("DOMContentLoaded", function () {
  const botonProcesar    = document.getElementById("botonProcesar");
  const confirmarExportar = document.getElementById("confirmarExportar");
  const inputArchivo     = document.getElementById("excelFile");
  if (botonProcesar)    botonProcesar.onclick    = () => { prepararModal(); document.getElementById('modalColumnas').style.display = 'flex'; };
  if (confirmarExportar) confirmarExportar.onclick = procesarExportacion;
  if (inputArchivo) {
    inputArchivo.addEventListener("change", (e) => {
      const archivo = e.target.files[0];
      if (archivo) leerExcelDesdeFilaA(archivo);
    });
  }
});

// =============================================
// MAPAS DE CATEGORÍAS
// =============================================

function buscarColumnaID(row, palabrasClave, palabrasExcluir = []) {
  return Object.keys(row).find(k => {
    const kNorm = k.toString().toLowerCase().replace(/_/g, " ").trim();
    return palabrasClave.every(p => kNorm.includes(p)) && !palabrasExcluir.some(p => kNorm.includes(p));
  });
}

const MAPA_MATERIALES = { "13":"Accesorios","11":"Joyas de plata por mayor","12":"Joyas Enchapadas" };

const MAPA_TIPOS = {
  "19":"Anillos de Plata","33":"Anillos Enchapados en Oro y Plata","20":"Aros de Plata",
  "32":"Aros Enchapados en Oro y Plata","43":"Bolsas","24":"Cadenas de Plata",
  "35":"Cadenas Enchapadas en Oro y Plata","44":"Cajas","23":"Colgantes de Plata",
  "36":"Colgantes Enchapados en Oro y Plata","26":"Collares de Plata",
  "38":"Collares Enchapados en Oro y Plata","22":"Conjuntos de Plata",
  "39":"Conjuntos Enchapados en Oro y Plata","29":"Hombre",
  "37":"Joyas Infantiles Enchapadas en Oro y Plata","25":"Infantil Plata",
  "31":"Insumos de Plata","41":"Insumos para Joyas Enchapados en Oro y Plata",
  "45":"Joyeros","30":"Pack de Joyas","21":"Pulseras de Plata",
  "34":"Pulseras Enchapadas en Oro y Plata","28":"Swarovski Elements",
  "27":"Tobilleras de Plata","40":"Tobilleras Enchapadas en Oro y Plata","46":"Limpiadores"
};

const MAPA_SUBTIPOS = {
  "4":"Anillo Circón","5":"Anillo con Micro Circón","6":"Anillo Lapidado",
  "7":"Anillo Marquesita","9":"Anillo MIDI Falange","12":"Anillo Piedra Natural",
  "8":"Anillo Plata con Oro","10":"Anillos de Compromiso","11":"Anillos de Hombres",
  "3":"Anillos de Plata Lisa","21":"Argollas de Plata 925","22":"Argollas con Colgantes",
  "23":"Aro Circón Pegados","20":"Aro de Plata Pegados","14":"Aros Circón Largo",
  "16":"Aros de Perla","13":"Aros de Plata Largos","17":"Aros Lapidado",
  "18":"Aros Mapuches","15":"Aros Marquesita","19":"Aros Swarovski Elements",
  "25":"Aros Trepadores y Cuff","48":"Cadena Cartier","49":"Cadena Cinta",
  "50":"Cadena Esferas","51":"Cadena Eslabón","59":"Cadena Forzatina",
  "47":"Cadena Groumet","52":"Cadena Gucci","53":"Cadena Rolo","54":"Cadena Singapur",
  "55":"Cadena Topo","56":"Cadena Tourbillon","57":"Cadena Valentino","58":"Cadena Veneciana",
  "33":"Colgante Circón","35":"Colgante Cruz","40":"Colgante de Perla",
  "39":"Colgante estilo Charms","32":"Colgante Piedra Natural","38":"Colgante Plata Lisa",
  "37":"Colgantes de Placa","34":"Colgantes Lapidado","36":"Colgantes Niño Niña",
  "43":"Collares con Circón","41":"Collares de Piedra","26":"Piercings de Plata 925",
  "31":"Pulsera con Circón","29":"Pulsera Macramé Hilo","27":"Pulsera de Hombre",
  "28":"Pulsera de Plata","30":"Pulsera con Piedra","74":"Aros Piedra Natural"
};

// =============================================
// LEER EXCEL
// =============================================

function leerExcelDesdeFilaA(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const data     = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const todasLasFilas = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (todasLasFilas.length < 2) { mostrarNotificacion("El archivo no tiene suficientes filas.", "alerta"); return; }

    const headers = (todasLasFilas[0] || []).map(h => (h ?? "").toString().trim());
    const datos   = todasLasFilas.slice(1).map(fila => {
      const obj = {};
      headers.forEach((col, i) => {
        let valor = fila[i];
        if (typeof valor === "string" && valor.trim().toUpperCase() === "NULL") valor = "";
        obj[col || `Columna${i}`] = valor;
      });
      const stockKey = buscarColumnaID(obj, ["cantidad"]) || "Cantidad";
      obj["_stock_original"] = Number(obj[stockKey] || 0);
      return obj;
    });

    datos.forEach(row => {
      // Materiales
      const keyIdMaterial = buscarColumnaID(row, ["id","material"]);
      const idMaterial    = keyIdMaterial ? (row[keyIdMaterial] || "").toString().trim() : "";
      if (idMaterial && MAPA_MATERIALES[idMaterial]) {
        const n = MAPA_MATERIALES[idMaterial];
        row["Categoría principal"] = n; row["PRODUCTO MATERIAL"] = n; row["producto_material"] = n;
      } else {
        const k   = buscarColumnaID(row, ["producto","material"]) || "PRODUCTO MATERIAL";
        const raw = (row[k] || "").toString().trim().toLowerCase();
        if (raw.includes("enchape")) row["Categoría principal"] = "ENCHAPADO";
        else if (raw.includes("accesorios")) row["Categoría principal"] = "ACCESORIOS";
        else if (raw.includes("plata")) row["Categoría principal"] = "Joyas de plata por mayor";
        else row["Categoría principal"] = "";
      }
      // Tipos
      const keyIdTipo = buscarColumnaID(row, ["id","tipo"], ["sub","subtipo"]);
      const idTipo    = keyIdTipo ? (row[keyIdTipo] || "").toString().trim() : "";
      if (idTipo && MAPA_TIPOS[idTipo]) {
        const n = MAPA_TIPOS[idTipo];
        row["producto_tipo"] = n; row["PRODUCTO TIPO"] = n; row["tipo"] = n;
      }
      // Subtipos
      const keyIdSubtipo = buscarColumnaID(row, ["id","subtipo"]);
      const idSubtipo    = keyIdSubtipo ? (row[keyIdSubtipo] || "").toString().trim() : "";
      if (idSubtipo && MAPA_SUBTIPOS[idSubtipo]) {
        const n = MAPA_SUBTIPOS[idSubtipo];
        row["producto_subtipo"] = n; row["PRODUCTO SUBTIPO"] = n; row["subtipo"] = n;
      }
      const valorFinalLower = (row["producto_subtipo"] || row["PRODUCTO SUBTIPO"] || "").toString().trim().toLowerCase();
      if (valorFinalLower === "enchapado en oro" || valorFinalLower === "enchapado en plata") {
        row["producto_subtipo"] = ""; row["PRODUCTO SUBTIPO"] = ""; row["subtipo"] = "";
      }
    });

    ordenColumnasVista = [...headers];
    if (!ordenColumnasVista.includes("Categoría principal")) ordenColumnasVista.push("Categoría principal");

    datosCombinaciones = []; datosReposicion = []; datosOriginales = [];
    const errores = [];

    datos.forEach(row => {
      const keySalida  = buscarColumnaID(row, ["salida"]) || "Salida";
      const salida     = (row[keySalida] || "").toString().trim();
      const keyCombi   = buscarColumnaID(row, ["combinacion"]) || "Combinaciones";
      const combinacion = (row[keyCombi] || "").toString().trim();
      const keySku     = buscarColumnaID(row, ["codigo"]) || "codigo_producto";
      const sku        = (row[keySku] || "SKU no definido").toString().trim();
      const combinacionRaw = combinacion.toLowerCase();
      const esMidi         = combinacionRaw === "midi";
      const combiValida    = combinacion !== "" && !["sin valor","null","ninguno","midi"].includes(combinacionRaw);

      if (combiValida) {
        const lista = combinacion.split(",");
        let errorDetectado = false;
        lista.forEach(c => {
          const val = c.trim();
          const esNumeroValido = /^#?\d+(-\d+)?$/i.test(val) || /^numeraci[oó]n\s*\d+$/i.test(val);
          const esLetraValida  = /^[A-Z]$/i.test(val);
          if (!esNumeroValido && !esLetraValida) { errores.push(`${sku} - Combinación inválida: ${val}`); errorDetectado = true; }
        });
        if (errorDetectado) return;
        row["CANTIDAD"] = row["_stock_original"];
        datosCombinaciones.push(row);
      } else if (salida === "Reposición") {
        datosReposicion.push(row);
      } else {
        datosOriginales.push(row);
      }
    });

    const divAlertas = document.getElementById("alertas");
    if (divAlertas) {
      divAlertas.innerHTML = errores.length
        ? errores.map(e => `<div class="alert alert-warning">${e}</div>`).join("")
        : "";
    }

    tipoSeleccionado = "sin_seleccion";
    datosFiltrados   = [...datosOriginales, ...datosCombinaciones];
    renderTablaConOrden(datosFiltrados);
    actualizarEstadoBotonesProcesar();
    const btnTipos = document.getElementById("botonesTipo");
    if (btnTipos) btnTipos.classList.remove("d-none");
  };
  reader.readAsArrayBuffer(file);
}

// =============================================
// CONSTRUIR CARACTERÍSTICAS
// =============================================

function construirCaracteristicas(row) {
  const getField = (preferKeys, includeText) => {
    const valExact = firstNonEmpty(row, preferKeys);
    if (valExact) return valExact;
    const k = detectarColumnaQueIncluye(row, includeText);
    return k ? (row[k] ?? "").toString().trim() : "";
  };
  const limpiarSep  = (s) => s.replace(/\s*:\s*/g, " ").replace(/\s+/g, " ").trim();
  const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const normalizarEtiquetaYValor = (texto, etiquetaPorDefecto = "") => {
    let t = limpiarSep(texto);
    t = t.replace(/\s*de\s*alargue\b/i, "").trim();
    const m = t.match(/^(largo|ancho|alto|di[aá]metro|circunferencia|alargue)\b\s*(.*)$/i);
    if (m) return `${capitalizar(m[1])} ${m[2].trim()}`;
    if (etiquetaPorDefecto) return `${etiquetaPorDefecto} ${t}`;
    return t;
  };

  const modelo      = getField(["modelo","Modelo","MODELO PRODUCTO"], "modelo");
  const material    = getField(["producto_material","PRODUCTO MATERIAL","ID PRODUCTO MATERIAL"], "material");
  const estilo      = getField(["producto_estilo","PRODUCTO ESTILO","ID PRODUCTO ESTILO"], "estilo");
  const dimension   = getField(["dimension","DIMENSION","Dimensión","Dimensiones"], "dimension");
  const peso        = getField(["peso","PESO"], "peso");
  const tipoProducto = getField(["producto_tipo","PRODUCTO TIPO","procucto_tipo"], "tipo");
  const partes = [];

  if (modelo) partes.push(`Modelo: ${modelo}`);

  if (tipoProducto) {
    let tipo = tipoProducto.trim();
    if (/enchapado$/i.test(tipo)) {
      const palabras = tipo.split(" ");
      const base = palabras.slice(0, -1).join(" ");
      tipo = `${base} ${base.toLowerCase().endsWith("as") ? "Enchapadas" : "Enchapados"}`;
    }
    partes.push(`Categoría: ${tipo}`);
    const nombreProducto   = (row["NOMBRE PRODUCTO"] || row["nombre_producto"] || "").toString();
    let categoriaDetectada = (row["producto_tipo"] || row["PRODUCTO TIPO"] || "").toString().toLowerCase()
      .replace(" enchapado","").replace(" enchapados","").trim();
    const tipoProductoFinal = obtenerTipoDeProducto(nombreProducto, categoriaDetectada, row["PRODUCTO SUBTIPO"], row["PRODUCTO TIPO"]);
    partes.push(`Tipo de Producto: ${tipoProductoFinal}`);
  }

  if (dimension) {
    String(dimension).split(",").map(p => p.trim()).filter(Boolean).forEach(part => {
      if (part.includes("+")) {
        const trozos = part.split("+").map(x => x.trim());
        if (trozos[0]) partes.push(`Dimensión: ${normalizarEtiquetaYValor(trozos[0], "Largo")}`);
        if (trozos[1]) partes.push(`Dimensión: ${normalizarEtiquetaYValor(trozos[1], "Alargue")}`);
      } else {
        partes.push(`Dimensión: ${normalizarEtiquetaYValor(part)}`);
      }
    });
  }

  if (peso) partes.push(`Peso: ${peso}`);

  if (material) {
    let mat = material.trim().toLowerCase();
    const nombreProd = (row["nombre_producto"] || row["NOMBRE PRODUCTO"] || "").toLowerCase();
    if (mat === "plata") mat = "Plata 925";
    else if (mat === "enchape" || mat === "enchapado") {
      if (nombreProd.includes("oro")) mat = "Enchapado en Oro";
      else if (nombreProd.includes("plata")) mat = "Enchapado en Plata";
      else mat = "Enchapado";
    } else {
      mat = mat.charAt(0).toUpperCase() + mat.slice(1);
    }
    partes.push(`Material: ${mat}`);
  }

  if (estilo) partes.push(`Estilo: ${estilo}`);

  const ocasionRaw = firstNonEmpty(row, ["ocasion","Ocasión"]) ||
    (detectarColumnaQueIncluye(row, "ocasion") ? row[detectarColumnaQueIncluye(row, "ocasion")] : "");
  if (ocasionRaw) {
    String(ocasionRaw).split(",").map(o => o.trim()).filter(Boolean)
      .forEach(o => partes.push(`Ocasión: ${o}`));
  }

  return partes.join(", ");
}

// =============================================
// CONSTRUIR CATEGORÍAS
// =============================================

function construirCategorias(row) {
  const getVal = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) {
        const v = row[k].toString().trim();
        if (v && v.toLowerCase() !== "sin valor" && v.toLowerCase() !== "null") return v;
      }
    }
    return "";
  };
  const categoriaPrincipal = getVal("Categoría principal","categoria_principal","CATEGORIA PRINCIPAL","Categoría","CATEGORIA");
  const tipo      = getVal("producto_tipo","PRODUCTO TIPO","procucto_tipo","PRODUCTO_TIPO");
  const subtipo   = getVal("producto_subtipo","PRODUCTO SUBTIPO","procucto_subtipo","PRODUCTO_SUBTIPO");
  const catAdicional = (row["Categoría Adicional"] || row["CATEGORIA ADICIONAL"] || "").toString().trim();

  let listaRaw = [categoriaPrincipal, tipo, subtipo, catAdicional].filter(Boolean);

  const categoriasCorregidas = listaRaw.map(cat => {
    const limpio = cat.toLowerCase().trim();
    if (limpio.includes("piercing")) return "Piercings de Plata 925";
    if (limpio.includes("argolla"))  return "Argollas de Plata 925";
    return cat;
  });

  const unicas = []; const vistos = new Set();
  for (const c of categoriasCorregidas) {
    const norm = c.toLowerCase().trim();
    if (!vistos.has(norm)) { vistos.add(norm); unicas.push(c); }
  }

  if (categoriaPrincipal && categoriaPrincipal.toUpperCase().includes("ENCHAPADO")) {
    for (let i = unicas.length - 1; i >= 0; i--) {
      const cat = unicas[i].toLowerCase();
      if (cat.includes("enchapado en oro") || cat.includes("enchapado en plata")) unicas.splice(i, 1);
    }
  }

  return unicas.reverse().join(", ");
}

// =============================================
// PRECIO
// =============================================

function parsePrecioConIVA(valor) {
  const limpio = (valor ?? "").toString()
    .replace(/\s/g,"").replace(/\$/g,"").replace(/\./g,"").replace(/,/g,".");
  const n = parseFloat(limpio);
  return isNaN(n) ? null : n;
}

// =============================================
// TRANSFORMAR DATOS PARA EXPORTAR
// =============================================

function transformarDatosParaExportar(datos) {
  return datos.map(row => {
    const idProducto = asNumericId(row["PRESTASHOP ID"] || row["prestashop_id"]);
    const codigo     = extraerCodigo(row);
    const nombre     = row["NOMBRE PRODUCTO"] || row["nombre_producto"] || "";

    const combinacionRaw = (row["Combinaciones"] || row["PRODUCTO COMBINACION"] || row["producto_combinacion"] || "")
      .toString().trim().toLowerCase();
    const stockOriginal = Number(row["_stock_original"] ?? row["cantidad"] ?? row["CANTIDAD"] ?? 0);
    const esAnilloProducto = esAnillo(row) || esColganteLetra(row);
    const esMidi    = combinacionRaw === "midi" || combinacionRaw.includes("midi");
    const sinCombinacion = combinacionRaw === "" || combinacionRaw === "null" ||
      combinacionRaw === "sin valor" || combinacionRaw === "ninguno" || esMidi;
    const esMidiPanmf = codigo.toUpperCase().startsWith("PANMF");

    let cantidad;
    if (!sinCombinacion) cantidad = 0;
    else if (esAnilloProducto) cantidad = esMidiPanmf ? stockOriginal : 0;
    else cantidad = stockOriginal;

    const resumen      = row["DESCRIPCION RESUMEN"] || row["descripcion_resumen"] || row["Resumen"] || "";
    const descripcionRaw = row["DESCRIPCION EXTENSA"] || row["descripcion_extensa"] || row["Descripción"] || "";
    const descripcion  = formatearDescripcionHTML(descripcionRaw);
    const precioConIVA = parsePrecioConIVA(row["PRECIO PRESTASHOP"] || row["precio_prestashop"]);
    const precioSinIVA = precioConIVA === null ? "0.00" : (precioConIVA / 1.19).toFixed(2).replace(",",".");
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

// =============================================
// RENDER DE TABLA
// =============================================

function renderTablaConOrden(datos) {
  const tablaDiv   = document.getElementById("tablaPreview");
  const procesarBtn = document.getElementById("botonProcesar");
  if (!datos.length) {
    tablaDiv.innerHTML = `<p class='text-muted'>No hay productos en esta categoría.</p>`;
    procesarBtn.classList.add("d-none"); return;
  }
  const columnas = ordenColumnasVista.length ? ordenColumnasVista : Object.keys(datos[0]);
  let html = `<table class="table table-bordered table-sm align-middle"><thead><tr>`;
  columnas.forEach(col => { html += `<th class="small">${col}</th>`; });
  html += `</tr></thead><tbody>`;
  datos.forEach(fila => {
    html += `<tr style="height:36px;">`;
    columnas.forEach(col => {
      const contenido = (fila[col] ?? "").toString();
      const previsual = contenido.length > 60 ? contenido.substring(0,60) + "..." : contenido;
      html += `<td class="small text-truncate" title="${contenido}" style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${previsual}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  tablaDiv.innerHTML = html;
  procesarBtn.classList.remove("d-none");
  const procesarImagenesBtn = document.getElementById("botonProcesarImagenes");
  if (procesarImagenesBtn) procesarImagenesBtn.classList.remove("d-none");
}

function mostrarTabla() {
  tipoSeleccionado = "sin_seleccion";
  datosFiltrados = [...datosOriginales, ...datosCombinaciones];
  renderTablaConOrden(datosFiltrados);
  actualizarEstadoBotonesProcesar();
}

function mostrarTablaFiltrada(datos) { renderTablaConOrden(datos); }

// =============================================
// EXPORTACIONES
// =============================================

function exportarCSV(tipo, datos) {
  const transformados = transformarDatosParaExportar(datos);
  const ws = XLSX.utils.json_to_sheet(transformados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  const ahora = new Date();
  const dd = String(ahora.getDate()).padStart(2,"0");
  const mm = String(ahora.getMonth()+1).padStart(2,"0");
  const aa = String(ahora.getFullYear()).slice(-2);
  const fechaStr = `${dd}-${mm}-${aa}`;
  let baseNombre;
  switch (tipo) {
    case "todo": case "nuevo": baseNombre = "productos_nuevos"; break;
    case "combinacion": baseNombre = "combinaciones"; break;
    case "reposición": case "reposicion": baseNombre = "productos_reposicion"; break;
    default: baseNombre = "exportacion_planilla";
  }
  XLSX.writeFile(wb, `${baseNombre}_${fechaStr}.csv`, { bookType:"csv", FS:";" });
}

function exportarCSVPersonalizado(nombre, datos) {
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  XLSX.writeFile(wb, `${nombre}.csv`, { bookType:"csv", FS:";" });
}

function inyectarPadresEnDataset(datos) {
  const anillos       = datos.filter(esAnillo);
  const colgantesLetra = datos.filter(esColganteLetra);
  const padres        = agruparAnillosComoPadres([...anillos, ...colgantesLetra]);
  if (!padres.length) return datos;
  const codPadres     = new Set(padres.map(r => extraerCodigo(r)));
  return [...datos.filter(r => !codPadres.has(extraerCodigo(r))), ...padres];
}

function esCodigoPadre(c) { return /000$/.test(String(c || "")); }

function crearPadreDesdeHijo(row) {
  const codigoHijo = extraerCodigo(row);
  const pref = prefijoPadre(codigoHijo);
  const base = { ...row };
  const codigoPadre = `${pref}000`;
  base["codigo_producto"] = codigoPadre; base["CODIGO PRODUCTO"] = codigoPadre;
  base["prestashop_id"] = ""; base["Combinaciones"] = ""; base["producto_combinacion"] = "";
  base["Cantidad"] = 0; base["cantidad"] = 0; base["CANTIDAD"] = 0; base["_stock_original"] = 0;
  return base;
}

function agregarPadresSiFaltan(datos) {
  const porPrefijo = new Map();
  datos.forEach(r => {
    const cod = extraerCodigo(r); if (!cod) return;
    const pref = prefijoPadre(cod); if (!pref) return;
    if (!porPrefijo.has(pref)) porPrefijo.set(pref, []);
    porPrefijo.get(pref).push(r);
  });
  const padresExistentes = new Set(datos.map(r => extraerCodigo(r)).filter(c => c && esCodigoPadre(c)));
  const nuevosPadres = [];
  porPrefijo.forEach((arr, pref) => {
    const tieneHijos = arr.some(r => !esCodigoPadre(extraerCodigo(r)));
    const codPadre   = `${pref}000`;
    if (tieneHijos && !padresExistentes.has(codPadre)) nuevosPadres.push(crearPadreDesdeHijo(arr[0]));
  });
  return nuevosPadres.length ? [...datos, ...nuevosPadres] : datos;
}

// =============================================
// PREPARAR MODAL Y EXPORTAR
// =============================================

function prepararModal() {
  const modalBody = document.getElementById("columnasFinales");

  if (tipoSeleccionado === "combinacion_cantidades" && datosCombinacionCantidades.length) {
    const columnas = Object.keys(datosCombinacionCantidades[0] || {});
    let html = `<div style="overflow-x:auto"><table class="table table-bordered table-sm align-middle"><thead><tr>`;
    columnas.forEach(col => html += `<th class="small">${col}</th>`);
    html += `</tr></thead><tbody>`;
    datosCombinacionCantidades.forEach(fila => {
      html += `<tr style="height:36px;">`;
      columnas.forEach(col => {
        const contenido = (fila[col] ?? "").toString();
        const previsual = contenido.length > 60 ? contenido.substring(0,60) + "..." : contenido;
        html += `<td class="small text-truncate" title="${contenido}" style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${previsual}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    modalBody.innerHTML = html;
    onAbrirModalProcesar(); return;
  }

  let dataset = (Array.isArray(datosFiltrados) && datosFiltrados.length)
    ? datosFiltrados : [...datosOriginales, ...datosCombinaciones];
  dataset = inyectarPadresEnDataset(dataset);
  const transformados = transformarDatosParaExportar(dataset);
  const columnas = Object.keys(transformados[0] || {});
  let html = `<div style="overflow-x:auto"><table class="table table-bordered table-sm align-middle"><thead><tr>`;
  columnas.forEach(col => html += `<th class="small">${col}</th>`);
  html += `</tr></thead><tbody>`;
  transformados.forEach(fila => {
    html += `<tr style="height:36px;">`;
    columnas.forEach(col => {
      const contenido = (fila[col] ?? "").toString();
      const previsual = contenido.length > 60 ? contenido.substring(0,60) + "..." : contenido;
      html += `<td class="small text-truncate" title="${contenido}" style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${previsual}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  modalBody.innerHTML = html;
  onAbrirModalProcesar();
}

function procesarExportacion() {
  if (tipoSeleccionado === "combinacion_cantidades") {
    exportarCSVPersonalizado("combinacion_cantidades", window.datosCombinacionCantidades || datosCombinacionCantidades);
    return;
  }
  let dataset = (Array.isArray(datosFiltrados) && datosFiltrados.length)
    ? datosFiltrados : [...datosOriginales, ...datosCombinaciones];
  dataset = inyectarPadresEnDataset(dataset);
  exportarCSV(tipoSeleccionado, dataset);
}

// =============================================
// FILTROS Y VISTAS
// =============================================

function actualizarEstadoBotonesProcesar() {
  const btnProcesar  = document.getElementById("botonProcesar");
  const btnImagenes  = document.getElementById("botonProcesarImagenes");
  if (!btnProcesar || !btnImagenes) return;
  const habilitado = tipoSeleccionado === "nuevo" || tipoSeleccionado === "reposicion" || tipoSeleccionado === "reposición";
  btnProcesar.disabled = !habilitado; btnProcesar.classList.toggle("disabled", !habilitado);
  btnImagenes.disabled = !habilitado; btnImagenes.classList.toggle("disabled", !habilitado);
}

function filtrarProductos(tipo) {
  tipoSeleccionado = tipo;
  if (tipo === "nuevo")      datosFiltrados = datosOriginales.filter(p => !p["Combinaciones"]);
  else if (tipo === "reposición") datosFiltrados = datosReposicion.filter(p => !p["Combinaciones"]);
  mostrarTablaFiltrada(datosFiltrados);
}

function filtrarCombinaciones(tipo) {
  tipoSeleccionado = "combinacion";
  if (tipo === "nuevo")      datosFiltrados = datosCombinaciones.filter(p => (p["Salida"] || "").trim() !== "Reposición");
  else if (tipo === "reposición") datosFiltrados = datosCombinaciones.filter(p => (p["Salida"] || "").trim() === "Reposición");
  mostrarTablaFiltrada(datosFiltrados);
  actualizarEstadoBotonesProcesar();
}

function mostrarProductosNuevos() {
  tipoSeleccionado = "nuevo";
  const todos = [...datosOriginales, ...datosCombinaciones, ...datosReposicion];
  const productosSinID = todos.filter(row => {
    const id = row["PRESTASHOP ID"] || row["prestashop_id"];
    return !id || id.toString().trim() === "";
  });
  const anillos        = productosSinID.filter(esAnillo);
  const colgantesLetra = productosSinID.filter(esColganteLetra);
  const otros          = productosSinID.filter(r => !anillos.includes(r) && !colgantesLetra.includes(r));
  datosFiltrados = [...otros, ...agruparAnillosComoPadres(anillos), ...agruparAnillosComoPadres(colgantesLetra)];
  renderTablaConOrden(datosFiltrados);
  actualizarEstadoBotonesProcesar();
}

function mostrarProductosConID() {
  tipoSeleccionado = "reposicion";
  const todos = [...datosOriginales, ...datosCombinaciones, ...datosReposicion];
  datosFiltrados = todos.filter(row => {
    const id = row["PRESTASHOP ID"] || row["prestashop_id"];
    return id && id.toString().trim() !== "";
  });
  renderTablaConOrden(datosFiltrados);
  actualizarEstadoBotonesProcesar();
}

function formatearDescripcionHTML(texto, baseCaracteres = 200) {
  if (!texto) return "";
  let raw = String(texto).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  if (!raw) return "";
  const NBSP = "\u00A0";
  raw = raw.replace(/\b(Plata)\s+(9(?:25|50))\b/gi, (_, m1, m2) => `${m1}${NBSP}${m2}`);
  raw = raw.replace(/\b(\d+(?:[.,]\d+)?)\s+(cm|mm|m|gramos|grs?|g|kg)\b/gi, (_, n, u) => `${n}${NBSP}${u}`);
  raw = raw.replace(/\b(de)\s+(Alargue)\b/gi, (_, d, a) => `${d}${NBSP}${a}`);
  const bloques = []; const n = raw.length; let i = 0;
  while (i < n) {
    if (n - i <= baseCaracteres) { bloques.push(raw.slice(i).trim()); break; }
    let p = raw.indexOf(".", i + baseCaracteres);
    if (p === -1) { bloques.push(raw.slice(i).trim()); break; }
    p = p + 1;
    bloques.push(raw.slice(i, p).trim());
    i = p;
  }
  return bloques.map(b => `<p>${b}</p>`).join("");
}

function obtenerFilasActivas({ tipoSeleccionado, datosFiltrados, datosOriginales, datosCombinaciones }) {
  if (Array.isArray(datosFiltrados) && datosFiltrados.length > 0) return datosFiltrados;
  return [...datosOriginales, ...datosCombinaciones];
}

function extraerUrlFoto(row) {
  if (!row || typeof row !== "object") return "";
  const url = row["FOTO LINK INDIVIDUAL"];
  return typeof url === "string" ? url.trim() : "";
}

// =============================================
// MODALES — SISTEMA UNIFICADO (sin Bootstrap)
// =============================================

// ---- Modal: Ingresar ID ----
function abrirModalIngresarID() {
  const tbody = document.getElementById("tablaIngresarID");
  if (!tbody) return;
  tbody.innerHTML = "";
  const todos = [...datosOriginales, ...datosCombinaciones, ...datosReposicion];
  if (!todos.length) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-muted">No hay productos cargados.</td></tr>`;
  } else {
    todos.forEach(row => {
      const sku = extraerCodigo(row); if (!sku) return;
      const idExistente = row["prestashop_id"] || row["PRESTASHOP ID"] || row["ID"] || row["id"] || "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-primary sku-copy" style="cursor:pointer;" data-sku="${sku}" title="Clic para copiar">${sku}</td>
        <td><input type="text" class="form-control form-control-sm" data-sku="${sku}" value="${idExistente}" placeholder="Ej: 12345"></td>`;
      tbody.appendChild(tr);
    });
  }
  document.getElementById("modalIngresarID").style.display = "flex";
}

function cerrarModalIngresarID() {
  document.getElementById("modalIngresarID").style.display = "none";
}

// ---- Modal: Agregar categoría ----
function abrirModalAgregarCategoria() {
  const input = document.getElementById("nuevaCategoria");
  if (input) input.value = "";
  document.getElementById("modalAgregarCategoria").style.display = "flex";
}

function cerrarModalAgregarCategoria() {
  document.getElementById("modalAgregarCategoria").style.display = "none";
}

function agregarCategoriaAdicional() {
  const input = document.getElementById("nuevaCategoria");
  if (!input) return;
  const nuevaCat = input.value.trim();
  if (!nuevaCat) { mostrarNotificacion("Ingresa una categoría antes de continuar.", "alerta"); return; }
  const nombreColumna = "Categoría Adicional";
  [window.datosOriginales, window.datosCombinaciones, window.datosReposicion].forEach(lista => {
    if (!Array.isArray(lista)) return;
    lista.forEach(row => { row[nombreColumna] = nuevaCat; });
  });
  if (!ordenColumnasVista.includes(nombreColumna)) ordenColumnasVista.push(nombreColumna);
  cerrarModalAgregarCategoria();
  renderTablaConOrden(window.datosFiltrados);
  mostrarNotificacion(`Categoría "${nuevaCat}" agregada correctamente`, "exito");
}

// ---- Modal: Errores de imágenes ----
function abrirModalErrores() {
  const listaUl = document.getElementById("listaErrores");
  listaUl.innerHTML = "";
  if (window.erroresImagenes && window.erroresImagenes.size) {
    window.erroresImagenes.forEach(codigo => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.textContent = codigo;
      listaUl.appendChild(li);
    });
  } else {
    listaUl.innerHTML = `<li class="list-group-item text-muted">No hay errores registrados</li>`;
  }
  document.getElementById("modalErrores").style.display = "flex";
}

function cerrarModalErrores() {
  document.getElementById("modalErrores").style.display = "none";
}

// ---- Guardar IDs ----
function guardarIDsAsignados() {
  const inputs = document.querySelectorAll("#tablaIngresarID input");
  inputs.forEach(input => {
    const id  = input.value.trim();
    const sku = input.dataset.sku;
    if (!sku) return;
    [datosOriginales, datosCombinaciones, datosReposicion].forEach(lista => {
      lista.forEach(row => {
        if (extraerCodigo(row) === sku) {
          row["prestashop_id"] = id; row["PRESTASHOP ID"] = id; row["ID"] = id;
        }
      });
    });
  });
  mostrarNotificacion("IDs asignados correctamente", "exito");
  renderTablaConOrden(datosFiltrados.length ? datosFiltrados : [...datosOriginales, ...datosCombinaciones]);
}

document.addEventListener("DOMContentLoaded", () => {
  const guardarBtn = document.getElementById("guardarIDs");
  if (guardarBtn) guardarBtn.addEventListener("click", guardarIDsAsignados);
});

// Copiar SKU al hacer clic
document.addEventListener("click", e => {
  const td = e.target.closest(".sku-copy");
  if (!td) return;
  const sku = td.dataset.sku; if (!sku) return;
  navigator.clipboard.writeText(sku).then(() => {
    document.querySelectorAll(".sku-copy").forEach(el => el.classList.remove("bg-success","text-white"));
    td.classList.add("bg-success","text-white");
    mostrarNotificacion(`Código ${sku} copiado`, "exito");
  }).catch(() => mostrarNotificacion("No se pudo copiar al portapapeles", "error"));
});
document.addEventListener("click", e => {
  if (!e.target.closest(".sku-copy"))
    document.querySelectorAll(".sku-copy").forEach(el => el.classList.remove("bg-success","text-white"));
});

// =============================================
// COMBINACIONES CON CANTIDADES
// =============================================

function mostrarTablaCombinacionesCantidad() {
  tipoSeleccionado = "combinacion_cantidades";
  ["formulario","botonesTipo","botonProcesar","botonProcesarImagenes","tablaPreview"].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.add("d-none");
  });

  let vista = document.getElementById("vistaCombinaciones");
  if (!vista) {
    vista = document.createElement("div");
    vista.id = "vistaCombinaciones";
    vista.className = "container my-4";
    vista.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Vista de Combinaciones y Cantidades</h5>
        <button class="btn btn-secondary btn-sm" onclick="volverDeCombinaciones()">
          <i class="fa-solid fa-arrow-left me-1"></i> Volver
        </button>
      </div>
      <div id="tablaCombinacionesContenido" class="table-responsive"></div>`;
    const tablaDiv = document.getElementById("tablaPreview");
    if (tablaDiv) tablaDiv.parentNode.insertBefore(vista, tablaDiv);
  }
  vista.classList.remove("d-none");

  const todos = [...datosOriginales, ...datosCombinaciones].filter(row => esAnillo(row) || esColganteLetra(row));
  const resultado  = [];
  const guardados  = JSON.parse(localStorage.getItem("datosCombinacionCantidades") || "{}");

  todos.forEach(row => {
    const codigo      = extraerCodigo(row);
    const idProducto  = asNumericId(row["prestashop_id"] || row["PRESTASHOP ID"] || row["ID"] || row["id"]);
    const nombre      = row["NOMBRE PRODUCTO"] || row["nombre_producto"] || "";
    const combinaciones = row["Combinaciones"] || row["PRODUCTO COMBINACION"] || "";
    const cantidad    = row["cantidad"] || row["CANTIDAD"] || 0;
    const precioConIVA = parsePrecioConIVA(row["precio_prestashop"] || row["PRECIO PRESTASHOP"]);
    const precioSinIVA = precioConIVA === null ? 0 : +(precioConIVA / 1.19).toFixed(2);
    const dataPrev    = guardados[codigo] || {};
    resultado.push({
      "ID": idProducto, "Nombre": nombre, "Referencia": codigo,
      "Combinaciones": combinaciones, "Cantidad": cantidad,
      "Precio S/ IVA": precioSinIVA,
      "Cantidad ingresada": dataPrev.cantidadIngresada || 0,
      "ID manual": dataPrev.idManual || "",
      "Detalle": dataPrev.detalle || []
    });
  });

  window.datosCombinacionCantidades = resultado;

  const contenedor  = document.getElementById("tablaCombinacionesContenido");
  const encabezados = ["ID","Nombre","Referencia","Combinaciones","Cantidad","Precio S/ IVA","Cantidad ingresada"];
  let html = `<table class="table table-bordered table-sm align-middle table-hover" id="tablaCombinaciones">
    <thead class="table-light"><tr>${encabezados.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;

  resultado.forEach((r, idx) => {
    const idMostrar = r["ID manual"] || r["ID"] || "";
    html += `
      <tr id="fila-${r["Referencia"]}" onclick="abrirModalDetalleProducto('${r["Referencia"]}', ${idx})" style="cursor:pointer;">
        <td class="celda-id fw-bold text-primary">${idMostrar}</td>
        <td>${r["Nombre"] ?? ""}</td><td>${r["Referencia"] ?? ""}</td>
        <td>${r["Combinaciones"] ?? ""}</td><td>${r["Cantidad"] ?? ""}</td>
        <td>${r["Precio S/ IVA"] ?? ""}</td>
        <td class="cantidad-ingresada fw-bold text-center">${r["Cantidad ingresada"]}</td>
      </tr>`;
  });

  html += `</tbody></table>
    <div class="text-center mt-4">
      <button class="btn btn-primary px-4" onclick="procesarCombinacionesFinal()">
        <i class="fa-solid fa-file-export me-1"></i> Procesar
      </button>
    </div>`;
  contenedor.innerHTML = html;
  actualizarEstadoBotonesProcesar();
}

function abrirModalDetalleProducto(codigo, index) {
  // Este modal se crea dinámicamente con Bootstrap (se mantiene igual)
  let modal = document.getElementById("modalDetalleProducto");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal fade"; modal.id = "modalDetalleProducto"; modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Detalle del producto</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" id="modalDetalleBody"></div>
          <div class="modal-footer">
            <button class="btn btn-primary" onclick="guardarCantidadIngresada(${index})">Guardar Cambios</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  const producto = window.datosCombinacionCantidades[index];
  const detalle  = (producto.Detalle && producto.Detalle.length > 0)
    ? producto.Detalle
    : Array.from({ length: 3 }).map(() => ({ numeracion:"", cantidad:0 }));
  const idValue  = producto["ID manual"] || producto["ID"] || "";

  modal.querySelector("#modalDetalleBody").innerHTML = `
    <div class="mb-3 d-flex align-items-center justify-content-between">
      <h6 class="text-primary mb-0">SKU: ${codigo}</h6>
      <div class="ms-3 flex-grow-1">
        <input type="text" id="idManualInput" class="form-control form-control-sm fw-bold"
          placeholder="Ingresar ID" value="${idValue}">
      </div>
    </div>
    <table class="table table-bordered table-sm align-middle">
      <thead class="table-light"><tr><th>Numeración</th><th>Cantidad</th></tr></thead>
      <tbody id="tablaNumeraciones">
        ${detalle.map(d => `
          <tr>
            <td><input type="text" class="form-control form-control-sm numeracion-input" value="${d.numeracion||""}" placeholder="Ej: #10-12"></td>
            <td><input type="number" class="form-control form-control-sm cantidad-input" min="0" value="${d.cantidad||0}"></td>
          </tr>`).join("")}
      </tbody>
    </table>
    <div class="text-center mt-2">
      <button class="btn btn-sm btn-ghost" onclick="agregarFilaNumeracion()">+ Agregar fila</button>
    </div>`;

  modal.querySelector(".modal-footer button").setAttribute("onclick", `guardarCantidadIngresada(${index})`);
  modal.dataset.codigo = codigo;
  new bootstrap.Modal(modal).show();
}

function guardarCantidadIngresada(index) {
  const modal = document.getElementById("modalDetalleProducto"); if (!modal) return;
  const codigo          = modal.dataset.codigo;
  const inputsNumeracion = modal.querySelectorAll(".numeracion-input");
  const inputsCantidad  = modal.querySelectorAll(".cantidad-input");
  const idManual        = modal.querySelector("#idManualInput")?.value.trim() || "";
  const detalle = []; let suma = 0;
  inputsNumeracion.forEach((nInput, i) => {
    const numeracion = nInput.value.trim();
    const cantidad   = parseFloat(inputsCantidad[i].value) || 0;
    detalle.push({ numeracion, cantidad }); suma += cantidad;
  });

  if (window.datosCombinacionCantidades?.[index]) {
    const prod = window.datosCombinacionCantidades[index];
    prod["Cantidad ingresada"] = suma; prod["ID manual"] = idManual; prod["Detalle"] = detalle;
  }

  const guardados = JSON.parse(localStorage.getItem("datosCombinacionCantidades") || "{}");
  guardados[codigo] = { cantidadIngresada: suma, idManual, detalle };
  localStorage.setItem("datosCombinacionCantidades", JSON.stringify(guardados));

  const fila = document.getElementById(`fila-${codigo}`);
  if (fila) {
    const celdaCant = fila.querySelector(".cantidad-ingresada");
    if (celdaCant) { celdaCant.textContent = suma; celdaCant.classList.add("text-success"); }
    const celdaId = fila.querySelector(".celda-id");
    if (celdaId) {
      const idOriginal = window.datosCombinacionCantidades[index]["ID"] || "";
      celdaId.textContent = idManual || idOriginal;
      if (idManual) celdaId.classList.add("text-success");
    }
  }

  bootstrap.Modal.getInstance(modal)?.hide();
  mostrarNotificacion("Guardado correctamente", "exito");
}

function procesarCombinacionesFinal() {
  const datos = window.datosCombinacionCantidades || [];
  if (!datos.length) { mostrarNotificacion("No hay datos para procesar.", "alerta"); return; }
  const resultado = [];
  datos.forEach(prod => {
    const idManual  = prod["ID manual"] || prod["ID"];
    const precio    = prod["Precio S/ IVA"] || 0;
    const baseCodigo = prod["Referencia"] || "";
    const detalle   = Array.isArray(prod["Detalle"]) ? prod["Detalle"] : [];
    detalle.forEach(d => {
      const combinacion = (d.numeracion || "").trim();
      const cantidad    = d.cantidad || 0;
      if (!combinacion) return;
      const esLetra       = /^[A-Z]$/i.test(combinacion);
      const atributoTexto = esLetra ? "Letra:select:0" : "Número:radio:0";
      const referencia    = baseCodigo.slice(0,-3) + combinacion.padStart(3,"0");
      resultado.push({
        "ID": idManual,
        "Attribute (Name:Type:Position)*": atributoTexto,
        "Value (Value:Position)*": `${combinacion}:0`,
        "Referencia": referencia, "Cantidad": cantidad, "Precio S/ IVA": precio
      });
    });
  });
  if (!resultado.length) { mostrarNotificacion("No hay combinaciones válidas para procesar.", "alerta"); return; }
  window.resultadoCombinacionesProcesado = resultado;
  abrirModalPrevisualizacionProcesado(resultado);
}

function agregarFilaNumeracion() {
  const tbody = document.getElementById("tablaNumeraciones"); if (!tbody) return;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="form-control form-control-sm numeracion-input" placeholder="Ej: #10-12"></td>
    <td><input type="number" class="form-control form-control-sm cantidad-input" min="0" value="0"></td>`;
  tbody.appendChild(tr);
}

function volverDeCombinaciones() {
  const vista = document.getElementById("vistaCombinaciones"); if (vista) vista.classList.add("d-none");
  const tablaDiv = document.getElementById("tablaPreview"); if (tablaDiv) tablaDiv.classList.remove("d-none");
  const formulario = document.querySelector(".formulario"); if (formulario) formulario.classList.remove("d-none");
  const botonesTipo = document.getElementById("botonesTipo"); if (botonesTipo) botonesTipo.classList.remove("d-none");
  const procesarBtn = document.getElementById("botonProcesar"); if (procesarBtn) procesarBtn.classList.remove("d-none");
}

// Modal Bootstrap dinámico: previsualización combinaciones procesadas
function abrirModalPrevisualizacionProcesado(resultado) {
  let modal = document.getElementById("modalProcesarCombinaciones");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal fade"; modal.id = "modalProcesarCombinaciones"; modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Previsualización combinaciones procesadas</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" id="bodyProcesarCombinaciones" style="max-height:70vh;overflow:auto;"></div>
          <div class="modal-footer">
            <button class="btn btn-primary" onclick="exportarCombinacionesProcesadas()">
              <i class="fa-solid fa-file-arrow-down me-1"></i> Exportar
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  const encabezados = ["ID","Attribute (Name:Type:Position)*","Value (Value:Position)*","Referencia","Cantidad","Precio S/ IVA"];
  let html = `<div style="overflow-x:auto"><table class="table table-bordered table-sm align-middle">
    <thead class="table-light"><tr>${encabezados.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;
  resultado.forEach(r => {
    html += `<tr><td>${r["ID"]}</td><td>${r["Attribute (Name:Type:Position)*"]}</td>
      <td>${r["Value (Value:Position)*"]}</td><td>${r["Referencia"]}</td>
      <td>${r["Cantidad"]}</td><td>${r["Precio S/ IVA"]}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  modal.querySelector("#bodyProcesarCombinaciones").innerHTML = html;
  new bootstrap.Modal(modal).show();
}

function exportarCombinacionesProcesadas() {
  if (!window.resultadoCombinacionesProcesado?.length) {
    mostrarNotificacion("No hay datos procesados para exportar.", "alerta"); return;
  }
  exportarCSVPersonalizado("combinaciones_procesadas", window.resultadoCombinacionesProcesado);
}

// =============================================
// IMÁGENES
// =============================================

function normalizarUrlDrive(url) {
  if (!url) return "";
  url = url.trim().replace(/^"|"$/g, "");
  try {
    const u = new URL(url);
    if (u.host.includes("drive.google.com")) {
      const id = driveIdFromUrl(url);
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
      return url;
    }
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(u.pathname)) return url;
    return url;
  } catch { return url; }
}

function registrarErrorImagen(codigo, img) {
  img.src = "https://dummyimage.com/200x200/cccccc/000000&text=Error";
  if (!window.erroresImagenes) window.erroresImagenes = new Set();
  window.erroresImagenes.add(codigo);
  document.getElementById("cantErrores").textContent = window.erroresImagenes.size;
  document.getElementById("erroresLinea").classList.remove("d-none");
}

function obtenerUrlValida(rawUrl) {
  if (!rawUrl) return null;
  const url = rawUrl.toString().trim();
  if (url.length < 5) return null;
  const idDrive = driveIdFromUrl(url);
  if (idDrive) return {
    tipo: 'drive',
    descarga: `https://drive.google.com/uc?export=download&id=${idDrive}`,
    preview: `https://lh3.googleusercontent.com/d/${idDrive}=s220`
  };
  if (url.startsWith('http') && /\.(jpg|jpeg|png|webp)/i.test(url)) return { tipo: 'web', descarga: url, preview: url };
  return null;
}

function generarTablaImagenes() {
  tipoSeleccionado = "imagenes";
  ["tablaPreview","botonesTipo","botonProcesar","botonProcesarImagenes"].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.add("d-none");
  });
  document.querySelector(".formulario")?.classList.add("d-none");

  const vista = document.getElementById("vistaImagenes");
  vista.classList.remove("d-none");

  const filas = obtenerFilasActivas({ tipoSeleccionado, datosFiltrados, datosOriginales, datosCombinaciones });
  if (!filas.length) { vista.innerHTML = "<p class='text-muted'>No hay productos para procesar imágenes.</p>"; return; }

  let mapUrls = new Map(), skusVistos = new Set(), sinFoto = [], skuRepetido = [], validos = [], previewUrls = [];

  filas.forEach(row => {
    const sku      = extraerCodigo(row);
    const rawUrl   = row["FOTO LINK INDIVIDUAL"] || row["FOTO LINK INDIVIDIDUAL"];
    const infoImg  = obtenerUrlValida(rawUrl);
    if (skusVistos.has(sku)) skuRepetido.push(sku); else skusVistos.add(sku);
    if (!infoImg) { sinFoto.push(sku); } else {
      const urlReal = infoImg.descarga;
      if (!mapUrls.has(urlReal)) mapUrls.set(urlReal, []);
      mapUrls.get(urlReal).push(sku);
      validos.push(sku);
      if (previewUrls.length < 5) previewUrls.push(infoImg.preview);
    }
  });

  let fotoRepetida = [];
  mapUrls.forEach(listaSkus => { if (listaSkus.length > 1) fotoRepetida.push(...listaSkus); });
  let totalErrores = sinFoto.length + skuRepetido.length + fotoRepetida.length;

  let alertasHtml = "";
  if (sinFoto.length)    alertasHtml += `<div class="alert alert-warning py-2 mb-2"><i class="fa-solid fa-triangle-exclamation me-1"></i> <strong>Sin Foto (${sinFoto.length}):</strong> ${sinFoto.slice(0,10).join(", ")}...</div>`;
  if (skuRepetido.length) alertasHtml += `<div class="alert alert-danger py-2 mb-2"><i class="fa-solid fa-copy me-1"></i> <strong>SKU Duplicado (${skuRepetido.length}):</strong> ${skuRepetido.join(", ")}</div>`;
  if (fotoRepetida.length) alertasHtml += `<div class="alert alert-danger py-2 mb-2"><i class="fa-solid fa-images me-1"></i> <strong>Foto Duplicada (${fotoRepetida.length}):</strong> ${fotoRepetida.slice(0,10).join(", ")}...</div>`;
  if (totalErrores === 0) alertasHtml = `<div class="alert alert-success py-2 mb-0"><i class="fa-solid fa-circle-check me-1"></i> ¡Todo perfecto!</div>`;

  const galeriaHtml = previewUrls.map(url =>
    `<div style="width:70px;height:70px;border-radius:8px;overflow:hidden;border:1px solid var(--border);background:var(--surface);">
      <img src="${url}" style="width:100%;height:100%;object-fit:contain;" onerror="this.src='https://via.placeholder.com/70?text=Err'">
    </div>`).join("");

  let html = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4>Gestor de Imágenes</h4>
      <div class="d-flex gap-2">
        <button id="btnZipMasivo" class="btn btn-primary" onclick="descargarImagenesZIP()">
          <i class="fa-solid fa-file-zipper me-1"></i> Descargar Todo (.zip)
        </button>
        <button class="btn btn-secondary" onclick="volverVistaPrincipal()">
          <i class="fa-solid fa-arrow-left me-1"></i> Volver
        </button>
      </div>
    </div>

    <div class="ios-card mb-4">
      <div class="row mb-3">
        <div class="col-md-7 border-end">
          <h6 class="text-muted mb-2">Previsualización</h6>
          <div class="d-flex gap-2 align-items-center" style="min-height:70px;">
            ${galeriaHtml || '<span class="text-muted small">Sin imágenes válidas</span>'}
          </div>
        </div>
        <div class="col-md-5 ps-4">
          <h6 class="text-muted mb-2">Resumen</h6>
          <div class="d-flex justify-content-between mb-1 border-bottom pb-1"><span>Total:</span><strong>${filas.length}</strong></div>
          <div class="d-flex justify-content-between mb-1 text-success"><span>Listos:</span><strong>${validos.length}</strong></div>
          <div class="d-flex justify-content-between text-danger"><span>Alertas:</span><strong>${totalErrores}</strong></div>
        </div>
      </div>
      <div class="border-top pt-3">
        <h6 class="text-muted mb-2">Estado de Datos</h6>
        <div style="max-height:150px;overflow-y:auto;">${alertasHtml}</div>
      </div>
    </div>

    <div id="progresoZipContainer" class="mb-3 d-none ios-card">
      <div class="d-flex justify-content-between mb-1">
        <span id="estadoProgreso" class="text-primary fw-bold small">Procesando...</span>
        <span id="contadorProgreso" class="text-muted small">0/${filas.length}</span>
      </div>
      <div class="progress"><div id="barraProgreso" class="progress-bar progress-bar-striped progress-bar-animated" style="width:0%">0%</div></div>
    </div>

    <div class="table-responsive">
      <table class="table table-bordered table-sm table-hover">
        <thead class="table-light"><tr><th>CODIGO</th><th>NOMBRE</th><th>TITULO</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead>
        <tbody>`;

  filas.forEach(row => {
    const sku       = extraerCodigo(row);
    const nombre    = row["NOMBRE PRODUCTO"] || "";
    const rawUrl    = row["FOTO LINK INDIVIDUAL"] || row["FOTO LINK INDIVIDIDUAL"];
    const infoImg   = obtenerUrlValida(rawUrl);
    const urlDescarga = infoImg ? infoImg.descarga : "";
    let filaClass = ""; let badges = [];
    if (mapUrls.get(urlDescarga)?.length > 1) { badges.push(`<span class="badge badge-danger">Foto Duplicada</span>`); filaClass = "table-danger"; }
    if (!urlDescarga) { badges.push(`<span class="badge badge-warning">Sin Foto</span>`); filaClass = "table-warning"; }
    if (!badges.length) badges.push(`<span class="badge badge-success">OK</span>`);
    const claseVerde = localStorage.getItem("sku_ok_" + sku) ? "bg-success text-white" : "";
    const skuLimpio  = String(sku).replace(/\s+/g,'').toUpperCase();
    const nombreLimpio = String(nombre).replace(/\s+/g,'').toUpperCase();
    const tituloMatch = (skuLimpio !== "" && skuLimpio === nombreLimpio) ? "SI" : "";
    html += `
      <tr class="${filaClass}">
        <td class="sku-copy ${claseVerde}" style="cursor:pointer;" data-sku="${sku}"><strong>${sku}</strong></td>
        <td class="text-truncate" style="max-width:250px;">${nombre}</td>
        <td class="text-center fw-bold text-primary">${tituloMatch}</td>
        <td>${badges.join(" ")}</td>
        <td>${urlDescarga ? `<button class="btn btn-icon" onclick="descargarUnaImagen('${urlDescarga}','${sku}')" title="Descargar"><i class="fa-solid fa-download"></i></button>` : ""}</td>
      </tr>`;
  });

  html += `</tbody></table></div>`;
  vista.innerHTML = html;
  actualizarEstadoBotonesProcesar();
}

async function descargarImagenesZIP() {
  const filas = obtenerFilasActivas({ tipoSeleccionado, datosFiltrados, datosOriginales, datosCombinaciones });
  if (!filas?.length) { mostrarNotificacion("No hay imágenes para descargar.", "alerta"); return; }
  const btn = document.getElementById("btnZipMasivo");
  const containerProgreso = document.getElementById("progresoZipContainer");
  const barra  = document.getElementById("barraProgreso");
  const estado = document.getElementById("estadoProgreso");
  const contador = document.getElementById("contadorProgreso");
  if (btn) btn.disabled = true;
  if (containerProgreso) containerProgreso.classList.remove("d-none");
  if (estado) estado.textContent = "Conectando con Drive...";
  const zip = new JSZip(); let completadas = 0, exitosas = 0, total = filas.length;
  for (const row of filas) {
    const codigo      = extraerCodigo(row);
    const urlOriginal = row["FOTO LINK INDIVIDUAL"] || row["FOTO LINK INDIVIDIDUAL"];
    if (codigo && urlOriginal) {
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(driveToDownloadUrl(urlOriginal))}`;
        const resp = await fetch(proxyUrl);
        if (resp.ok) { zip.file(`${codigo}.jpg`, await resp.blob()); exitosas++; }
      } catch (e) { console.warn(`Error con ${codigo}`, e); }
    }
    completadas++;
    if (barra) { const pct = Math.round((completadas/total)*100); barra.style.width = `${pct}%`; barra.textContent = `${pct}%`; }
    if (contador) contador.textContent = `${completadas}/${total}`;
  }
  if (estado) estado.textContent = "Empaquetando ZIP...";
  saveAs(await zip.generateAsync({ type:"blob" }), `Fotos_Renombradas_${fechaDDMMYY()}.zip`);
  if (btn) { btn.disabled = false; }
  if (estado) estado.textContent = `Listo. ${exitosas} imágenes descargadas.`;
  setTimeout(() => { if (containerProgreso) containerProgreso.classList.add("d-none"); }, 5000);
}

async function descargarUnaImagen(url, nombreArchivo) {
  try {
    mostrarNotificacion(`Descargando ${nombreArchivo}...`, "info");
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Error de red o bloqueo del proxy");
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl; link.download = `${nombreArchivo}.jpg`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    mostrarNotificacion(`${nombreArchivo} descargada`, "exito");
  } catch (error) {
    mostrarNotificacion("Proxy falló. Abriendo imagen original...", "alerta");
    window.open(url, '_blank');
  }
}

function volverVistaPrincipal() {
  document.getElementById("vistaImagenes")?.classList.add("d-none");
  document.getElementById("tablaPreview")?.classList.remove("d-none");
  document.getElementById("botonesTipo")?.classList.remove("d-none");
  document.getElementById("botonProcesar")?.classList.remove("d-none");
  document.querySelector(".formulario")?.classList.remove("d-none");
  document.getElementById("botonProcesarImagenes")?.classList.remove("d-none");
  tipoSeleccionado = "sin_seleccion";
  datosFiltrados = [...datosOriginales, ...datosCombinaciones];
  renderTablaConOrden(datosFiltrados);
  actualizarEstadoBotonesProcesar();
}

function volverAVistaPrincipal() { volverVistaPrincipal(); }

document.addEventListener("click", function(e) {
  const celda = e.target.closest(".sku-copy"); if (!celda) return;
  const sku = celda.dataset.sku; if (!sku) return;
  navigator.clipboard.writeText(sku).then(() => {
    celda.classList.add("bg-success","text-white");
    localStorage.setItem("sku_ok_" + sku, true);
  });
});

document.getElementById("botonProcesarImagenes")?.addEventListener("click", () => {
  renderTablaConOrden(datosFiltrados);
});

// =============================================
// AGREGAR CATEGORÍA ADICIONAL
// =============================================

function abrirModalAgregarCategoria_legacy() {
  const input = document.getElementById("nuevaCategoria");
  if (input) input.value = "";
}

// =============================================
// MODAL EXCEL WEB (jspreadsheet — Bootstrap interno)
// =============================================

window.miPlanillaExcel = null;
window.celdaActualExcel = null;

function abrirModalExcel() {
  let modal = document.getElementById("modalExcelWeb");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal fade"; modal.id = "modalExcelWeb"; modal.tabIndex = -1;
    modal.innerHTML = `
      <style>
        #modalExcelWeb .jexcel tbody td { white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important; }
        #modalExcelWeb .jexcel tbody tr { height:32px!important; }
      </style>
      <div class="modal-dialog modal-dialog-centered" style="max-width:80%;">
        <div class="modal-content shadow-lg">
          <div class="modal-header pb-2">
            <h5 class="modal-title"><i class="fas fa-table text-success me-2"></i>Edición Masiva (Modo Excel)</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" onclick="cerrarModalExcel()"></button>
          </div>
          <div class="p-2 d-flex align-items-center">
            <span class="me-2 text-muted fw-bold fst-italic" style="font-family:serif;font-size:1.2rem;">fx</span>
            <input type="text" id="barraExcelVista" class="form-control form-control-sm border-info shadow-none" placeholder="Selecciona una celda...">
          </div>
          <div class="modal-body" id="bodyExcelWeb" style="padding:2rem;">
            <div class="text-center p-4 text-muted" id="cargandoExcel">
              <i class="fa-solid fa-spinner fa-spin me-1"></i> Cargando tabla...
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary px-4" data-bs-dismiss="modal" onclick="cerrarModalExcel()">
              <i class="fa-solid fa-floppy-disk me-1"></i> Guardar y Actualizar Tabla
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  let dataset = (Array.isArray(datosFiltrados) && datosFiltrados.length)
    ? datosFiltrados : [...datosOriginales, ...datosCombinaciones];
  if (!dataset.length) { mostrarNotificacion("No hay datos para editar.", "alerta"); return; }

  const modalInst = new bootstrap.Modal(modal);
  modalInst.show();

  modal.addEventListener('shown.bs.modal', function inicializarExcel() {
    modal.removeEventListener('shown.bs.modal', inicializarExcel);
    const contenedorExcel = document.getElementById("bodyExcelWeb");
    contenedorExcel.innerHTML = "";
    const barraVista      = document.getElementById("barraExcelVista");
    barraVista.value = "";
    const columnasVisibles   = ordenColumnasVista.length ? ordenColumnasVista : Object.keys(dataset[0]);
    const datosParaExcel     = dataset.map(fila => columnasVisibles.map(col => (fila[col] ?? "").toString()));
    const configuracionColumnas = columnasVisibles.map(col => ({ type:'text', title:col, width:90 }));

    window.miPlanillaExcel = jspreadsheet(contenedorExcel, {
      data: datosParaExcel, columns: configuracionColumnas,
      search: true, pagination: 100,
      tableOverflow: true, tableHeight: "65vh", tableWidth: "100%",
      wordWrap: false, minSpareRows: 0, minSpareCols: 0,
      allowInsertColumn: false, allowInsertRow: false,

      onchange: function(instance, cell, x, y, value) {
        const nombreColumna = columnasVisibles[x];
        if (dataset[y]) {
          dataset[y][nombreColumna] = value;
          const colNorm = nombreColumna.toString().toLowerCase().trim();
          if (colNorm.includes("cantidad") || colNorm.includes("stock")) {
            const valorNum = Number(value) || 0;
            dataset[y]["_stock_original"] = valorNum; dataset[y]["CANTIDAD"] = valorNum; dataset[y]["cantidad"] = valorNum;
          }
          const skuMod = extraerCodigo(dataset[y]);
          if (skuMod) {
            [datosOriginales, datosCombinaciones, datosReposicion].forEach(lista => {
              const item = lista.find(r => extraerCodigo(r) === skuMod);
              if (item) {
                item[nombreColumna] = value;
                const cn = nombreColumna.toString().toLowerCase().trim();
                if (cn.includes("cantidad") || cn.includes("stock")) {
                  const vn = Number(value) || 0;
                  item["_stock_original"] = vn; item["CANTIDAD"] = vn; item["cantidad"] = vn;
                }
              }
            });
          }
        }
        if (window.celdaActualExcel?.x == x && window.celdaActualExcel?.y == y) barraVista.value = value;
      },

      onselection: function(instance, x1, y1) {
        window.celdaActualExcel = { x: x1, y: y1 };
        barraVista.value = instance.jexcel.getValueFromCoords(x1, y1) || "";
      },

      ondeleterow: function(instance, rowNumber, numOfRows) {
        const startIdx = parseInt(rowNumber);
        const skusEliminados = [];
        for (let i = 0; i < numOfRows; i++) {
          const fila = dataset[startIdx + i];
          if (fila) { const sku = extraerCodigo(fila); if (sku) skusEliminados.push(sku); }
        }
        dataset.splice(startIdx, numOfRows);
        skusEliminados.forEach(sku => {
          [window.datosOriginales, window.datosCombinaciones, window.datosReposicion, window.datosFiltrados].forEach(lista => {
            if (!Array.isArray(lista) || lista === dataset) return;
            const idx = lista.findIndex(r => extraerCodigo(r) === sku);
            if (idx !== -1) lista.splice(idx, 1);
          });
        });
        document.getElementById("barraExcelVista").value = "";
      }
    });

    barraVista.oninput = function() {
      if (window.celdaActualExcel) {
        const { x, y } = window.celdaActualExcel;
        window.miPlanillaExcel.setValueFromCoords(x, y, this.value);
      }
    };
  });
}

function cerrarModalExcel() {
  let dataset = (Array.isArray(datosFiltrados) && datosFiltrados.length)
    ? datosFiltrados : [...datosOriginales, ...datosCombinaciones];
  renderTablaConOrden(dataset);
  mostrarNotificacion("Tabla actualizada con tus ediciones", "exito");
}

// =============================================
// TIPO DE PRODUCTO
// =============================================

function obtenerTipoDeProducto(nombre, categoriaBase, subtipoOriginal, categoriaPlata) {
  nombre = nombre.toLowerCase();
  const esEnchapado = nombre.includes("enchapad") || nombre.includes("bañado") || nombre.includes("bañada");

  if (!esEnchapado) {
    if (subtipoOriginal && subtipoOriginal.trim() !== "" && subtipoOriginal.toLowerCase() !== "sin valor")
      return subtipoOriginal.trim();
    if (categoriaPlata && categoriaPlata.trim() !== "") return categoriaPlata.trim();
    return categoriaBase;
  }

  const subtiposPorCategoria = {
    aros: [
      { keys:["circon","circón","circones","cristal"], label:"Aros de Circón" },
      { keys:["corazon","corazón","corazones"], label:"Aros de Corazón" },
      { keys:["estrella"], label:"Aros Estrella" },
      { keys:["perla"], label:"Aros Perla" },
      { keys:["cuff","trepador"], label:"Aros Cuff / Trepadores" },
      { keys:["mariposa"], label:"Aros Mariposa" },
      { keys:["flor","trebol","trébol"], label:"Aros Florales" },
      { keys:["argolla"], label:"Aros Argolla" }
    ],
    collares: [
      { keys:["corazon","corazón"], label:"Collares con Corazón" },
      { keys:["cruz"], label:"Collares Cruz" },
      { keys:["circon","circón","cristal"], label:"Collares con Circón" },
      { keys:["perla"], label:"Collares con Perla" },
      { keys:["dije","colgante"], label:"Collares con Dije" },
      { keys:["placa"], label:"Collares Placa" }
    ],
    pulseras: [
      { keys:["eslabon","eslabón"], label:"Pulseras Eslabón" },
      { keys:["circon","circón"], label:"Pulseras con Circón" },
      { keys:["piedra"], label:"Pulseras con Piedra" },
      { keys:["macrame","macramé"], label:"Pulseras Macramé" },
      { keys:["cadena"], label:"Pulseras Cadena" }
    ],
    anillos: [
      { keys:["circon","circón"], label:"Anillos con Circón" },
      { keys:["piedra"], label:"Anillos Piedra Natural" },
      { keys:["falange","midi"], label:"Anillos MIDI / Falange" },
      { keys:["marquesita"], label:"Anillos Marquesita" },
      { keys:["liso"], label:"Anillos Lisos" }
    ],
    colgantes: [
      { keys:["inicial","letra"], label:"Colgantes Inicial" },
      { keys:["piedra"], label:"Colgantes Piedra Natural" },
      { keys:["cruz"], label:"Colgantes Cruz" },
      { keys:["placa"], label:"Colgantes Placa" },
      { keys:["niño","niña"], label:"Colgantes Niño/Niña" }
    ],
    cadenas: [
      { keys:["cartier"], label:"Cadenas Cartier" },
      { keys:["gucci"], label:"Cadenas Gucci" },
      { keys:["rolo"], label:"Cadenas Rolo" },
      { keys:["singapur"], label:"Cadenas Singapur" },
      { keys:["veneciana"], label:"Cadenas Veneciana" },
      { keys:["eslabon","eslabón"], label:"Cadenas Eslabón" }
    ],
    tobilleras: [
      { keys:["perla"], label:"Tobilleras con Perlas" },
      { keys:["cadena"], label:"Tobilleras Cadena" },
      { keys:["dije"], label:"Tobilleras con Dije" }
    ],
    conjuntos: [
      { keys:["corazon","corazón"], label:"Conjuntos Corazón" },
      { keys:["circon","circón"], label:"Conjuntos Circón" },
      { keys:["perla"], label:"Conjuntos Perla" },
      { keys:["cruz"], label:"Conjuntos Cruz" }
    ]
  };

  for (const st of (subtiposPorCategoria[categoriaBase] || [])) {
    for (const k of st.keys) { if (nombre.includes(k)) return st.label; }
  }

  const nombresEnchapado = {
    anillos:"Anillos Enchapados", aros:"Aros Enchapados", cadenas:"Cadenas Enchapadas",
    colgantes:"Colgantes Enchapados", pulseras:"Pulseras Enchapadas", tobilleras:"Tobilleras Enchapadas",
    collares:"Collares Enchapados", conjuntos:"Conjuntos Enchapados", infantil:"Infantil Enchapados"
  };
  return nombresEnchapado[categoriaBase] || "Enchapados";
}

// V2.3