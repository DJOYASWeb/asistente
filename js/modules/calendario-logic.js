let fechaCalendario = new Date();

// --- LISTA DE FERIADOS CHILENOS (Fijos y Móviles 2025-2026) ---
function obtenerNombreFeriado(dia, mes, anio) {
    // Mes en JS es 0-11 (Enero es 0)
    const key = `${dia}-${mes}`; // Formato "Día-Mes"

    // 1. Feriados FIJOS (misma fecha todos los años)
    const fijos = {
        "1-0": "Año Nuevo",
        "1-4": "Día del Trabajo",
        "21-4": "Glorias Navales",
        "20-5": "Pueblos Indígenas", // Aprox (cambia, pero solemos dejar fijo o ajustar)
        "29-5": "San Pedro y San Pablo",
        "16-6": "Virgen del Carmen",
        "15-7": "Asunción de la Virgen",
        "18-8": "Independencia Nacional",
        "19-8": "Glorias del Ejército",
        "12-9": "Encuentro de Dos Mundos",
        "31-9": "Día de las Iglesias Evangélicas",
        "1-10": "Día de todos los Santos",
        "8-11": "Inmaculada Concepción",
        "25-11": "Navidad"
    };

    if (fijos[key]) return fijos[key];

    // 2. Feriados MÓVILES Específicos (Semana Santa, etc.) para 2025 y 2026
    // Formato: "dia-mes-año": "Nombre"
    const moviles = {
        // 2025
        "18-3-2025": "Viernes Santo",
        "19-3-2025": "Sábado Santo",
        // 2026 (Semana Santa cae en Abril)
        "3-3-2026": "Viernes Santo", // 3 de Abril (mes 3 en JS)
        "4-3-2026": "Sábado Santo"
    };

    const keyFull = `${dia}-${mes}-${anio}`;
    return moviles[keyFull] || null;
}

function renderizarCalendario() {
    const grid = document.getElementById('calendarGrid');
    const titulo = document.getElementById('tituloMes');

    if (!grid || !titulo) return;

    // --- 1. FUSIÓN DE DATOS (Blogs + Inspira) ---
    const listaBlogs = window.datosTabla || [];
    const listaInspira = window.datosInspira || [];
    const todosLosEventos = [...listaBlogs, ...listaInspira];

    console.log(`📊 Calendario: ${listaBlogs.length} Blogs + ${listaInspira.length} Inspira.`);

    grid.innerHTML = "";

    const anioCal = fechaCalendario.getFullYear();
    const mesCal = fechaCalendario.getMonth(); 
    
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    titulo.innerText = `${nombresMeses[mesCal]} ${anioCal}`;

    // --- LÓGICA SEMANA COMIENZA EN LUNES ---
    // getDay(): 0=Dom, 1=Lun, 2=Mar...
    let primerDiaSemana = new Date(anioCal, mesCal, 1).getDay();
    
    // Convertir a formato: 0=Lun, 1=Mar ... 6=Dom
    // Si es Domingo (0) -> se vuelve 6
    // Si es Lunes (1) -> se vuelve 0
    primerDiaSemana = (primerDiaSemana === 0) ? 6 : primerDiaSemana - 1;

    const diasEnMes = new Date(anioCal, mesCal + 1, 0).getDate();

    // Relleno vacío inicial
    for (let i = 0; i < primerDiaSemana; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }

// Días reales
    const hoy = new Date();

    for (let dia = 1; dia <= diasEnMes; dia++) {
        const celda = document.createElement('div');
        let clases = 'calendar-day';
        
        // --- 1. VERIFICAR FERIADO ---
        const nombreFeriado = obtenerNombreFeriado(dia, mesCal, anioCal);
        
        // Si es feriado, añadimos la clase que pinta todo el fondo rosa
        if (nombreFeriado) {
            clases += ' feriado-dia';
        }

        // --- 2. Verificar si es HOY ---
        if (dia === hoy.getDate() && mesCal === hoy.getMonth() && anioCal === hoy.getFullYear()) {
            clases += ' day-today';
        }
        celda.className = clases;

        // Filtrar eventos del día
        const eventosDelDia = todosLosEventos.filter(item => {
            return esFechaCorrecta(item.fecha, dia, mesCal + 1, anioCal);
        });

        // Construir HTML de la celda
        // Si es feriado, usamos la clase 'feriado-num' para el número rojo
        const numClass = nombreFeriado ? 'feriado-num' : '';
        let htmlContenido = `<span class="day-number ${numClass}">${dia}</span>`;
        
        // Si hay feriado, mostrar nombre pequeño debajo del número
        if (nombreFeriado) {
            htmlContenido += `<span class="feriado-nombre">${nombreFeriado}</span>`;
        }

        // Pintar eventos (Blogs e Inspira)
        eventosDelDia.forEach(ev => {
            let color = 'bg-primary'; 
            let tituloStr = ev.nombre || ev.titulo || 'Sin título';

            // Colores según tipo
            if (ev.tipo === 'inspira') {
                color = 'bg-info text-dark'; 
            } else {
                const estado = (ev.estado || '').toLowerCase();
                if (estado.includes('publicad')) color = 'bg-success';
                else if (estado.includes('borrador') || estado.includes('pendiente')) color = 'bg-warning text-dark';
                else if (estado.includes('archivado')) color = 'bg-secondary';
            }

            const tituloCorto = tituloStr.length > 18 ? tituloStr.substring(0, 18) + '..' : tituloStr;
            const origen = ev.tipo === 'inspira' ? 'Djoyas Inspira' : 'Blog';

            htmlContenido += `
                <div class="event-tag ${color} mb-1" 
                     title="${tituloStr} (${origen})" 
                     onclick="alert('📝 ${tituloStr}\\n📅 ${ev.fecha}\\nOrigen: ${origen}')">
                    ${tituloCorto}
                </div>
            `;
        });

        celda.innerHTML = htmlContenido;
        grid.appendChild(celda);
    }
}

// Función auxiliar de fecha (No tocar)
function esFechaCorrecta(fechaRaw, diaTarget, mesTarget, anioTarget) {
    if (!fechaRaw) return false;
    try {
        let soloFecha = fechaRaw.toString().split(/[ T]/)[0]; 
        let fechaLimpia = soloFecha.replace(/\//g, '-');
        fechaLimpia = fechaLimpia.replace(/[^0-9\-]/g, "");
        const partes = fechaLimpia.split('-');
        if (partes.length !== 3) return false;

        let d, m, a;
        if (partes[0].length === 4) {
            a = parseInt(partes[0], 10);
            m = parseInt(partes[1], 10);
            d = parseInt(partes[2], 10);
        } else {
            d = parseInt(partes[0], 10);
            m = parseInt(partes[1], 10);
            a = parseInt(partes[2], 10);
        }
        return (d === diaTarget && m === mesTarget && a === anioTarget);
    } catch (e) { return false; }
}

function cambiarMes(delta) {
    fechaCalendario.setMonth(fechaCalendario.getMonth() + delta);
    renderizarCalendario();
}

window.cambiarMes = cambiarMes;
window.renderizarCalendario = renderizarCalendario;