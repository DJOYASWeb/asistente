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
      console.log(`✅ Semana actual detectada en columna: ${semanaActual} Rango: ${semanaStr}`);
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

async function cargarBlogsDeLaSemanaActual() {
  const db = firebase.firestore();
  const blogsSemana = document.getElementById("blogsSemana");
  blogsSemana.innerHTML = "";

  const hoy = new Date();
  const anio = hoy.getFullYear();

  const diaSemana = hoy.getDay(); // 0=domingo, 1=lunes
  const diffLunes = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);

  const inicioSemana = new Date(anio, hoy.getMonth(), diffLunes, 0, 0, 0);
  const finSemana = new Date(anio, hoy.getMonth(), diffLunes + 6, 23, 59, 59);

  console.log("📆 Semana actual:", inicioSemana.toLocaleDateString(), "→", finSemana.toLocaleDateString());

  const snapshot = await db.collection("blogs")
    .where("fecha", ">=", firebase.firestore.Timestamp.fromDate(inicioSemana))
    .where("fecha", "<=", firebase.firestore.Timestamp.fromDate(finSemana))
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
  cargarBlogsDeLaSemanaActual();
});


//upd 11-07 v2.9.5
