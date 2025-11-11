// =========================================
// 🔁 INICIO BLOQUE MODIFICADO – reportes_manager.js
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();
  const storage = firebase.storage();

  // === Tipos de archivos disponibles ===
  const tipos = [
    { tipo: "ventas", input: "inputVentas", info: "infoVentas" },
    { tipo: "clientes", input: "inputClientes", info: "infoClientes" },
    { tipo: "pedidos", input: "inputPedidos", info: "infoPedidos" }
  ];

  // === Inicialización de inputs ===
  tipos.forEach(cfg => {
    const inputEl = document.getElementById(cfg.input);
    const infoEl = document.getElementById(cfg.info);

    if (!inputEl || !infoEl) return;

    // Cargar estado actual al iniciar
    cargarUltimoArchivo(cfg.tipo, infoEl);

    // Escuchar subida de archivo
    inputEl.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      subirArchivoFirebase(cfg.tipo, file, infoEl);
    });
  });

  // === Subida a Firebase Storage + Firestore ===
  async function subirArchivoFirebase(tipo, file, infoEl) {
    const storageRef = storage.ref(`reportes/${tipo}.csv`);
    infoEl.innerHTML = `<p>⏳ Subiendo <strong>${file.name}</strong>...</p>`;

    try {
      await storageRef.put(file);
      const url = await storageRef.getDownloadURL();

      const registro = {
        nombreArchivo: file.name,
        tamanoKB: (file.size / 1024).toFixed(1),
        fechaSubida: new Date().toISOString(),
        url,
        tipo
      };

      await db.collection("reportes_datos").doc(tipo).set(registro);

      infoEl.innerHTML = `
        <p><strong>Último archivo:</strong> ${file.name}</p>
        <p><strong>Tamaño:</strong> ${(file.size / 1024).toFixed(1)} KB</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
        <p>✅ Subida completada correctamente.</p>
      `;
      mostrarToast(`Archivo ${tipo} cargado con éxito ✅`, "exito");
    } catch (err) {
      console.error("Error al subir archivo:", err);
      infoEl.innerHTML = `<p class="text-danger">❌ Error al subir ${file.name}</p>`;
      mostrarToast(`Error al subir ${tipo}: ${err.message}`, "error");
    }
  }

  // === Cargar último archivo de Firestore ===
  async function cargarUltimoArchivo(tipo, infoEl) {
    try {
      const doc = await db.collection("reportes_datos").doc(tipo).get();
      if (!doc.exists) {
        infoEl.innerHTML = `<p class="muted">Sin archivos cargados.</p>`;
        return;
      }
      const data = doc.data();
      const fecha = new Date(data.fechaSubida).toLocaleString();
      infoEl.innerHTML = `
        <p><strong>Último archivo:</strong> ${data.nombreArchivo}</p>
        <p><strong>Tamaño:</strong> ${data.tamanoKB} KB</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p>✅ Datos disponibles para el dashboard.</p>
      `;
    } catch (err) {
      console.error("Error leyendo metadatos:", err);
      infoEl.innerHTML = `<p class="text-danger">❌ Error al cargar información.</p>`;
    }
  }

  // === Procesar archivos (solo verifica existencia) ===
  async function procesarArchivos() {
    mostrarToast("Procesando archivos disponibles...", "alerta");

    try {
      const snapshot = await db.collection("reportes_datos").get();
      if (snapshot.empty) {
        mostrarToast("⚠️ No hay archivos cargados aún en Firebase.", "alerta");
        return;
      }
      const archivos = snapshot.docs.map(d => d.data());
      console.log("📦 Archivos disponibles:", archivos);
      mostrarToast(`✅ ${archivos.length} archivo(s) disponibles.`, "exito");
    } catch (err) {
      mostrarToast(`❌ Error al procesar archivos: ${err.message}`, "error");
    }
  }

  // === Toasts reutilizables ===
  function mostrarToast(mensaje, tipo = "exito") {
    const toast = document.createElement("div");
    toast.className = `toast-notif toast-${tipo}`;
    toast.innerHTML = `<span class="toast-icon">${
      tipo === "error" ? "❌" : tipo === "alerta" ? "⚠️" : "✅"
    }</span> ${mensaje}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // Exponer función global (botón “Procesar Datos” en HTML)
  window.procesarArchivos = procesarArchivos;
});

// =========================================
// 🔁 FIN BLOQUE MODIFICADO – reportes_manager.js
// =========================================
