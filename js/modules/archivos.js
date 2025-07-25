document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();

  const inputArchivo = document.getElementById("archivoDashboard");
  const infoArchivo = document.getElementById("infoArchivo");
  const tablaPreview = document.getElementById("tablaPreview"); // 👈 un div donde poner la tabla

  if (inputArchivo) {
    inputArchivo.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheets = {};
workbook.SheetNames.forEach(name => {
  const ws = workbook.Sheets[name];

  // Convertir hoja a matriz 2D básica
  const sheet = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });

  // Limitar a las primeras 6 filas
  const limitedSheet = sheet.slice(0, 6);

  // Procesar las celdas combinadas
  if (ws["!merges"]) {
    ws["!merges"].forEach(merge => {
      const startCell = XLSX.utils.encode_cell(merge.s);
      const value = ws[startCell]?.v;

      for (let R = merge.s.r; R <= merge.e.r; ++R) {
        for (let C = merge.s.c; C <= merge.e.c; ++C) {
          // Solo rellenar si está dentro de las filas que nos interesan
          if (R < 6) {
            if (typeof limitedSheet[R] === "undefined") limitedSheet[R] = [];
            if (!limitedSheet[R][C]) {
              limitedSheet[R][C] = value;
            }
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
          fecha: firebase.firestore.Timestamp.fromDate(now),
          data: JSON.stringify(sheets)
        };

        db.collection("dashboard_archivos").add(archivo)
          .then(() => {
            mostrarInfoArchivo({ nombre: archivo.nombre, fecha: nowStr });
            mostrarTabla(sheets); // 👈 muestra tabla recién subida
            console.log("Archivo guardado en Firestore");
          })
          .catch(err => {
            console.error("Error al guardar:", err);
          });
      };
      reader.readAsArrayBuffer(file);
    });

    // Mostrar el último archivo cargado
    db.collection("dashboard_archivos")
      .orderBy("fecha", "desc")
      .limit(1)
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0].data();
          const fecha = doc.fecha.toDate().toLocaleString();
          mostrarInfoArchivo({ nombre: doc.nombre, fecha });

          const sheets = JSON.parse(doc.data); // 👈 parsea el JSON
          mostrarTabla(sheets); // 👈 muestra tabla
        }
      })
      .catch(err => {
        console.error("Error al leer último archivo:", err);
      });
  }

  function mostrarInfoArchivo(archivo) {
    infoArchivo.innerHTML = `
      <p><strong>Último archivo:</strong> ${archivo.nombre}</p>
      <p><strong>Fecha de carga:</strong> ${archivo.fecha}</p>
      <p>El dashboard ya está usando esta información.</p>
    `;
  }

function mostrarTabla(sheets) {
  if (!tablaPreview) return;

  const primeraHoja = Object.keys(sheets)[0];
  const datos = sheets[primeraHoja];

  let html = `<h4>Vista previa: ${primeraHoja}</h4>`;
  html += `<div class="scroll-x"><table border="1"><tbody>`;

  datos.forEach((fila, i) => {
    html += "<tr>";
    fila.forEach(celda => {
      html += i === 0
        ? `<th>${celda ?? ""}</th>`
        : `<td>${celda ?? ""}</td>`;
    });
    html += "</tr>";
  });

  html += `</tbody></table></div>`;

  tablaPreview.innerHTML = html;
}

});

//upd 10-07 v2.2