/* ===================== Campos por entidad (amigables) ===================== */
const CAMPOS = {
  clientes: [
    {n:"id_customer", l:"id_cliente"},
    {n:"firstname",   l:"nombre"},
    {n:"lastname",    l:"apellido"},
    {n:"email",       l:"correo"},
    {n:"date_add",    l:"fecha_registro"},
    {n:"ultima_compra", l:"ultima_compra (calc)"},
    {n:"cant_pedidos",  l:"cantidad_pedidos (calc)"},
    {n:"monto_total",   l:"monto_total (entero, calc)"}
  ],
  productos: [
    {n:"id_product",      l:"id_producto"},
    {n:"reference",       l:"sku"},
    {n:"date_add",        l:"fecha_creacion"},
    {n:"precio",          l:"precio (entero)"},
    {n:"active",          l:"activo"},
    {n:"stock.quantity",  l:"stock_cantidad"},
    {n:"unidades_vendidas", l:"unidades_vendidas (calc)"}
  ],
  pedidos: [
    {n:"id_order",     l:"id_orden"},
    {n:"reference",    l:"referencia"},
    {n:"total_paid",   l:"total_pagado (entero)"},
    {n:"payment",      l:"metodo_pago"},
    {n:"date_add",     l:"fecha_pedido"},
    {n:"current_state",l:"estado"},
    {n:"cliente",      l:"cliente (calc nombre)"}
  ],
  categorias: [
    {n:"id_product",     l:"id_producto"},
    {n:"nombre_producto",l:"nombre_producto"},
    {n:"reference",      l:"sku"},
    {n:"stock.quantity", l:"stock_cantidad"},
    {n:"precio",         l:"precio (entero)"},
    {n:"marca",          l:"marca (id_manufacturer)"}
  ],
  marcas: [
    {n:"id_product",     l:"id_producto"},
    {n:"nombre_producto",l:"nombre_producto"},
    {n:"reference",      l:"sku"},
    {n:"stock.quantity", l:"stock_cantidad"},
    {n:"precio",         l:"precio (entero)"},
    {n:"marca",          l:"marca (id_manufacturer)"}
  ],
  transporte: [
    {n:"carrier_name", l:"carrier_name"},
    {n:"zone_name",    l:"zone_name"},
    {n:"shipping_cost",l:"shipping_cost (entero)"}
  ],
  ventas: [
    {n:"id_customer",    l:"id_cliente"},
    {n:"nombre",         l:"nombre (calc)"},
    {n:"cantidad_pedidos", l:"cantidad_pedidos"},
    {n:"monto_compras",  l:"monto_compras (entero)"},
    {n:"metodo_envio",   l:"metodo_envio (opcional)"}
  ],
  carros: [
    {n:"id_cart",          l:"id_carrito"},
    {n:"firstname",        l:"nombre_cliente"},
    {n:"lastname",         l:"apellido_cliente"},
    {n:"email",            l:"email_cliente"},
    {n:"phone",            l:"telefono_cliente"},
    {n:"city",             l:"ciudad_cliente"},
    {n:"date_add",         l:"fecha_creacion"},
    {n:"date_upd",         l:"ultima_actualizacion"},
    {n:"total_productos",  l:"total_productos (calc)"},
    {n:"valor_total_carrito", l:"valor_total_carrito (entero, calc)"}
  ]
};

