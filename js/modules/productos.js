$(document).ready(function () {
  let originalData = [];
  let filteredData = [];
  let colsMostrar = [];
  let colProcesar = null;

  // Referencias jQuery a contenedores y botones
  const $fileInput = $('#excelFile');
  const $colsMostrarDiv = $('#colsMostrar');
  const $colsProcesarDiv = $('#colsProcesar');
  const $btnProcesar = $('#btnProcesar');
  const $progressBar = $('#progressBar');
  const $progressBarFill = $progressBar.find('.progress-bar');
  const $resultadoDiv = $('#resultadoDiv');
  const $tablaResultado = $('#tablaResultado');
  const $alertas = $('#alertas');

  function showAlert(message, type = 'warning') {
    $alertas.text(message).removeClass('d-none alert-warning alert-danger alert-success')
      .addClass('alert-' + type).show();
    setTimeout(() => {
      $alertas.fadeOut();
    }, 5000);
  }

  function readExcel(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ''});
      if(jsonData.length === 0) {
        showAlert('El archivo Excel está vacío o no se pudo leer.', 'danger');
        return;
      }
      originalData = jsonData;
      filteredData = [...originalData];
      setupColumnSelectors(Object.keys(jsonData[0]));
      renderTablaMostrar();
      $btnProcesar.prop('disabled', true);
    };
    reader.readAsArrayBuffer(file);
  }

  // Prepara checkboxes y radios para columnas
  function setupColumnSelectors(columns) {
    $colsMostrarDiv.empty();
    $colsProcesarDiv.empty();

    columns.forEach(col => {
      // Checkbox para columnas a mostrar
      const idMostrar = 'mostrar_' + col.replace(/\W/g, '');
      const checkbox = $(`<input type="checkbox" id="${idMostrar}" value="${col}" checked>`);
      const label = $(`<label for="${idMostrar}"> ${col}</label><br>`);
      $colsMostrarDiv.append(checkbox).append(label);

      // Radio para columna a procesar (solo uno)
      const idProcesar = 'procesar_' + col.replace(/\W/g, '');
      const radio = $(`<input type="radio" name="colProcesar" id="${idProcesar}" value="${col}">`);
      const labelRadio = $(`<label for="${idProcesar}"> ${col}</label><br>`);
      $colsProcesarDiv.append(radio).append(labelRadio);
    });

    // Eventos para actualizar variables al cambiar selección
    $colsMostrarDiv.find('input[type=checkbox]').on('change', () => {
      colsMostrar = $colsMostrarDiv.find('input[type=checkbox]:checked').map(function() {
        return $(this).val();
      }).get();
      renderTablaMostrar();
      validateProcesarBtn();
    });

    $colsProcesarDiv.find('input[type=radio]').on('change', () => {
      const val = $colsProcesarDiv.find('input[type=radio]:checked').val();
      colProcesar = val || null;
      validateProcesarBtn();
    });

    // Inicializo variables
    colsMostrar = columns.slice();
    colProcesar = null;
  }

  // Habilita boton Procesar si hay al menos una columna para mostrar y una para procesar
  function validateProcesarBtn() {
    $btnProcesar.prop('disabled', !(colsMostrar.length > 0 && colProcesar));
  }

  // Renderiza tabla con columnas seleccionadas para mostrar
  function renderTablaMostrar() {
    if (filteredData.length === 0) {
      $tableContainer.html('<p>No hay datos para mostrar.</p>');
      return;
    }

    let html = '<table id="productosTable" class="table table-striped table-bordered"><thead><tr>';
    colsMostrar.forEach(col => { html += `<th>${col}</th>`; });
    html += '</tr></thead><tbody>';
    filteredData.forEach(row => {
      html += '<tr>';
      colsMostrar.forEach(col => {
        html += `<td>${row[col] || ''}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    $tableContainer.html(html);
  }

  // Función para procesar columna seleccionada: dividir y mostrar resultado con barra progreso
  async function procesarDivision() {
    $btnProcesar.prop('disabled', true);
    $progressBar.show();
    $progressBarFill.css('width', '0%').text('0%');

    // Dividir para cada fila la columna a procesar
    const total = filteredData.length;
    const resultado = [];

    for(let i=0; i < total; i++) {
      const fila = filteredData[i];
      const valor = (fila[colProcesar] || '').toString();
      const partes = valor.split(',').map(p => p.trim()).filter(p => p.length > 0);
      resultado.push({
        filaIndex: i,
        partes
      });

      // Actualizar barra progreso
      const porcentaje = Math.round(((i + 1) / total) * 100);
      $progressBarFill.css('width', porcentaje + '%').text(porcentaje + '%');
      await new Promise(r => setTimeout(r, 5)); // pequeña pausa para visualización fluida
    }

    $progressBar.hide();

    mostrarPantallaResultado(resultado);
  }

  // Muestra pantalla Resultado con tabla final dividida
  function mostrarPantallaResultado(resultado) {
    $('#columnSelector').hide();
    $tableContainer.hide();
    $btnProcesar.hide();

    $resultadoDiv.show();

    // Construir cabecera resultado: columnas a mostrar + columnas divididas
    const allCategoriasSet = new Set();

    resultado.forEach(r => {
      r.partes.forEach(p => allCategoriasSet.add(p));
    });

    const categoriasUnicas = Array.from(allCategoriasSet);

    let html = '<thead><tr>';
    colsMostrar.forEach(c => {
      html += `<th>${c}</th>`;
    });
    categoriasUnicas.forEach(c => {
      html += `<th>${c}</th>`;
    });
    html += '</tr></thead><tbody>';

    filteredData.forEach((row, idx) => {
      html += '<tr>';
      // columnas a mostrar
      colsMostrar.forEach(c => {
        html += `<td>${row[c] || ''}</td>`;
      });

      // columnas divididas: marca con X si esa categoría pertenece a la fila
      const categoriasFila = resultado[idx].partes;
      categoriasUnicas.forEach(cat => {
        html += `<td>${categoriasFila.includes(cat) ? 'X' : ''}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody>';

    $tablaResultado.html(html);
  }

  // Botón Volver reinicia la pantalla
  $('#btnVolver').on('click', () => {
    $resultadoDiv.hide();
    $('#columnSelector').show();
    $tableContainer.show();
    $btnProcesar.show();
    $btnProcesar.prop('disabled', !(colsMostrar.length > 0 && colProcesar));
  });

  // Eventos
  $fileInput.on('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    readExcel(file);
  });

  $btnProcesar.on('click', () => {
    if (!colProcesar) {
      alert('Por favor selecciona una columna a procesar.');
      return;
    }
    procesarDivision();
  });
});


//v. 1.4