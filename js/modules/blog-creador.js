// blog-creador.js

let navegacionBlogs = [];
let blogs = [];

/* =====================
   CARGA DE SELECTS
===================== */
// Convierte el ID a número para ordenar; si no es numérico, lo manda al final
function toNumId(v){
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : -Infinity;
}

function cargarNavegacionSelects() {
  fetch('./data/navegacion.json')
    .then(res => res.json())
    .then(data => {
      navegacionBlogs = data;

      const selectAnterior = document.getElementById("selectAnterior");
      const selectSiguiente = document.getElementById("selectSiguiente");
      if (!selectAnterior || !selectSiguiente) return;

      // opción vacía (opcional)
      [selectAnterior, selectSiguiente].forEach(sel => {
        if (!sel.querySelector('option[value=""]')) {
          const opt = document.createElement('option');
          opt.value = "";
          opt.textContent = "-- Selecciona --";
          sel.appendChild(opt);
        }
      });

      data.forEach((blog, index) => {
        const optionA = document.createElement("option");
        optionA.value = index;
        optionA.textContent = blog.titulo;
        selectAnterior.appendChild(optionA);

        const optionS = document.createElement("option");
        optionS.value = index;
        optionS.textContent = blog.titulo;
        selectSiguiente.appendChild(optionS);
      });
    });
}

function llenarSelects() {
  fetch('./data/blogs.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      blogs = data;
      const selects = [
        document.getElementById('select1'),
        document.getElementById('select2'),
        document.getElementById('select3')
      ].filter(Boolean);

      selects.forEach(select => {
        select.innerHTML = "";
        // opción vacía
        const optEmpty = document.createElement('option');
        optEmpty.value = "";
        optEmpty.textContent = "-- Selecciona --";
        select.appendChild(optEmpty);

        blogs.forEach((blog, index) => {
          const option = document.createElement("option");
          option.value = index;
          option.textContent = blog.titulo;
          select.appendChild(option);
        });
      });
    });
}

// (Opcional) carga inicial básica
window.onload = () => {
  llenarSelects();
  cargarNavegacionSelects();
};

function limpiarParaUrl(texto) {
  return texto
    .toString()               // Aseguramos que sea texto
    .toLowerCase()            // 1. Todo a minúsculas
    .normalize("NFD")         // 2. Separa la letra del tilde (n + ~)
    .replace(/[\u0300-\u036f]/g, "") // 3. Borra los tildes
    .replace(/\s+/g, "-")     // 4. Cambia espacios por guiones (si tienes categorías de 2 palabras)
    .trim();                  // 5. Borra espacios al inicio o final
}

