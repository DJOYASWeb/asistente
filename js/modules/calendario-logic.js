let fechaActual = new Date();

function renderizarCalendario() {
    const grid = document.getElementById('calendarGrid');
    const titulo = document.getElementById('tituloMes');
    
    // Si no hay datos aún, esperamos un poco o mostramos vacío
    const blogs = window.datosTabla || [];

    // Limpiar grid
    grid.innerHTML = "";

    // Datos del mes
    const year = fechaActual.getFullYear();
    const month = fechaActual.getMonth();
    
    // Nombres de meses en español
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    titulo.innerText = `${nombresMeses[month]} ${year}`;

    // Primer día del mes (0 = Domingo, 1 = Lunes...)
    const primerDia = new Date(year, month, 1).getDay();
    // Cantidad de días en el mes
    const diasEnMes = new Date(year, month + 1, 0).getDate();

    // Días vacíos previos (padding)
    for (let i = 0; i < primerDia; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }

    // Días reales
    const hoy = new Date();
    
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const celda = document.createElement('div');
        let clases = 'calendar-day';
        
        // Marcar hoy
        if (dia === hoy.getDate() && month === hoy.getMonth() && year === hoy.getFullYear()) {
            clases += ' day-today';
        }
        
        celda.className = clases;
        
        // HTML del número
        let htmlContenido = `<span class="day-number">${dia}</span>`;

        // --- BUSCAR BLOGS PARA ESTE DÍA ---
        // Formato esperado de fecha blog: "YYYY-MM-DD" o "DD/MM/YYYY"
        // Construimos string fecha actual loop:
        const fechaLoop = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const fechaLoopInversa = `${String(dia).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;

        const eventosDelDia = blogs.filter(blog => {
            if (!blog.fecha) return false;
            // Comparamos si la fecha del blog coincide con el día del loop
            // Verifica si tu fecha viene con hora (split ' ') o limpia
            const fechaBlogSoloDia = blog.fecha.split(' ')[0]; // Tomar solo la parte de la fecha
            return fechaBlogSoloDia === fechaLoop || fechaBlogSoloDia === fechaLoopInversa;
        });

        // Pintar eventos
        eventosDelDia.forEach(ev => {
            let color = 'bg-primary'; // Por defecto
            const estado = (ev.estado || '').toLowerCase();

            if (estado.includes('publicad')) color = 'bg-success';
            else if (estado.includes('borrador') || estado.includes('pendiente')) color = 'bg-warning text-dark';
            else if (estado.includes('archivado')) color = 'bg-secondary';

            // Título corto
            const tituloCorto = ev.nombre.length > 20 ? ev.nombre.substring(0, 20) + '...' : ev.nombre;

            htmlContenido += `
                <div class="event-tag ${color}" title="${ev.nombre}" onclick="alert('Blog: ${ev.nombre}\\nEstado: ${ev.estado}')">
                    ${tituloCorto}
                </div>
            `;
        });

        celda.innerHTML = htmlContenido;
        grid.appendChild(celda);
    }
}

// Funciones de navegación
function cambiarMes(delta) {
    fechaActual.setMonth(fechaActual.getMonth() + delta);
    renderizarCalendario();
}

// Exponer al global y ejecutar inicial
window.cambiarMes = cambiarMes;
window.renderizarCalendario = renderizarCalendario;

// Ejecutar cuando cargue (o llámalo al final de tu carga de datos de Firebase)
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño timeout para asegurar que datosTabla exista si viene de firebase
    setTimeout(renderizarCalendario, 1000);
});