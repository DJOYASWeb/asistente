async function cargarCampañasDesdeFirebase() {
  const db = firebase.firestore();
  const snapshot = await db.collection("dashboard_archivos").orderBy("fecha", "desc").limit(1).get();

  if (snapshot.empty) {
    console.warn("No hay archivos cargados.");
    return;
  }

  const archivo = snapshot.docs[0].data();

  const sheets = JSON.parse(archivo.data);
  const hoja = sheets[Object.keys(sheets)[0]];

  const filas = hoja.slice(0, 6);
  console.table(filas);

  const mesesFila = filas[0];
  const semanasFila = filas[1];
  const principalFila = filas[2];
  const segundaFila = filas[3];
  const terceraFila = filas[4];

  const hoy = new Date();
  const mesActual = hoy.toLocaleString("es-CL", { month: "long" }).toUpperCase();
  const dia = hoy.getDate();

  let semanaActual = -1;

  for (let i = 2; i < semanasFila.length; i++) {
    const mesCelda = mesesFila[i] || mesesFila[i - 1];
    const semanaStr = semanasFila[i];
    if (!semanaStr || typeof semanaStr !== "string" || !semanaStr.includes("-")) continue;

    const [inicio, fin] = semanaStr.split("-").map(n => parseInt(n));
    if (mesCelda?.toUpperCase().includes(mesActual) && dia >= inicio && dia <= fin) {
      semanaActual = i;
      break;
    }
  }

  if (semanaActual === -1) {
    console.warn("No se encontró semana actual.");
    return;
  }

  document.getElementById("campanaPrincipalActual").textContent = principalFila[semanaActual] || "-";
  document.getElementById("campanaSegundaActual").textContent = segundaFila[semanaActual] || "-";
  document.getElementById("campanaTerceraActual").textContent = terceraFila[semanaActual] || "-";

  document.getElementById("campanaPrincipalProxima").textContent = principalFila[semanaActual + 1] || "-";
  document.getElementById("campanaSegundaProxima").textContent = segundaFila[semanaActual + 1] || "-";
  document.getElementById("campanaTerceraProxima").textContent = terceraFila[semanaActual + 1] || "-";

  let semanasFaltan = 0;
  for (let i = semanaActual + 1; i < principalFila.length; i++) {
    if (principalFila[i] && principalFila[i] !== principalFila[semanaActual]) {
      semanasFaltan = i - semanaActual;
      break;
    }
  }

  document.getElementById("semanasFaltan").textContent = semanasFaltan;
}

async function cargarBlogsSemanaActual() {
  const db = firebase.firestore();

  const blogsSemana = document.getElementById("blogsSemana");
  blogsSemana.innerHTML = "";

  const hoy = new Date();

  // 📅 Calcular lunes y domingo de la semana actual
  const diaSemana = hoy.getDay(); // 0=Domingo, 1=Lunes...
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  // 🔢 Formatear en YYYY-MM-DD
  const formato = (fecha) =>
    fecha.toISOString().split("T")[0];

  const inicioStr = formato(lunes);
  const finStr = formato(domingo);
  const snapshot = await db.collection("blogs")
    .where("fecha", ">=", inicioStr)
    .where("fecha", "<=", finStr)
    .orderBy("fecha")
    .get();

  if (snapshot.empty) {
    blogsSemana.innerHTML = "<li class='list-group-item text-muted'>No hay blogs esta semana</li>";
    return;
  }

snapshot.forEach(doc => {
  const data = doc.data();
  const li = document.createElement("li");
  li.className = "list-group-item";
  li.textContent = `${doc.id} - ${data.nombre || "(Sin título)"}`;
  blogsSemana.appendChild(li);
});
}

async function cargarInspiraDeLaSemana() {
  const db = firebase.firestore();

  const inspiraSemana = document.getElementById("inspiraSemana");
  inspiraSemana.innerHTML = "";

  const hoy = new Date();

  const primerDiaSemana = new Date(hoy);
  primerDiaSemana.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes
  primerDiaSemana.setHours(0, 0, 0, 0);

  const ultimoDiaSemana = new Date(primerDiaSemana);
  ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 6); // Domingo
  ultimoDiaSemana.setHours(23, 59, 59, 999);

  const fechaInicioStr = primerDiaSemana.toISOString().slice(0, 10);
  const fechaFinStr = ultimoDiaSemana.toISOString().slice(0, 10);
  const snapshot = await db.collection("inspira").get();

  let encontrado = false;

  snapshot.forEach(doc => {
    const data = doc.data();
    const fechaStr = data.fecha; // ya en "YYYY-MM-DD"
    if (fechaStr >= fechaInicioStr && fechaStr <= fechaFinStr) {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.textContent = `${data.id} - ${data.titulo || "(Sin título)"}`;
      inspiraSemana.appendChild(li);
      encontrado = true;
    }
  });

  if (!encontrado) {
    inspiraSemana.innerHTML = `<li class="list-group-item text-muted">No hay contenido esta semana</li>`;
  }
}



document.addEventListener("DOMContentLoaded", () => {
  cargarCampañasDesdeFirebase();
  cargarBlogsSemanaActual();
  cargarInspiraDeLaSemana();
});




function initDashboard() {
    const avatar = document.getElementById("avatar");
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");

    const correo = prompt("Ingresa tu correo para cargar tu perfil:");
    if (!correo) return;

    db.collection("usuarios").doc(correo).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.fotoPerfil) avatar.src = data.fotoPerfil;
            if (data.nombreUsuario) userName.innerText = data.nombreUsuario;
            if (data.correoUsuario) userEmail.innerText = data.correoUsuario;
        }
    }).catch(error => {
        console.error("Error al cargar perfil: ", error);
    });
}





//upd 22-07 v1
