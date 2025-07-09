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

window.addEventListener("click", (e) => {
  if (!e.target.closest(".profile-section")) {
    const dropdown = document.getElementById("dropdown");
    if (dropdown?.classList.contains("show")) dropdown.classList.remove("show");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  actualizarFechaHora();
  setInterval(actualizarHora, 60000);
  cargarCampañasDesdeFirebase();
});

function actualizarFechaHora() {
  const now = new Date();
  const fecha = now.toLocaleDateString("es-CL", { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = now.toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit' });
  document.getElementById("fechaActual").textContent = fecha;
  document.getElementById("horaActual").textContent = hora;
}

function actualizarHora() {
  const now = new Date();
  const hora = now.toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit' });
  document.getElementById("horaActual").textContent = hora;
}

async function cargarCampañasDesdeFirebase() {
  const db = firebase.firestore();
  const snapshot = await db.collection("dashboard_archivos").orderBy("fecha", "desc").limit(1).get();
  if (snapshot.empty) {
    console.warn("No hay archivos cargados.");
    return;
  }

  const archivo = snapshot.docs[0].data();
  const sheetDataStr = archivo.data[Object.keys(archivo.data)[0]];
  const allRows = JSON.parse(sheetDataStr);

  const filas = {
    diasSemana: allRows[1].slice(2),  // desde la columna C
    principal: allRows[2].slice(2),
    segunda: allRows[3].slice(2),
    tercera: allRows[4].slice(2),
    activacion: allRows[5].slice(2),
  };

  const hoy = new Date();
  const diaHoy = hoy.getDate();

  let semanaActual = -1;

  for (let i = 0; i < filas.diasSemana.length; i++) {
    const rango = filas.diasSemana[i];
    if (typeof rango !== "string" || !rango.includes("-")) continue;

    const [ini, fin] = rango.split("-").map(Number);
    if (!isNaN(ini) && !isNaN(fin) && ini <= diaHoy && diaHoy <= fin) {
      semanaActual = i;
      break;
    }
  }

  if (semanaActual === -1) {
    console.warn("No se encontró semana actual.");
    return;
  }

  const campPrincipalActual = filas.principal[semanaActual] || "-";
  const campSegundaActual = filas.segunda[semanaActual] || "-";
  const campTerceraActual = filas.tercera[semanaActual] || "-";

  const campPrincipalProxima = filas.principal[semanaActual + 1] || "-";
  const campSegundaProxima = filas.segunda[semanaActual + 1] || "-";
  const campTerceraProxima = filas.tercera[semanaActual + 1] || "-";

  let semanasFaltan = 0;
  for (let i = semanaActual + 1; i < filas.principal.length; i++) {
    if (filas.principal[i] && filas.principal[i] !== campPrincipalActual) {
      semanasFaltan = i - semanaActual;
      break;
    }
  }

  document.getElementById("campanaPrincipalActual").textContent = campPrincipalActual;
  document.getElementById("campanaSegundaActual").textContent = campSegundaActual;
  document.getElementById("campanaTerceraActual").textContent = campTerceraActual;

  document.getElementById("campanaPrincipalProxima").textContent = campPrincipalProxima;
  document.getElementById("campanaSegundaProxima").textContent = campSegundaProxima;
  document.getElementById("campanaTerceraProxima").textContent = campTerceraProxima;

  document.getElementById("semanasFaltan").textContent = semanasFaltan;
}


//upd 09-07 v2.7