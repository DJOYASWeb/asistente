
async function fetchBlob(url) {
  const res = await fetch(url, { mode: "no-cors" });
  return await res.blob();
}

async function obtenerPesoDesdeImg(url) {
  const blob = await fetchBlob(url);
  return blob.size / 1024;
}

async function comprimirBlob(blobOriginal, maxKB = 120) {
  const img = await new Promise(resolve => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.src = URL.createObjectURL(blobOriginal);
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  let quality = 0.92;
  let blob;

  while (quality > 0.05) {
    blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
    if (blob.size / 1024 <= maxKB) return blob;
    quality -= 0.05;
  }

  return blob;
}

async function procesarImagen(url) {
  const blob = await fetchBlob(url);
  const kb = blob.size / 1024;

  if (kb <= 120) return blob;
  return await comprimirBlob(blob, 120);
}

async function comprimirImagenes() {
  const barra = document.getElementById("barraProgreso");
  const estado = document.getElementById("estadoProgreso");
  const btnComprimir = document.getElementById("btnComprimir");

  if (!window.imagenesProcesadas?.length) {
    alert("No hay imágenes procesadas.");
    return;
  }

  btnComprimir.disabled = true;
  barra.classList.remove("bg-success");
  barra.classList.add("progress-bar-animated");
  estado.textContent = "Comprimiendo imágenes...";

  const zip = new JSZip();
  const total = window.imagenesProcesadas.length;
  let completadas = 0;

  for (const { codigo, url } of window.imagenesProcesadas) {
    try {
      const blobFinal = await procesarImagen(url);
      zip.file(`${codigo}.jpg`, blobFinal);
    } catch (e) {
      console.warn("Error con", codigo, e);
    }

    completadas++;
    const pct = Math.round((completadas / total) * 100);
    barra.style.width = pct + "%";
    barra.textContent = pct + "%";
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `imagenes_${new Date().toISOString().slice(0,10)}.zip`);

  barra.classList.remove("progress-bar-animated");
  barra.classList.add("bg-success");
  barra.style.width = "100%";
  barra.textContent = "100%";
  estado.textContent = "✅ Archivo ZIP generado correctamente.";

  btnComprimir.disabled = false;
}
