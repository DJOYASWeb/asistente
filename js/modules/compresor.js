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

            // ✅ misma resolución, menor calidad
            const compressed = await compressImageSameResolution(blob, 0.6);
            newZip.file(name, compressed);

            fill.style.width = '100%';
            status.textContent = '✅ Listo';
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


    //v 1.5