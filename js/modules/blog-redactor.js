// blog-redactor.js

import { slugify, aplicarNegritaUltimaFraseConDosPuntos } from './blog-utils.js';

function convertirHTML() {
  const input = document.getElementById("inputTexto").value.trim();
  const lineas = input.split(/\n/);
  let html = '<section class="blog-container">\n';
  let contenido = '';
  let secciones = [];
  let bloqueIndice = '';
  let buffer = [];
  let enLista = false;

const flushBuffer = () => {
    if (buffer.length === 0) return;
    if (enLista) {
      contenido += '<ul class="texto-blog">\n';
      buffer.forEach(line => {
        const limpio = line.replace(/^\s*-?\s*/, '- ');
        
        // 1. Aplicamos la lógica de dos puntos
        let textoProcesado = aplicarNegritaUltimaFraseConDosPuntos(limpio);
        // 2. Y AHORA la de los asteriscos **negrita**
        textoProcesado = textoProcesado.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        contenido += `<li>${textoProcesado}</li>\n`;
      });
      contenido += '</ul>\n';
    } else {
      buffer.forEach(line => {
        // 1. Aplicamos la lógica de dos puntos
        let textoProcesado = aplicarNegritaUltimaFraseConDosPuntos(line);
        // 2. Y AHORA la de los asteriscos **negrita**
        textoProcesado = textoProcesado.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        contenido += `<p class="texto-blog">${textoProcesado}</p>\n`;
      });
    }
    buffer = [];
    enLista = false;
  };

  lineas.forEach(linea => {
    linea = linea.trim();
    if (!linea) {
      flushBuffer();
      return;
    }

    const h2Match = linea.match(/^(\d+)\.\s+(.*)/);
    const h3Match = linea.match(/^(\d+\.\d+)\s+(.*)/);

    if (h3Match) {
      flushBuffer();
      const id = slugify(h3Match[2]);
      contenido += `<h3 id="${id}" class="blog-h3">${h3Match[1]} ${h3Match[2]}</h3>\n`;
      return;
    }

    if (h2Match) {
      flushBuffer();
      const id = slugify(h2Match[2]);
      const tituloCompleto = `${h2Match[1]}. ${h2Match[2]}`;
      secciones.push({ id, titulo: tituloCompleto });
      contenido += `<h2 id="${id}" class="blog-h2"><span class="blog-h2">${h2Match[1]}. </span>${h2Match[2]}</h2>\n`;
      return;
    }

    if (/^-\s*[^\s]/.test(linea)) {
      if (!enLista) flushBuffer();
      enLista = true;
      buffer.push(linea);
    } else {
      flushBuffer();
      buffer.push(linea);
    }
  });

  flushBuffer();

  if (secciones.length > 0) {
    bloqueIndice += '<section class="indice">\n<h2 class="blog-h3">Índice de Contenidos</h2>\n<ul class="texto-blog">\n';
    secciones.forEach(sec => {
      bloqueIndice += `<li><a href="#${sec.id}">${sec.titulo}</a></li>\n`;
    });
    bloqueIndice += '</ul>\n</section>\n';
  }

  const contenidoPartido = contenido.split('</p>\n');
  if (contenidoPartido.length >= 2) {
    contenido = contenidoPartido.slice(0, 2).join('</p>\n') + '</p>\n' + bloqueIndice + contenidoPartido.slice(2).join('</p>\n');
  }

  html += contenido + '</section>';
  document.getElementById("resultadoHTML").textContent = html;
}
window.convertirHTML = convertirHTML;
function copiarResultado() {
  const resultado = document.getElementById("resultadoHTML").textContent;
  navigator.clipboard.writeText(resultado)
    .then(() => alert("✅ HTML copiado al portapapeles"))
    .catch(err => alert("❌ Error al copiar: " + err));
}
window.copiarResultado = copiarResultado;
//v3