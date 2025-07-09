document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();

  const inputArchivo = document.getElementById("archivoDashboard");
  const infoArchivo = document.getElementById("infoArchivo");
  const btnDescargar = document.getElementById("descargarNormalizado");

  if (!inputArchivo) return;

  let ultimaDataNormalizada = null; // para descargar después

  inputArchivo.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, { type: "array", cellStyles: true });

      const sheets = {};
      workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        normalizarCeldasCombinadas(sheet);
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const primeras6 = sheetData.slice(0, 6);
        sheets[name] = primeras6;
      });

      ultimaDataNormalizada = sheets;

      const now = new Date();
      const nowStr = now.toLocaleString();

const archivo = {
  nombre: file.name,
  fecha: firebase.firestore.Timestamp.fromDate(now),
  data: JSON.stringify(sheets)  // <<--- aquí
};

      db.collection("dashboard_archivos").add(archivo)
        .then(() => {
          mostrarInfoArchivo({ nombre: archivo.nombre, fecha: nowStr });
          console.log("Archivo normalizado y guardado en Firestore");
        })
        .catch(err => {
          console.error("Error al guardar:", err);
        });
    };
    reader.readAsArrayBuffer(file);
  });

  db.collection("dashboard_archivos")
    .orderBy("fecha", "desc")
    .limit(1)
    .get()
    .then(snapshot => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0].data();
        const fecha = doc.fecha.toDate().toLocaleString();
        mostrarInfoArchivo({ nombre: doc.nombre, fecha });
      }
    })
    .catch(err => {
      console.error("Error al leer último archivo:", err);
    });

  function mostrarInfoArchivo(archivo) {
    infoArchivo.innerHTML = `
      <p><strong>Último archivo:</strong> ${archivo.nombre}</p>
      <p><strong>Fecha de carga:</strong> ${archivo.fecha}</p>
      <p>El dashboard ya está usando esta información.</p>
    `;
  }

  function normalizarCeldasCombinadas(sheet) {
    if (!sheet["!merges"]) return;

    sheet["!merges"].forEach(merge => {
      const start = XLSX.utils.encode_cell(merge.s);
      const valor = sheet[start] ? sheet[start].v : "";
      for (let R = merge.s.r; R <= merge.e.r; ++R) {
        for (let C = merge.s.c; C <= merge.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!sheet[cellRef]) sheet[cellRef] = {};
          sheet[cellRef].v = valor;
          sheet[cellRef].t = typeof valor === "number" ? "n" : "s";
        }
      }
    });
    delete sheet["!merges"];
  }

  // Botón para descargar última normalizada
  if (btnDescargar) {
    btnDescargar.addEventListener("click", () => {
      if (!ultimaDataNormalizada) {
        alert("Primero carga un archivo.");
        return;
      }
      const wb = XLSX.utils.book_new();
      Object.keys(ultimaDataNormalizada).forEach(name => {
        const ws = XLSX.utils.aoa_to_sheet(ultimaDataNormalizada[name]);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
      XLSX.writeFile(wb, "archivo_normalizado.xlsx");
    });
  }
});

//upd 09-07 v1.5