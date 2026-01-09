let fechaCalendario = new Date();

function renderizarCalendario() {
    const grid = document.getElementById('calendarGrid');
    const titulo = document.getElementById('tituloMes');

    if (!grid || !titulo) return;

    // --- 1. FUSIÓN DE DATOS (AQUÍ ESTÁ LA CLAVE) ---
    // Obtenemos blogs (de blog-admin.js) y contenidos (de inspira.js)
    const listaBlogs = window.datosTabla || [];
    const listaInspira = window.datosInspira || [];

    // Los unimos en una sola lista maestra
    const todosLosEventos = [...listaBlogs, ...listaInspira];

    // DEBUG: Para que veas en consola que ya están juntos
    console.log(`📊 Calendario fusionado: ${listaBlogs.length} Blogs + ${listaInspira.length} Inspira. Total: ${todosLosEventos.length}`);

    grid.innerHTML = "";

    // Datos del calendario (Mes y Año actual)
    const anioCal = fechaCalendario.getFullYear();
    const mesCal = fechaCalendario.getMonth(); // 0 = Enero
    
    // Títulos
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    titulo.innerText = `${nombresMeses[mesCal]} ${anioCal}`;

    // Días del mes
    const primerDiaSemana = new Date(anioCal, mesCal, 1).getDay();
    const diasEnMes = new Date(anioCal, mesCal + 1, 0).getDate();

    // Relleno vacío
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
        
        if (dia === hoy.getDate() && mesCal === hoy.getMonth() && anioCal === hoy.getFullYear()) {
            clases += ' day-today';
        }
        celda.className = clases;

        // --- FILTRADO (MATEMÁTICO PURO) ---
        // Usamos la lista fusionada "todosLosEventos"
        const eventosDelDia = todosLosEventos.filter(item => {
            // Usamos item.fecha (funciona para blogs e inspira por igual)
            return esFechaCorrecta(item.fecha, dia, mesCal + 1, anioCal);
        });

        // HTML Celda
        let htmlContenido = `<span class="day-number">${dia}</span>`;
        
        eventosDelDia.forEach(ev => {
            // --- LÓGICA DE COLORES ---
            let color = 'bg-primary'; // Azul base
            let tituloStr = ev.nombre || ev.titulo || 'Sin título'; // Blogs usan 'nombre', Inspira usa 'titulo'

            // 1. Si es de INSPIRA (Celeste)
            if (ev.tipo === 'inspira') {
                color = 'bg-info text-dark'; 
            } 
            // 2. Si es BLOG (Verde/Amarillo/Gris)
            else {
                const estado = (ev.estado || '').toLowerCase();
                if (estado.includes('publicad')) color = 'bg-success';
                else if (estado.includes('borrador') || estado.includes('pendiente')) color = 'bg-warning text-dark';
                else if (estado.includes('archivado')) color = 'bg-secondary';
            }

            // Cortar títulos largos
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

// --- TU FUNCIÓN MATEMÁTICA INFALIBLE (NO LA CAMBIAMOS) ---
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

    } catch (e) {
        // console.error("Error fecha:", e);
        return false;
    }
}

// Navegación
function cambiarMes(delta) {
    fechaCalendario.setMonth(fechaCalendario.getMonth() + delta);
    renderizarCalendario();
}

window.cambiarMes = cambiarMes;
window.renderizarCalendario = renderizarCalendario;