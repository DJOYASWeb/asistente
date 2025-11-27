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

document.querySelectorAll(".menu-toggle").forEach(toggle => {
    toggle.addEventListener("click", function (e) {

        e.preventDefault();
        e.stopPropagation();

        const sidebar = document.getElementById("sidebar");
        const group = this.closest(".menu-group");
        const submenu = group.querySelector(".submenu");

        // --- 1) Si está MINI → solo expandir y permitir abrir después ---
        if (sidebar.classList.contains("mini")) {
            sidebar.classList.remove("mini");
            document.body.classList.remove("sidebar-mini");
        }

        // --- 2) Sidebar expandida → abrir/cerrar normalmente ---

        // Cerrar otros submenús
        document.querySelectorAll(".submenu").forEach(s => {
            if (s !== submenu) {
                s.classList.remove("active");
                s.style.maxHeight = null;
            }
        });

        // Reset flechas de otros toggles
        document.querySelectorAll(".menu-toggle").forEach(t => {
            if (t !== this) t.classList.remove("open");
        });

        // Toggle del submenú actual
        submenu.classList.toggle("active");
        this.classList.toggle("open");

        // Animación de altura
        if (submenu.classList.contains("active")) {
            submenu.style.maxHeight = submenu.scrollHeight + "px";
        } else {
            submenu.style.maxHeight = null;
        }
    });
});




