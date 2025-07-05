let jsonDataGlobal = [];
let datosFiltradosGlobal = [];

// Función mejorada para calcular el total
const calcularTotal = (row) => {
    const parsearValor = (valor) => {
        if (!valor) return 0;
        // Elimina símbolos de moneda, comas, espacios, etc.
        const num = String(valor).replace(/[^\d.-]/g, '');
        return parseFloat(num) || 0;
    };

    const col9 = parsearValor(row[9]);
    const col10 = parsearValor(row[10]);
    console.log(`Valores: col9=${col9}, col10=${col10}`); // Debug

    return col9 + col10 + 1;
};

const cargarExcel = async () => {
    mostrarCargando(true);
    try {
        const fechaHoy = obtenerFechaHoy();
        const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NTE2NzYxMDYsImV4cCI6MTc1MTgxNjEwNiwicm9sZXMiOltdLCJ1c2VybmFtZSI6IjEzOTMifQ.iPu2ryrmy9DBcp6vzBq7gTDRRgtuYKW53gcx3dcFQvFu_XzydlukTvAbEMxGMoZxWr0SQbVpGCpjV_YOccKS-acDY4xOPEMn-yoXXbohIuU0lvKFpaN3vyNMMVUyF1COjS7LqAXooLP47PELhOtqWb4ZRBClJXNK1VwAf7zG-lWy-1dSuoh0UlfWo1TqK1PqJXDtSZcSXILtIZ7kjlA1jOG5EcjrfrzEHPiqApcGoZGbybOVgzFbk8OF5uX1qNc3uLJZ7g_9X8P387grRhOjjFqB8Ae-lnP4NHgS2yF6P3g3ayGKyPcSVGxxp6Bsf8E7A3Suj-YLVBb3IKJi5oPw9nVsscIx1e0YOJ_IAO_BlbeQC2EzWlm-q7tokA_VdONYOOE5geKFGj9WunhOFUzKFM_Vz87NUWU83LMe0C8M2dyS82EM5GpwW15OiA4HIVXy2lSYuypMttLuCXxQgmGVToDv3HCoh6ToVhT26c_rrq7HSijAFp1rBgsNM2ZrZvNWUhxJgIrOinZqgkp81QWOoBnPZjqYvxrtlYzrch_DulmduTGPb0UWYINjEYRjiQYYoxYIWMCmEQGnzGsJMFHM6k-An_zejLvOhOmTk74g7dTB1zzw3bqIp6zQgI7RIUABCFkDtYs-a0FVfgKNwZLimYOMLUCNd5bfkTrW4gBM3mk";
        const url = `https://back.tgle.mx/api/check_ins/billing_report?from=${fechaHoy}%2000:00:00&to=${fechaHoy}%2023:59:59&token=${token}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonDataGlobal = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Verificar si hay datos (más de 1 fila, considerando headers)
        if (!jsonDataGlobal || jsonDataGlobal.length <= 1) {
            mostrarMensajeFlotante('No se encontraron datos en el archivo');
            mostrarTablaVacia();
            return;
        }

        // Debug: Mostrar estructura de datos
        console.log("Headers:", jsonDataGlobal[0]);
        console.log("Primera fila de datos:", jsonDataGlobal[1]);

        // Filtrar datos relevantes
        datosFiltradosGlobal = jsonDataGlobal.filter((row, index) => {
            if (index === 0) return true; // Mantener headers
            if (!row || !row.includes("-")) return false;
            const tipoPago = row[6] || "";
            return tipoPago.startsWith("WALK") || tipoPago.startsWith("VISA") || tipoPago.startsWith("PRIORITY PASS");
        });

        // Actualizar vista según la página
        if (document.getElementById('cardsContainer')) {
            generarCardsResumen();
            actualizarTabla(datosFiltradosGlobal);
            actualizarTotalGeneral();
        } else {
            const nombreSala = obtenerNombreSalaDesdeURL();
            filtrarSala(nombreSala);
        }

        // Actualizar marca de tiempo
        if (document.getElementById("horaActualizacion")) {
            document.getElementById("horaActualizacion").textContent = `Última actualización: ${obtenerHoraActual()}`;
        }

    } catch (error) {
        console.error("Error al cargar datos:", error);
        mostrarMensajeFlotante('Error al cargar datos');
        mostrarTablaVacia();
    } finally {
        mostrarCargando(false);
    }
};



document.addEventListener("DOMContentLoaded", () => {
    // Inicialización de eventos
    const btnCargar = document.getElementById("btnCargar");
    const btnActualizar = document.getElementById("btnActualizar");
    const btnLimpiarFiltro = document.getElementById("btnLimpiarFiltro");
    const btnSubir = document.getElementById("btnSubir");

    if (btnCargar) btnCargar.addEventListener("click", cargarExcel);
    if (btnActualizar) btnActualizar.addEventListener("click", actualizarContenido);
    if (btnLimpiarFiltro) btnLimpiarFiltro.addEventListener("click", limpiarFiltro);
    if (btnSubir) btnSubir.addEventListener("click", scrollArriba);

    window.addEventListener("scroll", () => {
        if (btnSubir) {
            btnSubir.style.display = document.documentElement.scrollTop > 300 ? "flex" : "none";
        }
    });

    cargarExcel();
    setInterval(cargarExcel, 3 * 60 * 1000); // Actualizar cada 5 minutos
});

// Función para mostrar mensajes flotantes
const mostrarMensajeFlotante = (mensaje) => {
    // Eliminar mensajes anteriores
    const existente = document.getElementById('mensaje-flotante');
    if (existente) existente.remove();

    // Crear nuevo mensaje
    const mensajeElement = document.createElement('div');
    mensajeElement.id = 'mensaje-flotante';
    mensajeElement.textContent = mensaje;
    mensajeElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: #f1666d;
        color: white;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        animation: fadeIn 0.3s ease-out;
    `;

    document.body.appendChild(mensajeElement);

    // Auto-eliminación después de 5 segundos
    setTimeout(() => {
        mensajeElement.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => mensajeElement.remove(), 300);
    }, 5000);
};

