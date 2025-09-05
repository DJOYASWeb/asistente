// ==========================================
// COTIZACIONES – LÓGICA (scopeado y seguro)
// ==========================================
(function () {
  "use strict";

let currentDetailId = null;


// ——— Carga de scripts por demanda (no uses async en <script> del HTML)
function loadScript(src){
  return new Promise((resolve, reject)=>{
    const s = document.createElement("script");
    s.src = src;
    s.async = false;                // respetar orden
    s.onload = resolve;
    s.onerror = ()=> reject(new Error(`No se pudo cargar: ${src}`));
    document.head.appendChild(s);
  });
}

// Detecta autoTable en todas las variantes: prototype, API o función UMD global
// Detecta autoTable en todas las variantes: prototype, API o función UMD
function getAutoTableRef(){
  const JSPDF = window.jspdf?.jsPDF;
  if (!JSPDF) return null;

  // 1) Plugin en el prototipo: doc.autoTable(...)
  if (JSPDF.prototype && JSPDF.prototype.autoTable) {
    return { type: "prototype", fn: null };
  }

  // 2) Plugin en la API estática: jsPDF.API.autoTable(...)
  if (JSPDF.API && typeof JSPDF.API.autoTable === "function") {
    return { type: "api", fn: JSPDF.API.autoTable };
  }

  // 3) UMD como función global
  if (typeof window.jspdfAutoTable === "function") {
    return { type: "function", fn: window.jspdfAutoTable };
  }
  if (typeof window.jspdfAutoTable?.autoTable === "function") {
    return { type: "function", fn: window.jspdfAutoTable.autoTable };
  }
  if (typeof window.autoTable === "function") {
    return { type: "function", fn: window.autoTable };
  }
  return null;
}



// ——— Garantiza jsPDF + autoTable desde CDNJS (si faltan)
async function ensurePdfLibs(){
  if(!(window.jspdf && window.jspdf.jsPDF)){
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }
  if(!getAutoTableRef()){
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
  }
  if(!(window.jspdf?.jsPDF) || !getAutoTableRef()){
    throw new Error("autoTable no disponible tras cargar scripts");
  }
}



  // —— Config / Helpers ——————————————————
  const STORAGE_KEY = "djoyas_cotizaciones_v1";
  const currencyCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function notiOk(msg){ try{ mostrarNotificacion(msg, "exito"); }catch{ console.log("✅", msg); } }
  function notiError(msg){ try{ mostrarNotificacion(msg, "error"); }catch{ console.error("⛔", msg); } }
  function fmtCLP(n){ return currencyCLP.format(n || 0); }
  function todayISO(){ return new Date().toISOString(); }
  function formatDDMMYYYY(iso){
    const d = iso ? new Date(iso) : new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth()+1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

// Cargar imagen con CORS habilitado (sirve para GitHub Pages u orígenes externos)
function loadImage(url){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen: " + url));
    img.src = url;
  });
}



// ===== Config de PDF (header/footer)
const PDF_FMT = {
  HEADER_IMG_H: 42,       // alto del logo
  HEADER_TOP_PAD: 12,     // ajuste vertical del bloque derecho
  COL_GAP: 24,            // espacio entre columnas de "Datos de Cliente(a)"
  TABLE_TOP_GAP: 24,      // espacio extra antes de la tabla
  TABLE_CONT_TOP_GAP: 16, // espacio extra cuando la tabla continúa en nueva página
  FOOTER_TEXT_SIZE: 8,
  FOOTER_LINES: 3,
  FOOTER_LEADING: 12,
  FOOTER_TOP_PAD: 10,
  // reserva mínima para que el contenido no choque con el footer
  FOOTER_H: 60
};

// Dibuja el header (logo izq + título/fecha/id der). Devuelve el nuevo "y" para continuar.
function drawHeader(doc, pageW, pageH, margin, logoImg, title, dateTxt, idTxt){
  const yTop = margin;
  let logoW = 0, logoH = 0;

  if (logoImg){
    const ratio = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1);
    logoH = PDF_FMT.HEADER_IMG_H;
    logoW = Math.round(logoH * ratio);
    doc.addImage(logoImg, "PNG", margin, yTop, logoW, logoH);
  }

  let yRight = yTop + PDF_FMT.HEADER_TOP_PAD;
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(title || "COTIZACIÓN", pageW - margin, yRight, { align: "right" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  yRight += 18;
  doc.text(dateTxt || "", pageW - margin, yRight, { align: "right" });

  yRight += 16;
  doc.text(idTxt || "", pageW - margin, yRight, { align: "right" });

  // línea separadora debajo del header
  const yAfter = Math.max(yTop + logoH, yRight) + 12;
  doc.setDrawColor(220);
  doc.line(margin, yAfter, pageW - margin, yAfter);

  return yAfter + 16;
}

// Dibuja el footer pegado al bottom con línea divisoria superior
function drawFooter(doc, pageW, pageH, margin){
  const l1 = "DistribuidoraDeJoyas.cl - Antonio Varas #989, Oficina 802, Edificio Capital - 4791154 Temuco - Chile";
  const l2 = "Para obtener más ayuda, póngase en contacto con Soporte:";
  const l3 = "Tel: 56 9 6390 7000";

  // Posiciones de texto (tres líneas)
  const y3 = pageH - margin;
  const y2 = y3 - PDF_FMT.FOOTER_LEADING;
  const y1 = y2 - PDF_FMT.FOOTER_LEADING;

  // Línea divisoria justo antes del footer
  const lineY = y1 - PDF_FMT.FOOTER_TOP_PAD;
  doc.setDrawColor(220);
  doc.line(margin, lineY, pageW - margin, lineY);

  // Texto de footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FMT.FOOTER_TEXT_SIZE);
  doc.text(l1, margin, y1);
  doc.text(l2, margin, y2);
  doc.text(l3, margin, y3);
}


// Header de la tabla (reutilizable en nuevas páginas). Devuelve nuevo y.
function drawTableHeader(doc, pageW, margin, y, colW){
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  // helpers locales
  const textRight = (txt, xRight, yy) => doc.text(String(txt), xRight, yy, { align: "right" });

  textRight("Cantidad", margin + colW.cant - 4, y);
  doc.text("Detalle", margin + colW.cant + 4, y);
  textRight("Valor Unitario", margin + colW.cant + colW.detalle + colW.vunit - 4, y);
  textRight("Valor Total",    margin + colW.cant + colW.detalle + colW.vunit + colW.vtotal - 4, y);

  y += 8; doc.setDrawColor(220); doc.line(margin, y, pageW - margin, y); y += 10;
  return y;
}

// Sección "Datos de Cliente(a)" en dos columnas simétricas. Devuelve nuevo y.
function drawClientTwoCol(doc, pageW, margin, y, cot){
  const colGap = PDF_FMT.COL_GAP;
  const colW = (pageW - margin*2 - colGap) / 2;

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Datos de Cliente(a)", margin, y);

  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const baseY = y + 14;               // primera línea bajo el título
  const lead  = 14;                   // interlineado

  // Izquierda
  doc.text(`Nombre:  ${cot.cliente?.nombre || "-"}`, margin, baseY);
  doc.text(`Correo:  ${cot.cliente?.correo || "-"}`, margin, baseY + lead);

  // Derecha
  const xRightCol = margin + colW + colGap;
  doc.text(`RUT:     ${cot.cliente?.rut || "-"}`,    xRightCol, baseY);
  doc.text(`Teléfono: ${cot.cliente?.fono || "-"}`,  xRightCol, baseY + lead);

  // Devuelve el y siguiente (2 líneas + título)
  return baseY + lead + 10;
}

  function uid(){ const d=new Date(); return `COT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}${String(d.getSeconds()).padStart(2,"0")}`; }

  // —— Estado ————————————————————————
  const state = {
    cotizaciones: [],
    editor: {
      id: null,
      cliente: { nombre:"", correo:"", rut:"", fono:"" },
      sucursal: "",
      items: [], // { sku, nombre, precio, stock, img, qty }
      notas: []  // strings seleccionadas (checkboxes + extras)
    }
  };


// ——— Correlativo para IDs tipo #COT00001
const STORAGE_SEQ_KEY = "djoyas_cotz_seq_v1";

function parseSeqFromId(id){
  const m = /^#COT(\d{5})$/.exec(id || "");
  return m ? parseInt(m[1], 10) : null;
}
function getMaxSeqFromState(){
  const nums = (state.cotizaciones || [])
    .map(c => parseSeqFromId(c.id))
    .filter(n => Number.isInteger(n));
  return nums.length ? Math.max(...nums) : 0;
}
function getNextCorrelativo(){
  let seq = parseInt(localStorage.getItem(STORAGE_SEQ_KEY) || "0", 10);
  // si aún no hay secuencia guardada, arranca desde el máximo existente
  if (!seq) seq = getMaxSeqFromState();
  seq += 1;
  localStorage.setItem(STORAGE_SEQ_KEY, String(seq));
  return `#COT${String(seq).padStart(5, "0")}`;
}

// ——— Fecha DD/MM/YYYY (para el PDF)
function formatDDMMYYYYSlash(iso){
  const d = iso ? new Date(iso) : new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}






  // —— Persistencia ————————————————————
  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state.cotizaciones = JSON.parse(raw);
    } catch (e) { console.warn("No se pudo leer localStorage", e); }
  }
  function saveState(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cotizaciones)); }
    catch (e){ console.warn("No se pudo guardar localStorage", e); }
  }

  // —— UI: Referencias ——————————————————
  const appSel = "#cotizacionesApp";
  function q(sel){ return $(`${appSel} ${sel}`); }

  // —— Productos: Provider dummy (reemplazable) ——————————
  // ⚠️ Para conectar a tu base, cambia searchProductos() por tu consulta real.
  const SAMPLE_PRODUCTS = [
    { sku:"EAR-0001", nombre:"Aros Plata 925 Corazón", precio: 5990, stock: 24, img:"https://picsum.photos/seed/ear1/400" },
    { sku:"NEC-0002", nombre:"Collar Infinito Plata 925", precio: 8990, stock: 12, img:"https://picsum.photos/seed/nec2/400" },
    { sku:"RIN-0003", nombre:"Anillo Ajustable Circones", precio: 7490, stock: 31, img:"https://picsum.photos/seed/rin3/400" },
    { sku:"BRA-0004", nombre:"Pulsera Doble Cadena", precio: 6990, stock: 18, img:"https://picsum.photos/seed/bra4/400" },
    { sku:"CHA-0005", nombre:"Cadena Plata 925 45cm", precio: 9990, stock: 40, img:"https://picsum.photos/seed/cha5/400" },
    { sku:"EAR-0006", nombre:"Aros Argollas 15mm", precio: 6490, stock: 7,  img:"https://picsum.photos/seed/ear6/400" },
    { sku:"NEC-0007", nombre:"Collar Inicial Letra A", precio: 8490, stock: 16, img:"https://picsum.photos/seed/nec7/400" },
    { sku:"RIN-0008", nombre:"Anillo Solitario Zircon", precio: 7990, stock: 20, img:"https://picsum.photos/seed/rin8/400" },
    { sku:"BRA-0009", nombre:"Pulsera Macramé Corazón", precio: 4990, stock: 22, img:"https://picsum.photos/seed/bra9/400" },
    { sku:"CHA-0010", nombre:"Choker Esmaltado Pastel", precio: 10990,stock: 9,  img:"https://picsum.photos/seed/cha10/400" },
    { sku:"EAR-0011", nombre:"Aros Perla Clásicos", precio: 5590, stock: 28, img:"https://picsum.photos/seed/ear11/400" },
    { sku:"NEC-0012", nombre:"Collar Medallón Estrella", precio: 9290, stock: 11, img:"https://picsum.photos/seed/nec12/400" },
     { sku:"BRA-0013", nombre:"Pulsera Macramé Corazón", precio: 4990, stock: 22, img:"https://picsum.photos/seed/bra9/400" },
    { sku:"CHA-0014", nombre:"Choker Esmaltado Pastel", precio: 10990,stock: 9,  img:"https://picsum.photos/seed/cha10/400" },
    { sku:"EAR-0015", nombre:"Aros Perla Clásicos", precio: 5590, stock: 28, img:"https://picsum.photos/seed/ear11/400" },
    { sku:"NEC-0016", nombre:"Collar Medallón Estrella", precio: 9290, stock: 11, img:"https://picsum.photos/seed/nec12/400" },
  ];

  async function searchProductos(query){
    const q = (query||"").trim().toLowerCase();
    if(!q) return SAMPLE_PRODUCTS.slice(0,10); // 2 filas × 5 columnas
    return SAMPLE_PRODUCTS.filter(p => 
      p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)
    ).slice(0,10);
  }

  // —— Render: Listado ——————————————————
