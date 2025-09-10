document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();

  const inputArchivo = document.getElementById("archivoDashboard");
  const infoArchivo = document.getElementById("infoArchivo");
  const tablaPreview = document.getElementById("tablaPreview"); // 👈 un div donde poner la tabla

  if (inputArchivo) {
    inputArchivo.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheets = {};
workbook.SheetNames.forEach(name => {
  const ws = workbook.Sheets[name];

  // Convertir hoja a matriz 2D básica
  const sheet = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });

  // Limitar a las primeras 6 filas
  const limitedSheet = sheet.slice(0, 6);

  // Procesar las celdas combinadas
  if (ws["!merges"]) {
    ws["!merges"].forEach(merge => {
      const startCell = XLSX.utils.encode_cell(merge.s);
      const value = ws[startCell]?.v;

      for (let R = merge.s.r; R <= merge.e.r; ++R) {
        for (let C = merge.s.c; C <= merge.e.c; ++C) {
          // Solo rellenar si está dentro de las filas que nos interesan
          if (R < 6) {
            if (typeof limitedSheet[R] === "undefined") limitedSheet[R] = [];
            if (!limitedSheet[R][C]) {
              limitedSheet[R][C] = value;
            }
          }
        }
      }
    });
  }

  sheets[name] = limitedSheet;
});

        const now = new Date();
        const nowStr = now.toLocaleString();

        const archivo = {
          nombre: file.name,
          fecha: firebase.firestore.Timestamp.fromDate(now),
          data: JSON.stringify(sheets)
        };

        db.collection("dashboard_archivos").add(archivo)
          .then(() => {
            mostrarInfoArchivo({ nombre: archivo.nombre, fecha: nowStr });
            mostrarTabla(sheets); // 👈 muestra tabla recién subida
            console.log("Archivo guardado en Firestore");
          })
          .catch(err => {
            console.error("Error al guardar:", err);
          });
      };
      reader.readAsArrayBuffer(file);
    });

    // Mostrar el último archivo cargado
    db.collection("dashboard_archivos")
      .orderBy("fecha", "desc")
      .limit(1)
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0].data();
          const fecha = doc.fecha.toDate().toLocaleString();
          mostrarInfoArchivo({ nombre: doc.nombre, fecha });

          const sheets = JSON.parse(doc.data); // 👈 parsea el JSON
          mostrarTabla(sheets); // 👈 muestra tabla
        }
      })
      .catch(err => {
        console.error("Error al leer último archivo:", err);
      });
  }

  function mostrarInfoArchivo(archivo) {
    infoArchivo.innerHTML = `
      <p><strong>Último archivo:</strong> ${archivo.nombre}</p>
      <p><strong>Fecha de carga:</strong> ${archivo.fecha}</p>
      <p>El dashboard ya está usando esta información.</p>
    `;
  }

function mostrarTabla(sheets) {
  if (!tablaPreview) return;

  const primeraHoja = Object.keys(sheets)[0];
  const datos = sheets[primeraHoja];

  let html = `<h4>Vista previa: ${primeraHoja}</h4>`;
  html += `<div class="scroll-x"><table border="1"><tbody>`;

  datos.forEach((fila, i) => {
    html += "<tr>";
    fila.forEach(celda => {
      html += i === 0
        ? `<th>${celda ?? ""}</th>`
        : `<td>${celda ?? ""}</td>`;
    });
    html += "</tr>";
  });

  html += `</tbody></table></div>`;

  tablaPreview.innerHTML = html;
}

});


/* ============================
   Configuración: Token Catálogo
   (para configuracion.html)
   ============================ */

(function(){
  // ENDPOINT live en tu servidor (ya creado)
  const ENDPOINT = 'https://distribuidoradejoyas.cl/modules/ps_products_export/products_live.php';
  const KEY = 'djq_token'; // clave donde guardamos el token en localStorage

  const $ = (s)=> document.querySelector(s);

  // Elementos (deben existir en tu HTML de configuracion.html)
  const input   = $('#cfgTokenInput');   // <input id="cfgTokenInput">
  const btnSave = $('#cfgBtnSave');      // <button id="cfgBtnSave">
  const btnShow = $('#cfgBtnShow');      // <button id="cfgBtnShow">
  const btnTest = $('#cfgBtnTest');      // <button id="cfgBtnTest">
  const btnClear= $('#cfgBtnClear');     // <button id="cfgBtnClear">
  const status  = $('#cfgTokenStatus');  // <div id="cfgTokenStatus">

  // Toaster (sin console.log)
  const toast = (msg, tipo='exito') => {
    if (typeof window.mostrarNotificacion === 'function') {
      mostrarNotificacion(msg, tipo);
    } else {
      // Fallback silencioso
      if (tipo === 'error') alert('❌ ' + msg);
      else alert('✅ ' + msg);
    }
  };

  // Enmascara token para mostrar estado
  function mask(s){
    if(!s) return '(sin token)';
    if(s.length <= 6) return '*'.repeat(s.length);
    return s.slice(0,3) + '***' + s.slice(-3);
  }

  function refreshUI(){
    const saved = localStorage.getItem(KEY) || '';
    if (input) { input.value = ''; input.type = 'password'; }
    if (btnShow) btnShow.textContent = 'Mostrar';
    if (status) status.textContent = saved ? `Token guardado: ${mask(saved)}` : 'No hay token guardado';
  }

  function saveToken(){
    const t = (input?.value || '').trim();
    if(!t){
      toast('Ingresa un token válido', 'alerta');
      input?.focus();
      return;
    }
    localStorage.setItem(KEY, t);
    refreshUI();
    toast('Token guardado');
  }

  function toggleShow(){
    if (!input || !btnShow) return;
    if (input.type === 'password') {
      input.type = 'text';
      btnShow.textContent = 'Ocultar';
    } else {
      input.type = 'password';
      btnShow.textContent = 'Mostrar';
    }
  }

  async function testConnection(){
    const tok = localStorage.getItem(KEY) || '';
    if(!tok){
      toast('No hay token guardado. Guarda uno primero.', 'alerta');
      return;
    }
    try{
      // Consulta mínima (respeta rate limit del servidor)
      const url = `${ENDPOINT}?q=aro&limit=1`;
      const res = await fetch(url, { headers: { 'X-Auth-Token': tok }});
      if(!res.ok){
        const txt = await res.text().catch(()=> '');
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const data = await res.json();
      const n = Array.isArray(data) ? data.length : 0;
      toast(`Conexión OK. Recibidos ${n} resultado(s).`);
    }catch(e){
      toast(`No se pudo conectar: ${e.message || e}`, 'error');
    }
  }

  function clearToken(){
    if(!confirm('¿Eliminar el token guardado?')) return;
    localStorage.removeItem(KEY);
    refreshUI();
    toast('Token eliminado', 'alerta');
  }

  function bind(){
    btnSave?.addEventListener('click', saveToken);
    btnShow?.addEventListener('click', toggleShow);
    btnTest?.addEventListener('click', testConnection);
    btnClear?.addEventListener('click', clearToken);
  }

  function boot(){
    // Solo corre en la página de configuración (si existen los nodos)
    if (!input && !btnSave && !btnShow && !btnTest && !btnClear && !status) return;
    refreshUI();
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // (Opcional) expone utilidades por si quieres invocarlas desde consola
  window.DJQ_TOKEN_UI = { refreshUI, saveToken, clearToken, testConnection };

})();


//upd v1