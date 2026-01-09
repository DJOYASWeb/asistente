// Variable global para la fecha actual del calendario
let fechaCalendario = new Date();

function renderizarCalendario() {
    const grid = document.getElementById('calendarGrid');
    const titulo = document.getElementById('tituloMes');
    
    // 1. Obtener datos: Intentamos leer la variable global datosTabla
    // Si no existe, usamos un array vacío para no romper el código
    const blogs = window.datosTabla || []; 

    console.log("📅 Intentando renderizar calendario con:", blogs.length, "blogs.");

    grid.innerHTML = "";

    const year = fechaCalendario.getFullYear();
    const month = fechaCalendario.getMonth();
    
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    titulo.innerText = `${nombresMeses[month]} ${year}`;

    // Cálculos de días
    const primerDiaSemana = new Date(year, month, 1).getDay(); // 0 = Domingo
    const diasEnMes = new Date(year, month + 1, 0).getDate();

    // Rellenar espacios vacíos antes del día 1
    for (let i = 0; i < primerDiaSemana; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }

    // Dibujar los días
    const hoy = new Date();
    
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const celda = document.createElement('div');
        let clases = 'calendar-day';
        
        // Marcar hoy
        if (dia === hoy.getDate() && month === hoy.getMonth() && year === hoy.getFullYear()) {
            clases += ' day-today';
        }
        celda.className = clases;
        
        // Creamos la fecha "objetivo" de este cuadro del calendario (YYYY-MM-DD)
        // OJO: Mes + 1 porque en JS los meses van de 0 a 11
        const mesStr = String(month + 1).padStart(2, '0');
        const diaStr = String(dia).padStart(2, '0');
        const fechaCuadro = `${year}-${mesStr}-${diaStr}`; // Ej: 2026-01-08

        // --- FILTRADO INTELIGENTE ---
        const eventosDelDia = blogs.filter(blog => {
            if (!blog.fecha) return false;
            return compararFechas(blog.fecha, fechaCuadro);
        });

        // HTML interno
        let htmlContenido = `<span class="day-number">${dia}</span>`;
        
        eventosDelDia.forEach(ev => {
            let color = 'bg-primary'; 
            const estado = (ev.estado || '').toLowerCase();

            if (estado.includes('publicad')) color = 'bg-success';
            else if (estado.includes('borrador') || estado.includes('pendiente')) color = 'bg-warning text-dark';
            else if (estado.includes('archivado')) color = 'bg-secondary';

            // Cortar título largo
            const tituloCorto = ev.nombre.length > 18 ? ev.nombre.substring(0, 18) + '..' : ev.nombre;

            htmlContenido += `
                <div class="event-tag ${color} mb-1" 
                     title="${ev.nombre} (${ev.estado})" 
                     onclick="alert('📝 ${ev.nombre}\\n📅 ${ev.fecha}')">
                    ${tituloCorto}
                </div>
            `;
        });

        celda.innerHTML = htmlContenido;
        grid.appendChild(celda);
    }
}

// --- FUNCIÓN MÁGICA PARA COMPARAR FECHAS ---
// Convierte cualquier cosa (08/01/2026, 2026-01-08 10:00, etc) a YYYY-MM-DD
function compararFechas(fechaBlog, fechaCalendario) {
    try {
        let fechaNormalizada = "";
        
        // Paso 1: Quitar la hora si existe (separar por espacio ' ')
        let soloFecha = fechaBlog.toString().split(' ')[0].trim();

        // Paso 2: Detectar si es DD/MM/YYYY
        if (soloFecha.includes('/')) {
            const partes = soloFecha.split('/'); // [08, 01, 2026]
            if (partes.length === 3) {
                // Lo voltea a 2026-01-08
                fechaNormalizada = `${partes[2]}-${partes[1]}-${partes[0]}`;
            }
        } 
        // Paso 3: Detectar si es YYYY-MM-DD
        else if (soloFecha.includes('-')) {
            fechaNormalizada = soloFecha;
        }

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

// Exponer globalmente
window.cambiarMes = cambiarMes;
window.renderizarCalendario = renderizarCalendario;