function renderListado(){
  const tbody = q("#cotzTbodyListado");
  const vacio = q("#cotzVacio");
  tbody.innerHTML = "";
  if(!state.cotizaciones.length){
    vacio.classList.remove("d-none");
    return;
  }
  vacio.classList.add("d-none");
  state.cotizaciones.forEach(c => {
    const tr = document.createElement("tr");
    tr.dataset.id = c.id;
    tr.className = "cotz-row-openable";
    tr.title = "Ver cotización";
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.cliente?.nombre || "-"}</td>
      <td>${formatDDMMYYYY(c.fecha)}</td>
      <td>${c.sucursal || "-"}</td>
      <td class="cotz-right">${fmtCLP(c.total || 0)}</td>
      <td>
        <div class="cotz-actions">
          <button class="cotz-btn-mini cotz-btn-secondary" data-edit="${c.id}">Editar</button>
          <button class="cotz-btn-mini cotz-btn-danger" data-del="${c.id}">Eliminar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}



// ——— Gestor único de vistas (evita vistas duplicadas)
function setView(view){
  const vListado = q("#cotzVistaListado");
  const vEditor  = q("#cotzVistaEditor");
  const vDetalle = q("#cotzVistaDetalle");
  const btnNueva = q("#cotzBtnNueva");

  // Oculta todo
  vListado?.classList.add("d-none");
  vEditor?.classList.add("d-none");
  vDetalle?.classList.add("d-none");

  // Muestra solo la vista solicitada
  if (view === "listado") vListado?.classList.remove("d-none");
  if (view === "editor")  vEditor?.classList.remove("d-none");
  if (view === "detalle") vDetalle?.classList.remove("d-none");

  // Botón "Crear nueva cotización"
  if (view === "listado") btnNueva?.classList.remove("d-none");
  else btnNueva?.classList.add("d-none");
}


  // —— Navegación ————————————————————
function showListado(){
  setView("listado");
  renderListado();
}

function showEditor(reset = true){
  if (reset) resetEditor();
  setView("editor");
}

function showDetalle(){
  setView("detalle");
}

  // —— Editor: Reset / Bind ————————————————
function resetEditor(){
  state.editor = {
    id: getNextCorrelativo(),                   // ← nuevo correlativo #COT00001
    cliente: { nombre:"", correo:"", rut:"", fono:"" },
    sucursal: "",
    items: [],
    notas: []
  };
  // limpiar inputs
  q("#cotzCliNombre").value = "";
  q("#cotzCliCorreo").value = "";
  q("#cotzCliRut").value = "";
  q("#cotzCliFono").value = "";
  q("#cotzSucursal").value = "";
  q("#cotzBuscar").value = "";
  q("#cotzResultados").innerHTML = "";
  q("#cotzTbodyItems").innerHTML = "";
  q("#cotzTotal").textContent = fmtCLP(0);
  q("#cotzNotasExtras").innerHTML = "";
  // checkboxes marcadas por defecto
  state.editor.notas = getChecklistSeleccionadas();
}


  // ——————————— Cargar cotización existente en el editor ———————————
function applyNotasToUI(notas = []){
  // checkboxes base
  const checks = $$("#cotizacionesApp #cotzChecklist input[type='checkbox']");
  const baseTexts = checks.map(ch => ch.dataset.text);
  // marca/desmarca según lo guardado
  checks.forEach(ch => { ch.checked = notas.includes(ch.dataset.text); });

  // notas extras = todas las que no son de los checkboxes base
  const extras = (notas || []).filter(n => !baseTexts.includes(n));
  const cont = q("#cotzNotasExtras");
  cont.innerHTML = "";
  extras.forEach(val => {
    const chip = document.createElement("div");
    chip.className = "cotz-chip";
    chip.dataset.text = val;
    chip.innerHTML = `<span>${val}</span><button title="Eliminar" class="cotz-chip-del">×</button>`;
    cont.appendChild(chip);
  });
}

function loadCotizacionById(id){
  const idx = state.cotizaciones.findIndex(x => x.id === id);
  if (idx < 0) {
    notiError("No se encontró la cotización.");
    return;
  }
  const c = state.cotizaciones[idx];

  // Carga en estado del editor (copia superficial suficiente aquí)
  state.editor = {
    id: c.id,
    fecha: c.fecha, // conservamos fecha original
    cliente: { ...c.cliente },
    sucursal: c.sucursal || "",
    items: (c.items || []).map(it => ({ ...it })), // [{sku,nombre,precio,stock,img,qty}]
    notas: Array.isArray(c.notas) ? [...c.notas] : []
  };

  // Pasa a vista editor (sin resetear)
  showEditor(false);

  // Rellena inputs
  q("#cotzCliNombre").value = c.cliente?.nombre || "";
  q("#cotzCliCorreo").value = c.cliente?.correo || "";
  q("#cotzCliRut").value    = c.cliente?.rut || "";
  q("#cotzCliFono").value   = c.cliente?.fono || "";
  q("#cotzSucursal").value  = c.sucursal || "";

  // Rellena items y total
  renderItems();

  // Rellena notas (checks + extras)
  applyNotasToUI(state.editor.notas);

  notiOk(`Abierta cotización ${c.id}`);
}


  function getChecklistSeleccionadas(){
    return $$("#cotizacionesApp #cotzChecklist input[type='checkbox']")
      .filter(ch => ch.checked)
      .map(ch => ch.dataset.text);
  }

  // —— Productos: Render resultados ————————————
  async function handleBuscar(){
    const query = q("#cotzBuscar").value;
    const resultados = await searchProductos(query);
    const wrap = q("#cotzResultados");
    wrap.innerHTML = "";
    resultados.forEach(p => {
      const card = document.createElement("div");
      card.className = "cotz-card-prod";
      card.innerHTML = `
        <img src="${p.img}" alt="${p.nombre}">
        <div class="cotz-prod-name">${p.nombre}</div>
        <div class="cotz-prod-sku">${p.sku}</div>
        <div class="cotz-prod-meta">
          <span>${fmtCLP(p.precio)}</span>
          <span>Stock: ${p.stock}</span>
        </div>
        <div class="cotz-prod-actions">
          <button class="cotz-btn-secondary" data-add="${p.sku}">Agregar</button>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  // —— Ítems: Añadir / Render / Totales —————————
  function addItem(prod){
    const found = state.editor.items.find(it => it.sku === prod.sku);
    if(found){
      found.qty += 1;
    } else {
      state.editor.items.push({
        sku: prod.sku,
        nombre: prod.nombre,
        precio: prod.precio,
        stock: prod.stock,
        img: prod.img,
        qty: 1
      });
    }
    renderItems();
    notiOk("Producto agregado a la cotización");
  }

  function renderItems(){
    const tbody = q("#cotzTbodyItems");
    tbody.innerHTML = "";
    state.editor.items.forEach((it, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <input class="cotz-qty" type="number" min="1" value="${it.qty}" data-idx="${idx}">
        </td>
        <td>
          <div style="font-weight:600">${it.nombre}</div>
          <div style="font-size:.85rem; color:#666">${it.sku}</div>
        </td>
        <td class="cotz-right">${fmtCLP(it.precio)}</td>
        <td class="cotz-right">${fmtCLP(it.precio * it.qty)}</td>
        <td><button class="cotz-del" data-del="${idx}">✕</button></td>
      `;
      tbody.appendChild(tr);
    });
    updateTotal();
  }

  function updateTotal(){
    const total = state.editor.items.reduce((acc, it) => acc + (it.precio * it.qty), 0);
    q("#cotzTotal").textContent = fmtCLP(total);
    return total;
  }

  // —— Guardar cotización ————————————————
function guardarCotizacion(){
  const nombre = q("#cotzCliNombre").value.trim();
  const correo = q("#cotzCliCorreo").value.trim();
  const rut    = q("#cotzCliRut").value.trim();
  const fono   = q("#cotzCliFono").value.trim();
  const sucursal = q("#cotzSucursal").value;

  if(!nombre || !correo || !rut || !sucursal){
    notiError("Completa Nombre, Correo, RUT y Sucursal.");
    return;
  }
  if(state.editor.items.length === 0){
    notiError("Agrega al menos 1 producto.");
    return;
  }

  // refresca notas
  const notasChecklist = getChecklistSeleccionadas();
  const notasExtras = Array.from(q("#cotzNotasExtras").querySelectorAll(".cotz-chip"))
    .map(ch => ch.dataset.text);
  state.editor.notas = [...notasChecklist, ...notasExtras];

  const total = updateTotal();

  const cot = {
id: state.editor.id,
    fecha: state.editor.fecha || todayISO(), // mantiene fecha si ya existía
    sucursal,
    cliente: { nombre, correo, rut, fono },
    items: state.editor.items,
    notas: state.editor.notas,
    total
  };

  const idx = state.cotizaciones.findIndex(x => x.id === cot.id);
  if (idx >= 0) {
    // actualizar existente
    state.cotizaciones[idx] = cot;
    notiOk("Cotización actualizada");
  } else {
    // nueva
    state.cotizaciones.unshift(cot);
    notiOk("Cotización guardada");
  }
  saveState();
  showListado();
}


  // —— Notas extras ————————————————
  function agregarNotaExtra(){
    const val = q("#cotzNotaExtra").value.trim();
    if(!val) return;
    const cont = q("#cotzNotasExtras");
    const chip = document.createElement("div");
    chip.className = "cotz-chip";
    chip.dataset.text = val;
    chip.innerHTML = `<span>${val}</span><button title="Eliminar" class="cotz-chip-del">×</button>`;
    cont.appendChild(chip);
    q("#cotzNotaExtra").value = "";
  }

  // —— Eventos globales ————————————————
function bindEvents(){
  // ——— Navegación
  q("#cotzBtnNueva").addEventListener("click", ()=> showEditor(true));
  q("#cotzBtnVolver").addEventListener("click", ()=>{
    const confirmSalir = state.editor.items.length>0 || q("#cotzCliNombre").value || q("#cotzCliCorreo").value || q("#cotzCliRut").value;
    if (confirmSalir && !confirm("Hay cambios sin guardar. ¿Volver de todos modos?")) return;
    showListado();
  });
  q("#cotzBtnGuardar").addEventListener("click", guardarCotizacion);

  // ——— Búsqueda
  q("#cotzBtnBuscar").addEventListener("click", handleBuscar);
  q("#cotzBuscar").addEventListener("keydown", (e)=>{
    if (e.key === "Enter") { e.preventDefault(); handleBuscar(); }
  });
  q("#cotzResultados").addEventListener("click", async (e)=>{
    const btn = e.target.closest("[data-add]");
    if(!btn) return;
    const sku = btn.getAttribute("data-add");
    const results = await searchProductos(q("#cotzBuscar").value);
    const prod = results.find(p => p.sku === sku);
    if (prod) addItem(prod);
  });

  // ——— Items: cantidad / eliminar
  q("#cotzTbodyItems").addEventListener("input", (e)=>{
    const inp = e.target.closest(".cotz-qty");
    if(!inp) return;
    const idx = Number(inp.getAttribute("data-idx"));
    let v = parseInt(inp.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    state.editor.items[idx].qty = v;
    renderItems();
  });
  q("#cotzTbodyItems").addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-del]");
    if(!btn) return;
    const idx = Number(btn.getAttribute("data-del"));
    state.editor.items.splice(idx,1);
    renderItems();
  });

  // ——— Checklist (se refresca al guardar)
  q("#cotzChecklist").addEventListener("change", ()=>{});

  // ——— Notas extra (ahora dentro de bindEvents, no fuera)
  q("#cotzBtnAgregarNota").addEventListener("click", agregarNotaExtra);
  q("#cotzNotasExtras").addEventListener("click", (e)=>{
    if (e.target.classList.contains("cotz-chip-del")){
      e.target.parentElement.remove();
    }
  });

  // ——— Listado: Ver (clic fila), Editar, Eliminar
  q("#cotzTbodyListado").addEventListener("click", (e)=>{
    const btnEdit = e.target.closest("[data-edit]");
    if (btnEdit) { loadCotizacionById(btnEdit.getAttribute("data-edit")); return; }
    const btnDel = e.target.closest("[data-del]");
    if (btnDel) { deleteCotizacion(btnDel.getAttribute("data-del")); return; }
    const tr = e.target.closest("tr");
    if (tr?.dataset.id) { showDetalleById(tr.dataset.id); }
  });


  // ——— Detalle (read-only): Volver, Editar, Exportar PDF
