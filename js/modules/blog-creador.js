// blog-creador.js


/* ==========================================
   CONFIGURACIÓN INICIAL Y CONEXIÓN FIREBASE
   ========================================== */
const DB_COLLECTION_CONFIG = "config";
const DB_DOC_POOL = "pool_destacados";

// Inicializamos el Set vacío por defecto
window.poolIds = new Set(); 

// 🔥 ESCUCHADOR EN TIEMPO REAL (SNAPSHOT)
// Esto descarga la lista al iniciar y la mantiene actualizada si cambias algo en otro lado
firebase.firestore().collection(DB_COLLECTION_CONFIG).doc(DB_DOC_POOL)
    .onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            // Convertimos el array de Firebase a nuestro Set local
            window.poolIds = new Set(data.ids || []);
            console.log("☁️ Pool sincronizado desde Firebase:", window.poolIds.size);
            window.cargarSelectsDestacados();
        } else {
            console.log("☁️ Creando documento de configuración por primera vez...");
            // Si no existe, lo creamos vacío
            firebase.firestore().collection(DB_COLLECTION_CONFIG).doc(DB_DOC_POOL).set({ ids: [] });
        }

        // Si el modal de preferencias está abierto, actualizamos la vista automáticamente
        const modalPref = document.getElementById('modalPreferencias');
        const modalSel = document.getElementById('modalSeleccionPool');
        
        if (modalPref && modalPref.style.display === 'flex') window.renderizarTablaPreferencias();
        if (modalSel && modalSel.style.display === 'flex') window.renderizarListaModal();
        
        // Actualizamos contador si existe
        const contador = document.getElementById("contadorPoolTexto");
        if(contador) contador.innerText = `${window.poolIds.size} seleccionados`;
    });



    

let navegacionBlogs = [];
let blogs = [];
window.blogsData = {};

/* =====================
   CARGA DE SELECTS
===================== */
// Convierte el ID a número para ordenar; si no es numérico, lo manda al final
function toNumId(v){
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : -Infinity;
}

