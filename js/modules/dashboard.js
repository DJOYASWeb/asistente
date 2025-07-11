async function cargarCampañasDesdeFirebase() {
  const db = firebase.firestore();
  const snapshot = await db.collection("dashboard_archivos").orderBy("fecha", "desc").limit(1).get();

  if (snapshot.empty) {
    console.warn("No hay archivos cargados.");
    return;
  }

  const archivo = snapshot.docs[0].data();

  const sheets = JSON.parse(archivo.data);  // ✅ aquí parseamos
  const hoja = sheets[Object.keys(sheets)[0]];  // asumimos la primera hoja

  const filas = hoja.slice(0, 6);  // solo las primeras 6 filas
  console.table(filas);

  const mesesFila = filas[0];
  const semanasFila = filas[1];
  const principalFila = filas[2];
  const segundaFila = filas[3];
  const terceraFila = filas[4];
  const activacionFila = filas[5];

  const hoy = new Date();
  const mesActual = hoy.toLocaleString("es-CL", { month: "long" }).toUpperCase();
  const dia = hoy.getDate();

  let semanaActual = -1;

  // 👇 recorremos desde columna 2 (índice 2)
  for (let i = 2; i < semanasFila.length; i++) {
    const mesCelda = mesesFila[i] || mesesFila[i - 1];
    const semanaStr = semanasFila[i];
    if (!semanaStr || typeof semanaStr !== "string" || !semanaStr.includes("-")) continue;

    const [inicio, fin] = semanaStr.split("-").map(n => parseInt(n));
    if (mesCelda?.toUpperCase().includes(mesActual) && dia >= inicio && dia <= fin) {
      semanaActual = i;
      console.log(`✅ Semana actual detectada en columna: ${semanaActual} Rango: ${semanaStr}`);
      break;
    }
  }

  if (semanaActual === -1) {
    console.warn("No se encontró semana actual.");
    return;
  }

  // ✅ Mostramos campañas activas
  document.getElementById("campanaPrincipalActual").textContent = principalFila[semanaActual] || "-";
  document.getElementById("campanaSegundaActual").textContent = segundaFila[semanaActual] || "-";
  document.getElementById("campanaTerceraActual").textContent = terceraFila[semanaActual] || "-";

  // ✅ Mostramos campañas próximas
  document.getElementById("campanaPrincipalProxima").textContent = principalFila[semanaActual + 1] || "-";
  document.getElementById("campanaSegundaProxima").textContent = segundaFila[semanaActual + 1] || "-";
  document.getElementById("campanaTerceraProxima").textContent = terceraFila[semanaActual + 1] || "-";

  // ✅ Semanas hasta próxima principal distinta
  let semanasFaltan = 0;
  for (let i = semanaActual + 1; i < principalFila.length; i++) {
    if (principalFila[i] && principalFila[i] !== principalFila[semanaActual]) {
      semanasFaltan = i - semanaActual;
      break;
    }
  }

  document.getElementById("semanasFaltan").textContent = semanasFaltan;
  cargarBlogsDeLaSemana(semanaActual, semanasFila, mesesFila);
}


async function cargarBlogsDeLaSemana(semanaActual, semanasFila, mesesFila) {
  const db = firebase.firestore();

  const blogsSemana = document.getElementById("blogsSemana");
  blogsSemana.innerHTML = "";

  // Obtenemos el rango de la semana en texto
  const semanaStr = semanasFila[semanaActual];
  const mesStr = mesesFila[semanaActual] || mesesFila[semanaActual - 1];
  if (!semanaStr || !mesStr) {
    blogsSemana.innerHTML = "<li class='list-group-item text-muted'>No hay rango definido</li>";
    return;
  }

  const [inicioDia, finDia] = semanaStr.split("-").map(n => parseInt(n));
  const mesActual = (new Date()).getFullYear(); // para incluir año actual

  const meses = {
    "ENERO": 0, "FEBRERO": 1, "MARZO": 2, "ABRIL": 3,
    "MAYO": 4, "JUNIO": 5, "JULIO": 6, "AGOSTO": 7,
    "SEPTIEMBRE": 8, "OCTUBRE": 9, "NOVIEMBRE": 10, "DICIEMBRE": 11
  };

  const mesIndex = meses[mesStr.trim().toUpperCase()];
  if (mesIndex === undefined) {
    blogsSemana.innerHTML = "<li class='list-group-item text-muted'>Mes no válido</li>";
    return;
  }

  const inicioFecha = new Date(mesActual, mesIndex, inicioDia, 0, 0, 0);
  const finFecha = new Date(mesActual, mesIndex, finDia, 23, 59, 59);

  const snapshot = await db.collection("blogs")
    .where("fecha", ">=", firebase.firestore.Timestamp.fromDate(inicioFecha))
    .where("fecha", "<=", firebase.firestore.Timestamp.fromDate(finFecha))
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
    li.textContent = data.titulo || "(Sin título)";
    blogsSemana.appendChild(li);
  });
}





document.addEventListener("DOMContentLoaded", () => {
  cargarCampañasDesdeFirebase();
});









//upd 11-07 v2.9.4 con logs
