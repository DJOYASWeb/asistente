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
        // 1. LIMPIEZA AGRESIVA (NIVEL QUIRÚRGICO)
        // Convertimos a texto
        let str = fechaRaw.toString();
        
        // EXPRESIÓN REGULAR: "Reemplaza todo lo que NO sea número (0-9), guion (-) o barra (/) por NADA"
        // Esto elimina espacios invisibles, letras, símbolos raros, horas, etc.
        str = str.replace(/[^0-9\-\/]/g, "");

        // Ahora normalizamos las barras a guiones
        str = str.replace(/\//g, '-');

        // Si después de limpiar quedó algo raro (ej: --), lo arreglamos
        // Esto separa por guiones
        const partes = str.split('-').filter(p => p.length > 0); 
        
        if (partes.length !== 3) return false;

        let d, m, a;

        // 2. DETECCIÓN (Igual que antes, pero con datos puros)
        if (partes[0].length === 4) {
            // YYYY-MM-DD
            a = parseInt(partes[0], 10);
            m = parseInt(partes[1], 10);
            d = parseInt(partes[2], 10);
        } else {
            // DD-MM-YYYY
            d = parseInt(partes[0], 10);
            m = parseInt(partes[1], 10);
            a = parseInt(partes[2], 10);
        }

        // 3. COMPARACIÓN
        const coincide = (d === diaTarget && m === mesTarget && a === anioTarget);
        
        // DEBUG EXTREMO: Si es el día 13 de Enero, imprímeme qué fecha "leyó" el código
        if (diaTarget === 13 && mesTarget === 1 && anioTarget === 2026) {
             console.log(`🔍 Revisando blog con fecha sucia: "${fechaRaw}" -> Limpia: "${str}" -> ¿Coincide?: ${coincide}`);
        }

        return coincide;

    } catch (e) {
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