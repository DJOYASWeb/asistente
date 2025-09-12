// blog-utils.js

// Normaliza cadenas para urls/hashes
export function slugify(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Aplica negrita a frases antes de dos puntos
export function aplicarNegritaUltimaFraseConDosPuntos(texto) {
  const match = texto.match(/^(.*?:)(\s*)(.*)$/);
  return match ? `<b>${match[1]}</b> ${match[3]}` : texto;
}
