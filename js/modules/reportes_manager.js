// =========================================
// ✅ VERSIÓN CORREGIDA SIN STORAGE – reportes_manager.js (Fase 2 Final)
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();

  // === Configuración de inputs ===
  const tipos = [
    { tipo: "ventas", input: "inputVentas", info: "infoVentas" },
    { tipo: "clientes", input: "inputClientes", info: "infoClientes" },
    { tipo: "pedidos", input: "inputPedidos", info: "infoPedidos" }
  ];

  // Vincular inputs
  tipos.forEach(cfg => {
    const inputEl = document.getElementById(cfg.input);
    const infoEl = document.getElementById(cfg.info);
    if (!inputEl || !infoEl) return;

    cargarUltimoArchivo(cfg.tipo, infoEl);

    inputEl.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      subirArchivoFirestore(cfg.tipo, file, infoEl);
    });
  });

  // === Subida directa a Firestore (sin Storage) ===
  async function subirArchivoFirestore(tipo, file, infoEl) {
    infoEl.innerHTML = `<p>⏳ Procesando <strong>${file.name}</strong>...</p>`;
    try {
      const reader = new FileReader();
      reader.onload = async ev => {
        const contenido = ev.target.result;

        const registro = {
          nombreArchivo: file.name,
          tamanoKB: (file.size / 1024).toFixed(1),
          fechaSubida: new Date().toISOString(),
          tipo,
          contenido, // Guardamos el CSV directamente como texto
          estado: "listo"
        };

        await db.collection("reportes_datos").doc(tipo).set(registro);

        mostrarTarjetaArchivo(infoEl, registro);
        mostrarToast(`✅ Archivo ${tipo} cargado correctamente.`, "exito");
      };
      reader.readAsText(file);
    } catch (err) {
      console.error("❌ Error al subir archivo:", err);
      infoEl.innerHTML = `<p class="text-danger">❌ Error al subir ${file.name}</p>`;
      mostrarToast(`Error al subir ${tipo}: ${err.message}`, "error");
    }
  }

  // === Cargar último archivo guardado en Firestore ===
  async function cargarUltimoArchivo(tipo, infoEl) {
    try {
      const doc = await db.collection("reportes_datos").doc(tipo).get();
      if (!doc.exists) {
        infoEl.innerHTML = `<p class="muted">Sin archivos cargados.</p>`;
        return;
      }
      mostrarTarjetaArchivo(infoEl, doc.data());
    } catch (err) {
      console.error("❌ Error leyendo archivo:", err);
      infoEl.innerHTML = `<p class="text-danger">Error al cargar información.</p>`;
    }
  }

  // === Renderizar tarjeta con info de archivo ===
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

  // === Procesar archivos disponibles ===
  async function procesarArchivos() {
    mostrarToast("Procesando archivos disponibles...", "alerta");
    try {
      const snapshot = await db.collection("reportes_datos").get();
      if (snapshot.empty) {
        mostrarToast("⚠️ No hay archivos cargados aún en Firestore.", "alerta");
        return;
      }
      const archivos = snapshot.docs.map(d => d.data());
      console.log("📦 Archivos disponibles:", archivos);
      mostrarToast(`✅ ${archivos.length} archivo(s) listos.`, "exito");
    } catch (err) {
      mostrarToast(`❌ Error al procesar archivos: ${err.message}`, "error");
    }
  }

  // === Toasts (notificaciones visuales) ===
  function mostrarToast(mensaje, tipo = "exito") {
    const toast = document.createElement("div");
    toast.className = `toast-notif toast-${tipo}`;
    toast.innerHTML = `<span class="toast-icon">${
      tipo === "error" ? "❌" : tipo === "alerta" ? "⚠️" : "✅"
    }</span> ${mensaje}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // Exponer función global para botón HTML
  window.procesarArchivos = procesarArchivos;
});

// === Previsualización del CSV desde Firestore ===
window.mostrarPrevisualizacion = async function (tipo) {
  try {
    const doc = await firebase.firestore().collection("reportes_datos").doc(tipo).get();
    if (!doc.exists) {
      alert("⚠️ No hay archivo guardado para " + tipo);
      return;
    }

    const contenido = doc.data().contenido;
    const data = Papa.parse(contenido, { header: true, skipEmptyLines: true }).data;
    const primerasFilas = data.slice(0, 10);
    const columnas = Object.keys(primerasFilas[0] || {});

    const modal = document.createElement("div");
    modal.className = "modal-previsualizacion";
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Previsualización – ${tipo}.csv</h3>
        <table class="tabla-preview">
          <thead><tr>${columnas.map(c => `<th>${c}</th>`).join("")}</tr></thead>
          <tbody>
            ${primerasFilas
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
  } catch (err) {
    console.error("❌ Error en previsualización:", err);
    alert("No se pudo cargar la previsualización.");
  }
};

// =========================================
// 🔁 FIN BLOQUE CORREGIDO – reportes_manager.js (Fase 2 Final)
// =========================================
