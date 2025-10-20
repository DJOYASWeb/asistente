    const logContainer = document.getElementById('progressContainer');

    const addProgressItem = (name) => {
      const div = document.createElement('div');
      div.className = 'image-item';
      div.innerHTML = `
        <span class="image-name">${name}</span>
        <div class="bar"><div class="fill"></div></div>
        <span class="status">Pendiente</span>
      `;
      logContainer.appendChild(div);
      return div;
    };

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
      const total = entries.length;
      let done = 0;

      for (const [name, entry] of entries) {
        const item = addProgressItem(name);

        if (!entry.dir && /\.(jpg|jpeg|png)$/i.test(name)) {
const blob = await entry.async('arraybuffer');
const imageBlob = new Blob([blob], { type: 'image/jpeg' });
          const fill = item.querySelector('.fill');
          const status = item.querySelector('.status');

          try {
            status.textContent = 'Comprimiendo...';
const compressed = await imageCompression(imageBlob, {
              maxSizeMB: 0.1, // 100 KB
              maxWidthOrHeight: 2000,
              useWebWorker: true,
              initialQuality: 0.7
            });

            newZip.file(name, compressed);
            fill.style.width = '100%';
            status.textContent = '✅ Listo';
          } catch (e) {
            fill.style.background = '#dc3545';
            fill.style.width = '100%';
            status.textContent = '⚠️ Error';
          }
        } else if (!entry.dir) {
          // No es imagen → copiar igual
          const blob = await entry.async('blob');
          newZip.file(name, blob);
          item.querySelector('.fill').style.width = '100%';
          item.querySelector('.status').textContent = 'Sin cambio';
        }

        done++;
      }

      // Generar ZIP final
      const resultBlob = await newZip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'imagenes_comprimidas.zip';
      a.click();

      const summary = document.createElement('p');
      summary.textContent = `🎉 Listo: ${done} archivos procesados.`;
      logContainer.appendChild(summary);
    };

    //v 1