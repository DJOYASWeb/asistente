/**
 * Muestra una notificación tipo toast en la esquina inferior derecha.
 *
 * @param {string} mensaje - Texto a mostrar en la notificación.
 * @param {string} estado  - "exito" | "error" | "alerta" | "info". Por defecto: "exito".
 *
 * Ejemplos:
 * mostrarNotificacion("Guardado correctamente", "exito");
 * mostrarNotificacion("Ocurrió un error", "error");
 */
function mostrarNotificacion(mensaje, estado = "exito") {
  const containerId = "notificacionesContainer";
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.cssText = "position:fixed;bottom:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;";
    document.body.appendChild(container);
  }

  const iconos = {
    exito:  "fa-circle-check",
    error:  "fa-circle-xmark",
    alerta: "fa-triangle-exclamation",
    info:   "fa-circle-info",
  };
  const icono = iconos[estado] || "fa-circle-check";

  const notif = document.createElement("div");
  notif.className = `toast-notif toast-${estado}`;
  notif.innerHTML = `
    <span class="toast-icon"><i class="fa-solid ${icono}"></i></span>
    <span class="toast-msg">${mensaje}</span>
    <button class="toast-close">&times;</button>
    <div class="toast-progress toast-progress-${estado}"></div>
  `;

  container.appendChild(notif);

  notif.querySelector(".toast-close").onclick = () => notif.remove();

  const progress = notif.querySelector(".toast-progress");
  progress.style.width = "0%";
  progress.style.transition = "width 2s linear";
  setTimeout(() => { progress.style.width = "100%"; }, 50);

  setTimeout(() => {
    notif.style.opacity = "0";
    notif.style.transform = "translateX(100%)";
    setTimeout(() => notif.remove(), 300);
  }, 2000);
}

