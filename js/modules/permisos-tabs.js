
async function aplicarPermisosDeTabs(uid) {
  try {
    const docRef = window.db.collection("usuarios").doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.warn("No se encontró el documento del usuario");
      return;
    }

    const data = docSnap.data();
    const tabsPermitidas = data.tabsPermitidas || [];

    document.querySelectorAll("[data-tab]").forEach(tabEl => {
      const tab = tabEl.getAttribute("data-tab");
      if (!tabsPermitidas.includes(tab)) {
        tabEl.classList.add("d-none");
      }
    });
  } catch (e) {
    console.error("Error aplicando permisos:", e);
  }
}

window.aplicarPermisosDeTabs = aplicarPermisosDeTabs;