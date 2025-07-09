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

  // 🔷 Leer datos reales desde Firestore
  const db = firebase.firestore();

  db.collection("dashboard_archivos")
    .orderBy("fecha", "desc")
    .limit(1)
    .get()
    .then(snapshot => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0].data();
        const data = doc.data; // Es el objeto que subimos desde archivos.js

        // 👇 Aquí personalizas según tu estructura del excel
        const campanaActiva = data?.General?.[1]?.[1] || "Sin datos";
        const campanaSiguiente = data?.General?.[2]?.[1] || "Sin datos";
        const semanasFaltan = data?.General?.[3]?.[1] || "0";
        const blogs = data?.Blogs || [];
        const inspira = data?.Inspira?.[1]?.[1] || "Sin datos";

        document.getElementById("campanaActiva").textContent = campanaActiva;
        document.getElementById("campanaSiguiente").textContent = campanaSiguiente;
        document.getElementById("semanasFaltan").textContent = semanasFaltan;

        const blogsList = document.getElementById("blogsSemana");
        blogsList.innerHTML = "";
        blogs.forEach(blog => {
          blogsList.innerHTML += `<li>${blog[0]}</li>`;
        });

        document.getElementById("inspiraSemana").textContent = inspira;
      } else {
        console.warn("No hay archivo subido aún.");
      }
    })
    .catch(err => {
      console.error("Error al obtener datos del dashboard:", err);
    });
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

//upd 09-07