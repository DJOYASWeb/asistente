// productos.js v3.5
$(document).ready(function () {
  // --------- ESTADO ---------
  let originalData = [];
  let filteredData = [];
  let colsMostrar = [];
  let colProcesar = null;

  // --------- SELECTORES ---------
  const $fileInput = $('#excelFile');
  const $colsMostrarDiv = $('#colsMostrar');
  const $colsProcesarDiv = $('#colsProcesar');
  const $btnProcesar = $('#btnProcesar');
  const $progressBar = $('#progressBar');
  const $progressFill = $('#progressBar .progress-bar');
  const $resultadoDiv = $('#resultadoDiv');
  const $alertas = $('#alertas');
  const $tableContainer = $('#tableContainer');
  const $btnExportar = $('#btnExportar');

  // --------- ORDEN DE CATEGORÍAS ---------
  const tipoOrden = {
    "Joyas de plata por mayor": { tipo: "Principal", orden: 1 },
    "ENCHAPADO": { tipo: "Principal", orden: 2 },
    "Accesorios": { tipo: "Principal", orden: 3 },
    "Insumos": { tipo: "Categoría", orden: 4 },
    "Anillos de Plata": { tipo: "Categoría", orden: 5 },
    "Aros de Plata": { tipo: "Categoría", orden: 6 },
    "Pulseras de Plata": { tipo: "Categoría", orden: 7 },
    "Conjuntos de Plata": { tipo: "Categoría", orden: 8 },
    "Colgantes de Plata": { tipo: "Categoría", orden: 9 },
    "Cadenas de Plata": { tipo: "Categoría", orden: 10 },
    "Infantil Plata": { tipo: "Categoría", orden: 11 },
    "Collares de Plata": { tipo: "Categoría", orden: 12 },
    "Tobilleras de Plata": { tipo: "Categoría", orden: 13 },
    "Swarovski Elements": { tipo: "Categoría", orden: 14 },
    "Hombre": { tipo: "Categoría", orden: 15 },
    "Pack de Joyas": { tipo: "Categoría", orden: 16 },
    "Insumos de Plata": { tipo: "Categoría", orden: 17 },
    "Aros Enchapado": { tipo: "Categoría", orden: 18 },
    "Anillos Enchapado": { tipo: "Categoría", orden: 19 },
    "Pulseras Enchapado": { tipo: "Categoría", orden: 20 },
    "Cadenas Enchapado": { tipo: "Categoría", orden: 21 },
    "Colgantes Enchapado": { tipo: "Categoría", orden: 22 },
    "Infantil enchapado": { tipo: "Categoría", orden: 23 },
    "Collares Enchapado": { tipo: "Categoría", orden: 24 },
    "Conjuntos Enchapado": { tipo: "Categoría", orden: 25 },
    "Tobilleras Enchapado": { tipo: "Categoría", orden: 26 },
    "Insumos Enchapados": { tipo: "Categoría", orden: 27 },
    "Sin valor": { tipo: "Categoría", orden: 28 }
  };

  // --------- HELPERS ---------
  function ordenarCategorias(categorias) {
    return categorias.sort((a, b) => {
      const aInfo = tipoOrden[a] || { orden: 9999 };
      const bInfo = tipoOrden[b] || { orden: 9999 };
      return aInfo.orden - bInfo.orden;
    });
  }

function showAlert(message, type = 'info') {
  // Adaptar el tipo al sistema de notificaciones DJOYAS
  let estado = 'exito';
  if (type === 'danger' || type === 'error') estado = 'error';
  if (type === 'warning' || type === 'alert') estado = 'alerta';
  mostrarNotificacion(message, estado);
}

  function updateActionsState() {
    const disabled = !(colsMostrar.length > 0 && colProcesar);
    $btnProcesar.prop('disabled', disabled);
  }

  // --------- LEER EXCEL/CSV (con Worker) ---------
  function readExcel(file) {
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith(".csv");
    const reader = new FileReader();

    reader.onload = function (e) {
      let fileData = isCSV ? e.target.result : new Uint8Array(e.target.result);
      const worker = new Worker("js/modules/excelWorker.js");
      worker.postMessage({ fileData, isCSV });

      worker.onmessage = function (msg) {
        if (!msg.data.success) {
          showAlert("Error procesando archivo: " + msg.data.error, "danger");
          return;
        }

        const jsonData = msg.data.data;
        if (jsonData.length === 0) {
          showAlert("El archivo está vacío o no se pudo leer.", "danger");
          return;
        }

        originalData = jsonData;
        filteredData = [...originalData];
        setupColumnSelectors(Object.keys(jsonData[0]));
        updateActionsState();
      };
    };

    if (isCSV) reader.readAsText(file, "UTF-8");
    else reader.readAsArrayBuffer(file);
  }

  // --------- COLUMNAS ---------
  function setupColumnSelectors(columns) {
    $colsMostrarDiv.empty();
    $colsProcesarDiv.empty();

    columns.forEach(col => {
      const idMostrar = 'mostrar_' + col.replace(/\W/g, '');
      $colsMostrarDiv.append(`<input type="checkbox" id="${idMostrar}" value="${col}" checked>`);
      $colsMostrarDiv.append(`<label for="${idMostrar}"> ${col}</label><br>`);

      const idProcesar = 'procesar_' + col.replace(/\W/g, '');
      $colsProcesarDiv.append(`<input type="radio" name="colProcesar" id="${idProcesar}" value="${col}">`);
      $colsProcesarDiv.append(`<label for="${idProcesar}"> ${col}</label><br>`);
    });

    $colsMostrarDiv.find('input[type=checkbox]').on('change', () => {
      colsMostrar = $colsMostrarDiv.find('input[type=checkbox]:checked')
        .map(function () { return this.value; })
        .get();
      renderTablaPreview();
      updateActionsState();
    });

    $colsProcesarDiv.find('input[type=radio]').on('change', () => {
      colProcesar = $colsProcesarDiv.find('input[type=radio]:checked').val() || null;
      updateActionsState();
    });

    colsMostrar = [...columns];
    colProcesar = null;
  }

  // --------- PROCESAR Y SIMPLIFICAR ---------
async function procesarDivision() {
  if (!colProcesar) {
    mostrarNotificacion('Por favor selecciona una columna a procesar.', 'error');
    return;
  }

  // 🔹 Ocultar todo lo anterior
  $('#excelFile').closest('.formulario').hide();
  $('#columnSelector').hide();
  $tableContainer.hide();
  $progressBar.show();
  $progressFill.css('width', '0%').text('0%');

  // 🔹 Procesamos solo los primeros 10 productos
  const limit = 10;
  const total = Math.min(filteredData.length, limit);
  const resultado = [];

  for (let i = 0; i < total; i++) {
    let partes = (filteredData[i][colProcesar] || '')
      .toString()
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
    partes = ordenarCategorias(partes);
    resultado.push({ partes });
    const porcentaje = Math.round(((i + 1) / total) * 100);
    $progressFill.css('width', porcentaje + '%').text(porcentaje + '%');
    await new Promise(r => setTimeout(r, 5));
  }

  $progressBar.hide();

  // Guardamos categorías procesadas
  filteredData.slice(0, total).forEach((row, i) => {
    row.__categoriasProcesadas = resultado[i].partes;
  });

  // 🔹 Mostrar solo en la segunda pantalla
  mostrarPantallaResultadoSimplificada(total);
}



function mostrarPantallaResultadoSimplificada(limit) {
  // Limpiamos pantalla y mostramos resultado
  $resultadoDiv.show().html('');

  // 🔹 Encabezado
  let html = `
    <div class="d-flex flex-wrap gap-2 mb-3">
      <button id="btnOrdenarCategorias" class="btn btn-info">Ordenar Categorías</button>
      <button id="btnAjustes" class="btn btn-secondary">Ajustes</button>
      <button id="btnVolver" class="btn btn-outline-secondary ms-auto">Volver atrás</button>
      <button id="btnExportar" class="btn btn-primary">Exportar Excel</button>
    </div>

    <div id="mensajeProcesado" class="alert alert-light">
      Se procesaron ${limit} productos de vista previa. Usa los botones para aplicar ajustes o exportar el archivo.
    </div>

    <div class="table-responsive mt-3">
      <table class="table table-bordered table-sm">
        <thead><tr>`;

  colsMostrar.forEach(c => { html += `<th>${c}</th>`; });
  html += `</tr></thead><tbody>`;

  filteredData.slice(0, limit).forEach(row => {
    html += '<tr>';
    colsMostrar.forEach(c => { html += `<td>${row[c] || ''}</td>`; });
    html += '</tr>';
  });

  html += `</tbody></table></div>`;

  $resultadoDiv.html(html);

  // 🔹 Notificación de confirmación
  mostrarNotificacion('Vista previa generada correctamente.', 'exito');

  // --- EVENTOS DE BOTONES ---
  $('#btnVolver').on('click', () => {
    $resultadoDiv.hide();
    $('#excelFile').closest('.formulario').show();
    $('#columnSelector').show();
    $tableContainer.hide();
    mostrarNotificacion('Has vuelto al inicio.', 'alerta');
  });

  $('#btnExportar').on('click', () => {
    if (!filteredData || filteredData.length === 0) {
      mostrarNotificacion('No hay datos para exportar.', 'error');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filteredData);
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');

      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Productos_DJOYAS_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
      mostrarNotificacion('Archivo Excel exportado correctamente.', 'exito');
    } catch (err) {
      console.error(err);
      mostrarNotificacion('Error al exportar el archivo Excel.', 'error');
    }
  });
}



  // --------- ORDENAR CATEGORÍAS ---------
  $('#btnOrdenarCategorias').on('click', () => {
    filteredData.forEach(row => {
      let cats = row.__categoriasProcesadas || [];
      cats = ordenarCategorias(cats);
      row.__categoriasProcesadas = cats;
      row[colProcesar] = cats.join(', ');
    });
    showAlert('Categorías ordenadas correctamente.', 'success');
  });

  // --------- AJUSTES (MODAL) ---------
  $('#btnAjustes').on('click', () => {
    const allCats = new Set();
    filteredData.forEach(r => (r.__categoriasProcesadas || []).forEach(c => allCats.add(c)));

    const $contenedor = $('#contenedorCategorias');
    $contenedor.empty();

    Array.from(allCats).sort().forEach(cat => {
      const btn = $(`
        <button class="btn btn-outline-secondary btn-sm categoria-btn" data-cat="${cat}">
          ${cat} <i class="fa-solid fa-xmark"></i>
        </button>
      `);
      $contenedor.append(btn);
    });

    $('.categoria-btn').on('click', function () {
      $(this).toggleClass('btn-outline-danger').toggleClass('btn-outline-secondary');
    });

openModalAjustes();
  });

  // --------- APLICAR AJUSTES ---------
  $('#btnAplicarAjustes').on('click', () => {
    const eliminadas = [];
    $('.categoria-btn.btn-outline-danger').each(function () {
      eliminadas.push($(this).data('cat'));
    });

    if (eliminadas.length === 0) {
      showAlert('No seleccionaste ninguna categoría para eliminar.', 'warning');
      return;
    }

    filteredData.forEach(row => {
      let cats = row.__categoriasProcesadas || [];
      cats = cats.filter(c => !eliminadas.includes(c));
      row[colProcesar] = cats.join(', ');
      row.__categoriasProcesadas = cats;
    });

    showAlert(`Se eliminaron ${eliminadas.length} categorías seleccionadas.`, 'success');
closeModalAjustes();
  });

  // --------- EXPORTAR EXCEL ---------
  $('#btnExportar').on('click', () => {
    if (!filteredData || filteredData.length === 0) {
      showAlert('No hay datos para exportar.', 'danger');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filteredData);
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');

      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Productos_DJOYAS_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);

  mostrarNotificacion('Archivo Excel exportado correctamente.', 'exito');
  } catch (err) {
    console.error(err);
    mostrarNotificacion('Error al exportar el archivo Excel.', 'error');
  }
  });

  // --------- EVENTOS ---------
  $fileInput.on('change', e => {
    const file = e.target.files[0];
    if (file) {
      $btnExportar.addClass('d-none');
      readExcel(file);
    }
  });

  $btnProcesar.on('click', () => procesarDivision());
});

function openModalAjustes() {
  document.getElementById('modalAjustes').style.display = 'flex';
}

function closeModalAjustes() {
  document.getElementById('modalAjustes').style.display = 'none';
}

//v. 1.6