/* ===================== Helpers & Estado ===================== */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function textoALineaLista(txt){ return txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); }
function listaSqlIN(vals, quoted=true){
  if(!vals.length) return "";
  const esc = s => s.replace(/'/g,"''");
  const arr = quoted ? vals.map(v=> `'${esc(v)}'`) : vals.map(v=> String(v).replace(/[^\d]/g,"")).filter(Boolean);
  return "(" + arr.join(",") + ")";
}
let currentStep = 1;

/* ===================== Render Campos (paso 2) ===================== */
function renderCampos(){
  Object.keys(CAMPOS).forEach(ent=>{
    const cont = document.getElementById("campos_"+ent);
    if(!cont) return;
    cont.innerHTML = "";
    CAMPOS[ent].forEach(c=>{
      const id = `${ent}_${c.n.replace(".","__")}`;
      const lab = document.createElement("label");
      lab.className = "big";
      lab.innerHTML = `<input type="checkbox" id="${id}"> <span>${c.l}</span>`;
      cont.appendChild(lab);
    });
  });
}

/* ===================== Wizard ===================== */
function updateSteps(){
  $$(".step").forEach(el => {
    const step = parseInt(el.dataset.step,10);
    el.classList.toggle("hidden", step !== currentStep);
  });
  const pills = $("#stepPills").children;
  for(let i=0;i<pills.length;i++){
    pills[i].classList.toggle("active", i+1===currentStep);
  }
  const ent = $$("input[name='ent']").find(x=>x.checked).value;
  // mostrar bloque correcto de campos y filtros
  const blocks = ["clientes","productos","pedidos","categorias","marcas","transporte","ventas","carros"];
  blocks.forEach(b=>{
    const campos = document.getElementById("stepCampos_"+b);
    const filtros = document.getElementById("stepFiltros_"+b);
    if(campos)  campos.style.display  = (currentStep===2 && ent===b) ? "block" : "none";
    if(filtros) filtros.style.display = (currentStep===3 && ent===b) ? "block" : "none";
  });
  // actualizar barra resumen cada vez
  buildSummaryBar();
  if(currentStep===4){ buildResumenFinal(); }
}
function attachNav(){
  $$(".step .next").forEach(b=> b.onclick = ()=>{ currentStep = Math.min(4, currentStep+1); updateSteps(); });
  $$(".step .prev").forEach(b=> b.onclick = ()=>{ currentStep = Math.max(1, currentStep-1); updateSteps(); });
}
$$("input[name='ent']").forEach(r=> r.onchange = updateSteps);

/* ===================== Summary live (barra) ===================== */
function addChip(container, txt){
  const s = document.createElement("span");
  s.className = "chip";
  s.textContent = txt;
  container.appendChild(s);
}
function buildSummaryBar(){
  const cont = $("#summaryBar");
  cont.innerHTML = "";
  const ent = $$("input[name='ent']").find(x=>x.checked).value;
  addChip(cont, `Entidad: ${ent}`);

  // columnas elegidas
  (CAMPOS[ent]||[]).forEach(c=>{
    const id = `${ent}_${c.n.replace(".","__")}`;
    if($("#"+id)?.checked) addChip(cont, `Columna: ${c.l}`);
  });

  // filtros rápidos (por entidad)
  if(ent==="clientes"){
    if($("#cli_activos").checked) addChip(cont,"Solo activos");
    if($("#cli_tiene_compras").checked) addChip(cont,"Solo con compras");
    if($("#cli_reg_desde").value) addChip(cont,`Desde ${$("#cli_reg_desde").value}`);
    if($("#cli_reg_hasta").value) addChip(cont,`Hasta ${$("#cli_reg_hasta").value}`);
    const lim = $("#cli_limite").value.trim(); addChip(cont, lim?`Límite: ${lim}`:"Sin límite");
  }
  if(ent==="productos"){
    if($("#pro_activos").checked) addChip(cont,"Solo activos");
    if($("#pro_stock_pos").checked) addChip(cont,"Stock > 0");
    if($("#pro_fecha_desde").value) addChip(cont,`Desde ${$("#pro_fecha_desde").value}`);
    if($("#pro_fecha_hasta").value) addChip(cont,`Hasta ${$("#pro_fecha_hasta").value}`);
    if($("#pro_incluir_ventas").checked) addChip(cont,"Incluye unidades_vendidas");
    const lim = $("#pro_limite").value.trim(); addChip(cont, lim?`Límite: ${lim}`:"Sin límite");
  }
  if(ent==="pedidos"){
    if($("#ped_fecha_desde").value) addChip(cont,`Desde ${$("#ped_fecha_desde").value}`);
    if($("#ped_fecha_hasta").value) addChip(cont,`Hasta ${$("#ped_fecha_hasta").value}`);
    if($("#ped_producto").value.trim()) addChip(cont,`Producto: ${$("#ped_producto").value.trim()}`);
    const lim = $("#ped_limite").value.trim(); addChip(cont, lim?`Límite: ${lim}`:"Sin límite");
  }
  if(ent==="categorias"){
    if($("#cat_id").value) addChip(cont,`ID categoría: ${$("#cat_id").value}`);
    addChip(cont,`id_lang: ${$("#cat_lang").value||1}`);
    const lim = $("#cat_limite").value.trim(); addChip(cont, lim?`Límite: ${lim}`:"Sin límite");
  }
  if(ent==="marcas"){
    if($("#mar_id").value) addChip(cont,`ID marca: ${$("#mar_id").value}`);
    addChip(cont,`id_lang: ${$("#mar_lang").value||1}`);
    const lim = $("#mar_limite").value.trim(); addChip(cont, lim?`Límite: ${lim}`:"Sin límite");
  }
  if(ent==="transporte"){
    if($("#tra_carrier").value) addChip(cont,`Carrier: ${$("#tra_carrier").value}`);
    if($("#tra_zone").value) addChip(cont,`Zona: ${$("#tra_zone").value}`);
    const lim = $("#tra_limite").value.trim(); addChip(cont, lim?`Límite: ${lim}`:"Sin límite");
  }
  if(ent==="ventas"){
    if($("#ven_desde").value) addChip(cont,`Desde ${$("#ven_desde").value}`);
    if($("#ven_hasta").value) addChip(cont,`Hasta ${$("#ven_hasta").value}`);
    if($("#ven_por_envio").checked) addChip(cont,"Por método de envío");
    const lim = $("#ven_limite").value.trim(); addChip(cont, lim?`Límite: ${lim}`:"Sin límite");
  }
  if(ent==="carros"){
    if($("#car_desde").value) addChip(cont,`Desde ${$("#car_desde").value}`);
    if($("#car_hasta").value) addChip(cont,`Hasta ${$("#car_hasta").value}`);
    const lim = $("#car_limite").value.trim(); addChip(cont, lim?`Límite: ${lim}`:"Sin límite");
  }
}
// escuchar cambios para refrescar barra
document.addEventListener("input", (e)=>{ buildSummaryBar(); });
document.addEventListener("change",(e)=>{ buildSummaryBar(); });

/* ===================== Resumen final (paso 4) ===================== */
function buildResumenFinal(){
  const cont = $("#resumenFinal");
  cont.innerHTML = "";
  cont.innerHTML = $("#summaryBar").innerHTML;
}

/* ===================== SQL GENERATORS ===================== */
function sql_clientes(){
  const sel = [];
  const has = id => $("#clientes_"+id.replace(".","__"))?.checked;

  sel.push("  clientes.id_customer AS id_cliente");
  if(has("firstname")) sel.push("  clientes.firstname AS nombre");
  if(has("lastname"))  sel.push("  clientes.lastname AS apellido");
  if(has("email"))     sel.push("  clientes.email AS correo");
  if(has("date_add"))  sel.push("  clientes.date_add AS fecha_registro");

  let joinOrders = false, having = [];
  if(has("ultima_compra") || has("cant_pedidos") || has("monto_total") || $("#cli_tiene_compras").checked){
    joinOrders = true;
    if(has("ultima_compra")) sel.push("  MAX(pedidos.date_add) AS ultima_compra");
    if(has("cant_pedidos"))  sel.push("  COUNT(DISTINCT pedidos.id_order) AS cant_pedidos");
    if(has("monto_total"))   sel.push("  ROUND(SUM(pedidos.total_paid),0) AS monto_total");
  }
  let sql = "SELECT\n" + (sel.length? sel.join(",\n"):"  clientes.*") + "\nFROM ps_customer AS clientes\n";
  if(joinOrders) sql += "LEFT JOIN ps_orders AS pedidos ON pedidos.id_customer = clientes.id_customer\n";

  const where = [];
  if($("#cli_activos").checked) where.push("clientes.active = 1");
  if($("#cli_reg_desde").value) where.push(`clientes.date_add >= '${$("#cli_reg_desde").value}'`);
  if($("#cli_reg_hasta").value) where.push(`clientes.date_add <= '${$("#cli_reg_hasta").value}'`);

  const correos = textoALineaLista($("#cli_correos").value);
  if(correos.length) where.push(`clientes.email IN ${listaSqlIN(correos,true)}`);
  const ruts = textoALineaLista($("#cli_ruts").value);
  if(ruts.length) where.push(`clientes.rut IN ${listaSqlIN(ruts,true)}`);

  if($("#cli_tiene_compras").checked){
    if(!joinOrders) sql += "LEFT JOIN ps_orders AS pedidos ON pedidos.id_customer = clientes.id_customer\n";
    having.push("COUNT(DISTINCT pedidos.id_order) > 0");
  }
  const pmin = $("#cli_pedidos_min").value, pmax = $("#cli_pedidos_max").value;
  if(pmin || pmax){
    if(!joinOrders) sql += "LEFT JOIN ps_orders AS pedidos ON pedidos.id_customer = clientes.id_customer\n";
    if(pmin) having.push(`COUNT(DISTINCT pedidos.id_order) >= ${parseInt(pmin,10)}`);
    if(pmax) having.push(`COUNT(DISTINCT pedidos.id_order) <= ${parseInt(pmax,10)}`);
  }

  if(where.length) sql += "WHERE\n  " + where.join("\n  AND ") + "\n";
  if(joinOrders){
    sql += "GROUP BY clientes.id_customer, clientes.firstname, clientes.lastname, clientes.email, clientes.date_add\n";
    if(having.length) sql += "HAVING\n  " + having.join("\n  AND ") + "\n";
  }

  sql += `ORDER BY ${$("#cli_orden_campo").value} ${$("#cli_orden_dir").value}\n`;
  const lim = $("#cli_limite").value.trim();
  sql += lim ? `LIMIT ${Math.max(1,parseInt(lim,10))};` : `;`;
  return sql;
}

function sql_productos(){
  const sel = [];
  const has = id => $("#productos_"+id.replace(".","__"))?.checked;

  sel.push("  productos.id_product AS id_producto");
  if(has("reference")) sel.push("  productos.reference AS sku");
  if(has("date_add"))  sel.push("  productos.date_add AS fecha_creacion");
  if(has("precio"))    sel.push("  ROUND(productos.price,0) AS precio");
  if(has("active"))    sel.push("  productos.active AS activo");

  let joinStock = false;
  if(has("stock.quantity") || $("#pro_stock_pos").checked){
    joinStock = true;
    if(has("stock.quantity")) sel.push("  COALESCE(stock.quantity,0) AS stock_cantidad");
  }

  let ventasSel = $("#pro_incluir_ventas").checked && ($("#pro_ventas_desde").value || $("#pro_ventas_hasta").value);
  let joinVentas = false;
  if(ventasSel || has("unidades_vendidas")){
    joinVentas = true;
    sel.push("  COALESCE(SUM(detalle_pedido.product_quantity),0) AS unidades_vendidas");
  }

  let sql = "SELECT\n" + (sel.length? sel.join(",\n"):"  productos.*") + "\nFROM ps_product AS productos\n";
  if(joinStock) sql += "LEFT JOIN ps_stock_available AS stock ON stock.id_product = productos.id_product AND stock.id_product_attribute = 0\n";
  if(joinVentas){
    sql += "LEFT JOIN ps_order_detail AS detalle_pedido ON detalle_pedido.product_id = productos.id_product\n";
    sql += "LEFT JOIN ps_orders AS pedidos ON pedidos.id_order = detalle_pedido.id_order\n";
  }

  const where = [];
  if($("#pro_activos").checked) where.push("productos.active = 1");
  if($("#pro_stock_pos").checked){
    if(!joinStock) sql += "LEFT JOIN ps_stock_available AS stock ON stock.id_product = productos.id_product AND stock.id_product_attribute = 0\n";
    where.push("COALESCE(stock.quantity,0) > 0");
  }
  if($("#pro_fecha_desde").value) where.push(`productos.date_add >= '${$("#pro_fecha_desde").value}'`);
  if($("#pro_fecha_hasta").value) where.push(`productos.date_add <= '${$("#pro_fecha_hasta").value}'`);

  const ids = textoALineaLista($("#pro_ids").value);
  if(ids.length) where.push(`productos.id_product IN ${listaSqlIN(ids,false)}`);
  const skus = textoALineaLista($("#pro_skus").value);
  if(skus.length) where.push(`productos.reference IN ${listaSqlIN(skus,true)}`);

  if($("#pro_incluir_ventas").checked && ($("#pro_ventas_desde").value || $("#pro_ventas_hasta").value)){
    if(!joinVentas){
      sql += "LEFT JOIN ps_order_detail AS detalle_pedido ON detalle_pedido.product_id = productos.id_product\n";
      sql += "LEFT JOIN ps_orders AS pedidos ON pedidos.id_order = detalle_pedido.id_order\n";
    }
    if($("#pro_ventas_desde").value) where.push(`pedidos.date_add >= '${$("#pro_ventas_desde").value}'`);
    if($("#pro_ventas_hasta").value) where.push(`pedidos.date_add <= '${$("#pro_ventas_hasta").value}'`);
  }

  if(where.length) sql += "WHERE\n  " + where.join("\n  AND ") + "\n";
  if(joinVentas){
    sql += "GROUP BY productos.id_product, productos.reference, productos.date_add, productos.price, productos.active";
    if(joinStock) sql += ", stock.quantity";
    sql += "\n";
  }

  sql += `ORDER BY ${$("#pro_orden_campo").value} ${$("#pro_orden_dir").value}\n`;
  const lim = $("#pro_limite").value.trim();
  sql += lim ? `LIMIT ${Math.max(1,parseInt(lim,10))};` : `;`;
  return sql;
}

function sql_pedidos(){
  const has = id => $("#pedidos_"+id.replace(".","__"))?.checked;
  const sel = [];
  sel.push("  pedidos.id_order AS id_orden");
  if(has("reference"))    sel.push("  pedidos.reference AS referencia");
  if(has("total_paid"))   sel.push("  ROUND(pedidos.total_paid,0) AS total_pagado");
  if(has("payment"))      sel.push("  pedidos.payment AS metodo_pago");
  if(has("date_add"))     sel.push("  pedidos.date_add AS fecha_pedido");
  if(has("current_state"))sel.push("  pedidos.current_state AS estado");
  if(has("cliente"))      sel.push("  CONCAT(clientes.firstname,' ',clientes.lastname) AS cliente");

  let sql = "SELECT\n" + (sel.length? sel.join(",\n"):"  pedidos.*") + "\nFROM ps_orders AS pedidos\n";
  if(has("cliente")) sql += "LEFT JOIN ps_customer AS clientes ON clientes.id_customer = pedidos.id_customer\n";

  const filtro = $("#ped_producto").value.trim();
  if(filtro){
    sql += "LEFT JOIN ps_order_detail AS detalle_pedido ON detalle_pedido.id_order = pedidos.id_order\n";
    sql += "LEFT JOIN ps_product AS productos ON productos.id_product = detalle_pedido.product_id\n";
  }

  const where = [];
  if($("#ped_fecha_desde").value) where.push(`pedidos.date_add >= '${$("#ped_fecha_desde").value}'`);
  if($("#ped_fecha_hasta").value) where.push(`pedidos.date_add <= '${$("#ped_fecha_hasta").value}'`);
  if(filtro){
    if(/^\d+$/.test(filtro)) where.push(`detalle_pedido.product_id = ${parseInt(filtro,10)}`);
    else where.push(`productos.reference = '${filtro.replace(/'/g,"''")}'`);
  }

  if(where.length) sql += "WHERE\n  " + where.join("\n  AND ") + "\n";
  sql += `ORDER BY ${$("#ped_orden_campo").value} ${$("#ped_orden_dir").value}\n`;
  const lim = $("#ped_limite").value.trim();
  sql += lim ? `LIMIT ${Math.max(1,parseInt(lim,10))};` : `;`;
  return sql;
}

function sql_categorias(){
  const has = id => $("#categorias_"+id.replace(".","__"))?.checked;
  const sel = [];
  if(has("id_product"))     sel.push("  productos.id_product AS id_producto");
  if(has("nombre_producto"))sel.push("  pl.name AS nombre_producto");
  if(has("reference"))      sel.push("  productos.reference AS sku");
  if(has("stock.quantity")) sel.push("  COALESCE(stock.quantity,0) AS stock_cantidad");
  if(has("precio"))         sel.push("  ROUND(productos.price,0) AS precio");
  if(has("marca"))          sel.push("  productos.id_manufacturer AS marca");

  let sql = "SELECT\n" + (sel.length? sel.join(",\n"):"  productos.*") + "\nFROM ps_category_product AS cp\n";
  sql += "LEFT JOIN ps_product AS productos ON productos.id_product = cp.id_product\n";
  sql += "LEFT JOIN ps_product_lang AS pl ON pl.id_product = productos.id_product AND pl.id_lang = "+(parseInt($("#cat_lang").value||"1",10))+"\n";
  sql += "LEFT JOIN ps_stock_available AS stock ON stock.id_product = productos.id_product AND stock.id_product_attribute = 0\n";

  const where = [];
  if($("#cat_id").value) where.push(`cp.id_category = ${parseInt($("#cat_id").value,10)}`);
  if(where.length) sql += "WHERE\n  " + where.join("\n  AND ") + "\n";

  sql += `ORDER BY ${$("#cat_orden_campo").value} ${$("#cat_orden_dir").value}\n`;
  const lim = $("#cat_limite").value.trim();
  sql += lim ? `LIMIT ${Math.max(1,parseInt(lim,10))};` : `;`;
  return sql;
}

function sql_marcas(){
  const has = id => $("#marcas_"+id.replace(".","__"))?.checked;
  const sel = [];
  if(has("id_product"))     sel.push("  productos.id_product AS id_producto");
  if(has("nombre_producto"))sel.push("  pl.name AS nombre_producto");
  if(has("reference"))      sel.push("  productos.reference AS sku");
  if(has("stock.quantity")) sel.push("  COALESCE(stock.quantity,0) AS stock_cantidad");
  if(has("precio"))         sel.push("  ROUND(productos.price,0) AS precio");
  if(has("marca"))          sel.push("  productos.id_manufacturer AS marca");

  let sql = "SELECT\n" + (sel.length? sel.join(",\n"):"  productos.*") + "\nFROM ps_product AS productos\n";
  sql += "LEFT JOIN ps_product_lang AS pl ON pl.id_product = productos.id_product AND pl.id_lang = "+(parseInt($("#mar_lang").value||"1",10))+"\n";
  sql += "LEFT JOIN ps_stock_available AS stock ON stock.id_product = productos.id_product AND stock.id_product_attribute = 0\n";

  const where = [];
  if($("#mar_id").value) where.push(`productos.id_manufacturer = ${parseInt($("#mar_id").value,10)}`);
  if(where.length) sql += "WHERE\n  " + where.join("\n  AND ") + "\n";

  sql += `ORDER BY ${$("#mar_orden_campo").value} ${$("#mar_orden_dir").value}\n`;
  const lim = $("#mar_limite").value.trim();
  sql += lim ? `LIMIT ${Math.max(1,parseInt(lim,10))};` : `;`;
  return sql;
}

function sql_transporte(){
  const has = id => $("#transporte_"+id.replace(".","__"))?.checked;
  const sel = [];
  if(has("carrier_name"))  sel.push("  carrier.name AS carrier_name");
  if(has("zone_name"))     sel.push("  zone.name AS zone_name");
  if(has("shipping_cost")) sel.push("  ROUND(delivery.price,0) AS shipping_cost");

  let sql = "SELECT\n" + (sel.length? sel.join(",\n"):"  carrier.name AS carrier_name, zone.name AS zone_name, ROUND(delivery.price,0) AS shipping_cost") + "\n";
  sql += "FROM ps_delivery AS delivery\n";
  sql += "LEFT JOIN ps_carrier AS carrier ON carrier.id_carrier = delivery.id_carrier\n";
  sql += "LEFT JOIN ps_zone AS zone ON zone.id_zone = delivery.id_zone\n";

  const where = [];
  if($("#tra_carrier").value) where.push(`delivery.id_carrier = ${parseInt($("#tra_carrier").value,10)}`);
  if($("#tra_zone").value)    where.push(`delivery.id_zone = ${parseInt($("#tra_zone").value,10)}`);
  if(where.length) sql += "WHERE\n  " + where.join("\n  AND ") + "\n";

  sql += `ORDER BY ${$("#tra_orden_campo").value} ${$("#tra_orden_dir").value}\n`;
  const lim = $("#tra_limite").value.trim();
  sql += lim ? `LIMIT ${Math.max(1,parseInt(lim,10))};` : `;`;
  return sql;
}

function sql_ventas(){
  const porEnvio = $("#ven_por_envio").checked;

  const sel = [];
  sel.push("  clientes.id_customer AS id_cliente");
  sel.push("  CONCAT(clientes.firstname,' ',clientes.lastname) AS nombre");
  sel.push("  COUNT(DISTINCT pedidos.id_order) AS cantidad_pedidos");
  sel.push("  ROUND(SUM(pedidos.total_paid),0) AS monto_compras");
  if(porEnvio) sel.push("  carrier.name AS metodo_envio");

  let sql = "SELECT\n" + sel.join(",\n") + "\nFROM ps_orders AS pedidos\n";
  sql += "LEFT JOIN ps_customer AS clientes ON clientes.id_customer = pedidos.id_customer\n";
  if(porEnvio) sql += "LEFT JOIN ps_carrier AS carrier ON carrier.id_carrier = pedidos.id_carrier\n";

  const where = [];
  if($("#ven_desde").value) where.push(`pedidos.date_add >= '${$("#ven_desde").value}'`);
  if($("#ven_hasta").value) where.push(`pedidos.date_add <= '${$("#ven_hasta").value}'`);
  if(where.length) sql += "WHERE\n  " + where.join("\n  AND ") + "\n";

  sql += "GROUP BY clientes.id_customer, clientes.firstname, clientes.lastname" + (porEnvio? ", carrier.name":"") + "\n";
  sql += `ORDER BY ${$("#ven_orden_campo").value} ${$("#ven_orden_dir").value}\n`;
  const lim = $("#ven_limite").value.trim();
  sql += lim ? `LIMIT ${Math.max(1,parseInt(lim,10))};` : `;`;
  return sql;
}

function sql_carros(){
  const has = id => $("#carros_"+id.replace(".","__"))?.checked;
  const sel = [];
  sel.push("  carrito.id_cart AS id_carrito");
  if(has("firstname")) sel.push("  clientes.firstname AS nombre_cliente");
  if(has("lastname"))  sel.push("  clientes.lastname AS apellido_cliente");
  if(has("email"))     sel.push("  clientes.email AS email_cliente");
  if(has("phone"))     sel.push("  addr.phone AS telefono_cliente");
  if(has("city"))      sel.push("  addr.city AS ciudad_cliente");
  if(has("date_add"))  sel.push("  carrito.date_add AS fecha_creacion");
  if(has("date_upd"))  sel.push("  carrito.date_upd AS ultima_actualizacion");
  if(has("total_productos"))  sel.push("  COALESCE(SUM(cpd.quantity),0) AS total_productos");
  if(has("valor_total_carrito")) sel.push("  ROUND(COALESCE(SUM(cpd.quantity * productos.price),0),0) AS valor_total_carrito");

  let sql = "SELECT\n" + (sel.length? sel.join(",\n"):"  carrito.*") + "\nFROM ps_cart AS carrito\n";
  sql += "LEFT JOIN ps_customer AS clientes ON clientes.id_customer = carrito.id_customer\n";
  sql += "LEFT JOIN ps_address AS addr ON addr.id_address = carrito.id_address_delivery\n";
  sql += "LEFT JOIN ps_cart_product AS cpd ON cpd.id_cart = carrito.id_cart\n";
  sql += "LEFT JOIN ps_product AS productos ON productos.id_product = cpd.id_product\n";

  // Abandonados = carritos sin pedido asociado
  sql += "LEFT JOIN ps_orders AS pedidos ON pedidos.id_cart = carrito.id_cart\n";

  const where = ["pedidos.id_order IS NULL"]; // no concretaron pedido
  if($("#car_desde").value) where.push(`carrito.date_add >= '${$("#car_desde").value}'`);
  if($("#car_hasta").value) where.push(`carrito.date_add <= '${$("#car_hasta").value}'`);
  if(where.length) sql += "WHERE\n  " + where.join("\n  AND ") + "\n";

  // agregados si se seleccionaron totales
  if(has("total_productos") || has("valor_total_carrito")){
    sql += "GROUP BY carrito.id_cart, clientes.firstname, clientes.lastname, clientes.email, addr.phone, addr.city, carrito.date_add, carrito.date_upd\n";
  }

  sql += `ORDER BY ${$("#car_orden_campo").value} ${$("#car_orden_dir").value}\n`;
  const lim = $("#car_limite").value.trim();
  sql += lim ? `LIMIT ${Math.max(1,parseInt(lim,10))};` : `;`;
  return sql;
}

/* ===================== Generar según entidad ===================== */
function generarSQL(){
  const ent = $$("input[name='ent']").find(x=>x.checked).value;
  switch(ent){
    case "clientes":   return sql_clientes();
    case "productos":  return sql_productos();
    case "pedidos":    return sql_pedidos();
    case "categorias": return sql_categorias();
    case "marcas":     return sql_marcas();
    case "transporte": return sql_transporte();
    case "ventas":     return sql_ventas();
    case "carros":     return sql_carros();
    default: return "-- Entidad no soportada --";
  }
}

/* ===================== Eventos principales ===================== */
function attachMain(){
  // navegación
  attachNav();
  // generar/copiar
  $("#generar").onclick = ()=>{ $("#salida").textContent = generarSQL(); buildResumenFinal(); };
  $("#copiar").onclick = async ()=>{ try{ await navigator.clipboard.writeText($("#salida").textContent); alert("Consulta copiada ✅"); }catch(e){ alert("No se pudo copiar automáticamente"); } };
  // refrescar summary live en todos los cambios
  document.addEventListener("input", buildSummaryBar);
  document.addEventListener("change", buildSummaryBar);
}

/* ===================== Init ===================== */
renderCampos();
attachMain();
updateSteps();