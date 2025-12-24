  const logContainer = document.getElementById('progressContainer');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const globalProgressBar = document.getElementById('globalProgressBar');
const globalProgressText = document.getElementById('globalProgressText');

const addProgressItem = (name) => {
  const row = document.createElement('div');
  row.className = 'image-item';
  row.innerHTML = `
    <div class="thumb"><img></div>
    <div class="info">
      <div class="name">${name}</div>
      <div class="meta"></div>
    </div>
    <div class="result">
      <div class="reduction"></div>
      <div class="final-size"></div>
    </div>
    <div class="status-cell">
      <span class="status">Procesando...</span><br>
      <a class="download-link" href="#" style="display:none;">Descargar</a>
    </div>
  `;
  logContainer.appendChild(row);
  return row;
};


    // ✅ Nueva función: no cambia resolución
    function compressImageSameResolution(blob, quality = 0.6) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const width = img.width;
          const height = img.height;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (compressedBlob) => {
              if (compressedBlob) resolve(compressedBlob);
              else reject(new Error('No se pudo generar el blob'));
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Error al cargar imagen'));
        img.src = URL.createObjectURL(blob);
      });
    }

document.getElementById('processBtn').onclick = async () => {
      const fileInput = document.getElementById('zipInput');

      // 1. Validación básica
      if (!fileInput.files.length) {
        alert('Por favor, sube al menos una imagen o un archivo ZIP.');
        return;
      }

      document.getElementById('resetBtn').style.display = 'block';

      // Ocultar la zona de carga (Tu mejora anterior)
      document.getElementById('dropZone').style.display = 'none';
      document.getElementById('processBtn').style.display = 'none';

      // Inicializar UI
      topBar.style.display = 'flex';
      globalProgressBar.style.width = '0%';
      globalProgressText.textContent = 'Analizando archivos...';
      downloadAllBtn.disabled = true;
      downloadAllBtn.style.opacity = '0.6';
      downloadAllBtn.style.cursor = 'not-allowed';
      logContainer.innerHTML = '';

      const newZip = new JSZip();
      
      // --- FASE 1: Recolección de Imágenes ---
      // Creamos una lista unificada de "tareas" sin importar de dónde vienen
      let tasks = [];

      for (const file of fileInput.files) {
          // Opción A: Es un ZIP
          if (/\.zip$/i.test(file.name)) {
              try {
                  const zipData = await file.arrayBuffer();
                  const loadedZip = await JSZip.loadAsync(zipData);
                  loadedZip.forEach((relativePath, entry) => {
                      // Solo agregamos si es imagen y no es carpeta
                      if (!entry.dir && /\.(jpg|jpeg|png)$/i.test(entry.name)) {
                          tasks.push({ type: 'zipEntry', data: entry, name: entry.name });
                      }
                  });
              } catch (e) {
                  console.error("Error leyendo ZIP:", e);
                  alert(`No se pudo leer el archivo ZIP: ${file.name}`);
              }
          } 
          // Opción B: Es una imagen suelta
          else if (/\.(jpg|jpeg|png)$/i.test(file.name)) {
              tasks.push({ type: 'file', data: file, name: file.name });
          }
      }

      if (tasks.length === 0) {
          alert("No se encontraron imágenes válidas (JPG/PNG) para procesar.");
          location.reload(); 
          return;
      }

      // --- FASE 2: Procesamiento ---
      let done = 0;
      globalProgressText.textContent = `Procesando ${tasks.length} imágenes...`;

      for (const task of tasks) {
        const item = addProgressItem(task.name);
        // const fill = item.querySelector('.fill'); // (Opcional si usas barra individual)
        const status = item.querySelector('.status');
        
        try {
            // 2.1 Obtener el BLOB (sea de zip o de archivo suelto)
            let blob;
            if (task.type === 'zipEntry') {
                const arr = await task.data.async('arraybuffer');
                blob = new Blob([arr]);
            } else {
                blob = task.data; // El objeto File ya es un Blob
            }

            const originalSize = blob.size;
            let compressed;

            // 2.2 Lógica de los 150KB (Tu mejora anterior)
            if (originalSize <= 150 * 1024) {
                compressed = blob; 
                status.textContent = 'Mantenido (Original)';
                // Si quieres que el usuario sepa que no hubo cambio visualmente:
                item.querySelector('.reduction').textContent = '0% menos';
            } else {
                status.textContent = 'Comprimiendo...';
                let quality = 0.8;
                do {
                  compressed = await compressImageSameResolution(blob, quality);
                  if (compressed.size <= 150 * 1024 || quality <= 0.1) break;
                  quality -= 0.1;
                } while (true);
            }

            // 2.3 Resultados y Guardado
            const finalSize = compressed.size;
            const reduction = 100 - ((finalSize / originalSize) * 100);
            
            // Guardamos todo en el nuevo ZIP final
            newZip.file(task.name, compressed);

            // Actualizar vista (Thumbnails y Textos)
            const imgEl = item.querySelector('img');
            imgEl.src = URL.createObjectURL(compressed);

            item.querySelector('.meta').textContent =
              `${(originalSize / 1024).toFixed(1)} KB → ${(finalSize / 1024).toFixed(1)} KB`;

            // Solo actualizamos el texto de reducción si no lo hicimos en el bloque "Mantenido"
            if (originalSize > 150 * 1024) {
                item.querySelector('.reduction').textContent = `${reduction.toFixed(1)}% menos`;
            }

            item.querySelector('.final-size').textContent =
              `Final: ${(finalSize / 1024).toFixed(1)} KB`;

            const statusEl = item.querySelector('.status');
            statusEl.textContent = 'Listo';
            statusEl.classList.add('ready');

            const link = item.querySelector('.download-link');
            link.style.display = 'inline';
            link.href = URL.createObjectURL(compressed);
            link.download = task.name;

        } catch (err) {
            console.error(`Error en ${task.name}:`, err);
            status.textContent = '⚠️ Error';
            status.classList.add('error');
        }

        // 2.4 Actualizar Barra Global
        done++;
        const progressPercent = Math.round((done / tasks.length) * 100);
        globalProgressBar.style.width = progressPercent + '%';
        globalProgressText.textContent = `Procesando... ${progressPercent}% (${done}/${tasks.length})`;

        // Pequeña pausa para que la UI respire
        await new Promise(r => setTimeout(r, 20));
      }

      // --- FASE 3: Finalización ---
      const resultBlob = await newZip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(resultBlob);

      globalProgressBar.style.width = '100%';
      globalProgressText.textContent = `✅ ¡Listo! ${tasks.length} imágenes procesadas.`;

      downloadAllBtn.disabled = false;
      downloadAllBtn.style.opacity = '1';
      downloadAllBtn.style.cursor = 'pointer';
      
      // Botón descarga final
      downloadAllBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = url;
        // Nombre dinámico según lo que subiste
        const timestamp = new Date().getTime();
        a.download = `imagenes_optimizadas_${timestamp}.zip`;
        a.click();
      };

      const summary = document.createElement('p');
      summary.className = 'text-center mt-3 text-success fw-bold';
      summary.textContent = `🎉 Proceso terminado.`;
      logContainer.appendChild(summary);
    };


    // === LÓGICA DRAG & DROP ===

