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
    if (dataTableInstance) {
      dataTableInstance.destroy();
    }
    if (filteredData.length === 0) {
      $tableContainer.html('<p>No hay datos para mostrar.</p>');
      $btnExport.addClass('d-none');
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

  // Busqueda/agregado/eliminacion masiva en Categorías
  function editCategoriasMasivo() {
    const buscarTxt = prompt("Ingrese texto a buscar en Categorías:");
    if (!buscarTxt) return;
    const elimSi = confirm(`¿Desea eliminar el texto "${buscarTxt}" de todas las Categorías? \n(Si: eliminar, No: agregar)`);
    commitTableEdits();
    filteredData.forEach(row => {
      let cat = row['Categorías'] || '';
      if (elimSi) {
        // Eliminar texto (caso insensible)
        const regex = new RegExp(buscarTxt, 'gi');
        cat = cat.replace(regex, '').replace(/(,\s*){2,}/g, ', ').trim();
        // Limpia comas dobles o espacios extras
        cat = cat.replace(/(^,)|(,$)/g, '').trim();
      } else {
        // Agregar texto al final, si no existe ya
        if (cat.toLowerCase().indexOf(buscarTxt.toLowerCase()) === -1) {
          if (cat) cat += ', ';
          cat += buscarTxt;
        }
      }
      row['Categorías'] = cat;
    });
    renderTable();
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

  // Añadimos botón para edición masiva categorías
  $columnSelector.append(`
    <button id="btnEditMasivo" class="btn btn-warning mt-3">Editar Categorías Masivamente</button>
  `);
  $('#btnEditMasivo').on('click', () => {
    editCategoriasMasivo();
  });
});
