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

// Detecta autoTable como método de instancia, API o función UMD
function getAutoTableRef(){
  const w = window;
  const JSPDF = w.jspdf?.jsPDF;

  // 1) Plugin acoplado a jsPDF (instancia o API)
  if (JSPDF?.prototype?.autoTable) return { type: "prototype", fn: null };
  if (JSPDF?.API?.autoTable)       return { type: "prototype", fn: null }; // muchos builds lo exponen aquí

  // 2) UMD: función global
  if (typeof w.jspdfAutoTable === "function")                 return { type: "function", fn: w.jspdfAutoTable };
  if (typeof w.jspdfAutoTable?.autoTable === "function")      return { type: "function", fn: w.jspdfAutoTable.autoTable };
  if (typeof w.autoTable === "function")                      return { type: "function", fn: w.autoTable };

  return null;
}


// ——— Garantiza jsPDF + autoTable desde CDNJS (si faltan)
async function ensurePdfLibs(){
  // jsPDF primero
  if(!(window.jspdf && window.jspdf.jsPDF)){
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }
  // autoTable después
  if(!getAutoTableRef()){
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
  }
  // verificación final
  const ok = !!(window.jspdf?.jsPDF) && !!getAutoTableRef();
  if(!ok) throw new Error("autoTable no disponible tras cargar scripts");
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
      id: uid(),
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
    id: state.editor.id || uid(),
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



// ——— Exportar PDF de una cotización (usa jsPDF + autoTable)
async function exportCotizacionPDF(id){
  const cot = state.cotizaciones.find(x => x.id === id);
  if(!cot){ notiError("No se encontró la cotización."); return; }

  // Cargar libs si faltan
  try { await ensurePdfLibs(); }
  catch (e){ notiError("No se pudieron cargar las librerías de PDF."); console.error(e); return; }

const at = getAutoTableRef();
if (at.type === "prototype") {
  doc.autoTable(tableOptions);     // plugin por API/instancia
} else {
  at.fn(doc, tableOptions);        // UMD: jspdfAutoTable(doc, options)
}
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Encabezado
  doc.setFont("helvetica","bold"); doc.setFontSize(14);
  doc.text("DJOYAS – Cotización", margin, y);
  doc.setFont("helvetica","normal"); doc.setFontSize(10);
  const fechaTxt = formatDDMMYYYY(cot.fecha || todayISO());
  doc.text(`ID: ${cot.id}`, pageW - margin, y, { align: "right" }); y += 16;
  doc.text(`Fecha: ${fechaTxt}`, pageW - margin, y, { align: "right" }); y += 8;
  doc.text(`Sucursal: ${cot.sucursal || "-"}`, pageW - margin, y, { align: "right" });

  y += 16; doc.setDrawColor(220); doc.line(margin, y, pageW - margin, y); y += 16;

  // Datos Cliente
  doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.text("Datos de Cliente(a)", margin, y);
  doc.setFont("helvetica","normal"); doc.setFontSize(10); y += 14;
  doc.text(`Nombre:  ${cot.cliente?.nombre || "-"}`, margin, y); y += 14;
  doc.text(`Correo:  ${cot.cliente?.correo || "-"}`, margin, y); y += 14;
  doc.text(`RUT:     ${cot.cliente?.rut || "-"}`, margin, y);    y += 14;
  doc.text(`Teléfono: ${cot.cliente?.fono || "-"}`, margin, y);

  // Tabla
  y += 18;
  const bodyRows = (cot.items || []).map(it => ([
    String(it.qty),
    `${it.nombre}\n${it.sku}`,
    fmtCLP(it.precio),
    fmtCLP(it.precio * it.qty),
  ]));

  const tableOptions = {
    startY: y,
    head: [[ "Cantidad", "Detalle", "V. Unitario", "V. Total" ]],
    body: bodyRows,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6, valign: "middle" },
    headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    columnStyles: { 0:{cellWidth:70, halign:"right"}, 1:{cellWidth:280}, 2:{cellWidth:100, halign:"right"}, 3:{cellWidth:100, halign:"right"} },
    margin: { left: margin, right: margin },
  };

  if (at.type === "prototype") {
    doc.autoTable(tableOptions);
  } else {
    at.fn(doc, tableOptions); // UMD
  }

  let finalY = doc.lastAutoTable?.finalY || (y + 30);

  // Total
  finalY += 10;
  doc.setFont("helvetica","bold"); doc.setFontSize(11);
  doc.text("Total:", pageW - margin - 120, finalY, { align: "left" });
  doc.text(fmtCLP(cot.total || 0), pageW - margin, finalY, { align: "right" });

  // Notas
  const notas = cot.notas || [];
  if (notas.length){
    finalY += 22;
    doc.setFontSize(12); doc.text("Notas", margin, finalY);
    finalY += 12; doc.setFont("helvetica","normal"); doc.setFontSize(10);
    const lineW = pageW - margin*2;
    notas.forEach(n => {
      const wrapped = doc.splitTextToSize(`• ${n}`, lineW);
      doc.text(wrapped, margin, finalY);
      finalY += wrapped.length * 12;
    });
  }

  finalY += 18; doc.setDrawColor(220); doc.line(margin, finalY, pageW - margin, finalY);
  finalY += 14; doc.setFontSize(9);
  doc.text("DistribuidoraDeJoyas.cl", margin, finalY);
  doc.text("Este documento es una cotización. Valores en CLP.", pageW - margin, finalY, { align: "right" });

  const safeName = (cot.cliente?.nombre || "cotizacion").replace(/[\\/:*?"<>|]+/g, " ");
  doc.save(`${cot.id} - ${safeName}.pdf`);
  notiOk("PDF generado correctamente");
}



  
  document.addEventListener("DOMContentLoaded", init);
})();




//v2.3