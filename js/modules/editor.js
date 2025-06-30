  function showTab(tabName) {
    // Ocultar todos los contenidos de tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.style.display = 'none');

    // Mostrar solo el tab seleccionado
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) selectedTab.style.display = 'block';

    // Remover clase activa de todos los botones
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // Agregar clase activa al botón que corresponde
    const buttonMap = {
      'constructor': 'btnConstructor',
      'recursos': 'btnRecursos'
    };
    const activeBtnId = buttonMap[tabName];
    if (activeBtnId) {
      document.getElementById(activeBtnId).classList.add('active');
    }

    // Si es constructor, cargamos bloques disponibles
    if (tabName === 'constructor') {
      cargarRecursos();
    }
}



function guardarRecurso(nombre, html) {
  let recursos = JSON.parse(localStorage.getItem('bloques') || '[]');
  recursos.push({ nombre, html });
  localStorage.setItem('bloques', JSON.stringify(recursos));
}

function cargarRecursos() {
  let recursos = JSON.parse(localStorage.getItem('bloques') || '[]');
  const contenedor = document.getElementById('bloques-disponibles');
  contenedor.innerHTML = '';
  recursos.forEach((r, i) => {
    const btn = document.createElement('button');
    btn.textContent = r.nombre;
    btn.onclick = () => agregarAlCanvas(r.html);
    contenedor.appendChild(btn);
  });
}
