document.querySelectorAll(".sidebar-doc-list li").forEach(item => {
    item.addEventListener("click", () => {

        // Quitar active
        document.querySelectorAll(".sidebar-doc-list li")
          .forEach(li => li.classList.remove("active"));

        item.classList.add("active");

        const id = item.dataset.doc;

        // Cargar contenido
        document.getElementById("doc-content").innerHTML = `
            <h2>${item.innerText}</h2>
            <p>Contenido dinámico cargado para <strong>${item.innerText}</strong>.</p>
            <p>Ahora puedes reemplazar este HTML por lo que quieras.</p>
        `;
    });
});
