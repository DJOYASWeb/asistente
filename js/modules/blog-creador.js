// blog-creador.js

let navegacionBlogs = [];
let blogs = [];

function cargarNavegacionSelects() {
  fetch('./data/navegacion.json')
    .then(res => res.json())
    .then(data => {
      navegacionBlogs = data;

      const selectAnterior = document.getElementById("selectAnterior");
      const selectSiguiente = document.getElementById("selectSiguiente");

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
      ].filter(Boolean); // evita null

      selects.forEach(select => {
        select.innerHTML = "";
        blogs.forEach((blog, index) => {
          const option = document.createElement("option");
          option.value = index;
          option.textContent = blog.titulo;
          select.appendChild(option);
        });
      });
    });
}


window.onload = () => {
  llenarSelects();
  cargarNavegacionSelects();
};

function generarHTML() {
  const titulo = document.getElementById("titulo").value;
  const fecha = document.getElementById("fecha").value;
  const autor = document.getElementById("autor").value;
  const categoria = document.getElementById("categoria").value;
  const imagen = document.getElementById("imagen").value;
  const altImagen = document.getElementById("altImagen").value;
  const cuerpo = document.getElementById("cuerpo").value;

  if (!titulo || !fecha || !autor || !categoria || !imagen || !cuerpo) {
    alert("Por favor completa todos los campos obligatorios antes de generar el HTML.");
    return;
  }

  const blogAnterior = navegacionBlogs[parseInt(document.getElementById("selectAnterior").value)];
  const blogSiguiente = navegacionBlogs[parseInt(document.getElementById("selectSiguiente").value)];

  const destacados = [
    blogs[parseInt(select1.value)],
    blogs[parseInt(select2.value)],
    blogs[parseInt(select3.value)]
  ];

  const destacadosHTML = destacados.map(blog => `
        <hr>
    <div class="row card-recomendados">
      <div class="col-5 portada-recomendados">
        <a href="${blog.url}"><img src="${blog.img}"></a>
      </div>
      <div class="col-7">
        <a href="${blog.url}"><h3 class="recomendados pt-2">${blog.titulo}</h3></a>
        <div class="etiquetas"><a class="etiqueta-tag" href="${blog.url.split('/').slice(0, 6).join('/')}">${blog.categoria}</a></div>
      </div>
    </div>

  `).join('\n');

  const slug = categoria.toLowerCase().replace(/\s+/g, '-');
  const slugAnterior = blogAnterior.categoria.toLowerCase().replace(/\s+/g, '-');
  const slugSiguiente = blogSiguiente.categoria.toLowerCase().replace(/\s+/g, '-');

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
    <div class="col-6"><a>Sofia de DJOYAS, </a><a>${fecha}</a></div>
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
        <a href="${blogAnterior.url}">
          <p class="etiqueta-blog"><i class="fa fa-angle-left mx-2"></i>Blog anterior</p>
        </a>
        <hr>
        <div class="row card-recomendados">
          <div class="col-auto">
            <h3 class="recomendados pt-2"><a href="${blogAnterior.url}">${blogAnterior.titulo}</a></h3>
            <div class="etiquetas">
              <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${slugAnterior}">${blogAnterior.categoria}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-lg-6 col-md-6 col-12">
      <div class="bloque2">
        <a href="${blogSiguiente.url}">
          <p class="etiqueta-blog">Blog siguiente <i class="fa fa-angle-right mx-2"></i></p>
        </a>
        <hr>
        <div class="row card-recomendados">
          <div class="col-auto">
            <h3 class="recomendados pt-2"><a href="${blogSiguiente.url}">${blogSiguiente.titulo}</a></h3>
            <div class="etiquetas">
              <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${slugSiguiente}">${blogSiguiente.categoria}</a>
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
<section class="publicidad-blog mt-5"><a  href="https://distribuidoradejoyas.cl/djoyas-inspira.24"><img src="/img/cms/paginas internas/blogs/inspira-blog.jpg" class="caja-img" alt="portada de blog"></a>
</section>

<!-- Etiquetas de contenido -->
 <section class="contenidos">
<div class="caja mt-5">
<h2 class="titulo-card">Consejos, Tendencias y Mucho Más</h2>
<ul class="list-group list-group-flush">
<li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/emprendimiento"><h3 class="etiqueta-blog">Emprendimiento </h3></a><i class="fa fa-angle-right"></i></li>
  <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/sabias-que"><h3 class="etiqueta-blog">Sabias que? </h3></a><i class="fa fa-angle-right"></i></li>
  <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/beneficios"><h3 class="etiqueta-blog">Beneficios</h3></a><i class="fa fa-angle-right"></i></li>
  <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/cuidado-y-mantenimiento"><h3 class="etiqueta-blog">Cuidado y Mantenimiento</h3></a><i class="fa fa-angle-right"></i>
  <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/innovacion"><h3 class="etiqueta-blog">Innovación</h3></a><i class="fa fa-angle-right"></i>
</ul></div></section></div></div>


  <!-- Newsletter -->
  <section class="newsletter-blog my-3">
    <div class="row">
      <div class="col-12 col-lg-9 cuerpo-newsletter">
        <h2>¿Estás buscando ese impulso extra para tu emprendimiento?</h2>
        <p>Suscríbete y recibe todas las novedades, consejos y más.</p>
        <form class="elementor-newsletter-form">
          <div class="row">
            <div class="col-12">
              <div class="input-group">
                <input name="email" type="email" class="form-control" placeholder="Ingresa tu correo electrónico">
                <button class="btn-newsletter" type="submit">Suscribirse</button>
              </div>
            </div>
          </div>
        </form>
      </div>
      <div class="col-12 col-lg-3 mt-4 cuerpo-newsletter">
        <img src="/img/cms/paginas internas/blogs/bloques usuarias.png" width="200px">
        <p>Más de 25K + clientas reciben nuestros correos</p>
      </div>
    </div>
  </section>
</div>
`.trim();

  document.getElementById("resultado").textContent = html;
}

function copiarHTML() {
  const resultado = document.getElementById("resultado").textContent;
  navigator.clipboard.writeText(resultado)
    .then(() => alert("Código copiado al portapapeles"))
    .catch(err => alert("Error al copiar: " + err));
}


// NUevo aut

function cargarBlogsEnSelect() {
  const select = document.getElementById('selectBlogExistente');
  select.innerHTML = `<option value="">-- Selecciona un blog existente --</option>`;

  db.collection("blog").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.textContent = `${data.nombre} (${data.fecha || 'sin fecha'})`;
      select.appendChild(opt);
    });
  }).catch(err => {
    console.error("Error al cargar blogs existentes:", err);
  });
}

document.getElementById('selectBlogExistente').addEventListener('change', e => {
  const id = e.target.value;
  if (!id) return;

  db.collection("blog").doc(id).get().then(doc => {
    if (!doc.exists) return alert("Blog no encontrado");
    const data = doc.data();

    document.getElementById('titulo').value = data.nombre || "";
    document.getElementById('fecha').value = data.fecha || "";
    document.getElementById('categoria').value = data.categoria || "";
    document.getElementById('cuerpo').value = data.blog || "";
    document.getElementById('altImagen').value = ""; // No lo tienes en firebase
    document.getElementById('imagen').value = "";    // No lo tienes en firebase

    // si quieres: también completa meta
    const metaInput = document.getElementById('meta');
    if (metaInput) metaInput.value = data.meta || "";

  });
});

window.addEventListener('load', cargarBlogsEnSelect);

const blogsData = {};


function cargarBlogsExistentes() {
  const db = firebase.firestore();
  db.collection("blogs").get().then((querySnapshot) => {
    const select = document.getElementById("selectBlogExistente");
    select.innerHTML = '<option value="">-- Selecciona un blog existente --</option>';

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      blogsData[doc.id] = data; // Guardamos los datos en memoria

      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = data.nombre || `Blog ${doc.id}`;
      select.appendChild(option);
    });
  }).catch((error) => {
    console.error("Error cargando blogs: ", error);
  });
}




function autocompletarFormulario(blogId) {

console.log("blogId recibido:", blogId);
console.log("blogsData keys:", Object.keys(blogsData));
console.log("blogsData[blogId]:", blogsData[blogId]);

  const data = blogsData[blogId];
  if (!data) {
    if (blogId !== "") console.warn(`Blog con ID ${blogId} no encontrado`);
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
  select.addEventListener("change", (e) => {
    const blogId = e.target.value;
    if (blogId) {
      autocompletarFormulario(blogId);
    }
  });
});







function setStep(n) {
  // manejado por BlogStartFlow
}
function nextStep() {}
function prevStep() {}

// Validaciones (stubs para compatibilidad)
function validateStep1() { return true; }
function validateStep2() { return true; }
function validateStep3() { return true; }

// No conectar botones (evita listeners duplicados)
function initWizardControls() { /* no-op */ }
// Llenado de selects relacionados (asegurar referencias DOM)
function safeBindRelacionados() {
  const selectAnterior = document.getElementById("selectAnterior");
  const selectSiguiente = document.getElementById("selectSiguiente");
  const select1 = document.getElementById("select1");
  const select2 = document.getElementById("select2");
  const select3 = document.getElementById("select3");

  // Reusar tu lógica existente
  if (typeof cargarNavegacionSelects === "function") cargarNavegacionSelects();
  if (typeof llenarSelects === "function") llenarSelects();
}

// === Flujo con botón "Iniciar blog" y cabeceras con nombre ===
// === Flujo con botón "Iniciar blog", cabeceras con nombre y tabs de pasos ===
(function BlogStartFlow(){
  const stepIds = ["step1","step2","step3","step4"];
  let editorHeightPx = null;
  let current = -1;
  const done = [false,false,false,false];

  const $ = (sel)=> document.querySelector(sel);
  const $$ = (sel)=> document.querySelectorAll(sel);
  const byId = (id)=> document.getElementById(id);

  function hideAllSteps(){ stepIds.forEach(id => { const el = byId(id); if (el) el.style.display = "none"; }); }

  function ensureDefaultAuthor(){
  const selAutor = document.getElementById("autor");
  if (selAutor && !selAutor.value) selAutor.value = "Sofía de DJOYAS";
}

function setStep(n){
  hideAllSteps();
  current = Math.max(0, Math.min(n, stepIds.length-1));
  const el = document.getElementById(stepIds[current]);
  if (el) el.style.display = "block";

  // ← Garantiza autor por defecto cuando entras al Paso 1
  if (current === 0) ensureDefaultAuthor();

if (current === 3) {
  const secGen = document.querySelector("#step4 .generar");
  const secRes = document.querySelector("#step4 .resultado");
  const preRes = document.getElementById("resultado"); // ← declarar aquí

  // Si aún no hay código generado, muestra el botón y oculta resultado
  const tieneCodigo = !!preRes?.textContent.trim();
  if (secGen) secGen.style.display = tieneCodigo ? "none" : "block";
  if (secRes) secRes.style.display = tieneCodigo ? "block" : "none";

  // Igualar altura al editor del paso 2 si la tenemos
  if (preRes && typeof editorHeightPx !== "undefined" && editorHeightPx) {
    preRes.style.minHeight = editorHeightPx + "px";
  }
}


  /* ---------- utilidades ---------- */
  function showModal(title, msg){
    if (typeof showIosModal==="function") return showIosModal(title,msg);
    alert(`${title}\n\n${msg}`);
  }

  // Validaciones
  function validateStep1(show=true){
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
  function validateStep2(show=true){
    const c = byId("cuerpo")?.value.trim();
    if(!c){
      if (show) showModal("Contenido vacío","Pega el HTML del blog en esta etapa.");
      return false;
    }
    return true;
  }
  function validateStep3(show=true){ return true; } // ajústalo si quieres obligar relacionados

  // Marca como completado y repinta
  function markDone(idx, ok){
    done[idx] = !!ok;
    paintNav();
  }

  // Título del blog seleccionado
  function getSelectedBlogTitle(){
    const sel = byId("selectBlogExistente"); if (!sel || !sel.value) return "";
    if (window.blogsData && window.blogsData[sel.value] && window.blogsData[sel.value].nombre) {
      return String(window.blogsData[sel.value].nombre).trim();
    }
    const raw = (sel.options[sel.selectedIndex]?.textContent || "").trim();
    const m = raw.match(/^(.+?)\s*\(/);
    return (m ? m[1] : raw).trim();
  }

  // Inserta el nombre del blog después de los ":" en los h2 de cada paso
  function stampTitleOnHeaders(title){
    const headers = $$("#blogWizard .wizard-step .cabecera-step h2, #blogWizard .wizard-step > h2");
    headers.forEach(h2 => {
      const txt = (h2.textContent || "").trim();
      const idx = txt.indexOf(":");
      h2.textContent = (idx >= 0 ? txt.slice(0, idx + 1) : (txt + ":")) + " " + title;
    });
  }

  /* ---------- Tabs (cajas) ---------- */
  function navTemplate(){
    return `
      <div class="wizard-nav" data-wiznav>
        <div class="wizbox" data-target-step="0"><div class="wiz-title">1. Datos</div><div class="wiz-sub" data-sub>Incompleto</div></div>
        <div class="wizbox" data-target-step="1"><div class="wiz-title">2. Cuerpo</div><div class="wiz-sub" data-sub>Incompleto</div></div>
        <div class="wizbox" data-target-step="2"><div class="wiz-title">3. Relacionados</div><div class="wiz-sub" data-sub>Incompleto</div></div>
        <div class="wizbox" data-target-step="3"><div class="wiz-title">4. HTML</div><div class="wiz-sub" data-sub>Incompleto</div></div>
      </div>`;
  }

  // Reemplaza el <hr> después del título por las cajas
  function mountNavs(){
    stepIds.forEach(id=>{
      const step = byId(id); if (!step) return;
      const header = step.querySelector(".cabecera-step") || step.querySelector(":scope > h2");
      if (!header) return;
      // si hay un HR justo después, lo quitamos
      const next = header.nextElementSibling;
      if (next && next.tagName === "HR") next.remove();
      // si no existe ya un nav en este step, lo insertamos
      const already = step.querySelector(":scope > .wizard-nav,[data-wiznav]");
      if (!already) header.insertAdjacentHTML("afterend", navTemplate());
    });

    // Delegación de clicks (una vez)
    byId("blogWizard")?.addEventListener("click", (e)=>{
      const box = e.target.closest(".wizbox");
      if (!box || !box.closest("[data-wiznav]")) return;
      const target = parseInt(box.dataset.targetStep,10);
      if (Number.isInteger(target)) setStep(target);
    });
  }

  // Pinta estado activo/completado en TODAS las copias de nav
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

  /* ---------- Navegación de botones ---------- */
  function bindNavButtons(){
    byId("next1")?.addEventListener("click", ()=> {
      const ok = validateStep1(true);
      markDone(0, ok);
      if (ok) setStep(1);
    });

    byId("prev2")?.addEventListener("click", ()=> setStep(0));
byId("next2")?.addEventListener("click", ()=> {
  const ok = validateStep2(true);
  markDone(1, ok);
  if (ok) {
    const t = byId("cuerpo");
    editorHeightPx = t ? t.clientHeight : null; // ← guarda altura del Paso 2
    setStep(2);
  }
});


    byId("prev3")?.addEventListener("click", ()=> setStep(1));
    byId("next3")?.addEventListener("click", ()=> {
      const ok = validateStep3(true);
      markDone(2, ok);
      if (ok) setStep(3);
    });

    byId("prev4")?.addEventListener("click", ()=> setStep(2));

    // Generar/Copiar (mantengo tus funciones)
byId("btnGenerar")?.addEventListener("click", ()=> {
  try {
    // Genera el HTML como siempre
    generarHTML();

    // Marca el paso como completo (si usas la barra de estado)
    if (typeof markDone === "function") markDone(3, true);
    if (typeof paintNav === "function") paintNav();

    // Toggle: oculta sección de generar y muestra resultado
    const secGen = document.querySelector("#step4 .generar");
    const secRes = document.querySelector("#step4 .resultado");
    if (secGen) secGen.style.display = "none";
    if (secRes) secRes.style.display = "block";

    // Enfoca el botón copiar (opcional)
    byId("btnCopiar")?.focus();

  } catch(e){
    console.error(e);
    if (typeof showIosModal === "function") showIosModal("Error","No se pudo generar el HTML.");
    else alert("No se pudo generar el HTML.");
  }
});

byId("btnRedactarOtro")?.addEventListener("click", ()=> {
  // 1) limpiar formulario
  ["titulo","fecha","imagen","altImagen","cuerpo"].forEach(id=>{
    const el = byId(id); if (el) el.value = "";
  });
  const selAutor = byId("autor"); if (selAutor) selAutor.value = "Sofía de DJOYAS";
  const selCat   = byId("categoria"); if (selCat) selCat.value = "";

  // Paso 3 selects
  ["selectAnterior","selectSiguiente","select1","select2","select3"].forEach(id=>{
    const el = byId(id); if (el) el.value = "";
  });

  // 2) limpiar resultado y volver a mostrar botón Generar
  const preRes = byId("resultado"); if (preRes) preRes.textContent = "";
  const secGen = document.querySelector("#step4 .generar");
  const secRes = document.querySelector("#step4 .resultado");
  if (secGen) secGen.style.display = "block";
  if (secRes) secRes.style.display = "none";

  // 3) resetear estado de pasos
  if (Array.isArray(done)) { for (let i=0;i<done.length;i++) done[i]=false; }
  if (typeof paintNav === "function") paintNav();

  // 4) mostrar de nuevo la card del selector y “cerrar” el wizard
  const sel = byId("selectBlogExistente");
  const selectorCard = sel?.closest(".ios-card");
  if (selectorCard) selectorCard.style.display = "";

  const btnInit = byId("btnIniciarBlog");
  if (btnInit) btnInit.disabled = true;
  if (sel) sel.value = "";

  // 5) ocultar los pasos y subir a la card
  if (typeof hideAllSteps === "function") hideAllSteps();
  window.scrollTo({ top: selectorCard?.offsetTop || 0, behavior: "smooth" });
});


    byId("btnCopiar")?.addEventListener("click", ()=> {
      try { copiarHTML(); }
      catch(e){ console.error(e); showModal("Error","No se pudo copiar el código."); }
    });
  }

  /* ---------- Botón Iniciar blog ---------- */
  function bindStart(){
    const sel = byId("selectBlogExistente");
    const btn = byId("btnIniciarBlog");
    if (!sel || !btn) return;

    sel.addEventListener("change", ()=> { btn.disabled = !sel.value; });

btn.addEventListener("click", ()=>{
  if (!sel.value){ /* ... */ return; }
  const title = getSelectedBlogTitle();
  stampTitleOnHeaders(title);

  const selectorCard = sel.closest(".ios-card");
  if (selectorCard) selectorCard.style.display = "none";

  mountNavs && mountNavs();
  paintNav && paintNav();
  setStep(0);
  ensureDefaultAuthor();  // ← por si Step 1 ya estaba montado
});
  }

  function bindRelacionados(){
    if (typeof cargarNavegacionSelects === "function") cargarNavegacionSelects();
    if (typeof llenarSelects === "function") llenarSelects();
  }

  // Init
  document.addEventListener("DOMContentLoaded", ()=>{
    hideAllSteps();      // Al inicio no se ven pasos
    bindStart();         // Select + Iniciar
    bindNavButtons();    // Prev, Next, Generar, Copiar
    bindRelacionados();  // Carga selects
      const step4Resultado = document.querySelector("#step4 .resultado");
  if (step4Resultado) step4Resultado.style.display = "none";

})();



// === Auto asignar (Paso 3) ===
(function AutoAsignarRelacionados(){
  const byId = (id)=> document.getElementById(id);

  // Normaliza textos (sin tildes, minúsculas, espacios compactados)
  const norm = (s)=> (s||"")
    .toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/\s+/g," ").trim();

  // Fisher–Yates shuffle
  function shuffle(a){
    for (let i=a.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  // Elige una opción única (por texto) dentro de un <select>
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

  // Intenta auto-asignar; si aún no hay datos cargados, reintenta un poco
  function autoAsignarIntent(retriesLeft=3){
    const sAnt = byId("selectAnterior");
    const sSig = byId("selectSiguiente");
    const s1   = byId("select1");
    const s2   = byId("select2");
    const s3   = byId("select3");

    // Esperar a que los selects estén poblados
    const allHaveOptions = [sAnt,sSig,s1,s2,s3].every(sel => sel && sel.options && sel.options.length > 1);
    if (!allHaveOptions){
      if (retriesLeft > 0) setTimeout(()=> autoAsignarIntent(retriesLeft-1), 300);
      else if (typeof showIosModal === "function") showIosModal("Sin datos", "Aún no hay suficientes opciones para auto asignar.");
      return;
    }

    // Construir asignación única
    const used = new Set();

    // Si ya hay selecciones previas, respétalas como usadas
    [sAnt,sSig,s1,s2,s3].forEach(sel => {
      const opt = sel.options[sel.selectedIndex];
      const key = norm(opt?.textContent || "");
      if (key) used.add(key);
    });

    // Limpia selecciones antes de asignar (opcional)
    [sAnt,sSig,s1,s2,s3].forEach(sel => { if (sel) sel.value = ""; });

    // Orden de pick (puedes cambiarlo si prefieres otra prioridad)
    const order = [sAnt, sSig, s1, s2, s3];
    let successCount = 0;
    for (const sel of order){
      if (pickUniqueForSelect(sel, used)) successCount++;
    }

    if (successCount < order.length){
      if (typeof showIosModal === "function") {
        showIosModal("Opciones insuficientes",
          "No hay suficientes blogs distintos para completar los 5 campos sin repetir.");
      } else {
        alert("No hay suficientes blogs distintos para completar los 5 campos sin repetir.");
      }
    } else {
      if (typeof showIosModal === "function") showIosModal("Listo", "Relacionados auto asignados sin repetir.");
    }

    // Si tu wizard marca “verde” al validar el paso 3 solo al presionar Siguiente,
    // no tocamos ese estado aquí. El verde aparecerá cuando avances con “Siguiente”.
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    const btn = byId("btnAutoAsignar");
    if (!btn) return;
    btn.addEventListener("click", ()=> autoAsignarIntent());
  });
})();



//updd v1.9