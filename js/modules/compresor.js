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
      if (!fileInput.files.length) {
        alert('Sube un archivo ZIP con imágenes');
        return;
      }

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
            status.textContent = 'Comprimiendo...';

const originalSize = blob.size;
let quality = 0.8;
let compressed;
do {
  compressed = await compressImageSameResolution(blob, quality);
  if (compressed.size <= 150 * 1024 || quality <= 0.1) break;
  quality -= 0.1;
} while (true);

const finalSize = compressed.size;
const reduction = 100 - ((finalSize / originalSize) * 100);
newZip.file(name, compressed);

// actualizar vista
const imgEl = item.querySelector('img');
imgEl.src = URL.createObjectURL(compressed);

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
            fill.style.width = '100%';
            status.textContent = '⚠️ Error';
          }
        } else if (!entry.dir) {
          const arr = await entry.async('arraybuffer');
          newZip.file(name, new Blob([arr]));
          fill.style.width = '100%';
          status.textContent = 'Sin cambio';
        }


        done++;

      }

const progressPercent = Math.round((done / entries.length) * 100);
globalProgressBar.style.width = progressPercent + '%';
globalProgressText.textContent = `Procesando... ${progressPercent}% (${done}/${entries.length})`;


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

// 🔹 (opcional) si aún quieres la descarga automática, puedes dejar estas líneas
const a = document.createElement('a');
a.href = url;
a.download = 'imagenes_comprimidas.zip';
a.click();

      const summary = document.createElement('p');
      summary.textContent = `🎉 Listo: ${done} archivos procesados.`;
      logContainer.appendChild(summary);
    };


    //v 1.8