// =========================================
// reportes_manager.js
// Version: replicado de dashboard_archivos (tres datasets)
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();

  // === Configuración de inputs ===
  const configuraciones = [
    { tipo: "ventas", input: "inputVentas", info: "infoVentas" },
    { tipo: "clientes", input: "inputClientes", info: "infoClientes" },
    { tipo: "pedidos", input: "inputPedidos", info: "infoPedidos" }
  ];

  configuraciones.forEach(cfg => {
    const inputEl = document.getElementById(cfg.input);
    const infoEl = document.getElementById(cfg.info);

    if (!inputEl || !infoEl) return;

    // Cargar el último archivo al iniciar
    cargarUltimoArchivo(cfg.tipo, infoEl);

    // Evento de subida
    inputEl.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      procesarArchivo(cfg.tipo, file, infoEl);
    });
  });

  // === Procesamiento general ===
  function procesarArchivo(tipo, file, infoEl) {
    const reader = new FileReader();
    reader.onload = ev => {
      const data = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheets = {};
      workbook.SheetNames.forEach(name => {
        const ws = workbook.Sheets[name];
        const sheet = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
        const limitedSheet = sheet.slice(0, 6);

        if (ws["!merges"]) {
          ws["!merges"].forEach(merge => {
            const startCell = XLSX.utils.encode_cell(merge.s);
            const value = ws[startCell]?.v;
            for (let R = merge.s.r; R <= merge.e.r; ++R) {
              for (let C = merge.s.c; C <= merge.e.c; ++C) {
                if (R < 6) {
                  if (!limitedSheet[R]) limitedSheet[R] = [];
                  if (!limitedSheet[R][C]) limitedSheet[R][C] = value;
                }
              }
            }
          });
        }

        sheets[name] = limitedSheet;
      });

      const now = new Date();
      const nowStr = now.toLocaleString();

      const archivo = {
        nombre: file.name,
        tipo,
        fecha: firebase.firestore.Timestamp.fromDate(now),
        data: JSON.stringify(sheets)
      };

      db.collection("reportes_" + tipo)
        .add(archivo)
        .then(() => {
          mostrarInfoArchivo(infoEl, { nombre: archivo.nombre, fecha: nowStr });
          console.log(`✅ Archivo de ${tipo} guardado en Firestore`);
        })
        .catch(err => console.error(`Error guardando ${tipo}:`, err));
    };
    reader.readAsArrayBuffer(file);
  }

  // === Cargar último archivo ===
  function cargarUltimoArchivo(tipo, infoEl) {
    db.collection("reportes_" + tipo)
      .orderBy("fecha", "desc")
      .limit(1)
      .get()
      .then(snapshot => {
        if (snapshot.empty) {
          infoEl.innerHTML = `<p class="muted">Sin archivos cargados.</p>`;
          return;
        }
        const doc = snapshot.docs[0].data();
        const fecha = doc.fecha.toDate().toLocaleString();
        mostrarInfoArchivo(infoEl, { nombre: doc.nombre, fecha });
      })
      .catch(err => console.error(`Error leyendo ${tipo}:`, err));
  }

  // === UI Info ===
  function mostrarInfoArchivo(el, archivo) {
    el.innerHTML = `
      <p><strong>Último archivo:</strong> ${archivo.nombre}</p>
      <p><strong>Fecha de carga:</strong> ${archivo.fecha}</p>
      <p>✅ El dashboard está usando esta información.</p>
    `;
  }
});
