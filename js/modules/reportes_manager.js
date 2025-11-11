// =========================================
// ✅ GESTIÓN LOCAL DE ARCHIVOS – reportes_manager.js (versión limpia)
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  // === Configuración de inputs ===
  const tipos = [
    { tipo: "ventas", input: "inputVentas", info: "infoVentas" },
    { tipo: "clientes", input: "inputClientes", info: "infoClientes" },
    { tipo: "pedidos", input: "inputPedidos", info: "infoPedidos" }
  ];

  tipos.forEach(cfg => {
    const inputEl = document.getElementById(cfg.input);
    const infoEl = document.getElementById(cfg.info);
    if (!inputEl || !infoEl) return;

    // Mostrar último archivo cargado (si existe)
    cargarArchivoLocal(cfg.tipo, infoEl);

    // Escuchar nuevas cargas
    inputEl.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      procesarArchivoLocal(cfg.tipo, file, infoEl);
    });
  });

  // === Procesar archivo CSV localmente ===
  async function procesarArchivoLocal(tipo, file, infoEl) {
    infoEl.innerHTML = `<p>⏳ Leyendo <strong>${file.name}</strong>...</p>`;
    try {
      const reader = new FileReader();
      reader.onload = e => {
        const contenido = e.target.result;

        // Guardar en localStorage
        const registro = {
          nombreArchivo: file.name,
          tamanoKB: (file.size / 1024).toFixed(1),
          fechaSubida: new Date().toISOString(),
          tipo,
          contenido,
          estado: "listo"
        };

        localStorage.setItem(`data_${tipo}`, JSON.stringify(registro));

        mostrarTarjetaArchivo(infoEl, registro);
        mostrarToast(`✅ Archivo ${tipo} cargado correctamente.`, "exito");
      };
      reader.readAsText(file);
    } catch (err) {
      console.error("❌ Error al procesar archivo:", err);
      infoEl.innerHTML = `<p class="text-danger">❌ Error al procesar ${file.name}</p>`;
      mostrarToast(`Error en ${tipo}: ${err.message}`, "error");
    }
  }

  // === Cargar archivo guardado previamente (desde localStorage) ===
  function cargarArchivoLocal(tipo, infoEl) {
    const saved = localStorage.getItem(`data_${tipo}`);
    if (!saved) {
      infoEl.innerHTML = `<p class="muted">Sin archivos cargados.</p>`;
      return;
    }

    let data;
    try {
      data = JSON.parse(saved);
    } catch (err) {
      console.warn(`⚠️ Error interpretando JSON de ${tipo}, limpiando almacenamiento...`);
      localStorage.removeItem(`data_${tipo}`);
      infoEl.innerHTML = `<p class="text-danger">❌ Archivo corrupto, vuelve a subir ${tipo}.csv</p>`;
      return;
    }

    // Verificar que tenga contenido CSV válido
    if (!data.contenido || typeof data.contenido !== "string") {
      infoEl.innerHTML = `<p class="text-danger">❌ El archivo guardado no es válido.</p>`;
      return;
    }

    mostrarTarjetaArchivo(infoEl, data);
  }


  // === Renderizar tarjeta con info del archivo ===
  function mostrarTarjetaArchivo(infoEl, data) {
    const fecha = new Date(data.fechaSubida).toLocaleString();
    infoEl.innerHTML = `
      <div class="archivo-card">
        <div class="archivo-header">
          <span class="archivo-nombre">📄 ${data.nombreArchivo}</span>
          <span class="archivo-estado ${
            data.estado === "listo" ? "ok" : data.estado === "error" ? "error" : "pendiente"
          }">${data.estado.toUpperCase()}</span>
        </div>
        <div class="archivo-detalles">
          <p><strong>Tamaño:</strong> ${data.tamanoKB} KB</p>
          <p><strong>Fecha:</strong> ${fecha}</p>
        </div>
        <button class="btn-ver" onclick="mostrarPrevisualizacion('${data.tipo}')">
          👁 Ver contenido
        </button>
      </div>
    `;
  }

  // === Procesar archivos (verificar existencia) ===
  function procesarArchivos() {
    mostrarToast("Procesando archivos disponibles...", "alerta");

    const tipos = ["ventas", "clientes", "pedidos"];
    const cargados = tipos.filter(t => localStorage.getItem(`data_${t}`));

    if (cargados.length === 0) {
      mostrarToast("⚠️ No hay archivos cargados aún.", "alerta");
      return;
    }

    console.log("📦 Archivos disponibles:", cargados);
    mostrarToast(`✅ ${cargados.length} archivo(s) disponibles.`, "exito");
  }

  // === Toasts visuales ===
  function mostrarToast(mensaje, tipo = "exito") {
    const toast = document.createElement("div");
    toast.className = `toast-notif toast-${tipo}`;
    toast.innerHTML = `<span class="toast-icon">${
      tipo === "error" ? "❌" : tipo === "alerta" ? "⚠️" : "✅"
    }</span> ${mensaje}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // Exponer función global
  window.procesarArchivos = procesarArchivos;
});

// =========================================
// 👁 PREVISUALIZACIÓN DE CSV (DESDE LOCALSTORAGE)
// =========================================
window.mostrarPrevisualizacion = function (tipo) {
  const saved = localStorage.getItem(`data_${tipo}`);
  if (!saved) {
    alert(`⚠️ No hay archivo guardado para ${tipo}`);
    return;
  }

  const data = JSON.parse(saved);
  const csv = Papa.parse(data.contenido, { header: true, skipEmptyLines: true }).data;
  const filas = csv.slice(0, 10);
  const columnas = Object.keys(filas[0] || {});

  const modal = document.createElement("div");
  modal.className = "modal-previsualizacion";
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Previsualización – ${tipo}.csv</h3>
      <table class="tabla-preview">
        <thead><tr>${columnas.map(c => `<th>${c}</th>`).join("")}</tr></thead>
        <tbody>
          ${filas
            .map(
              fila => `<tr>${columnas
                .map(col => `<td>${fila[col] ?? ""}</td>`)
                .join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
      <button class="btn-cerrar" onclick="this.closest('.modal-previsualizacion').remove()">Cerrar</button>
    </div>
  `;
  document.body.appendChild(modal);
};

// =========================================
// ✅ FIN – reportes_manager.js (versión limpia)
// =========================================
