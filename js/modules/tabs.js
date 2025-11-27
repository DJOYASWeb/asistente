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

document.addEventListener("DOMContentLoaded", () => {
  // Control manual de abrir/cerrar con clic
  document.querySelectorAll('.menu-toggle').forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      const submenu = button.nextElementSibling;
      submenu.classList.toggle('active');
      button.classList.toggle('open');
    });
  });

  // Esperar a que todo cargue (permisos, etc.)
  setTimeout(() => {
    const currentPage = window.location.pathname.split("/").pop();

    const groups = {
      "blog.html": "contenidos",
      "inspira.html": "contenidos",
      "catalogo.html": "catalogo",
      "productos.html": "planillas",
      "planilla.html": "planillas",
      "mysql.html": "planillas",
      "cotizar.html": "planillas",
      "reportes_clientes.html": "reportes",
    };

    const activeGroup = groups[currentPage];
    if (activeGroup) {
      const groupEl = document.querySelector(`.menu-group[data-group="${activeGroup}"]`);
      if (groupEl) {
        const submenu = groupEl.querySelector('.submenu');
        const toggle = groupEl.querySelector('.menu-toggle');
        if (submenu) submenu.classList.add('active');
        if (toggle) toggle.classList.add('open');
      }
    }
  }, 300); // ⏱ espera 300 ms para asegurarse que permisos-tabs ya terminó
});

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("mini");
  document.body.classList.toggle("sidebar-mini");
}

function activarPadreSegunPagina() {
  const paginaActual = window.location.pathname.split("/").pop();

  document.querySelectorAll(".submenu-item").forEach(item => {
    if (item.getAttribute("href") === paginaActual) {
      
      // Marcar el hijo
      item.classList.add("activo");

      // Marcar el padre
      const parent = item.closest(".menu-group");
      if (parent) {
        parent.querySelector(".menu-toggle").classList.add("activo");
      }
    }
  });
}

activarPadreSegunPagina();

// Permite abrir un tab padre mientras la barra está colapsada
document.querySelectorAll(".menu-toggle").forEach(toggle => {
  toggle.addEventListener("click", function (e) {

    const sidebar = document.getElementById("sidebar");

    // 1) Si la sidebar está colapsada → la expandimos
    if (sidebar.classList.contains("mini")) {

      // Expandir sidebar
      sidebar.classList.remove("mini");
      document.body.classList.remove("sidebar-mini");

      // Esperar un poquito para permitir la animación antes de abrir submenu
      setTimeout(() => {
        abrirSubmenu(this);
      }, 150);

    } else {
      // 2) Sidebar expandida → solo abrir/cerrar submenu
      abrirSubmenu(this);
    }
  });
});


function abrirSubmenu(toggleBtn) {
  const group = toggleBtn.closest(".menu-group");
  const submenu = group.querySelector(".submenu");

  // Cerrar otros submenus para evitar caos visual
  document.querySelectorAll(".submenu").forEach(sm => {
    if (sm !== submenu) sm.classList.remove("active");
  });

  // Abrir/cerrar el submenu seleccionado
  submenu.classList.toggle("active");

  // Mover flechita
  toggleBtn.classList.toggle("open");
}
