// blog-creador.js

let navegacionBlogs = [];
let blogs = [];

function cargarNavegacionSelects() {
  fetch('./data/navegacion.json')
    .then(res => res.json())
    .then(data => {
      navegacionBlogs = data;

      const selectAnterior = document.getElementById("selectAnterior");
      const selectSiguiente = document.getElementById("selectSiguiente");

      data.forEach((blog, index) => {
        const optionA = document.createElement("option");
        optionA.value = index;
        optionA.textContent = blog.titulo;
        selectAnterior.appendChild(optionA);

        const optionS = document.createElement("option");
        optionS.value = index;
        optionS.textContent = blog.titulo;
        selectSiguiente.appendChild(optionS);
      });
    });
}

function llenarSelects() {
  fetch('./data/blogs.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      blogs = data;
      const selects = [select1, select2, select3];
      selects.forEach(select => {
        select.innerHTML = "";
        blogs.forEach((blog, index) => {
          const option = document.createElement("option");
          option.value = index;
          option.textContent = blog.titulo;
          select.appendChild(option);
        });
      });
    });
}

window.onload = () => {
  llenarSelects();
  cargarNavegacionSelects();
};

function generarHTML() {
  const titulo = document.getElementById("titulo").value;
  const fecha = document.getElementById("fecha").value;
  const autor = document.getElementById("autor").value;
  const categoria = document.getElementById("categoria").value;
  const imagen = document.getElementById("imagen").value;
  const altImagen = document.getElementById("altImagen").value;
  const cuerpo = document.getElementById("cuerpo").value;

  if (!titulo || !fecha || !autor || !categoria || !imagen || !cuerpo) {
    alert("Por favor completa todos los campos obligatorios antes de generar el HTML.");
    return;
  }

  const blogAnterior = navegacionBlogs[parseInt(document.getElementById("selectAnterior").value)];
  const blogSiguiente = navegacionBlogs[parseInt(document.getElementById("selectSiguiente").value)];

  const destacados = [
    blogs[parseInt(select1.value)],
    blogs[parseInt(select2.value)],
    blogs[parseInt(select3.value)]
  ];

  const destacadosHTML = destacados.map(blog => `
    <div class="row card-recomendados">
      <div class="col-5 portada-recomendados">
        <a href="${blog.url}"><img src="${blog.img}"></a>
      </div>
      <div class="col-7">
        <a href="${blog.url}"><h3 class="recomendados pt-2">${blog.titulo}</h3></a>
        <div class="etiquetas"><a class="etiqueta-tag" href="${blog.url.split('/').slice(0, 6).join('/')}">${blog.categoria}</a></div>
      </div>
    </div>
    <hr>
  `).join('\n');

  const slug = categoria.toLowerCase().replace(/\s+/g, '-');
  const slugAnterior = blogAnterior.categoria.toLowerCase().replace(/\s+/g, '-');
  const slugSiguiente = blogSiguiente.categoria.toLowerCase().replace(/\s+/g, '-');

  const html = `
<div class="blog container">
  <!-- Header Blog -->
  <section class="header-blog">
    <h1 class="titulo-blog">${titulo}</h1>
    <div class="info-blog">
      <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${slug}">${categoria}</a>
      <a class="ml-2">${fecha}</a>
      <span class="ml-2">Autora: <a href="#"><u>${autor}</u></a></span>
    </div>
    <div class="portada-blog">
      <img src="${imagen}" class="caja-img" alt="${altImagen}">
    </div>
  </section>

  <!-- Contenido Blog -->
  <section class="contenido-blog">
    <p>${cuerpo}</p>
  </section>

  <hr>

  <!-- Redes Sociales -->
  <section class="rrss-blog row container py-3">
    <div class="col-6"><a>Sofia de DJOYAS, </a><a>${fecha}</a></div>
    <div class="col-6 iconos-blog">
      <a href="https://www.youtube.com/@distribuidoradejoyaschile9639"><i class="fa fa-youtube icono-contenido mx-1"></i></a>
      <a href="https://www.instagram.com/distribuidoradejoyas.cl/"><i class="fa fa-instagram icono-contenido mx-1"></i></a>
      <a href="https://cl.pinterest.com/distribuidoradejoyasCL/"><i class="fa fa-pinterest icono-contenido mx-1"></i></a>
      <a href="https://www.facebook.com/distribuidoradejoyaschile"><i class="fa fa-facebook icono-contenido mx-1"></i></a>
    </div>
  </section>

  <!-- Navegación entre artículos -->
  <section class="navegacion-articulos row mt-5">
    <div class="col-lg-6 col-md-6 col-12">
      <div class="bloque">
        <a href="${blogAnterior.url}">
          <p class="etiqueta-blog"><i class="fa fa-angle-left mx-2"></i>Blog anterior</p>
        </a>
        <hr>
        <div class="row card-recomendados">
          <div class="col-auto">
            <h3 class="recomendados pt-2"><a href="${blogAnterior.url}">${blogAnterior.titulo}</a></h3>
            <div class="etiquetas">
              <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${slugAnterior}">${blogAnterior.categoria}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-lg-6 col-md-6 col-12">
      <div class="bloque2">
        <a href="${blogSiguiente.url}">
          <p class="etiqueta-blog">Blog siguiente <i class="fa fa-angle-right mx-2"></i></p>
        </a>
        <hr>
        <div class="row card-recomendados">
          <div class="col-auto">
            <h3 class="recomendados pt-2"><a href="${blogSiguiente.url}">${blogSiguiente.titulo}</a></h3>
            <div class="etiquetas">
              <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${slugSiguiente}">${blogSiguiente.categoria}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Más vistos -->
  <section class="destacados mt-5">
    <div class="caja">
      <h2 class="titulo-card">Blog más vistos</h2>
      <hr>
      ${destacadosHTML}
    </div>
  </section>

  <!-- Newsletter -->
  <section class="newsletter-blog my-3">
    <div class="row">
      <div class="col-12 col-lg-9 cuerpo-newsletter">
        <h2>¿Estás buscando ese impulso extra para tu emprendimiento?</h2>
        <p>Suscríbete y recibe todas las novedades, consejos y más.</p>
        <form class="elementor-newsletter-form">
          <div class="row">
            <div class="col-12">
              <div class="input-group">
                <input name="email" type="email" class="form-control" placeholder="Ingresa tu correo electrónico">
                <button class="btn-newsletter" type="submit">Suscribirse</button>
              </div>
            </div>
          </div>
        </form>
      </div>
      <div class="col-12 col-lg-3 mt-4 cuerpo-newsletter">
        <img src="/img/cms/paginas internas/blogs/bloques usuarias.png" width="200px">
        <p>Más de 25K + clientas reciben nuestros correos</p>
      </div>
    </div>
  </section>
</div>
`.trim();

  document.getElementById("resultado").textContent = html;
}

function copiarHTML() {
  const resultado = document.getElementById("resultado").textContent;
  navigator.clipboard.writeText(resultado)
    .then(() => alert("Código copiado al portapapeles"))
    .catch(err => alert("Error al copiar: " + err));
}