// Función para mostrar tabla vacía manteniendo encabezados
const mostrarTablaVacia = () => {
    const tablas = document.querySelectorAll("#tablaGeneral, #tablaExcel");

    tablas.forEach(table => {
        if (!table) return;

        // Preservar los encabezados existentes o crear unos básicos
        let thead = table.querySelector('thead');
        if (!thead) {
            thead = table.createTHead();
            thead.innerHTML = `
                <tr>
                    <th>FECHA</th>
                    <th>ENTRADA</th>
                    <th>FOLIO</th>
                    <th>SALA</th>
                    <th>HUÉSPED</th>
                    <th>TIPO</th>
                    <th>SUBTIPO</th>
                    <th>CHECK OUT</th>
                    <th>RECEPCIONISTA</th>
                    <th>TOTAL</th>
                    <th>ESTADÍA</th>
                    <th>ESTADO</th>
                </tr>
            `;
        }

        // Crear o limpiar el cuerpo
        const tbody = table.querySelector('tbody') || table.createTBody();
        tbody.innerHTML = `
            <tr class="mensaje-sin-datos">
                <td colspan="${thead.querySelectorAll('th').length}" style="
                    text-align: center;
                    padding: 30px;
                    color: #6c757d;
                    font-style: italic;
                ">
                    Datos no disponibles
                </td>
            </tr>
        `;
    });
};

// ===== MANEJO DE SALAS =====

const obtenerNombreSalaDesdeURL = () => {
    const path = window.location.pathname;
    const nombreArchivo = path.split('/').pop().replace('.html', '');

    if (nombreArchivo.toLowerCase() === 'l19') {
        return 'L 19';
    }

    const mapaSalas = {
        'aifa': 'AIFA',
        'haven': 'HAVEN',
        'tgle': 'TGLE',
        'terraza': 'TERRAZA'
    };

    return mapaSalas[nombreArchivo.toLowerCase()] || nombreArchivo.toUpperCase();
};

