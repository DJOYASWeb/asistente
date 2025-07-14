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