/* =====================
   GENERAR HTML
===================== */
function generarHTML() {
  const titulo = document.getElementById("titulo")?.value?.trim();
  const fecha = document.getElementById("fecha")?.value?.trim();
  const autor = document.getElementById("autor")?.value?.trim();
  const categoria = document.getElementById("categoria")?.value?.trim();
  const imagen = document.getElementById("imagen")?.value?.trim();
  const altImagen = document.getElementById("altImagen")?.value?.trim();
  const cuerpo = document.getElementById("cuerpo")?.value?.trim();

  if (!titulo || !fecha || !autor || !categoria || !imagen || !cuerpo) {
    alert("Por favor completa todos los campos obligatorios antes de generar el HTML.");
    return;
  }

  // Relacionados
  const selAnt = document.getElementById("selectAnterior");
  const selSig = document.getElementById("selectSiguiente");
  const idxAnt = selAnt ? parseInt(selAnt.value, 10) : NaN;
  const idxSig = selSig ? parseInt(selSig.value, 10) : NaN;

  const blogAnterior = Number.isInteger(idxAnt) ? navegacionBlogs[idxAnt] : null;
  const blogSiguiente = Number.isInteger(idxSig) ? navegacionBlogs[idxSig] : null;

  const sel1 = document.getElementById("select1");
  const sel2 = document.getElementById("select2");
  const sel3 = document.getElementById("select3");

  const destacadosSel = [sel1, sel2, sel3]
    .map(sel => sel ? parseInt(sel.value, 10) : NaN)
    .map(i => Number.isInteger(i) ? blogs[i] : null)
    .filter(Boolean);

  const destacadosHTML = destacadosSel.map(blog => `
        <hr>
        <div class="row card-recomendados">
          <div class="col-5 portada-recomendados">
            <a href="${blog.url}"><img src="${blog.img}" alt=""></a>
          </div>
          <div class="col-7">
            <a href="${blog.url}"><h3 class="recomendados pt-2">${blog.titulo}</h3></a>
            <div class="etiquetas"><a class="etiqueta-tag" href="/blog/${limpiarParaUrl(blog.categoria)}"></div>
          </div>
        </div>
  `).join('\n');

  const slug = categoria.toLowerCase().replace(/\s+/g, '-');
  const slugAnterior = blogAnterior?.categoria ? blogAnterior.categoria.toLowerCase().replace(/\s+/g, '-') : slug;
  const slugSiguiente = blogSiguiente?.categoria ? blogSiguiente.categoria.toLowerCase().replace(/\s+/g, '-') : slug;

  const html = `
<div class="blog container">
  <div class="row division">
    <div class="col-12 col-md-12 col-lg-8 bloque-contenido px-3">
      <section class="header-blog">
        <h1 class="titulo-blog">${titulo}</h1>
        <div class="info-blog">
          <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${slug}">${categoria}</a>
          <a class="ml-2">${fecha}</a>
          <span class="ml-2">Autora: <a href="#"><u>${autor}</u></a></span>
        </div>
        <div class="portada-blog">
          <img src="${imagen}" class="caja-img" alt="${altImagen}">
        </div>
      </section>

      <!-- Contenido Blog -->
      <section class="contenido-blog">
        <p>${cuerpo}</p>
      </section>

      <hr>

      <!-- Redes Sociales -->
      <section class="rrss-blog row container py-3">
        <div class="col-6"><a>${autor}, </a><a>${fecha}</a></div>
        <div class="col-6 iconos-blog">
          <a href="https://www.youtube.com/@distribuidoradejoyaschile9639"><i class="fa fa-youtube icono-contenido mx-1"></i></a>
          <a href="https://www.instagram.com/distribuidoradejoyas.cl/"><i class="fa fa-instagram icono-contenido mx-1"></i></a>
          <a href="https://cl.pinterest.com/distribuidoradejoyasCL/"><i class="fa fa-pinterest icono-contenido mx-1"></i></a>
          <a href="https://www.facebook.com/distribuidoradejoyaschile"><i class="fa fa-facebook icono-contenido mx-1"></i></a>
        </div>
      </section>

      <!-- Navegación entre artículos -->
      <section class="navegacion-articulos row mt-5">
  <div class="col-lg-6 col-md-6 col-12">
    <div class="bloque">
      <a href="${blogAnterior?.url || '#'}">
        <p class="etiqueta-blog"><i class="fa fa-angle-left mx-2"></i>Blog anterior</p>
      </a>
      <hr>
      <div class="row card-recomendados">
        <div class="col-auto">
          <h3 class="recomendados pt-2">
            <a href="${blogAnterior?.url || '#'}">${blogAnterior?.titulo || '—'}</a>
          </h3>
          <div class="etiquetas">
            <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${limpiarParaUrl(blogAnterior?.categoria || categoria)}">
              ${blogAnterior?.categoria || categoria}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="col-lg-6 col-md-6 col-12">
    <div class="bloque2">
      <a href="${blogSiguiente?.url || '#'}">
        <p class="etiqueta-blog">Blog siguiente <i class="fa fa-angle-right mx-2"></i></p>
      </a>
      <hr>
      <div class="row card-recomendados">
        <div class="col-auto">
          <h3 class="recomendados pt-2">
            <a href="${blogSiguiente?.url || '#'}">${blogSiguiente?.titulo || '—'}</a>
          </h3>
          <div class="etiquetas">
            <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${limpiarParaUrl(blogSiguiente?.categoria || categoria)}">
              ${blogSiguiente?.categoria || categoria}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

    </div>
    <div class="col-12 col-md-12 col-lg-4 bloque-lateral">

      <!-- Más vistos -->
      <section class="destacados mt-5">
        <div class="caja">
          <h2 class="titulo-card">Blog más vistos</h2>
          ${destacadosHTML}
        </div>
      </section>

      <!-- Contenido publicidad -->
      <section class="publicidad-blog mt-5">
        <a href="https://distribuidoradejoyas.cl/djoyas-inspira.24">
          <img src="/img/cms/paginas internas/blogs/inspira-blog.jpg" class="caja-img" alt="portada de blog">
        </a>
      </section>

      <!-- Etiquetas de contenido -->
      <section class="contenidos">
        <div class="caja mt-5">
          <h2 class="titulo-card">Consejos, Tendencias y Mucho Más</h2>
          <ul class="list-group list-group-flush">
            <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/emprendimiento"><h3 class="etiqueta-blog">Emprendimiento</h3></a><i class="fa fa-angle-right"></i></li>
            <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/sabias-que"><h3 class="etiqueta-blog">Sabías que?</h3></a><i class="fa fa-angle-right"></i></li>
            <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/beneficios"><h3 class="etiqueta-blog">Beneficios</h3></a><i class="fa fa-angle-right"></i></li>
            <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/cuidado-y-mantenimiento"><h3 class="etiqueta-blog">Cuidado y Mantenimiento</h3></a><i class="fa fa-angle-right"></i></li>
            <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/innovacion"><h3 class="etiqueta-blog">Innovación</h3></a><i class="fa fa-angle-right"></i></li>
          </ul>
        </div>
      </section>
    </div>
  </div>


</div>
`.trim();

  document.getElementById("resultado").textContent = html;
}
window.generarHTML = generarHTML;

