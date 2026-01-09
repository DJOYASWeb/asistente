let fechaCalendario = new Date();

function renderizarCalendario() {
    const grid = document.getElementById('calendarGrid');
    const titulo = document.getElementById('tituloMes');

    if (!grid || !titulo) return;

    // Obtener datos
    const blogs = window.datosTabla || [];
    
    // DEBUG: Ver cuántos blogs hay
    console.log(`📊 Renderizando calendario. Total blogs cargados: ${blogs.length}`);

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
        // Le pasamos el día, mes (1-12) y año numéricos.
        const eventosDelDia = blogs.filter(blog => {
            // SOLO usamos blog.fecha como pediste
            return esFechaCorrecta(blog.fecha, dia, mesCal + 1, anioCal);
        });

        // DEBUG ESPECÍFICO PARA EL DÍA 13 DE ENERO (Para ver si lo encuentra)
        if (dia === 13 && mesCal === 0 && anioCal === 2026) {
             if (eventosDelDia.length === 0) {
                 console.warn("⚠️ Día 13 Enero: No se encontraron eventos. Revisa si la fecha del blog es exactamente '13/01/2026' o si tiene espacios.");
             } else {
                 console.log("✅ Día 13 Enero: ¡Evento encontrado!", eventosDelDia[0].nombre);
             }
        }

        // HTML Celda
        let htmlContenido = `<span class="day-number">${dia}</span>`;
        
        eventosDelDia.forEach(ev => {
            let color = 'bg-primary'; 
            const estado = (ev.estado || '').toLowerCase();

            if (estado.includes('publicad')) color = 'bg-success';
            else if (estado.includes('borrador') || estado.includes('pendiente')) color = 'bg-warning text-dark';
            else if (estado.includes('archivado')) color = 'bg-secondary';

            const tituloCorto = ev.nombre ? (ev.nombre.length > 18 ? ev.nombre.substring(0, 18) + '..' : ev.nombre) : 'Sin título';

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

function esFechaCorrecta(fechaRaw, diaTarget, mesTarget, anioTarget) {
    if (!fechaRaw) return false;

    try {
        // PASO 1 (CRUCIAL): Separar la fecha de cualquier hora o basura que venga después
        // Usamos .split con una expresión regular que corta en Espacio (" ") o letra "T" (común en ISO)
        // Nos quedamos solo con la primera parte [0]
        let soloFecha = fechaRaw.toString().split(/[ T]/)[0]; 

        // PASO 2: Ahora sí, limpieza de caracteres raros sobre ESA parte corta
        // Reemplaza barras por guiones para unificar
        let fechaLimpia = soloFecha.replace(/\//g, '-');
        
        // Quita cualquier cosa que no sea número o guion
        fechaLimpia = fechaLimpia.replace(/[^0-9\-]/g, "");

        const partes = fechaLimpia.split('-');

        // Si no tenemos 3 partes (Día, Mes, Año), abortamos
        if (partes.length !== 3) return false;

        let d, m, a;

        // PASO 3: Detección inteligente (¿Año al principio o al final?)
        if (partes[0].length === 4) {
            // Formato YYYY-MM-DD (2026-01-13)
            a = parseInt(partes[0], 10);
            m = parseInt(partes[1], 10);
            d = parseInt(partes[2], 10);
        } else {
            // Formato DD-MM-YYYY (13-01-2026)
            d = parseInt(partes[0], 10);
            m = parseInt(partes[1], 10);
            a = parseInt(partes[2], 10);
        }

        // PASO 4: Comparación Final
        return (d === diaTarget && m === mesTarget && a === anioTarget);

    } catch (e) {
        console.error("Error procesando fecha:", fechaRaw, e);
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