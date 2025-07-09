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

  try {
    const snapshot = await db
      .collection("dashboard_archivos")
      .orderBy("fecha", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn("No hay archivos cargados en Firebase.");
      return;
    }

    const archivo = snapshot.docs[0].data();

    // Ya no es URL, porque tú guardas el Excel parseado en JSON (como string en sheets)
    // Parseamos directamente desde la data guardada
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

    let semanaActual = -1;

    for (let i = 1; i < filas.diasSemana.length; i++) {
      const celda = filas.diasSemana[i];
      if (!celda || typeof celda !== "string") continue;

      const rango = celda.trim();
      if (!rango.includes("-")) continue;

      const [diaIni, diaFin] = rango.split("-").map((s) => parseInt(s));
      if (diaIni <= hoy.getDate() && hoy.getDate() <= diaFin) {
        semanaActual = i;
        break;
      }
    }

    if (semanaActual === -1) {
      console.warn("No se encontró semana actual.");
      return;
    }

    // Campañas activas
    document.getElementById("campanaPrincipalActual").textContent =
      filas.principal[semanaActual] || "-";
    document.getElementById("campanaSegundaActual").textContent =
      filas.segunda[semanaActual] || "-";
    document.getElementById("campanaTerceraActual").textContent =
      filas.tercera[semanaActual] || "-";

    // Campañas próximas
    document.getElementById("campanaPrincipalProxima").textContent =
      filas.principal[semanaActual + 1] || "-";
    document.getElementById("campanaSegundaProxima").textContent =
      filas.segunda[semanaActual + 1] || "-";
    document.getElementById("campanaTerceraProxima").textContent =
      filas.tercera[semanaActual + 1] || "-";

    // Semanas restantes para próxima principal distinta
    let semanasFaltan = 0;
    for (let i = semanaActual + 1; i < filas.principal.length; i++) {
      if (
        filas.principal[i] &&
        filas.principal[i] !== filas.principal[semanaActual]
      ) {
        semanasFaltan = i - semanaActual;
        break;
      }
    }
    document.getElementById("semanasFaltan").textContent = semanasFaltan;

  } catch (err) {
    console.error("Error al cargar campañas desde Firebase:", err);
  }
}


//upd 09-07 v2.3