// --- FUNCIÓN PARA CONVERTIR **TEXTO** EN <b>TEXTO</b> ---
function formatearNegritas(texto) {
    if (!texto) return "";
    // Busca pares de ** y los reemplaza por etiquetas <b>
    return texto.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
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
  if (!texto) return '';
  return texto
    .toString()
    .trim()                   // 1. ¡AQUÍ! Quitamos espacios al inicio y final primero
    .toLowerCase()            // 2. Minúsculas
    .normalize("NFD")         // 3. Normalizar tildes
    .replace(/[\u0300-\u036f]/g, "") // 4. Borrar tildes
    .replace(/\s+/g, "-");    // 5. Ahora sí, espacios internos a guiones
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
  const cuerpoRaw = document.getElementById("cuerpo")?.value?.trim();
  const cuerpo = cuerpoRaw ? cuerpoRaw.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') : "";

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

const destacadosHTML = destacadosSel.map(blog => {
    // Usamos 'nombre' si 'titulo' no existe, e 'imagen' si 'img' no existe
    const tituloFinal = blog.nombre || blog.titulo || "Sin título";
    const imagenFinal = blog.imagen || blog.img || "";
    const urlFinal = blog.url || "#";
    const categoriaFinal = blog.categoria || "General";

    return `
        <hr>
        <div class="row card-recomendados">
          <div class="col-5 portada-recomendados">
            <a href="${urlFinal}"><img src="${imagenFinal}" alt="${tituloFinal}"></a>
          </div>
          <div class="col-7">
            <a href="${urlFinal}"><h3 class="recomendados pt-2">${tituloFinal}</h3></a>
            <div class="etiquetas">
                <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${limpiarParaUrl(categoriaFinal)}">
                    ${categoriaFinal}
                </a>
            </div>
          </div>
        </div>
    `;
}).join('\n');

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
        window.blogsData[doc.id] = data;

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
const data = window.blogsData[blogId];
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
function setStepLocal(n) {
    // ... (código anterior de ocultar/mostrar pasos) ...

    // 🔥 SI VAMOS AL PASO 3 (Índice 2): CARGAR TODO
    if (n === 2) {
        setTimeout(() => {
            // 1. Cargar el Pool (Destacados 1, 2, 3)
            if (typeof window.cargarSelectsDestacados === 'function') {
                window.cargarSelectsDestacados();
            }

            // 2. Cargar Navegación (Anterior / Siguiente) - NUEVO
            if (typeof window.cargarSelectsNavegacion === 'function') {
                window.cargarSelectsNavegacion();
            }

        }, 50); // Pequeña espera para asegurar que el DOM esté listo
    }
  }
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
// Dentro de bindNavButtons...

    byId("next2")?.addEventListener("click", ()=> {
      const ok = validateStep2Local(true);
      markDone(1, ok);
      
      if (ok) {
        const t = byId("cuerpo");
        editorHeightPx = t ? t.clientHeight : null;
        setStepLocal(2);

        // 🛑 PASO 1: Bloquear funciones antiguas
        // Limpiamos manualmente para que si 'llenarSelects' corrió antes, lo borremos.
        ['select1', 'select2', 'select3'].forEach(id => {
             const el = document.getElementById(id);
             if(el) el.innerHTML = '<option value="">Cargando Pool...</option>';
        });

        // ✅ PASO 2: Cargar el Pool (con un pequeño respiro de 100ms)
        // El setTimeout asegura que nuestra función corra AL FINAL de todo, ganándole a cualquier otra.
        setTimeout(() => {
            if (typeof window.cargarSelectsDestacados === 'function') {
                window.cargarSelectsDestacados();
            } else {
                console.error("⚠️ No encuentro la función cargarSelectsDestacados");
            }
        }, 100);
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
    if (typeof cargarNavegacionSelects === "function") cargarNavegacionSelects(); // Carga Anterior/Siguiente (Todos)
    if (typeof llenarSelects === "function") llenarSelects();
    
    // 🔥 AGREGAR ESTO AQUÍ TAMBIÉN:
    if (typeof window.cargarSelectsDestacados === 'function') {
        window.cargarSelectsDestacados(); // Carga Destacados (Solo Pool)
    }
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
  

/* =========================================================
   NUEVO GESTOR DE POOL Y PREFERENCIAS (V2 - CON MODAL)
   ========================================================= */
(function() {
    const STORAGE_KEY_DESTACADOS = "djoyas_blogs_destacados_favs";
    let seleccionTemporal = new Set();

    // 1. Verificar si el blog está completo
    function verificarIntegridadBlog(data) {
        if (!data) return false;
        const tieneTitulo = data.nombre && data.nombre.trim().length > 0;
        const tieneAutor = data.autor && data.autor.trim().length > 0;
        const tieneCuerpo = data.blogHtml && data.blogHtml.trim().length > 0;
        return tieneTitulo && tieneAutor && tieneCuerpo;
    }

    // 2. Renderizar Tabla Principal
/* ==========================================
   RENDERIZAR TABLA DE PREFERENCIAS (POOL)
   ========================================== */
window.renderizarTablaPreferencias = function() {
    const tbody = document.getElementById("tablaPreferenciasBody");
    const mensajeVacio = document.getElementById("mensajeVacio");
    const contador = document.getElementById("contadorPoolTexto");

    if (!tbody) return;

    tbody.innerHTML = "";
    
    // Convertir el Set de IDs a Array
    const poolArray = Array.from(window.poolIds);

    if (poolArray.length === 0) {
        mensajeVacio.classList.remove("d-none");
        contador.textContent = "0 blogs en el pool";
        return;
    }

    mensajeVacio.classList.add("d-none");
    contador.textContent = `${poolArray.length} blogs en el pool`;

    poolArray.forEach(id => {
        const blog = window.blogsData[id]; // Asumiendo que tienes todos los datos cargados en blogsData
        
        if (!blog) return; // Si por algo no carga el dato, saltar

        const completo = esBlogCompleto(blog);
        
        // Configurar Etiqueta de Estado
        let estadoHtml = "";
        if (completo) {
            estadoHtml = `<span class="badge bg-success"><i class="fa fa-check"></i> Completo</span>`;
        } else {
            const faltan = obtenerFaltantes(blog);
            estadoHtml = `<span class="badge bg-danger" title="Falta: ${faltan}"><i class="fa fa-times"></i> Incompleto</span>
                          <small class="d-block text-muted" style="font-size:10px;">Falta: ${faltan}</small>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><small>${blog.id}</small></td>
            <td>
                <strong>${blog.nombre}</strong><br>
                <small class="text-muted">${blog.categoria}</small>
            </td>
            <td>${estadoHtml}</td>
        `;
        tbody.appendChild(tr);
    });
};

    // 3. Abrir Modal y Cargar Lista
    window.abrirModalPool = function() {
        const modal = document.getElementById("modalSeleccionPool");
        const inputBuscador = document.getElementById("buscadorModal");
        if(!modal) return;
        
        const guardados = JSON.parse(localStorage.getItem(STORAGE_KEY_DESTACADOS) || "[]");
        seleccionTemporal = new Set(guardados);

        if(inputBuscador) inputBuscador.value = "";
        modal.style.display = "flex"; 
        renderizarListaModal();
        if(inputBuscador) setTimeout(() => inputBuscador.focus(), 100);
    };

    window.cerrarModalPool = function() {
        const modal = document.getElementById("modalSeleccionPool");
        if(modal) modal.style.display = "none";
    };

    function renderizarListaModal(filtro = "") {
        const container = document.getElementById("listaModalBody");
        const contadorInfo = document.getElementById("contadorModalSeleccion");
        if (!container) return;

        container.innerHTML = "";
        const filtroNorm = filtro.toLowerCase().trim();
        const todos = Object.values(window.blogsData || {});
        
        // Ordenar ID descendente
        todos.sort((a, b) => {
            const idA = parseInt(a.id) || 0;
            const idB = parseInt(b.id) || 0;
            return idB - idA;
        });

        let mostrados = 0;
        todos.forEach(blog => {
            const textoBusqueda = `${blog.id} ${blog.nombre || ''}`.toLowerCase();
            if (filtro !== "" && !textoBusqueda.includes(filtroNorm)) return;

            mostrados++;
            const isChecked = seleccionTemporal.has(String(blog.id));

            const div = document.createElement("div");
            div.className = "item-modal";
            div.style.padding = "8px";
            div.style.borderBottom = "1px solid #eee";
            div.innerHTML = `
                <input type="checkbox" id="chk_${blog.id}" ${isChecked ? "checked" : ""} style="margin-right:10px;">
                <label for="chk_${blog.id}" style="margin:0; cursor:pointer; width:90%;">
                    <strong>#${blog.id}</strong> - ${blog.nombre || 'Sin Título'}
                </label>
            `;
            
            div.querySelector("input").addEventListener("change", (e) => {
                if (e.target.checked) seleccionTemporal.add(String(blog.id));
                else seleccionTemporal.delete(String(blog.id));
                if(contadorInfo) contadorInfo.textContent = `${seleccionTemporal.size} seleccionados`;
            });
            container.appendChild(div);
        });

        if (mostrados === 0) container.innerHTML = `<p class="text-muted text-center mt-3">No hay coincidencias.</p>`;
        if(contadorInfo) contadorInfo.textContent = `${seleccionTemporal.size} seleccionados`;
    }

    // Listener Buscador
    document.addEventListener("DOMContentLoaded", () => {
        const inputBuscador = document.getElementById("buscadorModal");
        if (inputBuscador) {
            inputBuscador.addEventListener("input", (e) => renderizarListaModal(e.target.value));
        }
    });

    // 4. Guardar Cambios del Modal
    window.guardarCambiosModal = function() {
        const arrayFinal = Array.from(seleccionTemporal);
        localStorage.setItem(STORAGE_KEY_DESTACADOS, JSON.stringify(arrayFinal));
        if(typeof mostrarNotificacion === "function") mostrarNotificacion(`✅ Pool actualizado: ${arrayFinal.length} blogs.`);
        else alert("Pool actualizado");
        
        window.cerrarModalPool();
        window.renderizarTablaPreferencias();
    };

    // 5. Navegación Vistas
    window.mostrarPreferencias = function() {
        const wizard = document.getElementById('blogWizard');
        const prefs = document.getElementById('seccionPreferencias');
        if (wizard && prefs) {
            wizard.classList.add('d-none');
            prefs.classList.remove('d-none');
            window.renderizarTablaPreferencias();
        }
    };

    window.cerrarPreferencias = function() {
        const wizard = document.getElementById('blogWizard');
        const prefs = document.getElementById('seccionPreferencias');
        if (wizard && prefs) {
            prefs.classList.add('d-none');
            wizard.classList.remove('d-none');
        }
    };

/* =========================================================
   AUTO ASIGNAR INTELIGENTE (SOLO BLOGS COMPLETOS)
   ========================================================= */

// 1. Función auxiliar de validación (Pégala fuera o antes de la función principal)
function esBlogCompleto(blog) {
    if (!blog) return false;
    const tieneNombre = blog.nombre && blog.nombre.trim().length > 0;
    const tieneCategoria = blog.categoria && blog.categoria.trim().length > 0;
    const tieneUrl = blog.url && blog.url.trim().length > 0;
    const tieneImagen = blog.imagen && blog.imagen.trim().length > 0;
    
    return tieneNombre && tieneCategoria && tieneUrl && tieneImagen;
}


/* =========================================================
   AUTO ASIGNAR INTELIGENTE (SOLO BLOGS COMPLETOS)
   ========================================================= */

// 1. Función de Validación (NECESARIA para que el filtro funcione)
function esBlogCompleto(blog) {
    if (!blog) return false;
    const tieneNombre = blog.nombre && blog.nombre.trim().length > 0;
    const tieneCategoria = blog.categoria && blog.categoria.trim().length > 0;
    const tieneUrl = blog.url && blog.url.trim().length > 0;
    const tieneImagen = blog.imagen && blog.imagen.trim().length > 0;
    
    return tieneNombre && tieneCategoria && tieneUrl && tieneImagen;
}

// 2. Función Principal Modificada
window.autoAsignarIntent = function(retriesLeft=3) {
    const sAnt = document.getElementById("selectAnterior");
    const sSig = document.getElementById("selectSiguiente");
    const s1   = document.getElementById("select1");
    const s2   = document.getElementById("select2");
    const s3   = document.getElementById("select3");

    // Chequeo de seguridad
    if (!s1 || !s2 || !s3) return; 

    // A. Cargar Pool de IDs
    const poolIdsRaw = JSON.parse(localStorage.getItem(STORAGE_KEY_DESTACADOS) || "[]");
    
    // B. 🔥 FILTRADO INTELIGENTE 🔥
    // Convertimos los IDs en objetos reales para revisarlos
    let poolValido = [];
    
    if (window.datosTabla && window.datosTabla.length > 0) {
        poolValido = poolIdsRaw.filter(id => {
            // Busamos el blog en la memoria (datosTabla viene de blog-admin.js)
            const blogReal = window.datosTabla.find(b => (b.id == id || b.docId == id));
            // Solo pasa si existe y está COMPLETO
            return esBlogCompleto(blogReal);
        });
    } else {
        // Si no se han cargado los datos aún, usamos el pool crudo (riesgoso)
        console.warn("⚠️ datosTabla no está listo, usando pool sin validar.");
        poolValido = poolIdsRaw;
    }

    // C. Mezclar Pool Validado (Shuffle)
    const poolMezclado = [...poolValido];
    for (let i = poolMezclado.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolMezclado[i], poolMezclado[j]] = [poolMezclado[j], poolMezclado[i]];
    }

    const used = new Set();
    [sAnt,sSig,s1,s2,s3].forEach(sel => { if(sel) sel.value = ""; });

    function pick(selectEl, preferredId = null) {
        if (!selectEl) return;
        
        // Intento 1: Usar ID del pool
        if (preferredId) {
           const optFav = Array.from(selectEl.options).find(o => o.value == preferredId);
           if (optFav) {
               const k = (optFav.textContent||"").trim();
               if (!used.has(k)) { selectEl.value = preferredId; used.add(k); return; }
           }
        }
        
        // Intento 2: Aleatorio normal
        const opts = Array.from(selectEl.options).filter(o => o.value !== "");
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        for (const op of opts) {
            const k = (op.textContent||"").trim();
            if (!used.has(k)) { selectEl.value = op.value; used.add(k); return; }
        }
    }

    // Asignar
    pick(s1, poolMezclado[0]);
    pick(s2, poolMezclado[1]);
    pick(s3, poolMezclado[2]);
    pick(sAnt, null);
    pick(sSig, null);

    // Mensaje informativo
    const total = poolIdsRaw.length;
    const validos = poolValido.length;
    const descartados = total - validos;
    
    let msg = "";
    if (poolMezclado.length > 0) {
        msg = `✅ Asignados destacados. (${descartados} ignorados por incompletos)`;
    } else {
        msg = "⚠️ Pool vacío o incompleto. Se asignaron al azar.";
    }
    
    if(typeof mostrarNotificacion === "function") mostrarNotificacion(msg, poolMezclado.length > 0 ? "exito" : "alerta");
};

// Re-bindear el botón
(function(){
    const btnAuto = document.getElementById("btnAutoAsignar");
    if(btnAuto) {
        const newBtn = btnAuto.cloneNode(true);
        btnAuto.parentNode.replaceChild(newBtn, btnAuto);
        newBtn.addEventListener("click", () => window.autoAsignarIntent());
    }
})();

// Función auxiliar para ver qué falta (Usada en la tabla de preferencias)
function obtenerFaltantes(blog) {
    let faltantes = [];
    if (!blog.nombre) faltantes.push("Nombre");
    if (!blog.categoria) faltantes.push("Categoría");
    if (!blog.url) faltantes.push("URL");
    if (!blog.imagen) faltantes.push("Imagen");
    return faltantes.join(", ");
}




})

/* ==========================================
   NAVEGACIÓN: MAGO <-> PREFERENCIAS
   ========================================== */

// 1. Mostrar la sección de preferencias (Oculta el wizard)
window.mostrarPreferencias = function() {
    const wizard = document.getElementById('blogWizard');
    const preferencias = document.getElementById('seccionPreferencias');

    if (wizard && preferencias) {
        wizard.classList.add('d-none');       // Ocultamos el generador
        preferencias.classList.remove('d-none'); // Mostramos la config
        
        // Dibujamos la tabla para ver qué tenemos y si están completos
        window.renderizarTablaPreferencias();
    }
};

// 2. Volver al generador (Oculta preferencias)
window.cerrarPreferencias = function() {
    const wizard = document.getElementById('blogWizard');
    const preferencias = document.getElementById('seccionPreferencias');

    if (wizard && preferencias) {
        preferencias.classList.add('d-none'); // Ocultamos config
        wizard.classList.remove('d-none');    // Mostramos generador
    }
};

/* ==========================================
   RENDERIZAR TABLA DE PREFERENCIAS (CON VALIDACIÓN)
   ========================================== */
window.renderizarTablaPreferencias = function() {
    const tbody = document.getElementById("tablaPreferenciasBody");
    const mensajeVacio = document.getElementById("mensajeVacio");

    if (!tbody) return;
    tbody.innerHTML = ""; // Limpiar tabla
    
    // Obtenemos los IDs guardados (Pool)
    const poolArray = Array.from(window.poolIds || []);

    if (poolArray.length === 0) {
        if(mensajeVacio) mensajeVacio.classList.remove("d-none");
        return;
    }
    
    if(mensajeVacio) mensajeVacio.classList.add("d-none");

    // Recorremos los IDs guardados
    poolArray.forEach(id => {
        // Buscamos los datos reales del blog en memoria
        // (Asegúrate de que datosTabla esté cargado desde blog-admin.js)
        const blog = (window.datosTabla || []).find(b => (b.id == id || b.docId == id));
        
        // Si no encontramos el blog (quizás se borró), mostramos el ID solamente
        if (!blog) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td colspan="2" class="text-danger">Blog ID: ${id} no encontrado (¿Eliminado?)</td>
                <td><button class="btn btn-sm btn-danger" onclick="togglePool('${id}'); renderizarTablaPreferencias()">Quitar</button></td>
            `;
            tbody.appendChild(tr);
            return;
        }

        // VALIDACIÓN: ¿Está completo?
        const completo = esBlogCompleto(blog); // Usamos la función que creamos antes
        let estadoHtml = "";
        
        if (completo) {
            estadoHtml = `<span class="badge bg-success">✅ Completo</span>`;
        } else {
            // Calculamos qué falta para decírselo al usuario
            const faltan = [];
            if (!blog.nombre) faltan.push("Nombre");
            if (!blog.categoria) faltan.push("Cat");
            if (!blog.url) faltan.push("URL");
            if (!blog.imagen) faltan.push("Img");
            
            estadoHtml = `<span class="badge bg-danger">❌ Incompleto</span>
                          <div style="font-size: 10px; color: #dc3545;">Falta: ${faltan.join(", ")}</div>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div class="fw-bold">${blog.nombre}</div>
                <small class="text-muted">${blog.categoria}</small>
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="togglePool('${id}'); renderizarTablaPreferencias()">
                   <i class="fa fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};


/* ==========================================
   GESTIÓN DEL MODAL DE SELECCIÓN (AGREGAR BLOGS AL POOL)
   ========================================== */

// 1. Abrir el modal
window.abrirModalPool = function() {
    const modal = document.getElementById('modalSeleccionPool');
    if (modal) {
        modal.style.display = 'flex';
        // Limpiamos el buscador al abrir
        if(document.getElementById('buscadorModal')) document.getElementById('buscadorModal').value = '';
        renderizarListaModal(); // Dibujamos la lista de opciones
    }
};

// 2. Cerrar el modal
window.cerrarModalPool = function() {
    const modal = document.getElementById('modalSeleccionPool');
    if (modal) modal.style.display = 'none';
};

// 3. Guardar (Simplemente cierra y actualiza la tabla de atrás)
window.guardarCambiosModal = function() {
    window.renderizarTablaPreferencias(); // Actualiza la tabla de configuración
    window.cerrarModalPool();
};

// 4. Función interna para dibujar la lista de checkboxes
function renderizarListaModal() {
    const contenedor = document.getElementById('listaModalBody');
    const inputBuscador = document.getElementById('buscadorModal');
    const filtro = inputBuscador ? inputBuscador.value.toLowerCase() : "";

    if (!contenedor) return;
    contenedor.innerHTML = ""; // Limpiar lista

    // Obtenemos TODOS los blogs de la memoria
    const todosLosBlogs = window.datosTabla || [];

    if (todosLosBlogs.length === 0) {
        contenedor.innerHTML = '<div class="text-center p-3">No hay blogs cargados en el sistema.</div>';
        return;
    }

    todosLosBlogs.forEach(blog => {
        // Filtro de búsqueda (por nombre)
        if (filtro && !blog.nombre.toLowerCase().includes(filtro)) return;

        const id = (blog.id || blog.docId).toString();
        const estaSeleccionado = window.poolIds.has(id);
        
        // Validación visual rápida (para saber si vale la pena seleccionarlo)
        const completo = typeof esBlogCompleto === 'function' ? esBlogCompleto(blog) : true;
        const iconoEstado = completo ? '<span class="text-success" title="Completo">✅</span>' : '<span class="text-warning" title="Incompleto">⚠️</span>';

        const div = document.createElement('div');
        div.className = "d-flex align-items-center border-bottom py-2";
        div.innerHTML = `
            <div class="me-3 ps-2">
                <input type="checkbox" class="form-check-input" style="transform: scale(1.3); cursor:pointer;"
                    ${estaSeleccionado ? "checked" : ""}
                    onchange="togglePool('${id}'); renderizarListaModal();"> 
            </div>
            <div style="flex:1;">
                <div class="fw-bold" style="font-size: 0.95rem;">${blog.nombre}</div>
                <div class="text-muted small">
                    ${iconoEstado} ${blog.categoria} <span class="ms-2 text-secondary">ID: ${id}</span>
                </div>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

// 5. Activar el buscador en tiempo real
const buscador = document.getElementById('buscadorModal');
if (buscador) {
    buscador.oninput = renderizarListaModal;
}


/* ==========================================
   LOGICA DEL CHECKBOX (TOGGLE)
   ========================================== */
/* ==========================================
   LOGICA DEL CHECKBOX (GUARDAR EN FIREBASE)
   ========================================== */
window.togglePool = function(id) {
    const strId = id.toString();

    // 1. Actualización Optimista (Visual inmediata)
    // Actualizamos la variable local primero para que se sienta rápido
    if (window.poolIds.has(strId)) {
        window.poolIds.delete(strId);
    } else {
        window.poolIds.add(strId);
    }

    // 2. Guardar en Firestore (La nube)
    // Convertimos el Set a Array porque Firestore no guarda Sets
    const arrayParaGuardar = Array.from(window.poolIds);

    firebase.firestore().collection(DB_COLLECTION_CONFIG).doc(DB_DOC_POOL)
        .set({ ids: arrayParaGuardar }, { merge: true })
        .then(() => {
            console.log("✅ Selección guardada en la nube.");
        })
        .catch((error) => {
            console.error("❌ Error al guardar en Firebase:", error);
            alert("Hubo un error al guardar tu selección en la nube.");
        });

    // 3. Actualizar contadores visuales locales (mientras responde Firebase)
    const contador = document.getElementById("contadorPoolTexto");
    if(contador) contador.innerText = `${window.poolIds.size} seleccionados`;
}

/* ==========================================
   FUNCIONES AUXILIARES (VALIDACIÓN)
   ========================================== */

// 1. Verifica si el blog tiene los 4 datos obligatorios
function esBlogCompleto(blog) {
    if (!blog) return false;
    
    // Verificamos que existan y no estén vacíos
    const tieneNombre = blog.nombre && blog.nombre.toString().trim().length > 0;
    const tieneCategoria = blog.categoria && blog.categoria.toString().trim().length > 0;
    const tieneUrl = blog.url && blog.url.toString().trim().length > 0;
    const tieneImagen = blog.imagen && blog.imagen.toString().trim().length > 0;
    
    return tieneNombre && tieneCategoria && tieneUrl && tieneImagen;
}

// 2. Devuelve un texto con lo que le falta (para mostrar en rojo)
function obtenerFaltantes(blog) {
    if (!blog) return "Datos no encontrados";
    
    let faltantes = [];
    if (!blog.nombre) faltantes.push("Nombre");
    if (!blog.categoria) faltantes.push("Categoría");
    if (!blog.url) faltantes.push("URL");
    if (!blog.imagen) faltantes.push("Imagen");
    
    return faltantes.length > 0 ? faltantes.join(", ") : "Nada";
}

// Hacemos las funciones globales por si acaso se llaman desde HTML
window.esBlogCompleto = esBlogCompleto;
window.obtenerFaltantes = obtenerFaltantes;


/* ==========================================
   CARGAR SELECTORES CON EL POOL (DESTACADOS)
   ========================================== */
window.cargarSelectsDestacados = function() {
    // 1. Identificamos los 3 selectores de destacados
    const idsSelects = ['select1', 'select2', 'select3'];
    
    // 2. Filtramos los blogs: Solo los que están en el Pool (window.poolIds)
    const blogsCandidatos = (window.datosTabla || []).filter(blog => {
        const id = (blog.id || blog.docId).toString();
        // Debe estar en el Pool Y estar completo
        return window.poolIds.has(id) && esBlogCompleto(blog);
    });

    // 3. Llenamos cada select
    idsSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Guardamos lo que estaba seleccionado por si acaso
        const valorPrevio = select.value;

        // Limpiamos y ponemos la opción por defecto
        select.innerHTML = '<option value="">-- Selecciona del Pool --</option>';

        // Si el pool está vacío, avisamos
        if (blogsCandidatos.length === 0) {
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.text = "(Tu pool está vacío o incompleto)";
            select.appendChild(opt);
            return;
        }

        // Insertamos las opciones
        blogsCandidatos.forEach(blog => {
            const id = blog.id || blog.docId;
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${blog.nombre} (${blog.categoria})`;
            select.appendChild(option);
        });

        // Intentamos restaurar la selección anterior si sigue existiendo
        if (valorPrevio && window.poolIds.has(valorPrevio)) {
            select.value = valorPrevio;
        }
    });
    
    console.log(`✅ Selects de destacados actualizados con ${blogsCandidatos.length} blogs del Pool.`);
};

/* ==========================================
   FUNCIÓN: CARGAR ANTERIOR/SIGUIENTE (SOLO TRANSCRITOS)
   ========================================== */
window.cargarSelectsNavegacion = function() {
    const idsSelects = ['selectAnterior', 'selectSiguiente'];
    
    // 1. Filtramos: Solo blogs con estado 'transcrito'
    // (Usamos toLowerCase por si acaso escribiste 'Transcrito' con mayúscula)
    const blogsAptos = (window.datosTabla || []).filter(blog => {
        return blog.estado && blog.estado.toLowerCase() === 'transcrito';
    });

    console.log(`📚 Cargando navegación con ${blogsAptos.length} blogs transcritos.`);

    idsSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const valorPrevio = select.value; // Guardar selección actual

        // Limpiar
        select.innerHTML = '<option value="">-- Selecciona un blog --</option>';

        // Llenar
        blogsAptos.forEach(blog => {
            const opt = document.createElement('option');
            // Usamos ID o docId según lo que tenga
            opt.value = blog.id || blog.docId; 
            // Mostramos Nombre y Fecha para ayudar a ordenar mentalmente
            opt.textContent = `${blog.nombre} (${blog.categoria})`;
            select.appendChild(opt);
        });

        // Restaurar selección
        if (valorPrevio) {
            select.value = valorPrevio;
        }
    });
};

/* ==========================================
   AUTO ASIGNAR ROBUSTO (BASADO EN OPCIONES DISPONIBLES)
   ========================================== */
window.autoAsignarCompleto = function() {
    console.log("🎲 Iniciando auto-asignación...");

    // 1. REFRESCAR LISTAS (Por seguridad)
    // Forzamos la recarga de opciones para asegurarnos de que hay algo que elegir
    if (typeof window.cargarSelectsNavegacion === 'function') window.cargarSelectsNavegacion();
    if (typeof window.cargarSelectsDestacados === 'function') window.cargarSelectsDestacados();

    // 2. FUNCIÓN DE AYUDA: ELEGIR AL AZAR DE UN SELECT
    function obtenerOpcionesValidas(idSelect) {
        const select = document.getElementById(idSelect);
        if (!select) return [];
        // Tomamos todas las opciones que tengan valor (ignoramos la opción "-- Seleccionar --")
        return Array.from(select.options).filter(opt => opt.value && opt.value.trim() !== "");
    }

    // 3. AUTO ASIGNAR NAVEGACIÓN (Anterior / Siguiente)
    // Usamos las opciones de 'selectAnterior' como fuente (son las mismas que Siguiente)
    const opcionesNav = obtenerOpcionesValidas('selectAnterior');
    
    if (opcionesNav.length < 2) {
        console.warn("⚠️ No hay suficientes blogs transcritos para navegación.");
    } else {
        // Mezclar
        const mezcladosNav = [...opcionesNav].sort(() => 0.5 - Math.random());
        
        const sAnt = document.getElementById("selectAnterior");
        const sSig = document.getElementById("selectSiguiente");

        // Asignar valores (El ID real está en .value)
        if (sAnt && mezcladosNav[0]) sAnt.value = mezcladosNav[0].value;
        if (sSig && mezcladosNav[1]) sSig.value = mezcladosNav[1].value;
    }

    // 4. AUTO ASIGNAR DESTACADOS (Pool)
    // Usamos las opciones de 'select1' como fuente (el Pool)
    const opcionesPool = obtenerOpcionesValidas('select1');

    if (opcionesPool.length === 0) {
        console.warn("⚠️ El Pool está vacío o no se cargó en los selects.");
        if(typeof mostrarNotificacion === 'function') mostrarNotificacion("El Pool está vacío. Agrega blogs en Preferencias.", "error");
    } else {
        // Mezclar
        const mezcladosPool = [...opcionesPool].sort(() => 0.5 - Math.random());

        const s1 = document.getElementById("select1");
        const s2 = document.getElementById("select2");
        const s3 = document.getElementById("select3");

        if (s1 && mezcladosPool[0]) s1.value = mezcladosPool[0].value;
        if (s2 && mezcladosPool[1]) s2.value = mezcladosPool[1].value;
        if (s3 && mezcladosPool[2]) s3.value = mezcladosPool[2].value;
    }

    console.log("✅ Auto asignación finalizada.");
};

// CONECTAR BOTÓN AL CARGAR
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnAutoAsignar");
    if (btn) {
        // Clonamos el botón para eliminar listeners viejos y poner el nuevo
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener("click", (e) => {
            e.preventDefault(); // Evita recargas si está dentro de un form
            window.autoAsignarCompleto();
        });
    }
});





// updd v1