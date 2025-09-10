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
   Configuración: Token Catálogo (sin consola)
   ============================ */
(function(){
  const ENDPOINT = 'https://distribuidoradejoyas.cl/modules/ps_products_export/products_live.php';
  const KEY = 'djq_token';

  const $ = (s)=> document.querySelector(s);
  const input   = $('#cfgTokenInput');
  const btnSave = $('#cfgBtnSave');
  const btnShow = $('#cfgBtnShow');
  const btnTest = $('#cfgBtnTest');
  const btnClear= $('#cfgBtnClear');
  const status  = $('#cfgTokenStatus');

  const toast = (msg, tipo='exito') =>
    (typeof window.mostrarNotificacion === 'function'
      ? mostrarNotificacion(msg, tipo)
      : alert((tipo==='error'?'❌ ':'✅ ')+msg));

  const looksLikeBcrypt = (s='') => /^\$2[aby]\$/.test(String(s));

  const mask = (s)=>{
    if(!s) return '(sin token)';
    if(s.length <= 6) return '*'.repeat(s.length);
    return s.slice(0,3)+'***'+s.slice(-3);
  };

  function refreshUI(){
    const saved = localStorage.getItem(KEY) || '';
    if (input)  { input.value = ''; input.type = 'password'; }
    if (btnShow){ btnShow.textContent = 'Mostrar'; }
    if (status) {
      status.textContent = saved
        ? (looksLikeBcrypt(saved)
            ? '⚠️ Detectado HASH guardado. Debes ingresar el TOKEN en texto plano.'
            : `Token guardado: ${mask(saved)}`)
        : 'No hay token guardado';
    }
  }

  // Migración automática: si hay un HASH guardado, se elimina y se avisa.
  function migrateIfHashStored(){
    const saved = localStorage.getItem(KEY) || '';
    if (looksLikeBcrypt(saved)){
      localStorage.removeItem(KEY);
      refreshUI();
      toast('Se detectó un HASH guardado. Por seguridad, debes ingresar el TOKEN en texto plano.', 'alerta');
    }
  }

  function saveToken(){
    const t = (input?.value || '').trim();
    if(!t){ toast('Ingresa un token válido', 'alerta'); input?.focus(); return; }
    if (looksLikeBcrypt(t)){
      toast('No pegues el HASH. Debes pegar el TOKEN en texto plano que corresponde a ese hash.', 'error');
      return;
    }
    localStorage.setItem(KEY, t);
    refreshUI();
    toast('Token guardado');
  }

  function toggleShow(){
    if (!input || !btnShow) return;
    const isPwd = input.type === 'password';
    input.type = isPwd ? 'text' : 'password';
    btnShow.textContent = isPwd ? 'Ocultar' : 'Mostrar';
  }

  async function testConnection(){
    const tok = localStorage.getItem(KEY) || '';
    if(!tok){ toast('No hay token guardado. Guarda uno primero.', 'alerta'); return; }
    if (looksLikeBcrypt(tok)){
      toast('El valor guardado parece un HASH. Guarda el TOKEN en texto plano.', 'error');
      return;
    }
    try{
      const url = `${ENDPOINT}?q=aro&limit=1`;
      const res = await fetch(url, { headers: { 'X-Auth-Token': tok }});
      if(!res.ok){
        const txt = await res.text().catch(()=> '');
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const data = await res.json();
      toast(`Conexión OK. Recibidos ${Array.isArray(data)?data.length:0} resultado(s).`);
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
    // Si no estás en configuracion.html, no hace nada
    if (!input && !btnSave && !btnShow && !btnTest && !btnClear && !status) return;
    migrateIfHashStored();
    refreshUI();
    bind();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Opcional para depuración desde botones u otros JS
  window.DJQ_TOKEN_UI = { refreshUI, testConnection, clearToken, saveToken };
})();










//upd v1