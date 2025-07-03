// dashboard.js

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}

function toggleMobileSidebar() {
  document.getElementById("sidebar").classList.toggle("active");
  document.getElementById("overlay").classList.toggle("show");
}

function closeMobileSidebar() {
  document.getElementById("sidebar").classList.remove("active");
  document.getElementById("overlay").classList.remove("show");
}

function toggleDropdown() {
  document.getElementById("dropdown").classList.toggle("show");
}

function toggleTheme() {
  const body = document.body;
  const icon = document.getElementById("theme-icon");
  const label = document.querySelector(".switch-label");
  const isDark = body.getAttribute("data-theme") === "dark";
  body.setAttribute("data-theme", isDark ? "light" : "dark");
  icon.textContent = isDark ? "🌙" : "☀️";
  label.textContent = isDark ? "Modo oscuro" : "Modo claro";
}

function logout() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "login.html";
}

// Cerrar dropdown si haces clic fuera
window.addEventListener("click", function (e) {
  if (!e.target.closest(".profile-section")) {
    const dropdown = document.getElementById("dropdown");
    if (dropdown && dropdown.classList.contains("show")) {
      dropdown.classList.remove("show");
    }
  }
});


document.addEventListener("DOMContentLoaded", () => {
  actualizarFechaHora();
  setInterval(actualizarHora, 60000);

  // Cargar datos ficticios iniciales
  document.getElementById("campanaActiva").textContent = "Campaña de Verano";
  document.getElementById("campanaSiguiente").textContent = "Campaña de Primavera";
  document.getElementById("semanasFaltan").textContent = "3";
  document.getElementById("blogsSemana").innerHTML = `
    <li>Cómo vender más en verano</li>
    <li>Las joyas más buscadas</li>
  `;
  document.getElementById("inspiraSemana").textContent = "Inspiración: Joyas para el Día de la Madre";
});

function actualizarFechaHora() {
  const now = new Date();
  const fecha = now.toLocaleDateString("es-CL", { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = now.toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit' });
  document.getElementById("fechaActual").textContent = `Fecha: ${fecha}`;
  document.getElementById("horaActual").textContent = `Hora: ${hora}`;
}

function actualizarHora() {
  const now = new Date();
  const hora = now.toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit' });
  document.getElementById("horaActual").textContent = `Hora: ${hora}`;
}

function marcarCompleto(boton) {
  const li = boton.closest("li");
  li.classList.add("text-decoration-line-through", "text-muted");
  boton.remove();
}


//eme1