// blog-creador.js

const DB_COLLECTION_CONFIG = "config";
const DB_DOC_POOL          = "pool_destacados";

window.poolIds = new Set();

firebase.firestore().collection(DB_COLLECTION_CONFIG).doc(DB_DOC_POOL)
  .onSnapshot((doc) => {
    if (doc.exists) {
      window.poolIds = new Set(doc.data().ids || []);
      console.log("Pool sincronizado desde Firebase:", window.poolIds.size);
      window.cargarSelectsDestacados();
    } else {
      console.log("Creando documento de configuración por primera vez...");
      firebase.firestore().collection(DB_COLLECTION_CONFIG).doc(DB_DOC_POOL).set({ ids: [] });
    }

    const modalPref = document.getElementById('modalPreferencias');
    const modalSel  = document.getElementById('modalSeleccionPool');
    if (modalPref && modalPref.style.display === 'flex') window.renderizarTablaPreferencias();
    if (modalSel  && modalSel.style.display  === 'flex') window.renderizarListaModal();

    const contador = document.getElementById("contadorPoolTexto");
    if (contador) contador.innerText = `${window.poolIds.size} seleccionados`;
  });

let navegacionBlogs = [];
let blogs = [];
window.blogsData = {};

function toNumId(v) {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : -Infinity;
}

function cargarNavegacionSelects() {
  fetch('./data/navegacion.json')
    .then(res => res.json())
    .then(data => {
      navegacionBlogs = data;
      const sAnt = document.getElementById("selectAnterior");
      const sSig = document.getElementById("selectSiguiente");
      if (!sAnt || !sSig) return;

      [sAnt, sSig].forEach(sel => {
        if (!sel.querySelector('option[value=""]')) {
          const opt = document.createElement('option');
          opt.value = ""; opt.textContent = "-- Selecciona --";
          sel.appendChild(opt);
        }
      });

      data.forEach((blog, index) => {
        [sAnt, sSig].forEach(sel => {
          const opt = document.createElement("option");
          opt.value = index; opt.textContent = blog.titulo;
          sel.appendChild(opt);
        });
      });
    });
}

function llenarSelects() {
  fetch('./data/blogs.json')
    .then(r => { if (!r.ok) throw new Error(`HTTP error! Status: ${r.status}`); return r.json(); })
    .then(data => {
      blogs = data;
      ['select1','select2','select3'].map(id => document.getElementById(id)).filter(Boolean)
        .forEach(select => {
          select.innerHTML = "";
          const optEmpty = document.createElement('option');
          optEmpty.value = ""; optEmpty.textContent = "-- Selecciona --";
          select.appendChild(optEmpty);
          blogs.forEach((blog, index) => {
            const option = document.createElement("option");
            option.value = index; option.textContent = blog.titulo;
            select.appendChild(option);
          });
        });
    });
}

window.onload = () => { llenarSelects(); cargarNavegacionSelects(); };

