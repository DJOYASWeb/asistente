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
      const selects = [select1, select2, select3];
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
    <div class="row card-recomendados">
      <div class="col-5 portada-recomendados">
        <a href="${blog.url}"><img src="${blog.img}"></a>
      </div>
      <div class="col-7">
        <a href="${blog.url}"><h3 class="recomendados pt-2">${blog.titulo}</h3></a>
        <div class="etiquetas"><a class="etiqueta-tag" href="${blog.url.split('/').slice(0, 6).join('/')}">${blog.categoria}</a></div>
      </div>
    </div>
    <hr>
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
      <hr>
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
  document.getElementById("autor").value = data.autor || "";
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






// ====== WIZARD ETAPAS ======
let currentStep = 0; // 0..3  (1..4 en UI)
const stepsIds = ["step1", "step2", "step3", "step4"];


function setStep(n) {
  currentStep = Math.max(0, Math.min(n, stepsIds.length - 1));
  stepsIds.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) el.style.display = idx === currentStep ? "block" : "none";
  });
  // Pintar badges
  document.querySelectorAll("#wizardSteps .step-badge").forEach((b, idx) => {
    b.classList.remove("bg-primary","text-white","bg-light","text-muted");
    if (idx === currentStep) {
      b.classList.add("bg-primary","text-white");
    } else {
      b.classList.add("bg-light","text-muted");
    }
  });
}

function nextStep() { setStep(currentStep + 1); }
function prevStep() { setStep(currentStep - 1); }

// Validaciones mínimas por etapa
function validateStep1() {
  const req = ["titulo","fecha","autor","categoria","imagen"];
  for (const id of req) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      showIosModal("Falta completar", "Por favor completa los datos del blog.");
      return false;
    }
  }
  return true;
}
function validateStep2() {
  const cuerpo = document.getElementById("cuerpo")?.value.trim();
  if (!cuerpo) {
    showIosModal("Contenido vacío", "Pega el HTML del blog en esta etapa.");
    return false;
  }
  return true;
}
function validateStep3() {
  // No es obligatorio, pero si quieres obligar: verifica que haya selección
  return true;
}

// Conectar botones
function initWizardControls() {
  // Etapa 1
  document.getElementById("next1")?.addEventListener("click", () => {
    if (validateStep1()) nextStep();
  });
  // Etapa 2
  document.getElementById("prev2")?.addEventListener("click", prevStep);
  document.getElementById("next2")?.addEventListener("click", () => {
    if (validateStep2()) nextStep();
  });
  // Etapa 3
  document.getElementById("prev3")?.addEventListener("click", prevStep);
  document.getElementById("next3")?.addEventListener("click", () => {
    if (validateStep3()) nextStep();
  });
  // Etapa 4
  document.getElementById("prev4")?.addEventListener("click", prevStep);

  // Generar y copiar (llaman tus funciones existentes)
  document.getElementById("btnGenerar")?.addEventListener("click", () => {
    try { generarHTML(); }
    catch (e) { console.error(e); showIosModal("Error", "No se pudo generar el HTML."); }
  });
  document.getElementById("btnCopiar")?.addEventListener("click", () => {
    try { copiarHTML(); }
    catch (e) { console.error(e); showIosModal("Error", "No se pudo copiar el código."); }
  });
}

// Mostrar paso 1 al elegir un blog existente
(function attachWizardToSelect() {
  const sel = document.getElementById("selectBlogExistente");
  if (!sel) return;

  sel.addEventListener("change", (e) => {
    const id = e.target.value;
    if (!id) {
      // Si deselecciona, ocultamos wizard
      showWizardHeader(false);
      stepsIds.forEach(s => { const el = document.getElementById(s); if (el) el.style.display = "none"; });
      return;
    }
    // Si selecciona un blog, mostramos etapa 1
    showWizardHeader(true);
    setStep(0);
  });
})();

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

// Iniciar wizard cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  initWizardControls();
  safeBindRelacionados();
});


