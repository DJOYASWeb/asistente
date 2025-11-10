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

  document.querySelectorAll('.menu-toggle').forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      const submenu = button.nextElementSibling;
      submenu.classList.toggle('active');
      button.classList.toggle('open');
    });
  });

  // Detectar la página actual y abrir el colapsable correspondiente
  const currentPage = window.location.pathname.split("/").pop();

  const groups = {
    "blog.html": "contenidos",
    "inspira.html": "contenidos",
    "catalogo.html": "catalogo",
    "planilla.html": "planillas",
    "mysql.html": "planillas",
    "cotizar.html": "planillas"
  };

  const activeGroup = groups[currentPage];
  if (activeGroup) {
    const groupEl = document.querySelector(`.menu-group[data-group="${activeGroup}"] .submenu`);
    if (groupEl) groupEl.classList.add('active');
  }