function limpiarParaUrl(texto) {
  if (!texto) return '';
  return texto.toString().trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

/* ===================== GENERAR HTML ===================== */
function generarHTML() {
  const titulo    = document.getElementById("titulo")?.value?.trim();
  const fecha     = document.getElementById("fecha")?.value?.trim();
  const autor     = document.getElementById("autor")?.value?.trim();
  const categoria = document.getElementById("categoria")?.value?.trim();
  const imagen    = document.getElementById("imagen")?.value?.trim();
  const altImagen = document.getElementById("altImagen")?.value?.trim() || titulo;
  const cuerpo    = document.getElementById("cuerpo")?.value?.trim() || "";

  if (!titulo || !fecha || !autor || !categoria || !imagen || !cuerpo) {
    alert("Por favor completa todos los campos obligatorios antes de generar el HTML.");
    return;
  }

  const buscarBlog = (id) => {
    if (!id) return null;
    return (window.datosTabla || []).find(b => (b.id == id || b.docId == id));
  };

  const blogAnterior  = buscarBlog(document.getElementById("selectAnterior")?.value);
  const blogSiguiente = buscarBlog(document.getElementById("selectSiguiente")?.value);

  const destacadosSel = [
    buscarBlog(document.getElementById("select1")?.value),
    buscarBlog(document.getElementById("select2")?.value),
    buscarBlog(document.getElementById("select3")?.value)
  ].filter(Boolean);

  const destacadosHTML = destacadosSel.map(blog => `
        <hr>
        <div class="row card-recomendados">
          <div class="col-5 portada-recomendados">
            <a href="${blog.url||'#'}"><img src="${blog.imagen||''}" alt="${blog.nombre||''}"></a>
          </div>
          <div class="col-7">
            <a href="${blog.url||'#'}"><h3 class="recomendados pt-2">${blog.nombre||''}</h3></a>
            <div class="etiquetas">
              <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${limpiarParaUrl(blog.categoria)}">
                ${blog.categoria||''}
              </a>
            </div>
          </div>
        </div>
  `).join('\n');

  const slug = limpiarParaUrl(categoria);

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
      <section class="contenido-blog">${cuerpo}</section>
      <hr>
      <section class="rrss-blog row container py-3">
        <div class="col-6"><a>${autor}, </a><a>${fecha}</a></div>
        <div class="col-6 iconos-blog">
          <a href="https://www.youtube.com/@distribuidoradejoyaschile9639"><i class="fa fa-youtube icono-contenido mx-1"></i></a>
          <a href="https://www.instagram.com/distribuidoradejoyas.cl/"><i class="fa fa-instagram icono-contenido mx-1"></i></a>
          <a href="https://cl.pinterest.com/distribuidoradejoyasCL/"><i class="fa fa-pinterest icono-contenido mx-1"></i></a>
          <a href="https://www.facebook.com/distribuidoradejoyaschile"><i class="fa fa-facebook icono-contenido mx-1"></i></a>
        </div>
      </section>
      <section class="navegacion-articulos row mt-5">
        <div class="col-lg-6 col-md-6 col-12">
          <div class="bloque">
            <a href="${blogAnterior?.url||'#'}">
              <p class="etiqueta-blog"><i class="fa fa-angle-left mx-2"></i>Blog anterior</p>
            </a>
            <hr>
            <div class="row card-recomendados">
              <div class="col-auto">
                <h3 class="recomendados pt-2">
                  <a href="${blogAnterior?.url||'#'}">${blogAnterior?.nombre||'—'}</a>
                </h3>
                <div class="etiquetas">
                  <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${limpiarParaUrl(blogAnterior?.categoria||categoria)}">
                    ${blogAnterior?.categoria||categoria}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-6 col-md-6 col-12">
          <div class="bloque2">
            <a href="${blogSiguiente?.url||'#'}">
              <p class="etiqueta-blog">Blog siguiente <i class="fa fa-angle-right mx-2"></i></p>
            </a>
            <hr>
            <div class="row card-recomendados">
              <div class="col-auto">
                <h3 class="recomendados pt-2">
                  <a href="${blogSiguiente?.url||'#'}">${blogSiguiente?.nombre||'—'}</a>
                </h3>
                <div class="etiquetas">
                  <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${limpiarParaUrl(blogSiguiente?.categoria||categoria)}">
                    ${blogSiguiente?.categoria||categoria}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    <div class="col-12 col-md-12 col-lg-4 bloque-lateral">
      <section class="destacados mt-5">
        <div class="caja">
          <h2 class="titulo-card">Blog más vistos</h2>
          ${destacadosHTML}
        </div>
      </section>
      <section class="publicidad-blog mt-5">
        <a href="https://distribuidoradejoyas.cl/djoyas-inspira.24">
          <img src="/img/cms/paginas internas/blogs/inspira-blog.jpg" class="caja-img" alt="portada de blog">
        </a>
      </section>
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
</div>`.trim();

  document.getElementById("resultado").textContent = html;
}
window.generarHTML = generarHTML;

function copiarHTML() {
  const resultado = document.getElementById("resultado").textContent;
  navigator.clipboard.writeText(resultado)
    .then(() => mostrarNotificacion("Código copiado al portapapeles", "exito"))
    .catch(err => mostrarNotificacion("Error al copiar: " + err, "error"));
}
window.copiarHTML = copiarHTML;

/* ===================== FIREBASE ===================== */
function cargarBlogsExistentes() {
  const db     = firebase.firestore();
  const select = document.getElementById("selectBlogExistente");
  if (!select) return;
  select.innerHTML = '<option value="">-- Selecciona un blog existente --</option>';

  db.collection("blogs").get().then((qs) => {
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
  }).catch(error => mostrarNotificacion("Error cargando blogs: " + (error?.message || error), "error"));
}

function autocompletarFormulario(blogId) {
  const data = window.blogsData[blogId];
  if (!data) { if (blogId !== "") mostrarNotificacion(`Blog con ID ${blogId} no encontrado`, "alerta"); return; }
  document.getElementById("titulo").value    = data.nombre || "";
  document.getElementById("fecha").value     = data.fecha  || "";
  document.getElementById("autor").value     = (data.autor && data.autor.trim()) || "Sofía de DJOYAS";
  document.getElementById("categoria").value = data.categoria || "";
  document.getElementById("imagen").value    = `/img/cms/paginas%20internas/blogs/blog-${blogId}.jpg`;
  document.getElementById("altImagen").value = data.altImagen || "";
  document.getElementById("cuerpo").value    = data.blogHtml || "";
}

document.addEventListener("DOMContentLoaded", () => {
  cargarBlogsExistentes();
  document.getElementById("selectBlogExistente")
    ?.addEventListener("change", (e) => { if (e.target.value) autocompletarFormulario(e.target.value); });
});

/* ===================== STUBS LEGADOS ===================== */
function setStep(n) {}
function nextStep() {}
function prevStep() {}
function validateStep1() { return true; }
function validateStep2() { return true; }
function validateStep3() { return true; }
function initWizardControls() {}
function safeBindRelacionados() {
  if (typeof cargarNavegacionSelects === "function") cargarNavegacionSelects();
  if (typeof llenarSelects === "function") llenarSelects();
}

/* ===================== WIZARD ===================== */
(function BlogStartFlow() {
  const stepIds = ["step1","step2","step3","step4"];
  let editorHeightPx = null, current = -1;
  const done = [false,false,false,false];
  const byId = (id) => document.getElementById(id);

  function hideAllSteps() {
    stepIds.forEach(id => { const el = byId(id); if (el) el.style.display = "none"; });
  }

  function ensureDefaultAuthor() {
    const selAutor = byId("autor");
    if (selAutor && !selAutor.value) selAutor.value = "Sofía de DJOYAS";
  }

  function setStepLocal(n) {
    hideAllSteps();
    current = Math.max(0, Math.min(n, stepIds.length - 1));
    const el = byId(stepIds[current]);
    if (el) el.style.display = "block";
    if (current === 0) ensureDefaultAuthor();
    if (current === 3) {
      const secGen = document.querySelector("#step4 .generar");
      const secRes = document.querySelector("#step4 .resultado");
      const preRes = byId("resultado");
      const tieneCodigo = !!preRes?.textContent.trim();
      if (secGen) secGen.style.display = tieneCodigo ? "none" : "block";
      if (secRes) secRes.style.display = tieneCodigo ? "block" : "none";
      if (preRes && editorHeightPx) preRes.style.minHeight = editorHeightPx + "px";
    }
    paintNav();
  }

  function showModal(title, msg) {
    if (typeof showIosModal === "function") return showIosModal(title, msg);
    alert(`${title}\n\n${msg}`);
  }

  function validateStep1Local(show = true) {
    const req = ["titulo","fecha","autor","categoria","imagen"];
    for (const id of req) {
      const el = byId(id);
      if (!el || !el.value.trim()) {
        if (show) showModal("Faltan datos", "Completa los datos del blog antes de continuar.");
        return false;
      }
    }
    return true;
  }
  function validateStep2Local(show = true) {
    const c = byId("cuerpo")?.value.trim();
    if (!c) { if (show) showModal("Contenido vacío", "Pega el HTML del blog en esta etapa."); return false; }
    return true;
  }
  function validateStep3Local() { return true; }

  function markDone(idx, ok) { done[idx] = !!ok; paintNav(); }

  function getSelectedBlogTitle() {
    const sel = byId("selectBlogExistente"); if (!sel || !sel.value) return "";
    if (window.blogsData && window.blogsData[sel.value]?.nombre) return String(window.blogsData[sel.value].nombre).trim();
    const raw = (sel.options[sel.selectedIndex]?.textContent || "").trim();
    const m   = raw.match(/^(.+?)\s*\(/);
    return (m ? m[1] : raw).trim();
  }

  function stampTitleOnHeaders(title) {
    document.querySelectorAll("#blogWizard .wizard-step .cabecera-step h2, #blogWizard .wizard-step > h2")
      .forEach(h2 => {
        const txt = (h2.textContent || "").trim();
        const idx = txt.indexOf(":");
        h2.textContent = (idx >= 0 ? txt.slice(0, idx + 1) : (txt + ":")) + " " + title;
      });
  }

  function navTemplate() {
    return `
      <div class="wizard-nav" data-wiznav>
        <div class="wizbox" data-target-step="0"><div class="wiz-title">1. Datos</div><div class="wiz-sub" data-sub>Incompleto</div></div>
        <div class="wizbox" data-target-step="1"><div class="wiz-title">2. Cuerpo</div><div class="wiz-sub" data-sub>Incompleto</div></div>
        <div class="wizbox" data-target-step="2"><div class="wiz-title">3. Relacionados</div><div class="wiz-sub" data-sub>Incompleto</div></div>
        <div class="wizbox" data-target-step="3"><div class="wiz-title">4. HTML</div><div class="wiz-sub" data-sub>Incompleto</div></div>
      </div>`;
  }

  function mountNavs() {
    stepIds.forEach(id => {
      const step = byId(id); if (!step) return;
      const header = step.querySelector(".cabecera-step") || step.querySelector(":scope > h2");
      if (!header) return;
      const next = header.nextElementSibling;
      if (next && next.tagName === "HR") next.remove();
      if (!step.querySelector(":scope > .wizard-nav,[data-wiznav]"))
        header.insertAdjacentHTML("afterend", navTemplate());
    });

    byId("blogWizard")?.addEventListener("click", (e) => {
      const box = e.target.closest(".wizbox");
      if (!box || !box.closest("[data-wiznav]")) return;
      const target = parseInt(box.dataset.targetStep, 10);
      if (Number.isInteger(target)) setStepLocal(target);
    });
  }

  function paintNav() {
    document.querySelectorAll("#blogWizard [data-wiznav]").forEach(nav => {
      nav.querySelectorAll(".wizbox").forEach(box => {
        const idx = parseInt(box.dataset.targetStep, 10);
        box.classList.toggle("is-active", idx === current);
        box.classList.toggle("is-done",   !!done[idx]);
        const sub = box.querySelector("[data-sub]");
        if (sub) sub.textContent = done[idx] ? "Listo" : "Incompleto";
      });
    });
  }

  function bindNavButtons() {
    byId("next1")?.addEventListener("click", () => {
      const ok = validateStep1Local(true); markDone(0, ok); if (ok) setStepLocal(1);
    });

    byId("prev2")?.addEventListener("click", () => setStepLocal(0));

    byId("next2")?.addEventListener("click", () => {
      const ok = validateStep2Local(true); markDone(1, ok);
      if (ok) {
        editorHeightPx = byId("cuerpo")?.clientHeight || null;
        setStepLocal(2);
        ['select1','select2','select3'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = '<option value="">Cargando Pool...</option>';
        });
        setTimeout(() => {
          if (typeof window.cargarSelectsDestacados === 'function') window.cargarSelectsDestacados();
          else console.error("No se encontró cargarSelectsDestacados");
        }, 100);
      }
    });

    byId("prev3")?.addEventListener("click", () => setStepLocal(1));
    byId("next3")?.addEventListener("click", () => {
      const ok = validateStep3Local(); markDone(2, ok); if (ok) setStepLocal(3);
    });

    byId("prev4")?.addEventListener("click", () => setStepLocal(2));

    byId("btnGenerar")?.addEventListener("click", () => {
      try {
        generarHTML(); markDone(3, true); paintNav();
        const secGen = document.querySelector("#step4 .generar");
        const secRes = document.querySelector("#step4 .resultado");
        if (secGen) secGen.style.display = "none";
        if (secRes) secRes.style.display = "block";
        byId("btnCopiar")?.focus();
        mostrarNotificacion("HTML generado correctamente", "exito");
      } catch(e) {
        mostrarNotificacion("No se pudo generar el HTML.", "error");
        if (typeof showIosModal === "function") showIosModal("Error", "No se pudo generar el HTML.");
        else alert("No se pudo generar el HTML.");
      }
    });

    byId("btnRedactarOtro")?.addEventListener("click", () => {
      ["titulo","fecha","imagen","altImagen","cuerpo"].forEach(id => { const el = byId(id); if (el) el.value = ""; });
      const selAutor = byId("autor"); if (selAutor) selAutor.value = "Sofía de DJOYAS";
      const selCat   = byId("categoria"); if (selCat) selCat.value = "";
      ["selectAnterior","selectSiguiente","select1","select2","select3"].forEach(id => { const el = byId(id); if (el) el.value = ""; });
      const preRes = byId("resultado"); if (preRes) preRes.textContent = "";
      const secGen = document.querySelector("#step4 .generar");
      const secRes = document.querySelector("#step4 .resultado");
      if (secGen) secGen.style.display = "block";
      if (secRes) secRes.style.display = "none";
      for (let i = 0; i < done.length; i++) done[i] = false;
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

    byId("btnCopiar")?.addEventListener("click", () => {
      try { copiarHTML(); }
      catch(e) { mostrarNotificacion("No se pudo copiar el código.", "error"); showModal("Error","No se pudo copiar el código."); }
    });
  }

  function bindStart() {
    const sel = byId("selectBlogExistente");
    const btn = byId("btnIniciarBlog");
    if (!sel || !btn) return;
    sel.addEventListener("change", () => { btn.disabled = !sel.value; });
    btn.addEventListener("click", () => {
      if (!sel.value) return;
      stampTitleOnHeaders(getSelectedBlogTitle());
      const selectorCard = sel.closest(".ios-card");
      if (selectorCard) selectorCard.style.display = "none";
      mountNavs(); paintNav(); setStepLocal(0); ensureDefaultAuthor();
    });
  }

  function bindRelacionados() {
    if (typeof cargarNavegacionSelects === "function") cargarNavegacionSelects();
    if (typeof llenarSelects === "function") llenarSelects();
    if (typeof window.cargarSelectsDestacados === 'function') window.cargarSelectsDestacados();
  }

  document.addEventListener("DOMContentLoaded", () => {
    hideAllSteps(); bindStart(); bindNavButtons(); bindRelacionados();
    const step4Resultado = document.querySelector("#step4 .resultado");
    if (step4Resultado) step4Resultado.style.display = "none";
  });
})();

/* ===================== POOL Y PREFERENCIAS ===================== */
(function() {
  const STORAGE_KEY_DESTACADOS = "djoyas_blogs_destacados_favs";
  let seleccionTemporal = new Set();

  /* ---- Validación ---- */
  function esBlogCompleto(blog) {
    if (!blog) return false;
    return !!(blog.nombre?.trim() && blog.categoria?.trim() && blog.url?.trim() && blog.imagen?.trim());
  }
  function obtenerFaltantes(blog) {
    if (!blog) return "Datos no encontrados";
    const f = [];
    if (!blog.nombre)    f.push("Nombre");
    if (!blog.categoria) f.push("Categoría");
    if (!blog.url)       f.push("URL");
    if (!blog.imagen)    f.push("Imagen");
    return f.length ? f.join(", ") : "Nada";
  }
  window.esBlogCompleto   = esBlogCompleto;
  window.obtenerFaltantes = obtenerFaltantes;

  /* ---- Tabla de preferencias ---- */
  window.renderizarTablaPreferencias = function() {
    const tbody        = document.getElementById("tablaPreferenciasBody");
    const mensajeVacio = document.getElementById("mensajeVacio");
    if (!tbody) return;
    tbody.innerHTML = "";

    const poolArray = Array.from(window.poolIds || []);
    if (poolArray.length === 0) { if (mensajeVacio) mensajeVacio.classList.remove("d-none"); return; }
    if (mensajeVacio) mensajeVacio.classList.add("d-none");

    poolArray.forEach(id => {
      const blog     = (window.datosTabla || []).find(b => (b.id == id || b.docId == id));
      if (!blog) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="2" class="text-danger">Blog ID: ${id} no encontrado (eliminado?)</td>
          <td><button class="btn btn-sm btn-danger" onclick="togglePool('${id}'); renderizarTablaPreferencias()">
            <i class="fa-solid fa-trash"></i> Quitar
          </button></td>`;
        tbody.appendChild(tr); return;
      }
      const completo = esBlogCompleto(blog);
      let estadoHtml = completo
        ? `<span class="badge badge-success"><i class="fa-solid fa-circle-check me-1"></i>Completo</span>`
        : `<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark me-1"></i>Incompleto</span>
           <div style="font-size:10px;color:#dc3545;">Falta: ${obtenerFaltantes(blog)}</div>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><div class="fw-bold">${blog.nombre}</div><small class="text-muted">${blog.categoria}</small></td>
        <td>${estadoHtml}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" onclick="togglePool('${id}'); renderizarTablaPreferencias()">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>`;
      tbody.appendChild(tr);
    });
  };

  /* ---- Modal pool ---- */
  window.abrirModalPool = function() {
    const modal = document.getElementById('modalSeleccionPool');
    const input = document.getElementById('buscadorModal');
    if (!modal) return;
    if (input) input.value = "";
    modal.style.display = 'flex';
    renderizarListaModal();
    if (input) setTimeout(() => input.focus(), 100);
  };

  window.cerrarModalPool = function() {
    const modal = document.getElementById('modalSeleccionPool');
    if (modal) modal.style.display = 'none';
  };

  function renderizarListaModal() {
    const contenedor = document.getElementById('listaModalBody');
    const filtro     = (document.getElementById('buscadorModal')?.value || "").toLowerCase();
    if (!contenedor) return;
    contenedor.innerHTML = "";

    const todos = window.datosTabla || [];
    if (!todos.length) {
      contenedor.innerHTML = '<div class="text-center p-3">No hay blogs cargados.</div>'; return;
    }

    todos.forEach(blog => {
      if (filtro && !blog.nombre.toLowerCase().includes(filtro)) return;
      const id              = (blog.id || blog.docId).toString();
      const estaSeleccionado = window.poolIds.has(id);
      const completo        = esBlogCompleto(blog);
      const iconoEstado     = completo
        ? '<i class="fa-solid fa-circle-check text-success"></i>'
        : '<i class="fa-solid fa-triangle-exclamation text-warning"></i>';

      const div = document.createElement('div');
      div.className = "d-flex align-items-center border-bottom py-2";
      div.innerHTML = `
        <div class="me-3 ps-2">
          <input type="checkbox" class="form-check-input" style="transform:scale(1.3);cursor:pointer;"
            ${estaSeleccionado ? "checked" : ""}
            onchange="togglePool('${id}'); renderizarListaModal();">
        </div>
        <div style="flex:1;">
          <div class="fw-bold" style="font-size:.95rem;">${blog.nombre}</div>
          <div class="text-muted small">${iconoEstado} ${blog.categoria} <span class="ms-2 text-secondary">ID: ${id}</span></div>
        </div>`;
      contenedor.appendChild(div);
    });
  }
  window.renderizarListaModal = renderizarListaModal;

  const buscador = document.getElementById('buscadorModal');
  if (buscador) buscador.oninput = renderizarListaModal;

  window.guardarCambiosModal = function() {
    window.renderizarTablaPreferencias();
    window.cerrarModalPool();
  };

  /* ---- Navegación Wizard <-> Preferencias ---- */
  window.mostrarPreferencias = function() {
    const wizard = document.getElementById('blogWizard');
    const prefs  = document.getElementById('seccionPreferencias');
    if (wizard && prefs) { wizard.classList.add('d-none'); prefs.classList.remove('d-none'); window.renderizarTablaPreferencias(); }
  };
  window.cerrarPreferencias = function() {
    const wizard = document.getElementById('blogWizard');
    const prefs  = document.getElementById('seccionPreferencias');
    if (wizard && prefs) { prefs.classList.add('d-none'); wizard.classList.remove('d-none'); }
  };

  /* ---- Toggle Pool ---- */
  window.togglePool = function(id) {
    const strId = id.toString();
    if (window.poolIds.has(strId)) window.poolIds.delete(strId);
    else window.poolIds.add(strId);

    firebase.firestore().collection(DB_COLLECTION_CONFIG).doc(DB_DOC_POOL)
      .set({ ids: Array.from(window.poolIds) }, { merge: true })
      .then(() => console.log("Selección guardada en la nube."))
      .catch(error => { console.error("Error al guardar en Firebase:", error); alert("Error al guardar la selección en la nube."); });

    const contador = document.getElementById("contadorPoolTexto");
    if (contador) contador.innerText = `${window.poolIds.size} seleccionados`;
  };

  /* ---- Selects destacados (sólo pool) ---- */
  window.cargarSelectsDestacados = function() {
    const blogsCandidatos = (window.datosTabla || []).filter(blog => {
      const id = (blog.id || blog.docId).toString();
      return window.poolIds.has(id) && esBlogCompleto(blog);
    });

    ['select1','select2','select3'].forEach(selectId => {
      const select = document.getElementById(selectId);
      if (!select) return;
      const valorPrevio = select.value;
      select.innerHTML = '<option value="">-- Selecciona del Pool --</option>';

      if (!blogsCandidatos.length) {
        const opt = document.createElement('option');
        opt.disabled = true; opt.text = "(Pool vacío o incompleto)";
        select.appendChild(opt); return;
      }
      blogsCandidatos.forEach(blog => {
        const id = blog.id || blog.docId;
        const option = document.createElement('option');
        option.value = id; option.textContent = `${blog.nombre} (${blog.categoria})`;
        select.appendChild(option);
      });
      if (valorPrevio && window.poolIds.has(valorPrevio)) select.value = valorPrevio;
    });
    console.log(`Selects de destacados actualizados con ${blogsCandidatos.length} blogs del Pool.`);
  };

  /* ---- Selects navegación (sólo transcritos) ---- */
  window.cargarSelectsNavegacion = function() {
    const blogsAptos = (window.datosTabla || []).filter(blog => blog.estado?.toLowerCase() === 'transcrito');
    ['selectAnterior','selectSiguiente'].forEach(selectId => {
      const select = document.getElementById(selectId);
      if (!select) return;
      const valorPrevio = select.value;
      select.innerHTML = '<option value="">-- Selecciona un blog --</option>';
      blogsAptos.forEach(blog => {
        const opt = document.createElement('option');
        opt.value = blog.id || blog.docId;
        opt.textContent = `${blog.nombre} (${blog.categoria})`;
        select.appendChild(opt);
      });
      if (valorPrevio) select.value = valorPrevio;
    });
  };

  /* ---- Auto asignar ---- */
  window.autoAsignarCompleto = function() {
    if (typeof window.cargarSelectsNavegacion === 'function') window.cargarSelectsNavegacion();
    if (typeof window.cargarSelectsDestacados === 'function') window.cargarSelectsDestacados();

    function opcionesValidas(idSelect) {
      const select = document.getElementById(idSelect);
      if (!select) return [];
      return Array.from(select.options).filter(opt => opt.value?.trim());
    }

    const opcionesNav = opcionesValidas('selectAnterior');
    if (opcionesNav.length >= 2) {
      const mezclados = [...opcionesNav].sort(() => 0.5 - Math.random());
      const sAnt = document.getElementById("selectAnterior");
      const sSig = document.getElementById("selectSiguiente");
      if (sAnt && mezclados[0]) sAnt.value = mezclados[0].value;
      if (sSig && mezclados[1]) sSig.value = mezclados[1].value;
    } else {
      console.warn("No hay suficientes blogs transcritos para navegación.");
    }

    const opcionesPool = opcionesValidas('select1');
    if (!opcionesPool.length) {
      if (typeof mostrarNotificacion === 'function') mostrarNotificacion("El Pool está vacío. Agrega blogs en Preferencias.", "alerta");
    } else {
      const mezclados = [...opcionesPool].sort(() => 0.5 - Math.random());
      ['select1','select2','select3'].forEach((id, i) => {
        const sel = document.getElementById(id);
        if (sel && mezclados[i]) sel.value = mezclados[i].value;
      });
    }
    console.log("Auto asignación finalizada.");
  };

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnAutoAsignar");
    if (btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener("click", (e) => { e.preventDefault(); window.autoAsignarCompleto(); });
    }
  });
})();

// updd v1