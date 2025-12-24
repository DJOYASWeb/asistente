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
      
      // 1. Validación (se mantiene igual)
      if (!fileInput.files.length) {
        alert('Sube un archivo ZIP con imágenes');
        return;
      }

      // ✅ NUEVO: Ocultar la zona de carga y el botón al iniciar
      document.getElementById('dropZone').style.display = 'none';
      document.getElementById('processBtn').style.display = 'none';

        topBar.style.display = 'flex';
  globalProgressBar.style.width = '0%';
  globalProgressText.textContent = 'Iniciando compresión...';
  downloadAllBtn.disabled = true;
  downloadAllBtn.style.opacity = '0.6';
  downloadAllBtn.style.cursor = 'not-allowed';

      logContainer.innerHTML = '';
      const zipFile = fileInput.files[0];
      const zipData = await zipFile.arrayBuffer();
      const jszip = await JSZip.loadAsync(zipData);
      const newZip = new JSZip();

      const entries = Object.entries(jszip.files);
      let done = 0;

      for (const [name, entry] of entries) {
        const item = addProgressItem(name);
        const fill = item.querySelector('.fill');
        const status = item.querySelector('.status');
if (!entry.dir && /\.(jpg|jpeg|png)$/i.test(name)) {
          try {
            const arr = await entry.async('arraybuffer');
            const blob = new Blob([arr]);
            
            // Definimos compressed aquí para usarlo fuera del if/else
            let compressed; 
            const originalSize = blob.size;

            // ✅ VALIDACIÓN: Si pesa 150KB (153600 bytes) o menos, no hacemos nada
            if (originalSize <= 150 * 1024) {
                compressed = blob; // Usamos el archivo original sin cambios
                status.textContent = 'Mantenido (Original)';
            } else {
                // Si pesa más, iniciamos el proceso de compresión
                status.textContent = 'Comprimiendo...';
                let quality = 0.8;
                do {
                  compressed = await compressImageSameResolution(blob, quality);
                  if (compressed.size <= 150 * 1024 || quality <= 0.1) break;
                  quality -= 0.1;
                } while (true);
            }

            const finalSize = compressed.size;
            const reduction = 100 - ((finalSize / originalSize) * 100);
            newZip.file(name, compressed);

            // actualizar vista
            const imgEl = item.querySelector('img');
            imgEl.src = URL.createObjectURL(compressed);

            // Ajustamos un poco el texto para que tenga sentido si no hubo reducción
            item.querySelector('.meta').textContent =
              `${(originalSize / 1024).toFixed(1)} KB → ${(finalSize / 1024).toFixed(1)} KB`;

            item.querySelector('.reduction').textContent =
              `${reduction.toFixed(1)}% menos`;

            item.querySelector('.final-size').textContent =
              `Final: ${(finalSize / 1024).toFixed(1)} KB`;

            const statusEl = item.querySelector('.status');
            statusEl.textContent = 'Listo';
            statusEl.classList.add('ready');

            const link = item.querySelector('.download-link');
            link.style.display = 'inline';
            link.href = URL.createObjectURL(compressed);
            link.download = name;

          } catch (err) {
            console.error(`Error en ${name}:`, err);
            fill.style.background = '#dc3545';
            // fill.style.width = '100%'; // 'fill' no está definido en tu snippet original, asegúrate de tenerlo o quitar esta línea si da error
            status.textContent = '⚠️ Error';
          }
        } else if (!entry.dir) {
          const arr = await entry.async('arraybuffer');
          newZip.file(name, new Blob([arr]));
          fill.style.width = '100%';
          status.textContent = 'Sin cambio';
        }


        done++;

        const progressPercent = Math.round((done / entries.length) * 100);
globalProgressBar.style.width = progressPercent + '%';
globalProgressText.textContent = `Procesando... ${progressPercent}% (${done}/${entries.length})`;

// 🔹 fuerza al navegador a repintar antes de seguir
await new Promise(r => setTimeout(r, 50));

      }

const resultBlob = await newZip.generateAsync({ type: 'blob' });
const url = URL.createObjectURL(resultBlob);

// ✅ (PUNTO 4) — actualiza barra y habilita el botón “Descargar todo”
globalProgressBar.style.width = '100%';
globalProgressText.textContent = `✅ Proceso completado (${entries.length} imágenes)`;

// habilitar botón
downloadAllBtn.disabled = false;
downloadAllBtn.style.opacity = '1';
downloadAllBtn.style.cursor = 'pointer';
downloadAllBtn.onclick = () => {
  const a = document.createElement('a');
  a.href = url;
  a.download = 'imagenes_comprimidas.zip';
  a.click();
};


      const summary = document.createElement('p');
      summary.textContent = `🎉 Listo: ${done} archivos procesados.`;
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
