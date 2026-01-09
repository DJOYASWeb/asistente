// Variable global para controlar la fecha que se está viendo
let fechaCalendario = new Date();

function renderizarCalendario() {
    const grid = document.getElementById('calendarGrid');
    const titulo = document.getElementById('tituloMes');

    // 🛡️ PROTECCIÓN: Si no estamos en la pestaña calendario, salimos.
    if (!grid || !titulo) return;

    // 1. Obtener datos (prioridad a los datos globales cargados por blog-admin.js)
    const blogs = window.datosTabla || [];

    grid.innerHTML = "";

    // Datos del mes actual del calendario
    const year = fechaCalendario.getFullYear();
    const month = fechaCalendario.getMonth(); // 0 = Enero, 1 = Febrero...
    
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

    // Dibujar los días reales (1 al 30/31)
    const hoy = new Date();
    
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const celda = document.createElement('div');
        let clases = 'calendar-day';
        
        // Marcar el día de hoy
        if (dia === hoy.getDate() && month === hoy.getMonth() && year === hoy.getFullYear()) {
            clases += ' day-today';
        }
        celda.className = clases;
        
        // Creamos la fecha objetivo de este cuadro: YYYY-MM-DD (Ej: 2026-02-12)
        // Nota: PadStart agrega el 0 a la izquierda si es necesario (1 -> 01)
        const mesStr = String(month + 1).padStart(2, '0');
        const diaStr = String(dia).padStart(2, '0');
        const fechaCuadro = `${year}-${mesStr}-${diaStr}`;

        // --- FILTRADO INTELIGENTE ---
        const eventosDelDia = blogs.filter(blog => {
            // ✅ AQUÍ ESTÁ LA CLAVE:
            // Usamos fechaIso si existe (es la mejor), si no, usamos fecha normal.
            const fechaParaRevisar = blog.fechaIso || blog.fecha;
            
            return compararFechas(fechaParaRevisar, fechaCuadro);
        });

        // HTML interno de la celda
        let htmlContenido = `<span class="day-number">${dia}</span>`;
        
        eventosDelDia.forEach(ev => {
            let color = 'bg-primary'; 
            const estado = (ev.estado || '').toLowerCase();

            if (estado.includes('publicad')) color = 'bg-success';
            else if (estado.includes('borrador') || estado.includes('pendiente')) color = 'bg-warning text-dark';
            else if (estado.includes('archivado')) color = 'bg-secondary';

            // Cortar títulos muy largos
            const tituloCorto = ev.nombre && ev.nombre.length > 18 ? ev.nombre.substring(0, 18) + '..' : (ev.nombre || 'Sin título');

            htmlContenido += `
                <div class="event-tag ${color} mb-1" 
                     title="${ev.nombre} (${ev.estado})" 
                     onclick="alert('📝 ${ev.nombre}\\n📅 ${ev.fechaIso || ev.fecha}')">
                    ${tituloCorto}
                </div>
            `;
        });

        celda.innerHTML = htmlContenido;
        grid.appendChild(celda);
    }
}

// --- FUNCIÓN DE COMPARACIÓN DE FECHAS (UNIVERSAL) ---
function compararFechas(fechaDato, fechaCalendario) {
    if (!fechaDato) return false;

    try {
        // 1. Limpieza: Quitamos horas, espacios y convertimos barras a guiones
        // Entrada posible: "22/11/2023", "2026-02-12", "2026-02-12 10:00:00"
        let fecha = fechaDato.toString().split(' ')[0].trim().replace(/\//g, '-');
        
        // fechaCalendario SIEMPRE es "YYYY-MM-DD" (Ej: 2026-02-12)

        // CASO A: Coincidencia Exacta (Ideal para fechaIso)
        if (fecha === fechaCalendario) return true;

        // CASO B: Intentar voltear si viene como DD-MM-YYYY
        const partes = fecha.split('-');
        
        if (partes.length === 3) {
            // Si el último bloque tiene 4 dígitos (DD-MM-YYYY), es el año
            if (partes[2].length === 4) {
                const fechaInvertida = `${partes[2]}-${partes[1]}-${partes[0]}`;
                return fechaInvertida === fechaCalendario;
            }
        }

        return false;
    } catch (e) {
        return false;
    }
}

// Navegación (Anterior / Siguiente)
function cambiarMes(delta) {
    fechaCalendario.setMonth(fechaCalendario.getMonth() + delta);
    renderizarCalendario();
}

// Exponer funciones al navegador
window.cambiarMes = cambiarMes;
window.renderizarCalendario = renderizarCalendario;

function compararFechas(fechaDato, fechaCalendario) {
    if (!fechaDato) return false;

    try {
        // 1. Limpieza: Quitamos horas y espacios si los hay
        // Convertimos todo a guiones para estandarizar (22/11/2023 -> 22-11-2023)
        let fecha = fechaDato.toString().split(' ')[0].trim().replace(/\//g, '-');
        
        // fechaCalendario siempre viene como "YYYY-MM-DD" (Ej: 2026-02-12)

        // CASO A: Coincidencia Exacta (Ideal para fechaIso)
        // Si fechaDato es "2026-02-12" y calendario es "2026-02-12" -> ¡BINGO!
        if (fecha === fechaCalendario) return true;

        // CASO B: Formato Invertido (DD-MM-YYYY vs YYYY-MM-DD)
        // Si fechaDato es "12-02-2026"
        const partes = fecha.split('-');
        
        // Si tiene 3 partes...
        if (partes.length === 3) {
            // Si el AÑO está al final (DD-MM-YYYY)
            // partes[0] = 12, partes[1] = 02, partes[2] = 2026
            if (partes[2].length === 4) {
                // Reconstruimos a YYYY-MM-DD para comparar
                const fechaInvertida = `${partes[2]}-${partes[1]}-${partes[0]}`;
                return fechaInvertida === fechaCalendario;
            }
        }

        return false;

    } catch (e) {
        return false;
    }
}

// Navegación
function cambiarMes(delta) {
    fechaCalendario.setMonth(fechaCalendario.getMonth() + delta);
    renderizarCalendario();
}

// Exponer globalmente
window.cambiarMes = cambiarMes;
window.renderizarCalendario = renderizarCalendario;