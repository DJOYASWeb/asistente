// editor.js
// Constructor visual básico: textarea + botón + previsualización
// Autor: Tu Asistente
// Fecha: 2025-07-01

document.addEventListener("DOMContentLoaded", () => {
  // Referencias a los elementos
  const textareaHTML = document.getElementById("textarea-html");
  const botonRenderizar = document.getElementById("boton-renderizar");
  const contenedorPreview = document.getElementById("contenedor-preview");

  // Evento al hacer clic en el botón
  botonRenderizar.addEventListener("click", () => {
    const htmlIngresado = textareaHTML.value.trim();
    contenedorPreview.innerHTML = htmlIngresado;
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("repositorio-clases");

  const clases = {
    "Botones": [
      "boton-principal",
      "boton-secundario",
      "boton-peligro"
    ],
    "Fondos": [
      "fondo-claro",
      "fondo-oscuro",
      "fondo-advertencia"
    ],
    "Textos": [
      "texto-destacado",
      "texto-pequeño",
      "texto-grande"
    ],
    "Bordes": [
      "borde-redondeado",
      "borde-delgado",
      "borde-grueso"
    ]
  };

  Object.keys(clases).forEach(categoria => {
    const seccion = document.createElement("div");
    seccion.className = "mb-4";

    const titulo = document.createElement("h3");
    titulo.textContent = categoria;
    seccion.appendChild(titulo);

    const lista = document.createElement("ul");
    lista.className = "list-group";

    clases[categoria].forEach(clase => {
      const item = document.createElement("li");
      item.className = "list-group-item d-flex justify-content-between align-items-center";
      item.textContent = clase;

      const btnCopiar = document.createElement("button");
      btnCopiar.className = "btn btn-sm btn-outline-primary";
      btnCopiar.textContent = "Copiar";
      btnCopiar.onclick = () => {
        navigator.clipboard.writeText(clase);
        alert(`✅ Clase "${clase}" copiada`);
      };

      item.appendChild(btnCopiar);
      lista.appendChild(item);
    });

    seccion.appendChild(lista);
    contenedor.appendChild(seccion);
  });
});
