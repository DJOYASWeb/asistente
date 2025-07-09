
// ----------------------
// CARGA DE ARCHIVO EXCEL (.xlsx)
// ----------------------

let datosPDV = [];

document.getElementById("archivoExcel").addEventListener("change", function (e) {
  const archivo = e.target.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = function (event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const nombreHoja = workbook.SheetNames[0];
    const hoja = workbook.Sheets[nombreHoja];

    // Leer como array desde la hoja (sin interpretar encabezados)
    const opciones = { header: 1, defval: "" };
    const datosCrudos = XLSX.utils.sheet_to_json(hoja, opciones);

    // Fila 3 = índice 2 (encabezados), datos desde fila 4 en adelante
    const encabezados = datosCrudos[2];
    const filas = datosCrudos.slice(3);

    datosPDV = filas.map(fila => {
      const obj = {};
      encabezados.forEach((col, i) => {
        obj[col.trim()] = fila[i] || "";
      });
      return obj;
    });

    document.getElementById("archivoCargado").textContent = `Archivo cargado: ${archivo.name}`;
    console.log("Datos cargados:", datosPDV);
  };

  lector.readAsArrayBuffer(archivo);
});

// ----------------------
// BÚSQUEDA POR CÓDIGO
// ----------------------

function buscarCodigo() {
  const codigoBuscado = document.getElementById("buscadorPDV").value.trim().toLowerCase();
  const contenedor = document.getElementById("resultadoPDV");
  contenedor.innerHTML = "";
  if (!codigoBuscado || datosPDV.length === 0) return;

const producto = datosPDV.find(p => (p["Código"] || "").trim().toLowerCase() === codigoBuscado);


  if (!producto) {
    contenedor.innerHTML = "<p style='padding:10px; color:#555;'>No se encontró el producto.</p>";
    return;
  }

  const columnas = {
    "Código Producto *": "Código",
    "Modelo Producto": "Modelo",
    "PrestaShop ID": "ID Producto",
    "Nombre Producto *": "Nombre Producto",
    "Precio Tienda": "Precio Tienda Con IVA",
    "Precio PrestaShop": "Precio WEB Con IVA",
    "Material": "Material",
    "Tipo *": "CATEG. PRINCIPAL",
    "Subtipo": "SUBCATEGORIA",
    "Combinación": "Combinaciones",
    "Dimensión": "Dimensión",
    "Peso (gr)": "Peso",
    "Descripción Resumen": "Resumen",
    "Estilo": "Estilo",
    "Descripción Extensa": "Descripción",
    "Caja": "Caja",
    "Número Bolsa": "Código De Bolsa",
    "Cantidad Original": "INGRESO BODEGA",
    "Cantidad Ideal": "",
    "Cantidad Crítica": "",
    "Foto Link Individual": "URL de Producto"
  };

  const tabla = document.createElement("table");
  tabla.classList.add("tabla-pdv");

  for (const [etiqueta, campo] of Object.entries(columnas)) {
    const fila = document.createElement("tr");
    const celda1 = document.createElement("td");
    const celda2 = document.createElement("td");
    const celda3 = document.createElement("td");

    celda1.textContent = etiqueta;

    let valor = "";
    if (campo === "") valor = "";
    else valor = (producto[campo] || "").toString().trim();

    celda2.textContent = valor;

    const btnCopiar = document.createElement("button");
    btnCopiar.textContent = "Copiar";
    btnCopiar.className = "copiar-btn";
    btnCopiar.onclick = () => {
      navigator.clipboard.writeText(valor);
      btnCopiar.textContent = "Copiado!";
      setTimeout(() => btnCopiar.textContent = "Copiar", 1000);
    };

    celda3.appendChild(btnCopiar);

    fila.appendChild(celda1);
    fila.appendChild(celda2);
    fila.appendChild(celda3);
    tabla.appendChild(fila);
  }

  contenedor.appendChild(tabla);
}

function mostrarTodosLosCodigos() {
  const lista = datosPDV.map(p => p["Código"]).filter(c => c).join("\n");
   alert("Primeros códigos:\n" + lista.substring(0, 300));
}


// poye