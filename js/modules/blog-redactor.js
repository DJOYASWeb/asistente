// blog-redactor.js

import { slugify, aplicarNegritaUltimaFraseConDosPuntos } from './blog-utils.js';

function convertirHTML() {
  const input  = document.getElementById("inputTexto").value.trim();
  const lineas = input.split(/\n/);
  let html     = '<section class="blog-container">\n';
  let contenido = '', secciones = [], bloqueIndice = '', buffer = [];
  let enLista  = false;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    if (enLista) {
      contenido += '<ul class="texto-blog">\n';
      buffer.forEach(line => {
        const limpio = line.replace(/^\s*-?\s*/, '- ');
        let textoProcesado = aplicarNegritaUltimaFraseConDosPuntos(limpio);
        textoProcesado = textoProcesado.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        contenido += `<li>${textoProcesado}</li>\n`;
      });
      contenido += '</ul>\n';
    } else {
      buffer.forEach(line => {
        let textoProcesado = aplicarNegritaUltimaFraseConDosPuntos(line);
        textoProcesado = textoProcesado.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        contenido += `<p class="texto-blog">${textoProcesado}</p>\n`;
      });
    }
    buffer = []; enLista = false;
  };

  lineas.forEach(linea => {
    linea = linea.trim();
    if (!linea) { flushBuffer(); return; }

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
      secciones.push({ id, titulo: `${h2Match[1]}. ${h2Match[2]}` });
      contenido += `<h2 id="${id}" class="blog-h2"><span class="blog-h2">${h2Match[1]}. </span>${h2Match[2]}</h2>\n`;
      return;
    }
    if (/^-\s*[^\s]/.test(linea)) {
      if (!enLista) flushBuffer();
      enLista = true; buffer.push(linea);
    } else {
      flushBuffer(); buffer.push(linea);
    }
  });

  flushBuffer();

  if (secciones.length > 0) {
    bloqueIndice += '<section class="indice">\n<h2 class="blog-h3">Índice de Contenidos</h2>\n<ul class="texto-blog">\n';
    secciones.forEach(sec => { bloqueIndice += `<li><a href="#${sec.id}">${sec.titulo}</a></li>\n`; });
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
    .then(() => mostrarNotificacion("HTML copiado al portapapeles", "exito"))
    .catch(err => mostrarNotificacion("Error al copiar: " + err, "error"));
}
window.copiarResultado = copiarResultado;

// v1.3