function copiarHTML() {
  const resultado = document.getElementById("resultado").textContent;
  navigator.clipboard.writeText(resultado)
    .then(() => {
      // ✅ Toast de éxito
      mostrarNotificacion("Código copiado al portapapeles", "exito");
    })
    .catch(err => {
      // ❌ Toast de error
      mostrarNotificacion("Error al copiar: " + err, "error");
    });
}
window.copiarHTML = copiarHTML;
/* =====================
   FIREBASE (cargas)
===================== */

const blogsData = {};

function cargarBlogsExistentes() {
  const db = firebase.firestore();
  const select = document.getElementById("selectBlogExistente");
  if (!select) return;

  select.innerHTML = '<option value="">-- Selecciona un blog existente --</option>';

  db.collection("blogs").get()
    .then((qs) => {
      // Pasar a array y ordenar por ID numérico DESC
      const docs = [];
      qs.forEach(d => docs.push(d));
      docs.sort((a, b) => toNumId(b.id) - toNumId(a.id));

      docs.forEach((doc) => {
        const data = doc.data() || {};
        blogsData[doc.id] = data;

        const opt = document.createElement("option");
        opt.value = doc.id;
        opt.textContent = `${doc.id} - ${data.nombre || `Blog ${doc.id}`}`;
        select.appendChild(opt);
      });
    })
    .catch((error) => {
      mostrarNotificacion("Error cargando blogs: " + (error?.message || error), "error");
    });
}

function autocompletarFormulario(blogId) {
  const data = blogsData[blogId];
  if (!data) {
 if (blogId !== "") mostrarNotificacion(`Blog con ID ${blogId} no encontrado`, "alerta");
    return;
  }

  document.getElementById("titulo").value = data.nombre || "";
  document.getElementById("fecha").value = data.fecha || "";
  document.getElementById("autor").value = (data.autor && data.autor.trim()) || "Sofía de DJOYAS";
  document.getElementById("categoria").value = data.categoria || "";
  document.getElementById("imagen").value = `/img/cms/paginas%20internas/blogs/blog-${blogId}.jpg`;
  document.getElementById("altImagen").value = data.altImagen || "";
  document.getElementById("cuerpo").value = data.blogHtml || "";
}

document.addEventListener("DOMContentLoaded", () => {
  cargarBlogsExistentes();
  const select = document.getElementById("selectBlogExistente");
  select?.addEventListener("change", (e) => {
    const blogId = e.target.value;
    if (blogId) autocompletarFormulario(blogId);
  });
});