// === Flujo con botón "Iniciar blog" y cabeceras con nombre ===
(function BlogStartFlow(){
  const stepIds = ["step1","step2","step3","step4"];
  let current = -1;
  let selectedBlogId = null;
  let selectedBlogTitle = "";

  const $ = (sel)=> document.querySelector(sel);
  const byId = (id)=> document.getElementById(id);

  // Ocultar pasos
  function hideAllSteps(){
    stepIds.forEach(id => { const el = byId(id); if (el) el.style.display = "none"; });
  }

  function setStep(n){
    hideAllSteps();
    current = Math.max(0, Math.min(n, stepIds.length-1));
    const el = byId(stepIds[current]);
    if (el) el.style.display = "block";
  }

  // Obtiene el nombre "limpio" del blog seleccionado
  function getSelectedBlogTitle(){
    const sel = byId("selectBlogExistente");
    if (!sel) return "";
    const id = sel.value;
    if (!id) return "";

    // 1) Si tienes blogsData cargado (tu código), úsalo
    if (window.blogsData && window.blogsData[id] && window.blogsData[id].nombre) {
      return String(window.blogsData[id].nombre).trim();
    }
    // 2) Intenta parsear el texto de la opción (quita " (fecha)")
    const opt = sel.options[sel.selectedIndex];
    const raw = (opt?.textContent || "").trim();
    const m = raw.match(/^(.+?)\s*\(/);
    return (m ? m[1] : raw).trim();
  }

  // Inserta el título después de los dos puntos en cada h2 de cabecera de paso
  function stampTitleOnHeaders(title){
    // Cubrimos h2 dentro de .cabecera-step y también h2 directos del paso
    const headers = document.querySelectorAll("#blogWizard .wizard-step .cabecera-step h2, #blogWizard .wizard-step > h2");
    headers.forEach(h2 => {
      const txt = (h2.textContent || "").trim();
      const idx = txt.indexOf(":");
      if (idx >= 0) {
        // Re-escribe manteniendo todo hasta ":" y agregando el título
        const base = txt.slice(0, idx + 1);
        h2.textContent = base + " " + title;
      } else {
        // Si no hay ":", lo añadimos
        h2.textContent = txt + ": " + title;
      }
    });
  }

  // Validaciones suaves (puedes endurecer si quieres)
  function showModal(title, msg){
    if (typeof showIosModal === "function") return showIosModal(title, msg);
    alert(`${title}\n\n${msg}`);
  }
  function validateStep1(){
    const req = ["titulo","fecha","autor","categoria","imagen"];
    for (const id of req){
      const el = byId(id);
      if (!el || !el.value.trim()){
        showModal("Faltan datos", "Completa los datos del blog antes de continuar.");
        return false;
      }
    }
    return true;
  }
  function validateStep2(){
    const cuerpo = byId("cuerpo")?.value.trim();
    if (!cuerpo){
      showModal("Contenido vacío", "Pega el HTML del blog en esta etapa.");
      return false;
    }
    return true;
  }
  function validateStep3(){ return true; }

  // Navegación
  function bindNav(){
    byId("next1")?.addEventListener("click", ()=> { if (validateStep1()) setStep(1); });
    byId("prev2")?.addEventListener("click", ()=> setStep(0));
    byId("next2")?.addEventListener("click", ()=> { if (validateStep2()) setStep(2); });
    byId("prev3")?.addEventListener("click", ()=> setStep(1));
    byId("next3")?.addEventListener("click", ()=> { if (validateStep3()) setStep(3); });
    byId("prev4")?.addEventListener("click", ()=> setStep(2));

    // Reutiliza tus funciones de generar/copiar
    byId("btnGenerar")?.addEventListener("click", ()=> {
      try { generarHTML(); }
      catch(e){ console.error(e); showModal("Error", "No se pudo generar el HTML."); }
    });
    byId("btnCopiar")?.addEventListener("click", ()=> {
      try { copiarHTML(); }
      catch(e){ console.error(e); showModal("Error", "No se pudo copiar el código."); }
    });
  }

  // Botón "Iniciar blog"
  function bindStart(){
    const sel = byId("selectBlogExistente");
    const btn = byId("btnIniciarBlog");
    if (!sel || !btn) return;

    // Habilita el botón solo si hay selección
    sel.addEventListener("change", ()=>{
      btn.disabled = !sel.value;
      // No mostramos pasos automáticamente; solo cuando aprietan "Iniciar blog"
    });

    // Inicia el flujo
btn.addEventListener("click", ()=>{
  if (!sel.value){
    showModal("Selecciona un blog","Primero elige un blog para iniciar.");
    return;
  }
  const title = getSelectedBlogTitle();
  stampTitleOnHeaders(title);

  // ⬇️ NUEVO: ocultar la card que contiene el select
  const selectorCard = sel.closest(".ios-card");
  if (selectorCard) selectorCard.style.display = "none";

  setStep(0); // mostrar Paso 1
});
  }

  // Rellenar relacionados (reusa lo tuyo)
  function bindRelacionados(){
    if (typeof cargarNavegacionSelects === "function") cargarNavegacionSelects();
    if (typeof llenarSelects === "function") llenarSelects();
  }

  // Init
  document.addEventListener("DOMContentLoaded", ()=>{
    hideAllSteps();       // Al inicio no se ven pasos
    bindStart();          // Botón y select
    bindNav();            // Prev/Next + generar/copiar
    bindRelacionados();   // Cargar selects de relacionados/destacados
  });
})();



//updd v2.1