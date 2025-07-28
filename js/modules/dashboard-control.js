
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    await aplicarPermisosDeTabs(user.uid);
  } else {
    // Si no está autenticado, lo redirige al login
    window.location.href = "login.html";
  }
});
