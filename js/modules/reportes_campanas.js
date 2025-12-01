// ================================================================
// 🟣 REPORTES DE CAMPAÑAS – Módulo Principal
// ================================================================

import { CampanasManager } from "./campanas_manager.js";

// Categorías principales estandarizadas
const CATEGORIAS_PRINCIPALES = {
  "ENCHAPADO": "Enchapado",
  "JOYAS DE PLATA POR MAYOR": "Joyas de Plata 925",
  "ACCESORIOS": "Accesorios"
};

// Detecta categoría principal desde el texto del CSV
export function detectarCategoriaPrincipal(categoriasTexto) {
  if (!categoriasTexto) return null;
  const lista = categoriasTexto.toUpperCase();

  for (let base of Object.keys(CATEGORIAS_PRINCIPALES)) {
    if (lista.includes(base)) return CATEGORIAS_PRINCIPALES[base];
  }

  return null;
}

// Detecta subcategoría (primera categoría no principal)
export function detectarSubcategoria(categoriasTexto) {
  if (!categoriasTexto) return null;

  const partes = categoriasTexto.split(",").map(c => c.trim());
  for (let cat of partes) {
    const may = cat.toUpperCase();
    if (!Object.keys(CATEGORIAS_PRINCIPALES).includes(may)) {
      return cat; // primera subcategoría válida
    }
  }
  return "Sin Subcategoría";
}

// Detecta etiquetas especiales (Black Friday, Navidad, etc.)
export function detectarEtiquetas(categoriasTexto) {
  if (!categoriasTexto) return [];

  const etiquetasClave = [
    "Black Friday",
    "Cyber",
    "Navidad",
    "Descuentos",
    "Colección Primavera",
    "Joyas día de la madre",
    "Inicio"
  ];

  return categoriasTexto
    .split(",")
    .map(c => c.trim())
    .filter(c => etiquetasClave.includes(c));
}

// Helper para fechas
export function parseFecha(str) {
  if (!str) return null;
  const [fecha, hora] = str.split(" ");
  const [y, m, d] = fecha.split("-").map(Number);
  if (!hora) return new Date(y, m - 1, d);
  const [H, M, S] = hora.split(":").map(Number);
  return new Date(y, m - 1, d, H, M, S);
}


// ================================================================
// 🟣 FUNCIÓN PRINCIPAL TEMPORAL – evitar errores hasta cargar el módulo completo
// ================================================================
window.cargarDashboardCampanas = async function () {

  const panel = document.getElementById("tab-campanas");
  if (!panel) {
    console.warn("⚠️ No se encontró el panel de campañas en el DOM");
    return;
  }

  // Limpia contenido dinámico por si acaso
  panel.querySelector("#campanasKPIs").innerHTML = `
    <div class="ios-card"><p class="muted">Cargando campaña...</p></div>
  `;

  console.log("🟣 cargarDashboardCampanas() ejecutada correctamente.");
};


