// ==========================================================
// 🔁 DASHBOARD RECOMPRA — CHURN POR ÚLTIMA COMPRA REAL
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
    const raw = Papa.parse(text, {
      header: true,
      skipEmptyLines: true
    }).data;

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
        1
      );

      fin = new Date(
        rangoPrincipal[1].getFullYear(),
        rangoPrincipal[1].getMonth() + 1,
        0
      );
    }

    // ==================================================
    // 📦 Filtrar ventas
    // ==================================================
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
    // 📉 CHURN MENSUAL (ÚLTIMA COMPRA REAL)
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
      churnMensual[m] = {
        c1: 0,
        c2: 0,
        c3: 0,
        c4: 0,
        c5: 0
      };
    });

    // 🔴 LÓGICA CLAVE
    clientes.forEach(c => {
      const mes = getMesKey(c.ultimaCompra);
      if (!churnMensual[mes]) return;

      if (c.compras === 1) churnMensual[mes].c1 += 1;
      else if (c.compras === 2) churnMensual[mes].c2 += 1;
      else if (c.compras === 3) churnMensual[mes].c3 += 1;
      else if (c.compras === 4) churnMensual[mes].c4 += 1;
      else if (c.compras >= 5) churnMensual[mes].c5 += 1;
    });

    // ==================================================
    // 🧾 Render tabla churn
    // ==================================================
    function renderTablaChurnMensual(data) {
      const filas = Object.keys(data).sort().map(mes => `
        <tr>
          <td>${mes}</td>
          <td>${data[mes].c1}</td>
          <td>${data[mes].c2}</td>
          <td>${data[mes].c3}</td>
          <td>${data[mes].c4}</td>
          <td>${data[mes].c5}</td>
        </tr>
      `).join("");

      return `
        <h4 style="margin-top:2rem;">📉 Clientas que dejaron de comprar (mes última compra)</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>Mes</th>
              <th>1 compra</th>
              <th>2 compras</th>
              <th>3 compras</th>
              <th>4 compras</th>
              <th>5+ compras</th>
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
        <h2>🔁 Recompra</h2>
        ${renderTablaChurnMensual(churnMensual)}
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