const mostrarTotalSala = (sala) => {
    const totalElement = document.getElementById('salaTotal');
    if (!totalElement) return;

    const total = jsonDataGlobal.slice(1).reduce((sum, row) => {
        if (row && row.includes("-")) {
            const salaRow = (row[4] || "").toUpperCase();
            const salaBuscada = sala === 'L 19' ? ['L 19', 'L19'] : [sala.toUpperCase()];

            if (salaBuscada.includes(salaRow)) {
                return sum + calcularTotal(row);
            }
        }
        return sum;
    }, 0);

    totalElement.querySelector('.total-value').textContent = total.toFixed(0);
};

const actualizarTotalGeneral = () => {
    const totalElement = document.getElementById('salaTotal');
    if (!totalElement) return;

    const total = jsonDataGlobal.slice(1).reduce((sum, row) => {
        if (row && row.includes("-")) {
            return sum + calcularTotal(row);
        }
        return sum;
    }, 0);

    totalElement.querySelector('.total-value').textContent = total.toFixed(0);
};

const filtrarSala = (sala) => {
    const salaBuscada = sala === 'L 19' ? ['L 19', 'L19'] : [sala.toUpperCase()];

    const datosFiltrados = datosFiltradosGlobal.filter((row, index) => {
        if (index === 0) return true;
        if (!row || !row.includes("-")) return false;

        const salaRow = (row[4] || "").toUpperCase();
        return salaBuscada.includes(salaRow);
    });

    actualizarTabla(datosFiltrados);
    mostrarTotalSala(sala);
};

// ===== FUNCIONES AUXILIARES =====

const mostrarCargando = (mostrar) => {
    const loader = document.getElementById('loader') || document.createElement('div');
    if (mostrar) {
        loader.id = 'loader';
        loader.innerHTML = '<div class="spinner"></div><p>Cargando datos...</p>';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        document.body.appendChild(loader);
    } else {
        if (document.getElementById('loader')) {
            document.body.removeChild(loader);
        }
    }
};

const obtenerFechaHoy = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

const obtenerHoraActual = () => new Date().toLocaleTimeString();

const convertirAMPMaDate = (horaTexto) => {
    if (!horaTexto) return null;
    const [hora, minuto, segundo, periodo] = horaTexto.split(/[: ]/);
    const date = new Date();
    date.setHours(
        periodo?.toUpperCase() === 'P.M.' && parseInt(hora) !== 12 ? parseInt(hora) + 12 : 
        hora === '12' && periodo?.toUpperCase() === 'A.M.' ? '00' : hora, 
        minuto, 
        segundo
    );
    return date;
};

const calcularEstadia = (fechaHora) => {
    if (!fechaHora) return { horas: 0, minutos: 0, diferencia: 0 };
    const diferencia = new Date() - new Date(fechaHora);
    return {
        horas: Math.floor(diferencia / (1000 * 60 * 60)),
        minutos: Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60)),
        diferencia
    };
};