q("#cotzDetVolver")?.addEventListener("click", showListado);
q("#cotzDetEditar")?.addEventListener("click", ()=>{
  if (!currentDetailId) return;
  loadCotizacionById(currentDetailId);
});
q("#cotzDetPdf")?.addEventListener("click", ()=>{
  if (!currentDetailId) return;
  exportCotizacionPDF(currentDetailId);
});



  // ——— Detalle (read-only): Volver y Editar
  q("#cotzDetVolver")?.addEventListener("click", showListado);
  q("#cotzDetEditar")?.addEventListener("click", ()=>{
    if (!currentDetailId) return;
    loadCotizacionById(currentDetailId);
  });
}


function renderDetalle(c){
  currentDetailId = c.id || null;

  q("#cotzDetCliNombre").textContent = c.cliente?.nombre || "—";
  q("#cotzDetCliCorreo").textContent = c.cliente?.correo || "—";
  q("#cotzDetCliRut").textContent    = c.cliente?.rut || "—";
  q("#cotzDetCliFono").textContent   = c.cliente?.fono || "—";
  q("#cotzDetSucursal").textContent  = c.sucursal || "—";

  // Items
  const tb = q("#cotzDetTbodyItems");
  tb.innerHTML = "";
  (c.items || []).forEach(it=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.qty}</td>
      <td>
        <div style="font-weight:600">${it.nombre}</div>
        <div style="font-size:.85rem; color:#666">${it.sku}</div>
      </td>
      <td class="cotz-right">${fmtCLP(it.precio)}</td>
      <td class="cotz-right">${fmtCLP(it.precio * it.qty)}</td>
    `;
    tb.appendChild(tr);
  });

  // Total
  const total = (c.items || []).reduce((acc,it)=> acc + (it.precio*it.qty), 0);
  q("#cotzDetTotal").textContent = fmtCLP(total);

  // Notas
  const ul = q("#cotzDetNotas");
  ul.innerHTML = "";
  (c.notas || []).forEach(n=>{
    const li = document.createElement("li");
    li.textContent = n;
    ul.appendChild(li);
  });
}

function showDetalleById(id){
  const c = state.cotizaciones.find(x => x.id === id);
  if(!c){ notiError("No se encontró la cotización."); return; }
  renderDetalle(c);
  showDetalle();
  notiOk(`Viendo cotización ${c.id}`);
}

function deleteCotizacion(id){
  const idx = state.cotizaciones.findIndex(x => x.id === id);
  if(idx < 0){ notiError("No se encontró la cotización."); return; }
  if(!confirm(`¿Eliminar la cotización ${state.cotizaciones[idx].id}? Esta acción no se puede deshacer.`)) return;
  state.cotizaciones.splice(idx,1);
  saveState();
  notiOk("Cotización eliminada");
  // Si estabas viendo esa misma, vuelve al listado
  showListado();
}




    // Abrir cotización desde el listado
q("#cotzTbodyListado").addEventListener("click", (e)=>{
  const tr = e.target.closest("tr");
  if(!tr || !tr.dataset.id) return;
  loadCotizacionById(tr.dataset.id);
});


    // Nota extra
    q("#cotzBtnAgregarNota").addEventListener("click", agregarNotaExtra);
    q("#cotzNotasExtras").addEventListener("click", (e)=>{
      if(e.target.classList.contains("cotz-chip-del")){
        e.target.parentElement.remove();
      }
    });
 

  // —— Init ———————————————————————————
  function init(){
    const app = $(appSel);
    if(!app) return; // no está en esta página
    loadState();
    renderListado();
    bindEvents();
  }


  function getAutoTableRef(){
  const w = window;
  // Modo plugin (doc.autoTable)
  if (w.jspdf?.jsPDF?.prototype?.autoTable) return { type: "prototype", fn: null };
  // Modo función UMD
  if (typeof w.jspdfAutoTable === "function") return { type: "function", fn: w.jspdfAutoTable };
  if (typeof w.jspdfAutoTable?.autoTable === "function") return { type: "function", fn: w.jspdfAutoTable.autoTable };
  if (typeof w.autoTable === "function") return { type: "function", fn: w.autoTable };
  return null;
}



// ===============================
// Exportar PDF (Carta) con header/footer por página, datos en 2 columnas,
// tabla con header repetido y más espacio al continuar.
// ===============================
async function exportCotizacionPDF(id){
  const cot = state.cotizaciones.find(x => x.id === id);
  if(!cot){ notiError("No se encontró la cotización."); return; }

  if (!(window.jspdf && window.jspdf.jsPDF)) {
    notiError("jsPDF no está cargado. Revisa el <script> en el HTML.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" }); // 👉 Formato Carta

  let pageW = doc.internal.pageSize.getWidth();
  let pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  const textRight = (txt, xRight, y) => doc.text(String(txt), xRight, y, { align: "right" });

  // Logo (carga una sola vez)
  const logoUrl = "https://djoyasweb.github.io/asistente/img/logo_byn.png";
  let logoImg = null;
  try { logoImg = await loadImage(logoUrl); } catch(e){ logoImg = null; }

  const fechaTxt = (typeof formatDDMMYYYYSlash === "function")
    ? formatDDMMYYYYSlash(cot.fecha || todayISO())
    : formatDDMMYYYY(cot.fecha || todayISO()).replace(/-/g, "/");

  // ===== Header y Footer de la primera página
  let y = drawHeader(doc, pageW, pageH, margin, logoImg, "COTIZACIÓN", fechaTxt, cot.id);
  drawFooter(doc, pageW, pageH, margin);

  // ensureSpace: respeta footer y reimprime header/footer + header de tabla si hace falta
  function ensureSpace(h, opts = {}){
    const bottomLimit = pageH - (margin + PDF_FMT.FOOTER_H);
    if (y + h > bottomLimit){
      doc.addPage();
      pageW = doc.internal.pageSize.getWidth();
      pageH = doc.internal.pageSize.getHeight();
      y = drawHeader(doc, pageW, pageH, margin, logoImg, "COTIZACIÓN", fechaTxt, cot.id);
      drawFooter(doc, pageW, pageH, margin);
      if (opts.afterNewPage === "tableHeader"){
        y += PDF_FMT.TABLE_CONT_TOP_GAP;
        y = drawTableHeader(doc, pageW, margin, y, computeColW(pageW, margin));
      }
    }
  }

  // Helper para widths de tabla según ancho de página actual
  function computeColW(pageW, margin){
    return {
      cant: 60,
      vunit: 100,
      vtotal: 100,
      detalle: pageW - margin*2 - 60 - 100 - 100
    };
  }

  // ===== Datos de Cliente(a) en dos columnas
  // Reserva espacio del bloque (título + 2 líneas por columna ≈ 38–42pt)
  ensureSpace(56);
  y = drawClientTwoCol(doc, pageW, margin, y, cot);

  // ===== Tabla
  y += PDF_FMT.TABLE_TOP_GAP;     // más aire antes de la tabla
  ensureSpace(40);                // header de tabla cabe seguro

  const colW = computeColW(pageW, margin);
  y = drawTableHeader(doc, pageW, margin, y, colW);

  // Filas
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const rows = (cot.items || []).map(it => ([
    String(it.qty),
    `${it.nombre}\n${it.sku}`,
    fmtCLP(it.precio),
    fmtCLP(it.precio * it.qty),
  ]));

  rows.forEach(r => {
    const [cant, detalle, vunit, vtotal] = r;
    const detalleLines = doc.splitTextToSize(detalle, colW.detalle - 8);
    const lineCount = Math.max(1, detalleLines.length);
    const rowH = 14 * lineCount + 4;
    // Si no cabe la fila, nueva página + header de tabla
    ensureSpace(rowH + 6, { afterNewPage: "tableHeader" });

    // Dibujo de la fila
    textRight(cant, margin + colW.cant - 4, y + 12);
    doc.text(detalleLines, margin + colW.cant + 4, y + 12);
    textRight(vunit,  margin + colW.cant + colW.detalle + colW.vunit - 4, y + 12);
    textRight(vtotal, margin + colW.cant + colW.detalle + colW.vunit + colW.vtotal - 4, y + 12);

    // Línea bajo la fila
    y += rowH;
    doc.setDrawColor(240); doc.line(margin, y, pageW - margin, y);
    y += 6;
  });

  // ===== Total
  ensureSpace(30);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Total:", pageW - margin - 120, y + 12);
  textRight(fmtCLP(cot.total || 0), pageW - margin, y + 12);
  y += 28;

  // ===== Notas
  const notas = cot.notas || [];
  if (notas.length) {
    ensureSpace(20);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("Notas", margin, y);
    y += 12;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);

    const lineW = pageW - margin*2;
    notas.forEach(n => {
      const wrapped = doc.splitTextToSize(`• ${n}`, lineW);
      wrapped.forEach(line => {
        ensureSpace(14);
        doc.text(line, margin, y + 12);
        y += 14;
      });
    });
  }

  // (No dibujamos pie aquí; drawFooter ya lo puso en cada página)

  // Descargar
  const safeName = (cot.cliente?.nombre || "cotizacion").replace(/[\\/:*?"<>|]+/g, " ");
  doc.save(`${cot.id} - ${safeName}.pdf`);
  notiOk("PDF generado correctamente");
}

  
  document.addEventListener("DOMContentLoaded", init);
})();




//v1.2