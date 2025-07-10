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
}

document.addEventListener("DOMContentLoaded", () => {
  cargarCampañasDesdeFirebase();
});









//upd 10-07 v2.9.3 con logs
