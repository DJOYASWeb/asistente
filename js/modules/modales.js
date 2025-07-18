// modales.js

function showIosModal(title, message) {
  const titleEl = document.getElementById('iosModalTitle');
  const messageEl = document.getElementById('iosModalMessage');
  const modal = document.getElementById('iosModal');

  if (titleEl && messageEl && modal) {
    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.style.display = 'flex';
  }
}

function closeIosModal() {
  const modal = document.getElementById('iosModal');
  if (modal) modal.style.display = 'none';
}

function mostrarModalHTML(contenidoHTML) {
  const modal = document.createElement("div");
  modal.id = "modalCodigoHTML";
  modal.style.cssText = `
    position:fixed;
    top:0; left:0;
    width:100%;
    height:100%;
    background:rgba(0,0,0,0.6);
    z-index:9999;
    display:flex;
    align-items:center;
    justify-content:center;
  `;

  const inner = document.createElement("div");
  inner.style.cssText = `
    background:white;
    max-width:800px;
    padding:2rem;
    border-radius:16px;
    width:90%;
    max-height:90vh;
    overflow:auto;
  `;

  const btn = document.createElement("button");
  btn.className = "btn-close position-absolute end-0 top-0 m-3";
  btn.onclick = () => modal.remove();

  const titulo = document.createElement("h5");
  titulo.className = "mb-3";
  titulo.textContent = "📋 Código HTML generado";

  const pre = document.createElement("pre");
  pre.id = "modalContenido";
  pre.style = "white-space:pre-wrap; background:#f9f9f9; padding:1rem; border-radius:10px;";
  pre.textContent = contenidoHTML;

  const copiar = document.createElement("button");
  copiar.className = "btn btn-primary mt-3";
  copiar.textContent = "📎 Copiar HTML";
  copiar.onclick = copiarAlPortapapeles;

  inner.appendChild(btn);
  inner.appendChild(titulo);
  inner.appendChild(pre);
  inner.appendChild(copiar);
  modal.appendChild(inner);
  document.body.appendChild(modal);
}

function copiarAlPortapapeles() {
  const texto = document.getElementById("modalContenido").textContent;
  navigator.clipboard.writeText(texto).then(() => {
    alert("¡Código HTML copiado al portapapeles!");
  });
}

// Cierre universal de modales con ESC
window.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    const modales = [
  'modalAgregarDato',
  'modalConfirmarEliminar',
  'modalEditarDato',
  'iosModal',
  'modalNuevaClienta',
  'modalCargaMasiva',
  'modalEstadisticas'
    ];

    modales.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.style.display === 'flex') {
        el.style.display = 'none';
      }
    });
  }
});

// Cierre universal de modales haciendo clic fuera
document.addEventListener('click', function (event) {
  const modalesAbiertos = document.querySelectorAll('.alinear[style*="display"]');
  modalesAbiertos.forEach(modal => {
    if (getComputedStyle(modal).display === 'flex') {
      const contenido = modal.querySelector('div');
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    }
  });
});

//v.1