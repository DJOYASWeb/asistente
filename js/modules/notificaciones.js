/**
 * Muestra una notificación tipo toast en la esquina inferior derecha.
 *
 * @param {string} mensaje - Texto a mostrar en la notificación.
 * @param {string} estado - Estado visual: "exito" (verde) o "error" (rojo). Por defecto: "exito".
 *
 * Ejemplos:
 * mostrarNotificacion("Guardado correctamente", "exito");
 * mostrarNotificacion("Ocurrió un error", "error");
 */
function mostrarNotificacion(mensaje, estado = "exito") {
  const containerId = "notificacionesContainer";
  let container = document.getElementById(containerId);

  // Crea el contenedor si no existe
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

  // Crea la notificación
  const notif = document.createElement("div");
  notif.className = `toast-notif toast-${estado}`;
  notif.innerHTML = `
    <span class="toast-icon">${estado === "exito" ? "✅" : "❌"}</span>
    <span class="toast-msg">${mensaje}</span>
    <button class="toast-close">&times;</button>
    <div class="toast-progress toast-progress-${estado}"></div>
  `;

  container.appendChild(notif);

  const progress = notif.querySelector(".toast-progress");

  // Cierre manual
  notif.querySelector(".toast-close").onclick = () => notif.remove();

  // Animación de barra y desaparición automática
  progress.style.width = "0%";
  progress.style.transition = "width 2s linear";
  setTimeout(() => {
    progress.style.width = "100%";
  }, 50);

  setTimeout(() => {
    notif.style.opacity = "0";
    notif.style.transform = "translateX(100%)";
    setTimeout(() => notif.remove(), 300);
  }, 2000);
}

//v.1.4