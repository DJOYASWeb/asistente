// Variable global para controlar la fecha que se está viendo
let fechaCalendario = new Date();

function renderizarCalendario() {
    const grid = document.getElementById('calendarGrid');
    const titulo = document.getElementById('tituloMes');

    // 🛡️ PROTECCIÓN: Si no estamos en la pestaña calendario, salimos.
    if (!grid || !titulo) return;

    // 1. Obtener datos
    const blogs = window.datosTabla || [];

    grid.innerHTML = "";

    // Datos del mes actual del calendario
    const year = fechaCalendario.getFullYear();
    const month = fechaCalendario.getMonth(); 
    
    // Títulos
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    titulo.innerText = `${nombresMeses[month]} ${year}`;

    // Cálculos matemáticos del mes
    const primerDiaSemana = new Date(year, month, 1).getDay(); // 0 = Domingo
    const diasEnMes = new Date(year, month + 1, 0).getDate();

    // Rellenar días vacíos antes del 1
    for (let i = 0; i < primerDiaSemana; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }

    // Dibujar los días reales
    const hoy = new Date();
    
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const celda = document.createElement('div');
        let clases = 'calendar-day';
        
        if (dia === hoy.getDate() && month === hoy.getMonth() && year === hoy.getFullYear()) {
            clases += ' day-today';
        }
        celda.className = clases;
        
        // Fecha objetivo: YYYY-MM-DD
        const mesStr = String(month + 1).padStart(2, '0');
        const diaStr = String(dia).padStart(2, '0');
        const fechaCuadro = `${year}-${mesStr}-${diaStr}`;

        // --- FILTRADO (SOLO MIRA blog.fecha) ---
        const eventosDelDia = blogs.filter(blog => {
            // Aquí ignoramos fechaIso y usamos solo fecha
            return compararFechas(blog.fecha, fechaCuadro);
        });

        // HTML interno de la celda
        let htmlContenido = `<span class="day-number">${dia}</span>`;
        
        eventosDelDia.forEach(ev => {
            let color = 'bg-primary'; 
            const estado = (ev.estado || '').toLowerCase();

            if (estado.includes('publicad')) color = 'bg-success';
            else if (estado.includes('borrador') || estado.includes('pendiente')) color = 'bg-warning text-dark';
            else if (estado.includes('archivado')) color = 'bg-secondary';

            const tituloCorto = ev.nombre && ev.nombre.length > 18 ? ev.nombre.substring(0, 18) + '..' : (ev.nombre || 'Sin título');

            htmlContenido += `
                <div class="event-tag ${color} mb-1" 
                     title="${ev.nombre}" 
                     onclick="alert('📝 ${ev.nombre}\\n📅 ${ev.fecha}')">
                    ${tituloCorto}
                </div>
            `;
        });

        celda.innerHTML = htmlContenido;
        grid.appendChild(celda);
    }
}

// --- COMPARADOR SOLO PARA "fecha" ---
// Detecta automáticamente si es DD/MM/YYYY o YYYY-MM-DD
function compararFechas(fechaDato, fechaCalendario) {
    if (!fechaDato) return false;

    try {
        // 1. Limpieza: Quitar hora y espacios. Cambiar barras por guiones.
        // Ej: "08/01/2026" -> "08-01-2026"
        // Ej: "2025-09-29" -> "2025-09-29"
        let fecha = fechaDato.toString().split(' ')[0].trim().replace(/\//g, '-');
        
        const partes = fecha.split('-');
        if (partes.length !== 3) return false;

        let fechaNormalizada = "";

        // 2. ¿El año está al principio o al final?
        if (partes[0].length === 4) {
            // Caso: YYYY-MM-DD (2025-09-29) -> Ya está lista
            fechaNormalizada = fecha;
        } else {
            // Caso: DD-MM-YYYY (08-01-2026) -> Lo invertimos
            fechaNormalizada = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }

        // 3. Comparar con el calendario (que siempre es YYYY-MM-DD)
        return fechaNormalizada === fechaCalendario;

    } catch (e) {
        return false;
    }
}

// Navegación
function cambiarMes(delta) {
    fechaCalendario.setMonth(fechaCalendario.getMonth() + delta);
    renderizarCalendario();
}

// Exponer funciones
window.cambiarMes = cambiarMes;
window.renderizarCalendario = renderizarCalendario;