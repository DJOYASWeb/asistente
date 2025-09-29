
// productos.js
$(document).ready(function () {
  let originalData = [];
  let filteredData = [];
  let selectedColumns = [];
  let dataTableInstance = null;
  
  const $fileInput = $('#excelFile');
  const $columnSelector = $('#columnSelector');
  const $tableContainer = $('#tableContainer');
  const $filterSection = $('#filterSection');
  const $filterInput = $('#filterInput');
  const $btnExport = $('#btnExport');
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
      setupColumnSelector(Object.keys(jsonData[0]));
      $filterSection.removeClass('d-none');
      $btnExport.addClass('d-none');
      renderTable();
    };
    reader.readAsArrayBuffer(file);
  }

  function setupColumnSelector(columns) {
    $columnSelector.empty();
    $columnSelector.append('<p><strong>Selecciona columnas a mostrar:</strong></p>');
    columns.forEach(col => {
      const id = 'col_' + col.replace(/\W/g, '');
      const checkbox = $('<input>', {
        type: 'checkbox',
        id,
        class: 'col-select',
        checked: true,
        value: col,
      });
      const label = $('<label>', {for: id, text: ' ' + col});
      $columnSelector.append(checkbox).append(label).append('<br>');

      checkbox.on('change', () => {
        selectedColumns = $('.col-select:checked').map(function () {return this.value}).get();
        renderTable();
      });
    });
    selectedColumns = [...columns];
  }


