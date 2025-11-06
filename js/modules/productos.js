// productos.js v4.0 (Ajustes funcionales en modal + columnas dinámicas)
$(document).ready(function () {

  // --------- ESTADO GLOBAL ---------
  let originalData = [];
  let filteredData = [];
  let colsMostrar = [];
  let colProcesar = null;
  let allColumns = []; // <-- TODAS las columnas detectadas en el archivo
  const PREVIEW_LIMIT = 10;

  // --------- CACHE DE SELECTORES ---------
  const $fileInput = $('#excelFile');
  const $colsMostrarDiv = $('#colsMostrar');
  const $colsProcesarDiv = $('#colsProcesar');
  const $btnProcesar = $('#btnProcesar');
  const $progressBar = $('#progressBar');
  const $progressFill = $('#progressBar .progress-bar');
  const $resultadoDiv = $('#resultadoDiv');
  const $tableContainer = $('#tableContainer');

  // --------- ORDEN DE CATEGORIAS PARA ORDENAR ---------
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

  // --------- LEER EXCEL / CSV CON WORKER ---------
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

        // Guardamos datos en memoria
        originalData = jsonData;
        filteredData = [...originalData];

        // Construimos selectores de columnas
        setupColumnSelectors(Object.keys(jsonData[0]));
        updateActionsState();

        mostrarNotificacion('Archivo cargado correctamente.', 'exito');
      };
    };

    if (isCSV) {
      reader.readAsText(file, "UTF-8");
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  // --------- ARMAR LOS CHECKBOX Y RADIO DE COLUMNAS ---------
  function setupColumnSelectors(columns) {
    // 🔴 IMPORTANTE: guardamos todas las columnas disponibles globalmente
    allColumns = [...columns];

    $colsMostrarDiv.empty();
    $colsProcesarDiv.empty();

    columns.forEach(col => {
      const idMostrar = 'mostrar_' + col.replace(/\W/g, '');
      $colsMostrarDiv.append(`
        <input type="checkbox" id="${idMostrar}" value="${col}" checked>
        <label for="${idMostrar}"> ${col}</label><br>
      `);

      const idProcesar = 'procesar_' + col.replace(/\W/g, '');
      $colsProcesarDiv.append(`
        <input type="radio" name="colProcesar" id="${idProcesar}" value="${col}">
        <label for="${idProcesar}"> ${col}</label><br>
      `);
    });

    // eventos para columnas visibles
    $colsMostrarDiv.find('input[type=checkbox]').on('change', () => {
      colsMostrar = $colsMostrarDiv
        .find('input[type=checkbox]:checked')
        .map(function () { return this.value; })
        .get();
      updateActionsState();
    });

    // evento para columna a procesar
    $colsProcesarDiv.find('input[type=radio]').on('change', () => {
      colProcesar = $colsProcesarDiv
        .find('input[type=radio]:checked')
        .val() || null;
      updateActionsState();
    });

    // estado inicial
    colsMostrar = [...columns];
    colProcesar = null;
  }

  // --------- PROCESAR DIVISIÓN (VISTA FINAL) ---------
  async function procesarDivision() {
    if (!colProcesar) {
      mostrarNotificacion('Por favor selecciona una columna a procesar.', 'error');
      return;
    }

    // Ocultamos UI inicial
    $('#excelFile').closest('.formulario').hide();
    $('#columnSelector').hide();
    $tableContainer.hide();
    $progressBar.show();
    $progressFill.css('width', '0%').text('0%');

    const total = Math.min(filteredData.length, PREVIEW_LIMIT);
    const resultado = [];

    for (let i = 0; i < total; i++) {
      const rawValor = (filteredData[i][colProcesar] || '').toString().trim();

      // separar por coma
      let partes = rawValor.split(',').map(p => p.trim()).filter(Boolean);

      // pares tipo "Clave: Valor"
      const pares = {};
      partes.forEach(p => {
        const [campo, val] = p.split(':').map(x => x?.trim());
        if (campo && val) {
          pares[campo] = val;
        }
      });

      // guardamos lo que calculamos
      resultado.push({
        original: rawValor,
        partes,
        pares
      });

      // nota: si esta columna parece categorías, ordenamos
      // (solo si NO tiene el formato clave: valor, es decir, categorías simples)
      if (Object.keys(pares).length === 0 && partes.length > 0) {
        partes = ordenarCategorias(partes);
      }

      // guardamos algo util en la fila para exportar luego
      filteredData[i].__procesado = {
        original: rawValor,
        partes,
        pares
      };

      const pct = Math.round(((i + 1) / total) * 100);
      $progressFill.css('width', pct + '%').text(pct + '%');

      // mini pausa no-bloqueante para que la barra se vea animada
      await new Promise(r => setTimeout(r, 5));
    }

    $progressBar.hide();

    // mostramos resultado final (preview + botones)
    renderResultadoPreview(total);
  }

  // --------- RENDER PANTALLA RESULTADO (BOTONES + TABLA PREVIEW) ---------
  function renderResultadoPreview(limit) {
    // reconstruimos todo el bloque de resultado en vivo
    // esto es importante porque #btnAjustes, #btnVolver, #btnExportar se crean dinámicamente
    let html = `
      <div class="d-flex flex-wrap gap-2 mb-3">
        <button id="btnOrdenarCategorias" class="btn btn-info">Ordenar Categorías</button>
        <button id="btnAjustes" class="btn btn-secondary">Ajustes</button>
        <button id="btnVolver" class="btn btn-outline-secondary ms-auto">Volver atrás</button>
        <button id="btnExportar" class="btn btn-primary">Exportar Excel</button>
      </div>

      <div id="mensajeProcesado" class="alert alert-light">
        Se procesaron ${limit} productos de vista previa.
        Vista limitada a las columnas seleccionadas.
      </div>

      <div class="table-responsive mt-3">
        <table class="table table-bordered table-sm">
          <thead><tr>`;

    // Cabecera: SOLO las columnas que el usuario eligió ver
    colsMostrar.forEach(col => {
      html += `<th>${col}</th>`;
    });

    html += `</tr></thead><tbody>`;

    // Filas: primeras N filas
    filteredData.slice(0, limit).forEach((row, i) => {
      html += `<tr>`;
      colsMostrar.forEach(col => {
        let valorCelda = row[col] || '';

        // si esta es la columna procesada, mostramos lindo los pares "clave: valor"
        if (col === colProcesar && row.__procesado) {
          const p = row.__procesado;
          if (p && p.pares && Object.keys(p.pares).length > 0) {
            // tenemos estructura tipo "Campo: Valor"
            let detalles = '';
            for (const [campo, val] of Object.entries(p.pares)) {
              detalles += `<div><strong>${campo}:</strong> ${val}</div>`;
            }
            valorCelda = detalles;
          } else if (p && p.partes && p.partes.length > 0) {
            // caso categorías simples
            valorCelda = p.partes.join(', ');
          }
        }

        html += `<td>${valorCelda}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;

    // Pegarlo en el div resultado y mostrarlo
    $resultadoDiv.html(html).show();

    // Aviso visual
    mostrarNotificacion('Vista previa generada.', 'exito');
  }

  // --------- ORDENAR CATEGORÍAS (CLICK DELEGADO) ---------
  // Nota: este botón se genera dinámicamente en renderResultadoPreview
  $(document).on('click', '#btnOrdenarCategorias', () => {
    if (!colProcesar) {
      mostrarNotificacion('Primero selecciona la columna a procesar.', 'alerta');
      return;
    }

    // Ordena las categorías SOLO si es lista de categorías (sin pares "clave: valor")
    filteredData.forEach(row => {
      if (row.__procesado) {
        const p = row.__procesado;
        if (p && p.pares && Object.keys(p.pares).length > 0) {
          // tiene pares tipo "Campo: Valor", NO lo tratamos como categorías
          return;
        }
        if (p && p.partes && p.partes.length > 0) {
          p.partes = ordenarCategorias(p.partes);
          // reflejar también en la columna original por si exportamos
          row[colProcesar] = p.partes.join(', ');
        }
      }
    });

    mostrarNotificacion('Categorías ordenadas correctamente.', 'exito');

    // volver a renderizar tabla con los cambios aplicados
    renderResultadoPreview(PREVIEW_LIMIT);
  });

// --------- AJUSTES (ABRIR MODAL AVANZADO) ---------
$(document).on('click', '#btnAjustes', () => {
  const $contenedor = $('#contenedorCategorias');
  $contenedor.empty();

  // Construimos un selector de columnas
  let htmlSelect = `<div class="mb-3">
      <label class="form-label"><strong>Selecciona una columna:</strong></label>
      <select id="columnaSeleccionada" class="form-select">
        <option value="">-- Seleccionar --</option>`;
  allColumns.forEach(col => {
    htmlSelect += `<option value="${col}">${col}</option>`;
  });
  htmlSelect += `</select></div>
  <div id="areaCategorias" class="mt-3"></div>`;

  $contenedor.html(htmlSelect);

  // Evento de cambio de columna
  $(document).off('change', '#columnaSeleccionada').on('change', '#columnaSeleccionada', function () {
    const colSeleccionada = $(this).val();
    const $area = $('#areaCategorias');
    $area.empty();

    if (!colSeleccionada) return;

    // Si la columna tiene categorías separadas por coma
    const setCategorias = new Set();
    filteredData.forEach(row => {
      const valor = (row[colSeleccionada] || '').toString();
      valor.split(',').map(v => v.trim()).filter(Boolean).forEach(v => setCategorias.add(v));
    });

    if (setCategorias.size === 0) {
      $area.html('<p class="text-muted">No se detectaron valores en esta columna.</p>');
      return;
    }

    // Render de botones únicos
    $area.append('<p><strong>Valores únicos detectados:</strong></p>');
    const contenedorBtns = $('<div class="d-flex flex-wrap gap-2"></div>');

    Array.from(setCategorias).sort().forEach(cat => {
      const btn = $(`<button class="btn btn-outline-secondary btn-sm categoria-btn" data-cat="${cat}">
        ${cat} <i class="fa-solid fa-xmark"></i>
      </button>`);
      contenedorBtns.append(btn);
    });

    $area.append(contenedorBtns);

    // Al hacer clic se marca/desmarca para eliminar
    $('.categoria-btn').on('click', function () {
      $(this).toggleClass('btn-outline-danger').toggleClass('btn-outline-secondary');
    });
  });

  abrirModalAjustes();
});

// --------- APLICAR AJUSTES (CATEGORÍAS O COLUMNAS) ---------
$(document).on('click', '#btnAplicarAjustes', () => {
  const colSeleccionada = $('#columnaSeleccionada').val();

  // Si estamos en modo categorías
  if (colSeleccionada) {
    const eliminadas = [];
    $('.categoria-btn.btn-outline-danger').each(function () {
      eliminadas.push($(this).data('cat'));
    });

    if (eliminadas.length === 0) {
      mostrarNotificacion('No seleccionaste ninguna categoría para eliminar.', 'alerta');
      return;
    }

    filteredData.forEach(row => {
      let valor = (row[colSeleccionada] || '').toString();
      let partes = valor.split(',').map(v => v.trim()).filter(Boolean);
      partes = partes.filter(p => !eliminadas.includes(p));
      row[colSeleccionada] = partes.join(', ');
    });

    cerrarModalAjustes();
    mostrarNotificacion(`Se eliminaron ${eliminadas.length} valores de "${colSeleccionada}".`, 'exito');
    renderResultadoPreview(PREVIEW_LIMIT);
    return;
  }

  // Si estamos en modo selección de columnas (ninguna columna elegida aún)
  const seleccionadas = [];
  $('.chk-columna:checked').each(function () {
    seleccionadas.push($(this).val());
  });

  if (seleccionadas.length === 0) {
    mostrarNotificacion('Debes dejar al menos una columna visible.', 'alerta');
    return;
  }

  colsMostrar = [...seleccionadas];

  cerrarModalAjustes();
  mostrarNotificacion('Columnas actualizadas correctamente.', 'exito');
  renderResultadoPreview(PREVIEW_LIMIT);
});


  // --------- APLICAR AJUSTES (GUARDAR COLUMNAS VISIBLES) ---------
  $(document).on('click', '#btnAplicarAjustes', () => {
    const seleccionadas = [];
    $('.chk-columna:checked').each(function () {
      seleccionadas.push($(this).val());
    });

    if (seleccionadas.length === 0) {
      mostrarNotificacion('Debes dejar al menos una columna visible.', 'alerta');
      return;
    }

    colsMostrar = [...seleccionadas];

    closeModalAjustes();
    mostrarNotificacion('Columnas actualizadas correctamente.', 'exito');

    // refrescar la vista con las nuevas columnas elegidas
    renderResultadoPreview(PREVIEW_LIMIT);
  });

  // --------- VOLVER ATRÁS ---------
  // también se genera dinámicamente
  $(document).on('click', '#btnVolver', () => {
    $resultadoDiv.hide();

    // mostramos la UI inicial de nuevo
    $('#excelFile').closest('.formulario').show();
    $('#columnSelector').show();
    mostrarNotificacion('Has vuelto al inicio.', 'alerta');
  });

  // --------- EXPORTAR EXCEL ---------
  // también botón dinámico
  $(document).on('click', '#btnExportar', () => {
    if (!filteredData || filteredData.length === 0) {
      mostrarNotificacion('No hay datos para exportar.', 'error');
      return;
    }

    try {
      // Exportamos TODO filteredData tal como está en memoria (incluye __procesado)
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

  // --------- INPUT FILE / PROCESAR ---------
  $fileInput.on('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      readExcel(file);
    }
  });

  $btnProcesar.on('click', () => {
    procesarDivision();
  });

}); 

// --- Apertura y cierre del modal AJUSTES ---
function abrirModalAjustes() {
  const modal = document.getElementById('modalAjustes');
  if (modal) modal.style.display = 'flex';
}

function cerrarModalAjustes() {
  const modal = document.getElementById('modalAjustes');
  if (modal) modal.style.display = 'none';
}


//v. 1.6