function mostrarNotificacion(mensaje, estado = "exito") {
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
  notif.className = `toast-notif toast-${estado}`;
  notif.innerHTML = `
    <span class="toast-icon">${estado === "exito" ? "✅" : "❌"}</span>
    <span class="toast-msg">${mensaje}</span>
    <button class="toast-close">&times;</button>
    <div class="toast-progress"></div>
  `;

  container.appendChild(notif);

  const progress = notif.querySelector(".toast-progress");
  setTimeout(() => {
    notif.style.opacity = "0";
    notif.style.transform = "translateX(100%)";
    setTimeout(() => notif.remove(), 300);
  }, 2000);

  notif.querySelector(".toast-close").onclick = () => notif.remove();

  // animación de la barra
  progress.style.width = "100%";
  progress.style.transition = "width 2s linear";
  setTimeout(() => {
    progress.style.width = "0%";
  }, 50);
}

v.1.2