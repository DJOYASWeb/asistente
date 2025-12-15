// ==========================================================
// 🔁 DASHBOARD DE RECOMPRA
// ==========================================================
async function cargarDashboardRecompra() {
  showLoader();

  try {
    const saved = localStorage.getItem("csv_ventas");
    if (!saved) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ No hay enlace configurado para Ventas.</p>
        </div>`;
      return;
    }

    // ==========================
    // Cargar CSV ventas
    // ==========================
    const response = await fetch(saved);
    const text = await response.text();
    const raw = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

    // ==========================
    // Normalizar encabezados
    // ==========================
    const data = raw.map(row => {
      const limpio = {};
      for (let k in row) {
        limpio[k.trim().toLowerCase().replace(/\s+/g, "_")] = row[k];
      }
      return limpio;
    });

    // ==========================
    // Parse fecha
    // ==========================
    function parseFecha(str) {
      if (!str) return null;
      const [f] = str.split(" ");
      const [y, m, d] = f.split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }

    // ==========================
    // Filtro rango global
    // ==========================
    const inicio = rangoPrincipal?.[0] || null;
    const fin = rangoPrincipal?.[1] || null;

    const filtrados = data.filter(r => {
      const f = parseFecha(r.fecha_y_hora);
      if (!f) return false;
      if (inicio && fin) return f >= inicio && f <= fin;
      return true;
    });

    // ==========================
    // AGRUPAR POR CLIENTE
    // ==========================
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

    // ==========================
    // MÉTRICAS DE RECOMPRA
    // ==========================
    const unaCompra = clientes.filter(c => c.compras === 1);
    const dosCompras = clientes.filter(c => c.compras === 2);

    const hoy = new Date();
    const seisMesesMs = 1000 * 60 * 60 * 24 * 30 * 6;

    const fugadas = clientes.filter(c =>
      hoy - c.ultimaCompra >= seisMesesMs
    );

    // ==========================
    // RENDER UI
    // ==========================
    const main = document.getElementById("contenidoReportesMain");
    main.innerHTML = `
      <div class="ios-card">
        <h2><i class="fa-solid fa-rotate-right"></i> Recompra</h2>

        <div class="metricas-grid">

          <div class="card-metrica">
            <strong style="font-size:2rem;">${unaCompra.length}</strong>
            <p>Clientas con 1 compra</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${dosCompras.length}</strong>
            <p>Clientas con 2 compras</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${fugadas.length}</strong>
            <p>Clientas fugadas (+6 meses)</p>
          </div>

        </div>

        <h4 style="margin-top:1.5rem;">Clientas fugadas</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>ID Cliente</th>
              <th>Compras</th>
              <th>Última compra</th>
              <th>Días sin comprar</th>
            </tr>
          </thead>
          <tbody>
            ${fugadas
              .sort((a, b) => a.ultimaCompra - b.ultimaCompra)
              .map(c => {
                const dias = Math.floor((hoy - c.ultimaCompra) / (1000 * 60 * 60 * 24));
                return `
                  <tr>
                    <td>${c.cliente}</td>
                    <td>${c.compras}</td>
                    <td>${c.ultimaCompra.toISOString().split("T")[0]}</td>
                    <td>${dias}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    // Botón PDF (si lo estás usando)
    inyectarBotonPDF(main);

  } catch (err) {
    console.error("❌ Error recompra:", err);
    document.getElementById("contenidoReportesMain").innerHTML = `
      <div class="ios-card">
        <p class="text-danger">❌ Error cargando recompra: ${err.message}</p>
      </div>`;
  }
}
