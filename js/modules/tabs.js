window.showTab = function(tab) {
  const tabs = ['contenidos', 'recursos', 'ingreso', 'crear', 'redactar', 'calendario','constructor','carga','historial','general','archivos','clases','secciones','reportes','archivos','categorias'];
  tabs.forEach(t => {
    const section = document.getElementById(t);
    const btn = document.getElementById(`btn${capitalize(t)}`);
    if (section) section.classList.toggle('d-none', t !== tab);
    if (btn) btn.classList.toggle('active', t === tab);
  });

  if (tab === 'recursos' && typeof cargarRecursos === "function") {
    cargarRecursos();
  }
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

document.addEventListener("DOMContentLoaded", () => {
  const enlaces = document.querySelectorAll("#sidebar a");
  const paginaActual = window.location.pathname.split("/").pop();

  enlaces.forEach(enlace => {
    const href = enlace.getAttribute("href");

    // Coincidencia exacta con el archivo
    if (paginaActual === href) {
      enlace.classList.add("activo");
    }
  });
});