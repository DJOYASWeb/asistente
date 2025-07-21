// Variable para almacenar la categoría seleccionada y las columnas elegidas
let selectedCategory = null;
let selectedColumns = [];

// Mapeo de categorías a tablas de PrestaShop
const tableMap = {
  "productos": {
    "table": "ps_product",
    "columns": ["id_product", "name", "price", "quantity", "reference", "active"]
  },
  "categorías": {
    "table": "ps_category",
    "columns": ["id_category", "name", "description", "active"]
  },
  "pedidos": {
    "table": "ps_orders",
    "columns": ["id_order", "id_customer", "total_paid", "date_add", "status"]
  },
  "clientes": {
    "table": "ps_customer",
    "columns": ["id_customer", "firstname", "lastname", "email", "date_add"]
  }
};

// Función para manejar la selección de la categoría
function selectCategory(category) {
  selectedCategory = category;
  // Ocultar la selección de categoría y mostrar la selección de columnas
  document.getElementById("category-selection").style.display = "none";
  document.getElementById("confirmation").style.display = "block";
  
  // Cargar las columnas según la categoría seleccionada
  loadColumns(category);
}

// Cargar las columnas de la categoría seleccionada
function loadColumns(category) {
  const availableColumnsDiv = document.getElementById("available-columns");
  availableColumnsDiv.innerHTML = ''; // Limpiar las columnas disponibles

  const columns = tableMap[category].columns;
  columns.forEach(column => {
    const button = document.createElement("button");
    button.classList.add("column-btn");
    button.textContent = column.replace('_', ' ').toUpperCase(); // Formato más amigable
    button.onclick = () => addColumn(column);
    availableColumnsDiv.appendChild(button);
  });
}

// Confirmar la selección de la categoría
function confirmSelection() {
  document.getElementById("confirmation").style.display = "none";
  document.getElementById("columns-selection").style.display = "block";
}

// Añadir una columna a la lista de columnas seleccionadas
function addColumn(column) {
  // Evitar duplicados
  if (!selectedColumns.includes(column)) {
    selectedColumns.push(column);
    updateSelectedColumns();
  }
}

// Actualizar el área de columnas seleccionadas
function updateSelectedColumns() {
  const selectedDiv = document.getElementById("selected-columns");
  selectedDiv.innerHTML = ''; // Limpiar el área antes de actualizar

  selectedColumns.forEach(column => {
    const columnElement = document.createElement("div");
    columnElement.textContent = column.replace('_', ' ').toUpperCase();
    selectedDiv.appendChild(columnElement);
  });
}

// Generar la consulta SQL
function generateSQL() {
  if (selectedColumns.length === 0) {
    alert("Por favor, selecciona al menos una columna.");
    return;
  }

  const table = tableMap[selectedCategory].table;
  const query = `SELECT ${selectedColumns.join(", ")} FROM ${table};`;

  // Mostrar el SQL generado en el área de texto
  const queryTextArea = document.getElementById("sql-query");
  queryTextArea.value = query;

  // Mostrar la sección de SQL
  document.getElementById("sql-result").style.display = "block";
}

// Función para copiar el SQL al portapapeles
function copySQL() {
  const queryTextArea = document.getElementById("sql-query");
  queryTextArea.select();
  document.execCommand('copy');
  alert("SQL Copiado al Portapapeles");
}

// Función para cambiar entre pestañas
function showTab(tabName) {
  const tabSections = document.querySelectorAll(".tab-section");
  tabSections.forEach(section => {
    section.classList.add("d-none");
  });

  const activeTab = document.getElementById(tabName);
  activeTab.classList.remove("d-none");

  // Cambiar el estado activo de los botones de pestaña
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(button => {
    button.classList.remove("active");
  });

  const activeButton = document.getElementById("btn" + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  activeButton.classList.add("active");
}

// Función para mostrar u ocultar la barra lateral en dispositivos móviles
function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("active");
}

// Función para cerrar la barra lateral cuando se hace clic fuera
function closeMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("active");
}

// Función para cambiar entre modo claro/oscuro
function toggleTheme() {
  const body = document.body;
  body.classList.toggle("dark-theme");
  const themeIcon = document.getElementById("theme-icon");
  themeIcon.textContent = body.classList.contains("dark-theme") ? "🌙" : "☀️";
}

// Función para manejar el dropdown del usuario
function toggleDropdown() {
  const dropdown = document.getElementById("dropdown");
  dropdown.classList.toggle("show");
}

// Función para cerrar sesión
function logout() {
  // Redirigir o cerrar sesión de la app
  window.location.href = "login.html"; // O alguna página de logout
}


//v 1