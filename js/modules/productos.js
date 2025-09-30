// productos.js v2.9
$(document).ready(function () {
  // --------- ESTADO ---------
  let originalData = [];
  let filteredData = [];
  let colsMostrar = [];
  let colProcesar = null;

  // --------- SELECTORES CACHÉ ---------
  const $fileInput = $('#excelFile');
  const $colsMostrarDiv = $('#colsMostrar');
  const $colsProcesarDiv = $('#colsProcesar');
  const $btnProcesar = $('#btnProcesar');
  const $progressBar = $('#progressBar');
  const $progressFill = $('#progressBar .progress-bar');
  const $resultadoDiv = $('#resultadoDiv');
  const $tablaResultado = $('#tablaResultado');
  const $alertas = $('#alertas');
  const $tableContainer = $('#tableContainer');

  const $btnAgregarCategoria = $('#btnAgregarCategoria');
  const $btnOrdenarCategorias = $('#btnOrdenarCategorias');
  const $btnVolver = $('#btnVolver');
  const $btnFinalizar = $('#btnFinalizar');

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
    "Sin valor": { tipo: "Categoría", orden: 28 },
    // SubCategorías
    "Circón": { tipo: "SubCategoría", orden: 29 },
    "Anillos de Plata Lisa": { tipo: "SubCategoría", orden: 30 },
    "Anillo Circón": { tipo: "SubCategoría", orden: 31 },
    "Anillo con Micro Circón": { tipo: "SubCategoría", orden: 32 },
    "Anillo Lapidado": { tipo: "SubCategoría", orden: 33 },
    "Anillo Marquesita": { tipo: "SubCategoría", orden: 34 },
    "Anillo Plata con Oro": { tipo: "SubCategoría", orden: 35 },
    "Anillo MIDI Falange": { tipo: "SubCategoría", orden: 36 },
    "Anillos de Compromiso": { tipo: "SubCategoría", orden: 37 },
    "Anillos de Hombres": { tipo: "SubCategoría", orden: 38 },
    "Anillo Piedra Natural": { tipo: "SubCategoría", orden: 39 },
    "Aros de Plata Largos": { tipo: "SubCategoría", orden: 40 },
    "Aros Circón Largo": { tipo: "SubCategoría", orden: 41 },
    "Aros Marquesita": { tipo: "SubCategoría", orden: 42 },
    "Aros de Perla": { tipo: "SubCategoría", orden: 43 },
    "Aros Lapidado": { tipo: "SubCategoría", orden: 44 },
    "Aros Mapuches": { tipo: "SubCategoría", orden: 45 },
    "Aros Swarovski Elements": { tipo: "SubCategoría", orden: 46 },
    "Aro de Plata Pegados": { tipo: "SubCategoría", orden: 47 },
    "Argollas": { tipo: "SubCategoría", orden: 48 },
    "Argollas con Colgantes": { tipo: "SubCategoría", orden: 49 },
    "Aro Circón Pegados": { tipo: "SubCategoría", orden: 50 },
    "Aros Piedra Natural": { tipo: "SubCategoría", orden: 51 },
    "Aros Trepadores y Cuff": { tipo: "SubCategoría", orden: 52 },
    "Piercing": { tipo: "SubCategoría", orden: 53 },
    "Pulsera de Hombre": { tipo: "SubCategoría", orden: 54 },
    "Pulsera de Plata": { tipo: "SubCategoría", orden: 55 },
    "Pulsera Macramé Hilo": { tipo: "SubCategoría", orden: 56 },
    "Pulsera con Piedra": { tipo: "SubCategoría", orden: 57 },
    "Pulsera con Circón": { tipo: "SubCategoría", orden: 58 },
    "Colgante Piedra Natural": { tipo: "SubCategoría", orden: 59 },
    "Colgante Circón": { tipo: "SubCategoría", orden: 60 },
    "Colgantes Lapidado": { tipo: "SubCategoría", orden: 61 },
    "Colgante Cruz": { tipo: "SubCategoría", orden: 62 },
    "Colgantes Niño Niña": { tipo: "SubCategoría", orden: 63 },
    "Colgantes de Placa": { tipo: "SubCategoría", orden: 64 },
    "Colgante Plata Lisa": { tipo: "SubCategoría", orden: 65 },
    "Colgante estilo Charms": { tipo: "SubCategoría", orden: 66 },
    "Colgante de Perla": { tipo: "SubCategoría", orden: 67 },
    "Collares de Piedra": { tipo: "SubCategoría", orden: 68 },
    "Collares de Plata": { tipo: "SubCategoría", orden: 69 },
    "Collares con Circón": { tipo: "SubCategoría", orden: 70 },
    "Enchapado en Oro": { tipo: "SubCategoría", orden: 71 },
    "Enchapado en Plata": { tipo: "SubCategoría", orden: 72 },
    "Sin valor": { tipo: "SubCategoría", orden: 73 },
    "Cadena Groumet": { tipo: "SubCategoría", orden: 74 },
    "Cadena Cartier": { tipo: "SubCategoría", orden: 75 },
    "Cadena Cinta": { tipo: "SubCategoría", orden: 76 },
    "Cadena Esferas": { tipo: "SubCategoría", orden: 77 },
    "Cadena Eslabón": { tipo: "SubCategoría", orden: 78 },
    "Cadena Gucci": { tipo: "SubCategoría", orden: 79 },
    "Cadena Rolo": { tipo: "SubCategoría", orden: 80 },
    "Cadena Singapur": { tipo: "SubCategoría", orden: 81 },
    "Cadena Topo": { tipo: "SubCategoría", orden: 82 },
    "Cadena Topo con Esferas": { tipo: "SubCategoría", orden: 83 },
    "Cadena Tourbillon": { tipo: "SubCategoría", orden: 84 },
    "Cadena Valentino": { tipo: "SubCategoría", orden: 85 },
    "Cadena Veneciana": { tipo: "SubCategoría", orden: 86 }
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
    $btnAgregarCategoria.prop('disabled', disabled);
    $btnOrdenarCategorias.prop('disabled', disabled);
  }

  // --------- LEER EXCEL ---------
  function readExcel(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        showAlert('El archivo Excel está vacío o no se pudo leer.', 'danger');
        return;
      }

      originalData = jsonData;
      filteredData = [...originalData];
      setupColumnSelectors(Object.keys(jsonData[0]));
      renderTablaMostrar();
      updateActionsState();
    };
    reader.readAsArrayBuffer(file);
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

    // Eventos
    $colsMostrarDiv.find('input[type=checkbox]').on('change', () => {
      colsMostrar = $colsMostrarDiv.find('input[type=checkbox]:checked')
        .map(function () { return this.value; })
        .get();
      renderTablaMostrar();
      updateActionsState();
    });

    $colsProcesarDiv.find('input[type=radio]').on('change', () => {
      colProcesar = $colsProcesarDiv.find('input[type=radio]:checked').val() || null;
      updateActionsState();
    });

    colsMostrar = [...columns];
    colProcesar = null;
  }

  // --------- TABLAS ---------
  function renderTablaMostrar() {
    if (filteredData.length === 0) {
      $tableContainer.html('<p>No hay datos para mostrar.</p>').show();
      return;
    }

    let html = '<table class="table table-striped table-bordered"><thead><tr>';
    colsMostrar.forEach(col => html += `<th>${col}</th>`);
    html += '</tr></thead><tbody>';

    filteredData.forEach(row => {
      html += '<tr>';
      colsMostrar.forEach(col => html += `<td>${row[col] || ''}</td>`);
      html += '</tr>';
    });

    html += '</tbody></table>';
    $tableContainer.html(html).show();

    $resultadoDiv.hide();
    $('#columnSelector').show();
    $btnProcesar.show();
  }

  function mostrarPantallaResultado(resultado) {
    $tableContainer.hide().empty();
    $('#columnSelector').hide();
    $btnProcesar.hide();
    $resultadoDiv.show();

    const categoriasPrincipales = ['Joyas de plata por mayor', 'ENCHAPADO'];
    const allCategoriasSet = new Set();
    resultado.forEach(r => r.partes.forEach(p => allCategoriasSet.add(p)));

    const restoCategorias = Array
      .from(allCategoriasSet)
      .filter(cat => !categoriasPrincipales.includes(cat))
      .sort();

    const categoriasUnicas = [
      ...categoriasPrincipales.filter(cat => allCategoriasSet.has(cat)),
      ...restoCategorias
    ];

    let html = '<thead><tr>';
    colsMostrar.forEach(c => html += `<th>${c}</th>`);
    categoriasUnicas.forEach(cat => {
      html += `<th>${cat} <button class="btn btn-sm btn-danger btnEliminarCat" data-cat="${cat}" style="margin-left:5px;">Eliminar</button></th>`;
    });
    html += '</tr></thead><tbody>';

    filteredData.forEach((row, idx) => {
      html += '<tr>';
      colsMostrar.forEach(c => html += `<td>${row[c] || ''}</td>`);
      const categoriasFila = resultado[idx].partes;
      categoriasUnicas.forEach(cat => html += `<td>${categoriasFila.includes(cat) ? 'X' : ''}</td>`);
      html += '</tr>';
    });

    html += '</tbody>';
    $tablaResultado.html(html);

    $('.btnEliminarCat').off('click').on('click', function () {
      eliminarCategoria($(this).data('cat'));
    });
  }

  // --------- PROCESAR ---------
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
    mostrarPantallaResultado(resultado);
  }

  function generarResultadoDesdeDatos() {
    return filteredData.map(row => {
      let partes = (row[colProcesar] || '')
        .toString()
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);
      return { partes: ordenarCategorias(partes) };
    });
  }

  // --------- CATEGORÍAS (acciones) ---------
  function eliminarCategoria(categoria) {
    if (!colProcesar) return;
    filteredData.forEach(row => {
      let cats = (row[colProcesar] || '')
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);
      cats = cats.filter(c => c.toLowerCase() !== categoria.toLowerCase());
      row[colProcesar] = ordenarCategorias(cats).join(', ');
    });
    mostrarPantallaResultado(generarResultadoDesdeDatos());
  }

  function agregarCategoria(categoriaNueva) {
    if (!colProcesar) return;
    filteredData.forEach(row => {
      let cats = (row[colProcesar] || '')
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);
      if (!cats.some(c => c.toLowerCase() === categoriaNueva.toLowerCase())) {
        cats.push(categoriaNueva);
        row[colProcesar] = ordenarCategorias(cats).join(', ');
      }
    });
    mostrarPantallaResultado(generarResultadoDesdeDatos());
  }

  function ordenarTodasLasCategorias() {
    if (!colProcesar) {
      showAlert('Selecciona primero la columna a procesar.', 'danger');
      return;
    }
    filteredData.forEach(row => {
      let cats = (row[colProcesar] || '')
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);
      row[colProcesar] = ordenarCategorias(cats).join(', ');
    });
    mostrarPantallaResultado(generarResultadoDesdeDatos());
    showAlert('Todas las categorías fueron ordenadas correctamente.', 'success');
  }

  // --------- EVENTOS ---------
  $fileInput.on('change', e => {
    const file = e.target.files[0];
    if (file) readExcel(file);
  });

  $btnProcesar.on('click', () => {
    procesarDivision();
  });

  $btnAgregarCategoria.on('click', () => {
    const nuevaCat = prompt('Ingrese la categoría que desea agregar a todos:');
    if (nuevaCat && nuevaCat.trim()) agregarCategoria(nuevaCat.trim());
  });

  $btnOrdenarCategorias.on('click', () => {
    ordenarTodasLasCategorias();
  });

  $btnVolver.on('click', () => {
    $resultadoDiv.hide();
    $('#columnSelector').show();
    $tableContainer.show();
    $btnProcesar.show();
    renderTablaMostrar();
    updateActionsState();
  });

  $btnFinalizar.on('click', () => {
    $resultadoDiv.hide();
    $('#columnSelector').show();
    $tableContainer.show();
    $btnProcesar.show();
    renderTablaMostrar();
    showAlert('Cambios finalizados y aplicados correctamente.', 'success');
    updateActionsState();
  });
});


//v. 1.3