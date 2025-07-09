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
  const data = archivo.data;

  // Solo tomamos la primera hoja
  const hojaNombre = Object.keys(data)[0];
  const hoja = JSON.parse(data[hojaNombre]);

  const allRows = hoja;

  const filas = {
    diasSemana: allRows[1].slice(2),
    principal: allRows[2].slice(2),
    segunda: allRows[3].slice(2),
    tercera: allRows[4].slice(2),
    activacion: allRows[5].slice(2),
  };

  const hoy = new Date();
  const diaHoy = hoy.getDate();

  let semanaActual = -1;

  for (let i = 0; i < filas.diasSemana.length; i++) {
    const valor = filas.diasSemana[i];
    if (typeof valor !== "string") continue;

    const rango = valor.trim();
    if (!rango.includes("-")) continue;

    const [diaIni, diaFin] = rango.split("-").map(s => parseInt(s));
    if (!isNaN(diaIni) && !isNaN(diaFin)) {
      if (diaIni <= diaHoy && diaHoy <= diaFin) {
        semanaActual = i;
        break;
      }
    }
  }

  if (semanaActual === -1) {
    console.warn("No se encontró semana actual.");
    return;
  }

  console.log("Semana actual:", semanaActual);

  // Campañas activas
  document.getElementById("campanaActiva").textContent = `Principal: ${filas.principal[semanaActual] || "-"}`;
  document.getElementById("campanaActiva").innerHTML += `<br>Segunda: ${filas.segunda[semanaActual] || "-"}`;
  document.getElementById("campanaActiva").innerHTML += `<br>Tercera: ${filas.tercera[semanaActual] || "-"}`;

  // Campañas próximas
  document.getElementById("campanaSiguiente").innerHTML =
    `Principal: ${filas.principal[semanaActual + 1] || "-"}<br>` +
    `Segunda: ${filas.segunda[semanaActual + 1] || "-"}<br>` +
    `Tercera: ${filas.tercera[semanaActual + 1] || "-"}`;

  // Semanas restantes para próxima principal distinta
  let semanasFaltan = 0;
  for (let i = semanaActual + 1; i < filas.principal.length; i++) {
    if (filas.principal[i] && filas.principal[i] !== filas.principal[semanaActual]) {
      semanasFaltan = i - semanaActual;
      break;
    }
  }
  document.getElementById("semanasFaltantes").textContent = semanasFaltan || "-";
}


//upd 09-07 v2.5