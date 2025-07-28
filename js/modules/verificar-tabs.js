// js/modules/verificar-tabs.js

firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    if (typeof aplicarPermisosDeTabs === "function") {
      await aplicarPermisosDeTabs(user.uid);
    }
  } else {
    window.location.href = "login.html";
  }
});
