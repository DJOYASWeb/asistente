const generados = new Set();
const maxCodigos = 100000; // hay 100000 combinaciones posibles

function generarCodigo() {
    if (generados.size >= maxCodigos) {
        document.getElementById('output').textContent = "Ya se generaron todos los códigos posibles.";
        return;
    }

    let codigo;
    do {
        codigo = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    } while (generados.has(codigo));

    generados.add(codigo);

    document.getElementById('output').textContent = `Nuevo código generado: ${codigo}`;

    // Opcional: muestra la lista acumulada
    const lista = Array.from(generados).join(", ");
    document.getElementById('list').textContent = `Códigos generados (${generados.size}): ${lista}`;
}