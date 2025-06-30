



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