const dropZone = document.getElementById('dropZone');
const zipInput = document.getElementById('zipInput');
const fileNameDisplay = document.getElementById('fileName');

// 1. Al hacer clic en el rectángulo, activamos el input oculto
dropZone.addEventListener('click', () => {
    zipInput.click();
});

// 2. Al seleccionar un archivo manualmente (clic)
zipInput.addEventListener('change', () => {
    if (zipInput.files.length) {
        updateThumbnail(zipInput.files[0]);
    }
});

// 3. Eventos de arrastre (Drag & Drop)
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault(); // Necesario para permitir el drop
    dropZone.classList.add('dragover'); // Añade efectos visuales
});

['dragleave', 'dragend'].forEach(type => {
    dropZone.addEventListener(type, () => {
        dropZone.classList.remove('dragover'); // Quita efectos
    });
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    if (e.dataTransfer.files.length) {
        // Asignamos los archivos soltados al input real
        zipInput.files = e.dataTransfer.files;
        updateThumbnail(e.dataTransfer.files[0]);
    }
});

// Función auxiliar para mostrar el nombre del archivo cargado
function updateThumbnail(file) {
    fileNameDisplay.textContent = `📂 Archivo cargado: ${file.name}`;
    // Opcional: Cambiar el borde a verde o sólido para indicar éxito
    dropZone.style.borderColor = '#28a745'; 
    dropZone.style.borderStyle = 'solid';
}


    //v 2.1
