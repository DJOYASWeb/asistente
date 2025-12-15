// ==========================================================
// 🔁 DASHBOARD RECOMPRA — CLIENTAS
// ==========================================================

async function cargarDashboardRecompra() {
  showLoader();

  try {
    const saved = localStorage.getItem("csv_ventas");
    if (!saved) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ No hay CSV de ventas configurado.</p>
        </div>`;
      return;
    }

    // ==================================================
    // 📥 Cargar CSV
    // ==================================================
    const resp = await fetch(saved);
    const text = await resp.text();
    const raw = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

    // ==================================================
    // 🧹 Normalizar encabezados
    // ==================================================
    const data = raw.map(r => {
      const o = {};
      Object.keys(r).forEach(k => {
        o[k.trim().toLowerCase().replace(/\s+/g, "_")] = r[k];
      });
      return o;
    });

    // ==================================================
    // 🕒 Parsear fecha
    // ==================================================
    function parseFecha(str) {
      if (!str) return null;
      const [f] = str.split(" ");
      const [y, m, d] = f.split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }

    // ==================================================
    // 📅 Filtrar por rango activo
    // ==================================================
    const inicio = rangoPrincipal?.[0] || null;
    const fin = rangoPrincipal?.[1] || null;

    const filtrados = data.filter(r => {
      const f = parseFecha(r.fecha_y_hora);
      if (!f) return false;
      if (inicio && fin) return f >= inicio && f <= fin;
      return true;
    });

    if (filtrados.length === 0) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card">
          <p class="muted text-center">⚠️ No hay compras en el rango seleccionado.</p>
        </div>`;
      return;
    }

    // ==================================================
    // 👩‍🦰 AGRUPAR POR CLIENTA
    // ==================================================
    const clientesMap = {};

    filtrados.forEach(r => {
      const cliente = r.id_del_cliente || r.id_cliente;
      if (!cliente) return;

      const fecha = parseFecha(r.fecha_y_hora);
      if (!fecha) return;

      if (!clientesMap[cliente]) {
        clientesMap[cliente] = {
          cliente,
          compras: 0,
          ultimaCompra: fecha
        };
      }

      clientesMap[cliente].compras += 1;

      if (fecha > clientesMap[cliente].ultimaCompra) {
        clientesMap[cliente].ultimaCompra = fecha;
      }
    });

    const clientes = Object.values(clientesMap);

    // ==================================================
    // 📊 SEGMENTACIÓN
    // ==================================================
    const hoy = new Date();
    const seisMesesMs = 1000 * 60 * 60 * 24 * 30 * 6;

    const unaCompra = clientes.filter(c => c.compras === 1);
    const dosCompras = clientes.filter(c => c.compras === 2);

    const fugadas = clientes.filter(
      c => hoy - c.ultimaCompra >= seisMesesMs
    );

    const recurrentes = clientes.filter(c =>
      c.compras >= 3 &&
      (hoy - c.ultimaCompra) < seisMesesMs
    );

    const clientasTotal = clientes.length;

    // ==================================================
    // 🧩 HELPER TABLAS (TOP 10)
    // ==================================================
    function renderTablaClientes(titulo, lista, mostrarDias = false) {
      return `
        <h4 style="margin-top:1.5rem;">${titulo}</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>ID Cliente</th>
              <th>Compras</th>
              <th>Última compra</th>
              ${mostrarDias ? "<th>Días sin comprar</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${
              lista.slice(0, 10).map(c => {
                const dias = Math.floor(
                  (hoy - c.ultimaCompra) / (1000 * 60 * 60 * 24)
                );

                return `
                  <tr>
                    <td>${c.cliente}</td>
                    <td>${c.compras}</td>
                    <td>${c.ultimaCompra.toISOString().slice(0,10)}</td>
                    ${mostrarDias ? `<td>${dias}</td>` : ""}
                  </tr>
                `;
              }).join("")
            }
          </tbody>
        </table>
      `;
    }

    // ==================================================
    // 🖥️ RENDER
    // ==================================================
    const main = document.getElementById("contenidoReportesMain");
    main.innerHTML = `
      <div class="ios-card">
        <h2><i class="fa-solid fa-rotate-right"></i> Recompra</h2>

        <div class="metricas-grid">

          <div class="card-metrica">
            <strong style="font-size:2rem;">${clientasTotal}</strong>
            <p>Total clientas que compraron</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${unaCompra.length}</strong>
            <p>Clientas con 1 compra</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${dosCompras.length}</strong>
            <p>Clientas con 2 compras</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${recurrentes.length}</strong>
            <p>Clientas recurrentes</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${fugadas.length}</strong>
            <p>Clientas fugadas (+6 meses)</p>
          </div>

        </div>

        ${renderTablaClientes("Clientas fugadas (top 10)", fugadas, true)}
        ${renderTablaClientes("Clientas con 1 compra (top 10)", unaCompra)}
        ${renderTablaClientes("Clientas con 2 compras (top 10)", dosCompras)}
        ${renderTablaClientes("Clientas recurrentes (top 10)", recurrentes)}

      </div>
    `;

    inyectarBotonPDF(main);

  } catch (err) {
    console.error("❌ Error recompra:", err);
    document.getElementById("contenidoReportesMain").innerHTML = `
      <div class="ios-card">
        <p class="text-danger">❌ Error cargando recompra</p>
      </div>`;
  }
}
