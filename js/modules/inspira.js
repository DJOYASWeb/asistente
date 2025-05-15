// inspira.js

const db = firebase.firestore();
let cacheEntradas = [];

function showTab(tab) {
  const tabs = ['contenidos', 'recursos', 'ingreso'];
  tabs.forEach(t => {
    const section = document.getElementById(t);
    const btn = document.getElementById(`btn${capitalize(t)}`);
    if (section) section.classList.toggle('d-none', t !== tab);
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function mostrarPopup() {
  const popup = document.getElementById('popupSuccess');
  popup.style.display = 'block';
  popup.style.opacity = '1';
  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => popup.style.display = 'none', 300);
  }, 3000);
}

function showIosModal(title, message) {
  document.getElementById('iosModalTitle').textContent = title;
  document.getElementById('iosModalMessage').textContent = message;
  document.getElementById('iosModal').style.display = 'flex';
}

function closeIosModal() {
  document.getElementById('iosModal').style.display = 'none';
}

async function guardarInspira(e) {
  e.preventDefault();
  const nuevaEntrada = {
    id: document.getElementById('inspiraId').value,
    titulo: document.getElementById('inspiraTitulo').value,
    autor: document.getElementById('inspiraAutor').value,
    descripcion: document.getElementById('inspiraDescripcion').value,
    imagen: document.getElementById('inspiraImagen').value,
    duracion: document.getElementById('inspiraDuracion').value + ' ' + document.getElementById('inspiraUnidad').value,
    tematica: document.getElementById('inspiraTematica').value,
    categoria: document.getElementById('inspiraCategoria').value,
    fecha: document.getElementById('inspiraFecha').value,
    link: document.getElementById('inspiraLink').value,
    timestamp: new Date().toISOString()
  };

  try {
    await db.collection("inspira").doc(nuevaEntrada.id).set(nuevaEntrada);
    document.getElementById('formInspira').reset();
    showIosModal("✅ Éxito", "El contenido fue guardado correctamente.");
  } catch (err) {
    console.error("❌ Error al guardar entrada:", err);
    showIosModal("❌ Error", "No se pudo guardar. Intenta de nuevo.");
  }
}

async function cargarContenidos() {
  const select = document.getElementById('contenidoSelect');
  select.innerHTML = '<option value="">Selecciona un contenido</option>';
  try {
    const snapshot = await db.collection("inspira").get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = `${data.titulo} (${data.tematica || 'sin temática'})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar contenidos:", error);
    select.innerHTML = '<option>Error al cargar</option>';
  }
}

function refrescarContenidos() {
  cargarContenidos();
  showIosModal("🔄 Refrescado", "Se actualizaron los contenidos desde la base de datos.");
}

window.addEventListener('load', cargarContenidos);
