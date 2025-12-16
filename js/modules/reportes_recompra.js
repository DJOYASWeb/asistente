// ==========================================================
// 🔁 DASHBOARD RECOMPRA — CON CHURN MENSUAL
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
    // 🕒 Parse fecha
    // ==================================================
    function parseFecha(str) {
      if (!str || typeof str !== "string") return null;
      const [fechaPart] = str.trim().split(" ");
      const [y, m, d] = fechaPart.split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }

    // ==================================================
    // 📅 Rango fechas
    // ==================================================
    let inicio = null;
    let fin = null;

    if (Array.isArray(rangoPrincipal) && rangoPrincipal.length === 2) {
      inicio = new Date(
        rangoPrincipal[0].getFullYear(),
        rangoPrincipal[0].getMonth(),
        rangoPrincipal[0].getDate()
      );

      fin = new Date(
        rangoPrincipal[1].getFullYear(),
        rangoPrincipal[1].getMonth(),
        rangoPrincipal[1].getDate()
      );
    }

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
    // 📦 Agrupar por pedido
    // ==================================================
    const pedidosMap = {};

    filtrados.forEach(r => {
      const pedidoId = r.id_del_pedido || r.id_pedido;
      if (!pedidoId) return;

      if (!pedidosMap[pedidoId]) {
        pedidosMap[pedidoId] = {
          pedido: pedidoId,
          cliente: r.id_del_cliente || r.id_cliente,
          fecha: parseFecha(r.fecha_y_hora)
        };
      }
    });

    const pedidos = Object.values(pedidosMap);

    // ==================================================
    // 👩‍🦰 Agrupar por clienta
    // ==================================================
    const clientesMap = {};

    pedidos.forEach(p => {
      if (!p.cliente || !p.fecha) return;

      if (!clientesMap[p.cliente]) {
        clientesMap[p.cliente] = {
          cliente: p.cliente,
          compras: 0,
          ultimaCompra: p.fecha
        };
      }

      clientesMap[p.cliente].compras += 1;

      if (p.fecha > clientesMap[p.cliente].ultimaCompra) {
        clientesMap[p.cliente].ultimaCompra = p.fecha;
      }
    });

    const clientes = Object.values(clientesMap);

    // ==================================================
    // 📊 Segmentación
    // ==================================================
    const hoy = new Date();
    const seisMesesMs = 1000 * 60 * 60 * 24 * 30 * 6;

    const activas = clientes.filter(c => hoy - c.ultimaCompra < seisMesesMs);
    const fugadas = clientes.filter(c => hoy - c.ultimaCompra >= seisMesesMs);

    const unaCompra = activas.filter(c => c.compras === 1);
    const dosCompras = activas.filter(c => c.compras === 2);
    const recurrentes = activas.filter(c => c.compras >= 3);

    // ==================================================
    // 📉 CHURN MENSUAL
    // ==================================================
    function getMesKey(fecha) {
      return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    }

    function generarMeses(inicio, fin) {
      const meses = [];
      const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      while (cursor <= fin) {
        meses.push(getMesKey(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return meses;
    }

    const mesesRango = inicio && fin ? generarMeses(inicio, fin) : [];
    const churnMensual = {};

    mesesRango.forEach(m => {
      churnMensual[m] = { una: 0, dos: 0, tres: 0 };
    });

    fugadas.forEach(c => {
      const mes = getMesKey(c.ultimaCompra);
      if (!churnMensual[mes]) return;

      if (c.compras === 1) churnMensual[mes].una += 1;
      else if (c.compras === 2) churnMensual[mes].dos += 1;
      else if (c.compras >= 3) churnMensual[mes].tres += 1;
    });

    // ==================================================
    // 🧩 Render helpers
    // ==================================================
    function renderTablaClientes(titulo, lista, mostrarDias = false) {
      return `
        <h4 style="margin-top:1.5rem;">${titulo}</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>ID Cliente</th>
              <th>Pedidos</th>
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

    function renderTablaChurnMensual(data) {
      const filas = Object.keys(data).sort().map(mes => `
        <tr>
          <td>${mes}</td>
          <td>${data[mes].una}</td>
          <td>${data[mes].dos}</td>
          <td>${data[mes].tres}</td>
        </tr>
      `).join("");

      return `
        <h4 style="margin-top:2rem;">📉 Clientas que dejaron de comprar por mes</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>Mes</th>
              <th>1 compra</th>
              <th>2 compras</th>
              <th>3+ compras</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      `;
    }

    // ==================================================
    // 🖥️ Render final
    // ==================================================
    const main = document.getElementById("contenidoReportesMain");
    main.innerHTML = `
      <div class="ios-card">
        <h2><i class="fa-solid fa-rotate-right"></i> Recompra</h2>

        <div class="metricas-grid">
          <div class="card-metrica">
            <strong style="font-size:2rem;">${clientes.length}</strong>
            <p>Total clientas</p>
          </div>
          <div class="card-metrica">
            <strong style="font-size:2rem;">${unaCompra.length}</strong>
            <p>1 pedido</p>
          </div>
          <div class="card-metrica">
            <strong style="font-size:2rem;">${dosCompras.length}</strong>
            <p>2 pedidos</p>
          </div>
          <div class="card-metrica">
            <strong style="font-size:2rem;">${recurrentes.length}</strong>
            <p>Recurrentes</p>
          </div>
          <div class="card-metrica">
            <strong style="font-size:2rem;">${fugadas.length}</strong>
            <p>Fugadas (+6 meses)</p>
          </div>
        </div>

        ${renderTablaChurnMensual(churnMensual)}

        ${renderTablaClientes("Clientas fugadas (top 10)", fugadas, true)}
        ${renderTablaClientes("Clientas con 1 pedido (top 10)", unaCompra)}
        ${renderTablaClientes("Clientas con 2 pedidos (top 10)", dosCompras)}
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
