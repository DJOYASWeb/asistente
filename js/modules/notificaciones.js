// notificaciones.js

function mostrarNotificacion(mensaje, tipo = "info") {
  const containerId = "notificacionesContainer";
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "fixed";
    container.style.bottom = "1rem";
    container.style.right = "1rem";
    container.style.zIndex = "9999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "0.5rem";
    document.body.appendChild(container);
  }

  const notif = document.createElement("div");
  notif.className = `toast-notif toast-${tipo}`;
  notif.textContent = mensaje;

  container.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = "0";
    notif.style.transform = "translateX(100%)";
    setTimeout(() => notif.remove(), 300);
  }, 2000);
}
