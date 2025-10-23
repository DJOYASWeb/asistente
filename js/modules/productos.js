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

  function showAlert(message, type = 'warning') {
    $alertas
      .text(message)
      .removeClass('d-none alert-warning alert-danger alert-success')
      .addClass('alert-' + type)
      .show();
    setTimeout(() => $alertas.fadeOut(), 4000);
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
        renderTablaPreview();
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

  // --------- PREVIEW ---------
  function renderTablaPreview() {
    if (filteredData.length === 0) {
      $tableContainer.html('<p>No hay datos para mostrar.</p>').show();
      return;
    }

    const previewLimit = 10;
    const previewData = filteredData.slice(0, previewLimit);

    let html = `<p class="text-muted">Mostrando solo las primeras ${previewLimit} filas de ${filteredData.length} productos cargados.</p>`;
    html += '<table class="table table-striped table-bordered"><thead><tr>';
    colsMostrar.forEach(col => (html += `<th>${col}</th>`));
    html += '</tr></thead><tbody>';

    previewData.forEach(row => {
      html += '<tr>';
      colsMostrar.forEach(col => (html += `<td>${row[col] || ''}</td>`));
      html += '</tr>';
    });

    html += '</tbody></table>';
    $tableContainer.html(html).show();

    $resultadoDiv.hide();
    $('#columnSelector').show();
    $btnProcesar.show();
  }

  // --------- PROCESAR Y SIMPLIFICAR ---------
  async function procesarDivision() {
    if (!colProcesar) {
      showAlert('Por favor selecciona una columna a procesar.', 'danger');
      return;
    }

    $btnProcesar.prop('disabled', true);
    $progressBar.show();
    $progressFill.css('width', '0%').text('0%');

    const total = filteredData.length;
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

    filteredData.forEach((row, i) => {
      row.__categoriasProcesadas = resultado[i].partes;
    });

    mostrarPantallaResultadoSimplificada();
  }

  function mostrarPantallaResultadoSimplificada() {
    $('#columnSelector').hide();
    $tableContainer.hide();
    $resultadoDiv.show();
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

    const modal = new bootstrap.Modal(document.getElementById('modalAjustes'));
    modal.show();
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
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalAjustes'));
    modal.hide();
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
      showAlert('Archivo Excel exportado correctamente.', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Error al exportar el archivo Excel.', 'danger');
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


//v. 1