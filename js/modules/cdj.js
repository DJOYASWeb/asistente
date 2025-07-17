const generados = new Set();
const maxCodigos = 100000;

function generarCodigo() {
    const idPS = document.getElementById('idPS').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();

    // Validar que todos los campos estén llenos
    if (!idPS || !nombre || !correo) {
        document.getElementById('output').textContent = "Por favor completa todos los campos antes de generar un código.";
        return;
    }

    if (generados.size >= maxCodigos) {
        document.getElementById('output').textContent = "Ya se generaron todos los códigos posibles.";
        return;
    }

    let codigo;
    do {
        codigo = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    } while (generados.has(codigo));

    generados.add(codigo);

    document.getElementById('output').textContent = `Código generado: ${codigo}`;

    // Añadir a la tabla
    const tbody = document.getElementById('tabla').querySelector('tbody');
    const fila = document.createElement('tr');
    fila.innerHTML = `
        <td>${idPS}</td>
        <td>${nombre}</td>
        <td>${correo}</td>
        <td>${codigo}</td>
    `;
    tbody.appendChild(fila);

    // Limpiar los campos del formulario
    document.getElementById('formulario').reset();
}