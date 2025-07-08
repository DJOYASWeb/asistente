document.addEventListener("DOMContentLoaded", () => {
  const inputArchivo = document.getElementById("archivoDashboard");
  const infoArchivo = document.getElementById("infoArchivo");

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
          const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
          sheets[name] = sheet;
        });

        const now = new Date().toLocaleString();

        const archivo = {
          nombre: file.name,
          fecha: now,
          datos: sheets
        };

        // Guarda en localStorage
        localStorage.setItem("dashboardData", JSON.stringify(archivo));

        mostrarInfoArchivo(archivo);
      };
      reader.readAsArrayBuffer(file);
    });

    // Mostrar estado actual si existe
    const previo = localStorage.getItem("dashboardData");
    if (previo) {
      mostrarInfoArchivo(JSON.parse(previo));
    }
  }

  function mostrarInfoArchivo(archivo) {
    infoArchivo.innerHTML = `
      <p><strong>Archivo actual:</strong> ${archivo.nombre}</p>
      <p><strong>Fecha de carga:</strong> ${archivo.fecha}</p>
      <p>El dashboard ya está usando esta información.</p>
    `;
  }
});