/* =====================
   STUBS LEGADOS (no usados)
===================== */
function setStep(n) { /* manejado por BlogStartFlow */ }
function nextStep() {}
function prevStep() {}
function validateStep1() { return true; }
function validateStep2() { return true; }
function validateStep3() { return true; }
function initWizardControls() { /* no-op */ }
function safeBindRelacionados() {
  if (typeof cargarNavegacionSelects === "function") cargarNavegacionSelects();
  if (typeof llenarSelects === "function") llenarSelects();
}

/* =====================
   WIZARD (Iniciar + Tabs)
===================== */
(function BlogStartFlow(){
  const stepIds = ["step1","step2","step3","step4"];
  let editorHeightPx = null;
  let current = -1;
  const done = [false,false,false,false];

  const $ = (sel)=> document.querySelector(sel);
  const $$ = (sel)=> document.querySelectorAll(sel);
  const byId = (id)=> document.getElementById(id);

  function hideAllSteps(){
    stepIds.forEach(id => { const el = byId(id); if (el) el.style.display = "none"; });
  }

  function ensureDefaultAuthor(){
    const selAutor = document.getElementById("autor");
    if (selAutor && !selAutor.value) selAutor.value = "Sofía de DJOYAS";
  }

  function setStepLocal(n){
    hideAllSteps();
    current = Math.max(0, Math.min(n, stepIds.length-1));
    const el = document.getElementById(stepIds[current]);
    if (el) el.style.display = "block";

    // Paso 1: autor por defecto
    if (current === 0) ensureDefaultAuthor();

    // Paso 4: toggle y altura del resultado
    if (current === 3) {
      const secGen = document.querySelector("#step4 .generar");
      const secRes = document.querySelector("#step4 .resultado");
      const preRes = document.getElementById("resultado");

      const tieneCodigo = !!preRes?.textContent.trim();
      if (secGen) secGen.style.display = tieneCodigo ? "none" : "block";
      if (secRes) secRes.style.display = tieneCodigo ? "block" : "none";

      if (preRes && editorHeightPx) preRes.style.minHeight = editorHeightPx + "px";
    }

    paintNav();
  }

  /* ---------- utilidades ---------- */
  function showModal(title, msg){
    if (typeof showIosModal==="function") return showIosModal(title,msg);
    alert(`${title}\n\n${msg}`);
  }

  // Validaciones
  function validateStep1Local(show=true){
    const req = ["titulo","fecha","autor","categoria","imagen"];
    for (const id of req){
      const el = byId(id);
      if (!el || !el.value.trim()){
        if (show) showModal("Faltan datos","Completa los datos del blog antes de continuar.");
        return false;
      }
    }
    return true;
  }
  function validateStep2Local(show=true){
    const c = byId("cuerpo")?.value.trim();
    if(!c){
      if (show) showModal("Contenido vacío","Pega el HTML del blog en esta etapa.");
      return false;
    }
    return true;
  }
  function validateStep3Local(show=true){ return true; }

  function markDone(idx, ok){
    done[idx] = !!ok;
    paintNav();
  }

  function getSelectedBlogTitle(){
    const sel = byId("selectBlogExistente"); if (!sel || !sel.value) return "";
    if (window.blogsData && window.blogsData[sel.value] && window.blogsData[sel.value].nombre) {
      return String(window.blogsData[sel.value].nombre).trim();
    }
    const raw = (sel.options[sel.selectedIndex]?.textContent || "").trim();
    const m = raw.match(/^(.+?)\s*\(/);
    return (m ? m[1] : raw).trim();
  }

  function stampTitleOnHeaders(title){
    const headers = $$("#blogWizard .wizard-step .cabecera-step h2, #blogWizard .wizard-step > h2");
    headers.forEach(h2 => {
      const txt = (h2.textContent || "").trim();
      const idx = txt.indexOf(":");
      h2.textContent = (idx >= 0 ? txt.slice(0, idx + 1) : (txt + ":")) + " " + title;
    });
  }

  function navTemplate(){
    return `
      <div class="wizard-nav" data-wiznav>
        <div class="wizbox" data-target-step="0"><div class="wiz-title">1. Datos</div><div class="wiz-sub" data-sub>Incompleto</div></div>
        <div class="wizbox" data-target-step="1"><div class="wiz-title">2. Cuerpo</div><div class="wiz-sub" data-sub>Incompleto</div></div>
        <div class="wizbox" data-target-step="2"><div class="wiz-title">3. Relacionados</div><div class="wiz-sub" data-sub>Incompleto</div></div>
        <div class="wizbox" data-target-step="3"><div class="wiz-title">4. HTML</div><div class="wiz-sub" data-sub>Incompleto</div></div>
      </div>`;
  }

  function mountNavs(){
    stepIds.forEach(id=>{
      const step = byId(id); if (!step) return;
      const header = step.querySelector(".cabecera-step") || step.querySelector(":scope > h2");
      if (!header) return;
      const next = header.nextElementSibling;
      if (next && next.tagName === "HR") next.remove();
      const already = step.querySelector(":scope > .wizard-nav,[data-wiznav]");
      if (!already) header.insertAdjacentHTML("afterend", navTemplate());
    });

    byId("blogWizard")?.addEventListener("click", (e)=>{
      const box = e.target.closest(".wizbox");
      if (!box || !box.closest("[data-wiznav]")) return;
      const target = parseInt(box.dataset.targetStep,10);
      if (Number.isInteger(target)) setStepLocal(target);
    });
  }

  function paintNav(){
    $$("#blogWizard [data-wiznav]").forEach(nav=>{
      nav.querySelectorAll(".wizbox").forEach(box=>{
        const idx = parseInt(box.dataset.targetStep,10);
        box.classList.toggle("is-active", idx === current);
        box.classList.toggle("is-done", !!done[idx]);
        const sub = box.querySelector("[data-sub]");
        if (sub) sub.textContent = done[idx] ? "Listo" : "Incompleto";
      });
    });
  }

  function bindNavButtons(){
    byId("next1")?.addEventListener("click", ()=> {
      const ok = validateStep1Local(true);
      markDone(0, ok);
      if (ok) setStepLocal(1);
    });

    byId("prev2")?.addEventListener("click", ()=> setStepLocal(0));
    byId("next2")?.addEventListener("click", ()=> {
      const ok = validateStep2Local(true);
      markDone(1, ok);
      if (ok) {
        const t = byId("cuerpo");
        editorHeightPx = t ? t.clientHeight : null;
        setStepLocal(2);
      }
    });

    byId("prev3")?.addEventListener("click", ()=> setStepLocal(1));
    byId("next3")?.addEventListener("click", ()=> {
      const ok = validateStep3Local(true);
      markDone(2, ok);
      if (ok) setStepLocal(3);
    });

    byId("prev4")?.addEventListener("click", ()=> setStepLocal(2));

byId("btnGenerar")?.addEventListener("click", ()=> {
  try {
    generarHTML();
    markDone(3, true);
    paintNav();

    const secGen = document.querySelector("#step4 .generar");
    const secRes = document.querySelector("#step4 .resultado");
    if (secGen) secGen.style.display = "none";
    if (secRes) secRes.style.display = "block";
    byId("btnCopiar")?.focus();

    // ✅ Toast de éxito
    mostrarNotificacion("HTML generado correctamente", "exito");
  } catch(e){
    // ❌ Toast de error
    mostrarNotificacion("No se pudo generar el HTML.", "error");
    if (typeof showIosModal === "function") showIosModal("Error","No se pudo generar el HTML.");
    else alert("No se pudo generar el HTML.");
  }
});


    byId("btnRedactarOtro")?.addEventListener("click", ()=> {
      ["titulo","fecha","imagen","altImagen","cuerpo"].forEach(id=>{
        const el = byId(id); if (el) el.value = "";
      });
      const selAutor = byId("autor"); if (selAutor) selAutor.value = "Sofía de DJOYAS";
      const selCat   = byId("categoria"); if (selCat) selCat.value = "";

      ["selectAnterior","selectSiguiente","select1","select2","select3"].forEach(id=>{
        const el = byId(id); if (el) el.value = "";
      });

      const preRes = byId("resultado"); if (preRes) preRes.textContent = "";
      const secGen = document.querySelector("#step4 .generar");
      const secRes = document.querySelector("#step4 .resultado");
      if (secGen) secGen.style.display = "block";
      if (secRes) secRes.style.display = "none";

      for (let i=0;i<done.length;i++) done[i]=false;
      paintNav();

      const sel = byId("selectBlogExistente");
      const selectorCard = sel?.closest(".ios-card");
      if (selectorCard) selectorCard.style.display = "";
      const btnInit = byId("btnIniciarBlog");
      if (btnInit) btnInit.disabled = true;
      if (sel) sel.value = "";

      hideAllSteps();
      window.scrollTo({ top: selectorCard?.offsetTop || 0, behavior: "smooth" });
    });

    byId("btnCopiar")?.addEventListener("click", ()=> {
      try { copiarHTML(); }
      catch(e){ mostrarNotificacion("No se pudo copiar el código.", "error"); showModal("Error","No se pudo copiar el código."); }
    });
  }

  function bindStart(){
    const sel = byId("selectBlogExistente");
    const btn = byId("btnIniciarBlog");
    if (!sel || !btn) return;

    sel.addEventListener("change", ()=> { btn.disabled = !sel.value; });

    btn.addEventListener("click", ()=>{
      if (!sel.value) return;
      const title = getSelectedBlogTitle();
      stampTitleOnHeaders(title);

      const selectorCard = sel.closest(".ios-card");
      if (selectorCard) selectorCard.style.display = "none";

      mountNavs();
      paintNav();
      setStepLocal(0);
      ensureDefaultAuthor();
    });
  }

  function bindRelacionados(){
    if (typeof cargarNavegacionSelects === "function") cargarNavegacionSelects();
    if (typeof llenarSelects === "function") llenarSelects();
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    hideAllSteps();
    bindStart();
    bindNavButtons();
    bindRelacionados();

    const step4Resultado = document.querySelector("#step4 .resultado");
    if (step4Resultado) step4Resultado.style.display = "none";
  });
})();
  
