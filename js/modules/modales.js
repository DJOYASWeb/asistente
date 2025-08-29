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