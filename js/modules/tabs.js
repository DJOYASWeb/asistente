function showTab(tab) {
  const tabs = ['crear', 'editar', 'revisar']; // ajusta según tus secciones reales
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