/* =====================
   AUTO ASIGNAR (Paso 3)
===================== */
(function AutoAsignarRelacionados(){
  const byId = (id)=> document.getElementById(id);

  const norm = (s)=> (s||"")
    .toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/\s+/g," ").trim();

  function shuffle(a){
    for (let i=a.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function pickUniqueForSelect(selectEl, usedKeys){
    if (!selectEl) return false;
    const options = Array.from(selectEl.options).filter(o => o.value !== "");
    if (options.length === 0) return false;

    const shuffled = shuffle(options.slice());
    for (const opt of shuffled){
      const key = norm(opt.textContent || opt.label || "");
      if (!key) continue;
      if (!usedKeys.has(key)){
        selectEl.value = opt.value;
        usedKeys.add(key);
        return true;
      }
    }
    return false;
  }

  function autoAsignarIntent(retriesLeft=3){
    const sAnt = byId("selectAnterior");
    const sSig = byId("selectSiguiente");
    const s1   = byId("select1");
    const s2   = byId("select2");
    const s3   = byId("select3");

    const allHaveOptions = [sAnt,sSig,s1,s2,s3].every(sel => sel && sel.options && sel.options.length > 1);
    if (!allHaveOptions){
      if (retriesLeft > 0) setTimeout(()=> autoAsignarIntent(retriesLeft-1), 300);
      else if (typeof showIosModal === "function") showIosModal("Sin datos", "Aún no hay suficientes opciones para auto asignar.");
      return;
    }

    const used = new Set();

    [sAnt,sSig,s1,s2,s3].forEach(sel => {
      const opt = sel.options[sel.selectedIndex];
      const key = norm(opt?.textContent || "");
      if (key) used.add(key);
    });

    [sAnt,sSig,s1,s2,s3].forEach(sel => { if (sel) sel.value = ""; });

    const order = [sAnt, sSig, s1, s2, s3];
    let successCount = 0;
    for (const sel of order){
      if (pickUniqueForSelect(sel, used)) successCount++;
    }

    if (successCount < order.length){
      if (typeof showIosModal === "function") {
        showIosModal("Opciones insuficientes","No hay suficientes blogs distintos para completar los 5 campos sin repetir.");
      } else {
        alert("No hay suficientes blogs distintos para completar los 5 campos sin repetir.");
      }
    } else {
      if (typeof showIosModal === "function") showIosModal("Listo", "Relacionados auto asignados sin repetir.");
    }
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    const btn = byId("btnAutoAsignar");
    if (!btn) return;
    btn.addEventListener("click", ()=> autoAsignarIntent());
  });
})();



// updd v3