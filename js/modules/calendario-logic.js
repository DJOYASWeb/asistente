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

function compararFechas(fechaBlog, fechaCalendario) {
    if (!fechaBlog) return false;

    try {
        // 1. Limpieza básica: quitar horas y espacios
        let fechaLimpia = fechaBlog.toString().split(' ')[0].trim();
        
        let diaBlog, mesBlog, anioBlog;
        let partes = [];
        let separador = '';

        // 2. Identificar separador
        if (fechaLimpia.includes('/')) separador = '/';
        else if (fechaLimpia.includes('-')) separador = '-';
        else return false; // No sabemos qué es

        partes = fechaLimpia.split(separador);

        // 3. DETECCIÓN INTELIGENTE: ¿El año está al principio o al final?
        // Si la primera parte tiene 4 dígitos (ej: 2026-01-09), es YYYY-MM-DD
        if (partes[0].length === 4) {
            anioBlog = parseInt(partes[0], 10);
            mesBlog = parseInt(partes[1], 10);
            diaBlog = parseInt(partes[2], 10);
        } 
        // Si no, asumimos que es DD-MM-YYYY o DD/MM/YYYY (ej: 09-01-2026)
        else {
            diaBlog = parseInt(partes[0], 10);
            mesBlog = parseInt(partes[1], 10);
            anioBlog = parseInt(partes[2], 10);
        }

        // 4. Datos del Calendario (Siempre viene como YYYY-MM-DD)
        const partesCal = fechaCalendario.split('-');
        const anioCal = parseInt(partesCal[0], 10);
        const mesCal = parseInt(partesCal[1], 10);
        const diaCal = parseInt(partesCal[2], 10);

        // 5. Comparación final
        return (diaBlog === diaCal && mesBlog === mesCal && anioBlog === anioCal);

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