// ===== VISUALIZACIÓN =====
const generarCardsResumen = () => {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    container.innerHTML = '';
    const SALAS = {
        AIFA: "AIFA",
        HAVEN: "HAVEN",
        TGLE: "TGLE",
        L19: "L 19",  // Clave L19 para coincidir con CSS (.l19-card)
        TERRAZA: "TERRAZA"
    };

    const CAPACIDADES = {
        'AIFA': 189,
        'HAVEN': 122,
        'TGLE': 121,
        'L 19': 70,   // Nota: El valor usa espacio (L 19)
        'TERRAZA': 74
    };

    const totales = {};

    // Inicializar totales
    Object.values(SALAS).forEach(sala => totales[sala] = 0);

    // Contar registros
    jsonDataGlobal.slice(1).forEach(row => {
        if (row && row.includes("-")) {
            let sala = (row[4] || "").toUpperCase();
            if (sala === 'L19') sala = 'L 19';  // Conversión para coincidir con SALAS

            if (Object.values(SALAS).includes(sala)) {
                totales[sala] += calcularTotal(row);
            }
        }
    });

    // Crear cards
    Object.entries(SALAS).forEach(([key, sala]) => {
        const card = document.createElement('div');
        // Clase en minúsculas para coincidir con CSS
        card.className = `summary-card ${key.toLowerCase()}-card`;

        const total = totales[sala].toFixed(0);
        const capacidad = CAPACIDADES[sala] || 100;
        const porcentaje = Math.min(Math.round((totales[sala] / capacidad) * 100), 100);

        // Sistema de color compacto
        const colorBarra = porcentaje >= 80 ? '#e63946' : porcentaje >= 50 ? '#ffbe0b' : '#2a9d8f';
        const icono = porcentaje >= 90 ? '⚠️' : porcentaje >= 70 ? '🔔' : '';

        card.innerHTML = `
            <div class="card-header">
                <h2>${sala} ${icono}</h2>
                <div class="total">${total}<small>/${capacidad}</small></div>
            </div>
            <div class="progress-bar" title="${porcentaje}% ocupado">
                <div class="progress-fill" style="width: ${porcentaje}%; background: ${colorBarra};"></div>
            </div>
            <a href="${key.toLowerCase()}.html" class="btn-detalles"> Ver detalles →</a>
        `;

        container.appendChild(card);
    });
};
const actualizarTabla = (datos) => {
    const table = document.getElementById("tablaExcel") || document.getElementById("tablaGeneral");
    if (!table) return;

    table.innerHTML = `
        <thead>
            <tr>
                <th>FECHA</th>
                <th>ENTRADA</th>
                <th>FOLIO</th>
                <th>SALA</th>
                <th>HUÉSPED</th>
                <th>TIPO</th>
                <th>SUBTIPO</th>
                <th>CHECK OUT</th>
                <th>RECEPCIONISTA</th>
                <th>TOTAL</th>
                <th>ESTADÍA</th>
                <th>ESTADO</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    if (!datos || datos.length <= 1) {
        mostrarMensajeSinDatos();
        return;
    }

    datos.slice(1)
        .filter(row => {
            if (!row || !row.includes("-")) return false;
            const tipo = (row[6] || "").toUpperCase();
            return tipo.includes('VISA') || tipo.includes('PRIORITY PASS') || tipo.startsWith('WALK');
        })
        .forEach(row => {
            const fechaHora = convertirAMPMaDate(row[1]);
            const estadia = calcularEstadia(fechaHora);
            const tipoPago = row[6] || "";
            const minutosLimite = tipoPago === 'VISA' ? 120 : 180;
            const minutosRestantes = minutosLimite - (estadia.horas * 60 + estadia.minutos);
            const esExcedido = minutosRestantes <= 0;
            const esRecheck = minutosRestantes > 0 && minutosRestantes < 15;
            const total = calcularTotal(row);

            const tr = document.createElement('tr');

            if (esExcedido) {
                tr.classList.add('fila-excedida');
                tr.title = "Tiempo excedido - requiere atención inmediata";
            } else if (esRecheck) {
                tr.classList.add('fila-recheck');
                tr.title = "Próximo a hacer checkout";
            }

            const campos = [
                row[0] || '-',
                row[1] || '-',
                row[3] || '-',
                (row[4] || '-').toUpperCase(),
                row[5] || '-',
                row[6] || '-',
                row[7] || '-',
                row[8] || '-',
                row[18] || '-',
                total
            ];

            campos.forEach(contenido => {
                const td = document.createElement('td');
                td.textContent = contenido;
                tr.appendChild(td);
            });

            const tdEstadia = document.createElement('td');
            tdEstadia.textContent = `${estadia.horas}h ${estadia.minutos}m`;
            tdEstadia.title = `Tiempo en sala: ${estadia.horas} horas y ${estadia.minutos} minutos`;
            tr.appendChild(tdEstadia);

            const tdEstado = document.createElement('td');
            let estadoHTML = '';

            if (esExcedido) {
                const tiempoExcedido = Math.abs(minutosRestantes);
                estadoHTML = `
                    <div class="estado-alerta critico">
                        <span class="icono">⚠️</span>
                        <div class="detalle">
                            <strong>EXCEDIDO</strong>
                            <small>${Math.floor(tiempoExcedido/60)}h ${tiempoExcedido%60}m</small>
                        </div>
                    </div>
                `;
            } else if (esRecheck) {
                estadoHTML = `
                    <div class="estado-alerta aviso">
                        <span class="icono">⏱️</span>
                        <div class="detalle">
                            <strong>CHECKOUT</strong>
                            <small>en ${minutosRestantes}m</small>
                        </div>
                    </div>
                `;
            } else {
                estadoHTML = `
                    <div class="estado-normal">
                        ${minutosRestantes}m restantes
                    </div>
                `;
            }

            tdEstado.innerHTML = estadoHTML;
            tr.appendChild(tdEstado);

            tbody.appendChild(tr);
        });
};












// ===== FILTROS Y UTILIDADES =====
let filtrosActivos = {
    excedido: false,
    recheck: false
};

const aplicarFiltros = () => {
    const tabla = document.querySelector("#tablaGeneral, #tablaExcel");
    const tbody = tabla?.querySelector('tbody');
    const filas = tbody?.querySelectorAll('tr') || [];

    if (!filtrosActivos.excedido && !filtrosActivos.recheck) {
        filas.forEach(fila => fila.style.display = "");
        // Eliminar mensaje si existe
        const mensajeExistente = tbody?.querySelector('.mensaje-sin-resultados');
        if (mensajeExistente) mensajeExistente.remove();
        return;
    }

    let filasMostradas = 0;

    filas.forEach(fila => {
        const esExcedido = fila.classList.contains('fila-excedida');
        const esRecheck = fila.classList.contains('fila-recheck');

        const mostrarFila = (filtrosActivos.excedido && esExcedido) || 
                          (filtrosActivos.recheck && esRecheck);

        fila.style.display = mostrarFila ? "" : "none";
        if (mostrarFila) filasMostradas++;
    });

    // Eliminar mensaje anterior si existe
    const mensajeExistente = tbody?.querySelector('.mensaje-sin-resultados');
    if (mensajeExistente) mensajeExistente.remove();

    // Mostrar mensaje si no hay coincidencias
    if (filasMostradas === 0 && tbody) {
        const filtrosActivosText = [
            filtrosActivos.excedido ? 'excedidos' : null,
            filtrosActivos.recheck ? 'que requieran revisión' : null
        ].filter(Boolean).join(' ni ');

        const mensajeFila = document.createElement('tr');
        mensajeFila.className = 'mensaje-sin-resultados';
        mensajeFila.innerHTML = `
            <td colspan="12" style="
                text-align: center;
                padding: 20px;
                background-color: #f8f9fa;
                color: #6c757d;
                font-style: italic;
            ">
                No se encontraron registros <strong>${filtrosActivosText}</strong>
            </td>
        `;
        tbody.appendChild(mensajeFila);
    }
};

const actualizarEstilosBotones = () => {
    const btnExcedido = document.querySelector("button[onclick*='excedido']");
    const btnRecheck = document.querySelector("button[onclick*='recheck']");

    const actualizarBoton = (boton, estaActivo) => {
        if (!boton) return;
        boton.style.fontWeight = estaActivo ? 'bold' : 'normal';
        boton.style.boxShadow = estaActivo ? '0 0 0 2px white' : 'none';
        boton.classList.toggle('active', estaActivo);
    };

    actualizarBoton(btnExcedido, filtrosActivos.excedido);
    actualizarBoton(btnRecheck, filtrosActivos.recheck);
};

const filtrarPorEstado = (estado) => {
    filtrosActivos[estado] = !filtrosActivos[estado];
    actualizarEstilosBotones();
    aplicarFiltros();
};

const limpiarFiltro = () => {
    filtrosActivos = { excedido: false, recheck: false };
    actualizarEstilosBotones();
    aplicarFiltros();

    if (document.getElementById('cardsContainer')) {
        actualizarTabla(datosFiltradosGlobal);
    } else {
        filtrarSala(obtenerNombreSalaDesdeURL());
    }
};

const actualizarContenido = () => {
    cargarExcel();
    limpiarFiltro();
};

const scrollArriba = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
};