function renderTable() {
  console.log('renderTable ejecutado'); // LOG para verificar ejecución

  if (dataTableInstance) {
    dataTableInstance.destroy();
    dataTableInstance = null;
  }
  if (filteredData.length === 0) {
    $tableContainer.html('<p>No hay datos para mostrar.</p>');
    $btnExport.addClass('d-none');
    $('#btnDividirCategorias').remove();
    return;
  }
  const headers = selectedColumns;
  let html = '<table id="productosTable" class="table table-striped table-bordered"><thead><tr>';
  headers.forEach(h => { html += `<th>${h}</th>`; });
  html += '</tr></thead><tbody>';
  filteredData.forEach(row => {
    html += '<tr>';
    headers.forEach(h => {
      html += `<td contenteditable="true" data-col="${h}">${row[h]}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  $tableContainer.html(html);

  dataTableInstance = $('#productosTable').DataTable({
    lengthMenu: [10, 25, 50, 100],
    pageLength: 25,
    scrollX: true,
    columnDefs: [
      { targets: '_all', className: 'dt-head-center dt-body-center' }
    ]
  });
  $btnExport.removeClass('d-none');

  // Añadimos un botón fijo de prueba para ver si se muestra
  if ($('#btnPrueba').length === 0) {
    $tableContainer.append('<button id="btnPrueba" class="btn btn-primary mt-3">BOTÓN DE PRUEBA</button>');
  }
}



  function applyFilter() {
    const filterValue = $filterInput.val().toLowerCase();
    if (!filterValue) {
      filteredData = [...originalData];
    } else {
      filteredData = originalData.filter(row => {
        const cat = (row['Categorías'] || '').toString().toLowerCase();
        return cat.includes(filterValue);
      });
    }
    renderTable();
  }

  function commitTableEdits() {
    // Actualiza filteredData con las modificaciones hechas en celdas contenteditable
    $('#productosTable tbody tr').each(function (rowIndex) {
      const rowData = filteredData[rowIndex];
      $(this).find('td').each(function () {
        const col = $(this).data('col');
        rowData[col] = $(this).text().trim();
      });
    });
  }

  function exportExcel() {
    commitTableEdits();
    // Reconstruir los datos originales con cambios aplicados a fila filtradas
    filteredData.forEach((row, index) => {
      const originalIndex = originalData.findIndex(r => r.ID_Producto === row.ID_Producto);
      if (originalIndex > -1) {
        originalData[originalIndex] = {...row};
      }
    });
    // Crear worksheet
    const ws = XLSX.utils.json_to_sheet(originalData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    const blob = new Blob([wbout], {type:"application/octet-stream"});
    saveAs(blob, "productos_modificado.xlsx");
  }

  // División y selección masiva de Categorías
  function dividirCategoriasYCargarTablaAux(data, columnaCategorias = 'Categorías') {
    // Extraer todas las categorías únicas para generar columnas
    const categoriasSet = new Set();
    data.forEach(row => {
      const cats = (row[columnaCategorias] || '').split(',').map(c => c.trim()).filter(c => c != '');
      cats.forEach(c => categoriasSet.add(c));
    });

    const categoriasUnicas = Array.from(categoriasSet).sort();

    // Crear estructura HTML para la tabla auxiliar con checkboxes para eliminar
    let html = '<div class="mt-3"><p><strong>División y selección masiva de Categorías:</strong></p>';
    html += '<table id="tablaCategoriasAux" class="table table-bordered table-sm">';
    html += '<thead><tr><th>Producto (Nombre)</th>';

    categoriasUnicas.forEach(cat => {
      html += `<th>${cat}</th>`;
    });

    html += '</tr></thead><tbody>';

    data.forEach(row => {
      const cats = (row[columnaCategorias] || '').split(',').map(c => c.trim());
      html += `<tr><td>${row['Nombre'] || ''}</td>`;
      categoriasUnicas.forEach(cat => {
        const tieneCat = cats.includes(cat);
        html += `<td class="text-center">`;
        if(tieneCat) {
          html += `<input type="checkbox" class="elim-cat-check" data-producto="${row['Nombre'] || ''}" data-categoria="${cat}">`;
        } else {
          html += '';
        }
        html += `</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += `<button id="btnProcesarEliminacion" class="btn btn-danger mt-2">Procesar Eliminación de Categorías Seleccionadas</button>`;
    html += '</div>';

    // Añadir debajo de la tabla principal
    $('#tableContainer').after(html);

    $('#btnProcesarEliminacion').on('click', () => {
      procesarEliminacionCategorias(data, categoriasUnicas);
    });
  }

  // Procesar eliminación masiva en Categorías y actualizar tabla principal
  function procesarEliminacionCategorias(data, categoriasUnicas) {
    // Obtener categorías a eliminar por producto
    const categoriasAEliminarPorProducto = {};

    $('.elim-cat-check:checked').each(function() {
      const producto = $(this).data('producto');
      const categoria = $(this).data('categoria');
      if (!categoriasAEliminarPorProducto[producto]) {
        categoriasAEliminarPorProducto[producto] = new Set();
      }
      categoriasAEliminarPorProducto[producto].add(categoria);
    });

    // Actualizar data eliminando categorías seleccionadas
    data.forEach(row => {
      const nombre = row['Nombre'] || '';
      let cats = (row['Categorías'] || '').split(',').map(c => c.trim()).filter(c => c !== '');
      if (categoriasAEliminarPorProducto[nombre]) {
        cats = cats.filter(cat => !categoriasAEliminarPorProducto[nombre].has(cat));
      }
      row['Categorías'] = cats.join(', ');
    });

    // Re-renderizar tabla principal con Categorías actualizadas
    renderTable();

    // Remover tabla auxiliar y botón
    $('#tablaCategoriasAux').parent().remove();

    showAlert('Categorías eliminadas masivamente y tabla actualizada.', 'success');
  }

  // Eventos
  $fileInput.on('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    readExcel(file);
  });

  $filterInput.on('input', () => {
    applyFilter();
  });

  $btnExport.on('click', () => {
    exportExcel();
  });

  // Botón extra para editar categorías masivamente (original)
  $columnSelector.append(`
    <button id="btnEditMasivo" class="btn btn-warning mt-3">Editar Categorías Masivamente</button>
  `);
  $('#btnEditMasivo').on('click', () => {
    editCategoriasMasivo();
  });

  // Función original para edición masiva rápida por texto (deje para compatibilidad)
  function editCategoriasMasivo() {
    const buscarTxt = prompt("Ingrese texto a buscar en Categorías:");
    if (!buscarTxt) return;
    const elimSi = confirm(`¿Desea eliminar el texto "${buscarTxt}" de todas las Categorías? \n(Si: eliminar, No: agregar)`);
    commitTableEdits();
    filteredData.forEach(row => {
      let cat = row['Categorías'] || '';
      if (elimSi) {
        const regex = new RegExp(buscarTxt, 'gi');
        cat = cat.replace(regex, '').replace(/(,\s*){2,}/g, ', ').trim();
        cat = cat.replace(/(^,)|(,$)/g, '').trim();
      } else {
        if (cat.toLowerCase().indexOf(buscarTxt.toLowerCase()) === -1) {
          if (cat) cat += ', ';
          cat += buscarTxt;
        }
      }
      row['Categorías'] = cat;
    });
    renderTable();
  }
});


//v. 1.2