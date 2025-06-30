  function showTab(tab) {
    // Mostrar contenido correcto
    document.getElementById('tab-recursos').style.display = tab === 'recursos' ? 'block' : 'none';
    document.getElementById('tab-constructor').style.display = tab === 'constructor' ? 'block' : 'none';

    // Actualizar clase activa en los botones
    document.getElementById('btnCrear').classList.remove('active');
    document.getElementById('btnCalendario').classList.remove('active');

    if (tab === 'constructor') {
      document.getElementById('btnCrear').classList.add('active');
      cargarRecursos(); // Cargar bloques si entramos al constructor
    } else {
      document.getElementById('btnCalendario').classList.add('active');
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
