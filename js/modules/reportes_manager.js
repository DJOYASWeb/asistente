// =========================================
// reportes_manager.js
// Maneja la subida y lectura de CSVs (Ventas / Clientes / Pedidos)
// =========================================

// Subir archivo CSV a Firebase Storage y guardar metadatos en Firestore
async function subirArchivoCSV(tipo, archivo) {
  if (!archivo) return mostrarToast(`⚠️ No se seleccionó archivo para ${tipo}`, "alerta");

  const reader = new FileReader();

  reader.onload = async (e) => {
    const contenido = e.target.result;
    const storageRef = firebase.storage().ref(`reportes/${tipo.toLowerCase()}.csv`);

    try {
      // Subir o reemplazar archivo existente
      await storageRef.putString(contenido);
      const url = await storageRef.getDownloadURL();

      // Guardar metadatos en Firestore
      await firebase.firestore()
        .collection("reportes_datos")
        .doc(tipo.toLowerCase())
        .set({
          nombreArchivo: archivo.name,
          tamanoKB: (archivo.size / 1024).toFixed(1),
          fechaSubida: new Date().toISOString(),
          url,
          tipo
        });

      mostrarToast(`✅ ${tipo} cargado correctamente`, "exito");
    } catch (error) {
      console.error(error);
      mostrarToast(`❌ Error al subir ${tipo}: ${error.message}`, "error");
    }
  };

  reader.readAsText(archivo);
}

// Descargar y leer CSV desde Firebase Storage
async function obtenerCSVDesdeFirebase(tipo) {
  try {
    const doc = await firebase.firestore()
      .collection("reportes_datos")
      .doc(tipo.toLowerCase())
      .get();

    if (!doc.exists) {
      mostrarToast(`⚠️ No se encontró archivo para ${tipo}`, "alerta");
      return null;
    }

    const { url } = doc.data();
    const response = await fetch(url);
    const csv = await response.text();

    mostrarToast(`📦 ${tipo} descargado desde Firebase`, "exito");
    return csv;
  } catch (error) {
    console.error(error);
    mostrarToast(`❌ Error al leer ${tipo}: ${error.message}`, "error");
    return null;
  }
}

// Vincular inputs de Configuración
function inicializarCargadoresCSV() {
  const tipos = ["Ventas", "Clientes", "Pedidos"];

  tipos.forEach(tipo => {
    const input = document.getElementById(`input${tipo}`);
    if (!input) return;

    input.addEventListener("change", () => {
      const archivo = input.files[0];
      if (archivo) subirArchivoCSV(tipo, archivo);
    });
  });
}

document.addEventListener("DOMContentLoaded", inicializarCargadoresCSV);

// Toast visual
function mostrarToast(mensaje, tipo = "exito") {
  const toast = document.createElement("div");
  toast.className = `toast-notif toast-${tipo}`;
  toast.innerHTML = `
    <span class="toast-icon">${
      tipo === "error" ? "❌" :
      tipo === "alerta" ? "⚠️" : "✅"
    }</span> ${mensaje}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
