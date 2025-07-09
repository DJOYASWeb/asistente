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

window.addEventListener("click", function (e) {
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
  document.getElementById("fechaActual").textContent = `Fecha: ${fecha}`;
  document.getElementById("horaActual").textContent = `Hora: ${hora}`;
}

function actualizarHora() {
  const now = new Date();
  const hora = now.toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit' });
  document.getElementById("horaActual").textContent = `Hora: ${hora}`;
}

async function cargarCampañasDesdeFirebase() {
  const db = firebase.firestore();
  const snapshot = await db.collection("dashboard_archivos").orderBy("fecha", "desc").limit(1).get();
  if (snapshot.empty) {
    console.warn("No hay archivos cargados.");
    return;
  }

  const archivo = snapshot.docs[0].data();
  const sheetName = Object.keys(archivo.data)[0];
  const allRows = JSON.parse(archivo.data[sheetName]);

  const filas = {
    diasSemana: allRows[1],
    principal: allRows[2],
    segunda: allRows[3],
    tercera: allRows[4],
    activacion: allRows[5],
  };

  const hoy = new Date();
  const diaHoy = hoy.getDate();

  let semanaActual = -1;

  for (let col = 2; col < filas.diasSemana.length; col++) { // empezar desde la columna C (índice 2)
    const rango = filas.diasSemana[col];
    if (!rango || typeof rango !== "string" || !rango.includes("-")) continue;

    const [diaIni, diaFin] = rango.split("-").map(s => parseInt(s));
    if (diaHoy >= diaIni && diaHoy <= diaFin) {
      semanaActual = col;
      break;
    }
  }

  if (semanaActual === -1) {
    console.warn("No se encontró semana actual.");
    return;
  }

  console.log("Semana actual:", semanaActual);

  const campPrincipalActual = filas.principal[semanaActual] || "-";
  const campSegundaActual = filas.segunda[semanaActual] || "-";
  const campTerceraActual = filas.tercera[semanaActual] || "-";

  const campPrincipalProxima = filas.principal[semanaActual + 1] || "-";
  const campSegundaProxima = filas.segunda[semanaActual + 1] || "-";
  const campTerceraProxima = filas.tercera[semanaActual + 1] || "-";

  // Mostrar en los elementos que ya tienes en el HTML
  document.getElementById("campanaActiva").textContent =
    `Principal: ${campPrincipalActual}, Segunda: ${campSegundaActual}, Tercera: ${campTerceraActual}`;

  document.getElementById("campanaSiguiente").textContent =
    `Principal: ${campPrincipalProxima}, Segunda: ${campSegundaProxima}, Tercera: ${campTerceraProxima}`;

  // calcular semanas hasta próxima principal distinta
  let semanasFaltan = 0;
  for (let i = semanaActual + 1; i < filas.principal.length; i++) {
    if (filas.principal[i] && filas.principal[i] !== campPrincipalActual) {
      semanasFaltan = i - semanaActual;
      break;
    }
  }
  document.getElementById("semanasFaltantes").textContent = semanasFaltan;
}


//upd 09-07 v2.6