let jsonDataGlobal = [];
let datosFiltradosGlobal = [];

document.addEventListener("DOMContentLoaded", () => {
    // Inicialización de eventos
    const btnCargar = document.getElementById("btnCargar");
    const btnActualizar = document.getElementById("btnActualizar");
    const btnSubir = document.getElementById("btnSubir");

    if (btnCargar) btnCargar.addEventListener("click", cargarExcel);
    if (btnActualizar) btnActualizar.addEventListener("click", actualizarContenido);
    if (btnSubir) btnSubir.addEventListener("click", scrollArriba);

    window.addEventListener("scroll", () => {
        if (btnSubir) {
            btnSubir.style.display = document.documentElement.scrollTop > 300 ? "flex" : "none";
        }
    });

    // Carga inicial
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        cargarExcel();
    }

    setInterval(cargarExcel, 5 * 60 * 1000); // Actualizar cada 5 minutos
});

// ===== FUNCIONES PRINCIPALES =====

const cargarExcel = async () => {
    mostrarCargando(true);
    try {
        const fechaHoy = obtenerFechaHoy();
        const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NDMxNzQ4NDgsImV4cCI6MTc0MzMxNDg0OCwicm9sZXMiOltdLCJ1c2VybmFtZSI6IjEzOTMifQ.zWz8g4ixM75jeVyVvsjGV3sVZWATI6Zn5d5HrWK72bR2nR5OEPaWQODAbzWrqZA8K2InlgqZrQ5onZhZIUkFwynv26LfVYGBxGwswVKlnZgdXt2TbtPhZiCITPXAXi-zMYpGGThT41Xvf_bcojDjBywAoyhNnttqF3ZPlfa4hpJcXlHsfJDU3VIYcRSwqinE78uy7WVwDthcOPbog1adCl9xhodcRrzJE3sPVOgayYqiut4SFX6pcS58GQEtkqkH4Ht1FFid_EZvkKUjisWWZvinaqlvJ-SALn0NBfiJAT4piHgO9QR5Jn_L8g84Fg5Oxpivf6h8icjsH2dYeTjIX4j6muWsimeb3w0DZBsi8z5LIv7Qxt6_CrOtIZTLowQ7u4Dl857xdgnt4eq9OIOG4qcQXN4rbeYRbLycFUsgT5TOMnac7VRfzSRnMdNivhAhYrQFmJDR3VWv3zYmMZcytcmIy2dHuJBj2mXIlWbVFr-VbtDIIyIp1aTgllSHv20H4XdtauIq1VcupqLRknOQo2RYQT00vi2e6eQI6yjbbu9OPQnUQN-iU5v9IWyelmcG7Z4ZPO1CyN3RMqpAPBlFWIVqQEYJL4WxVTdp6D6XvT4Kr9rbmcnMMi47ng8NBN5R4b0CVee-XXdDAN7jDkepJ8oWa4MeU_tGm_0GNcLz5pI"
        
        const url = `https://back.tgle.mx/api/check_ins/billing_report?from=${fechaHoy}%2000:00:00&to=${fechaHoy}%2023:59:59&token=${TOKEN}`;

        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonDataGlobal = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Filtrar solo los tipos de pago relevantes
        datosFiltradosGlobal = jsonDataGlobal.filter((row, index) => {
            if (index === 0) return true;
            const tipoPago = row[6] || "";
            return tipoPago.startsWith("WALK") || tipoPago.startsWith("VISA") || tipoPago.startsWith("PRIORITY PASS");
        });

        // Actualizar todas las vistas
        if (document.getElementById('cardsContainer')) {
            generarCardsResumen();
            actualizarTablaGeneral(); // Tabla general solo en index.html
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
        alert("Error al cargar datos. Por favor intenta nuevamente.");
    } finally {
        mostrarCargando(false);
    }
};

// ===== TABLA GENERAL (index.html) =====

const actualizarTablaGeneral = () => {
    const table = document.getElementById("tablaGeneral");
    if (!table) return;

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    thead.innerHTML = "";
    tbody.innerHTML = "";

    // Columnas a mostrar
    const columnasDeseadas = [0, 1, 3, 4, 5, 6, 7, 8, 18];
    const headerRow = datosFiltradosGlobal[0] || [];

    // Crear headers
    const trHeader = document.createElement("tr");
    columnasDeseadas.forEach((index, i) => {
        const th = document.createElement("th");
        th.textContent = i === 1 ? "Entrada" : headerRow[index] || "";
        trHeader.appendChild(th);
    });
    trHeader.innerHTML += "<th>Estadía</th><th>Minutos Restantes</th><th>Total</th>";
    thead.appendChild(trHeader);

    // Llenar tabla con todos los datos
    datosFiltradosGlobal.slice(1).forEach(row => {
        if (row && row.includes("-")) {
            const tr = document.createElement("tr");
            const fechaHora = convertirAMPMaDate(row[1]);

            // Columnas principales
            columnasDeseadas.forEach(index => {
                const td = document.createElement("td");
                td.textContent = row[index] || "";
                tr.appendChild(td);
            });

            // Calcular tiempos
            const estadia = calcularEstadia(fechaHora);
            const tipoPago = row[6] || "";
            const minutosLimite = tipoPago === 'VISA' ? 120 : 180;
            const minutosRestantes = minutosLimite - (estadia.horas * 60 + estadia.minutos);
            const total = (parseFloat(row[9]) || 0) + 1;

            // Crear celdas de tiempo
            const tdEstadia = document.createElement("td");
            tdEstadia.textContent = `${estadia.horas}h ${estadia.minutos}m`;

            const tdMinutosRestantes = document.createElement("td");
            const tdTotal = document.createElement("td");
            tdTotal.textContent = total;

            // Estilizar según tiempo
            if (minutosRestantes <= 0) {
                const tiempoExcedido = Math.abs(minutosRestantes);
                tdMinutosRestantes.textContent = `Excedido: ${Math.floor(tiempoExcedido/60)}h ${tiempoExcedido%60}m`;
                [tdEstadia, tdMinutosRestantes, tdTotal].forEach(td => td.style.backgroundColor = "#f1666d");
            } else if (minutosRestantes < 15) {
                tdMinutosRestantes.textContent = `Checkout en ${minutosRestantes}m`;
                [tdEstadia, tdMinutosRestantes, tdTotal].forEach(td => td.style.backgroundColor = "#ffcc54");
            } else {
                tdMinutosRestantes.textContent = `${minutosRestantes}m`;
            }

            tr.append(tdEstadia, tdMinutosRestantes, tdTotal);
            tbody.appendChild(tr);
        }
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

    const total = datosFiltradosGlobal.slice(1).reduce((sum, row) => {
        if (row && row.includes("-")) {
            const salaRow = (row[4] || "").toUpperCase();
            const salaBuscada = sala === 'L 19' ? ['L 19', 'L19'] : [sala.toUpperCase()];

            if (salaBuscada.includes(salaRow)) {
                return sum + (parseFloat(row[9]) || 0) + 1;
            }
        }
        return sum;
    }, 0);

    const totalFinal = sala.toUpperCase() === "AIFA" ? total + 2 : total;
    totalElement.querySelector('.total-value').textContent = totalFinal.toFixed(0);
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

// ===== CARDS DE RESUMEN =====

const generarCardsResumen = () => {
    const container = document.getElementById('cardsContainer');
    if (!container) return;

    container.innerHTML = '';
    const salas = ["AIFA", "HAVEN", "TGLE", "L 19", "TERRAZA"];
    const totales = {};

    salas.forEach(sala => totales[sala] = 0);

    jsonDataGlobal.slice(1).forEach(row => {
        if (row && row.includes("-")) {
            let sala = (row[4] || "").toUpperCase();
            if (sala === 'L19') sala = 'L 19';

            const total = (parseFloat(row[9]) || 0) + 1;
            if (salas.includes(sala)) totales[sala] += total;
        }
    });

    salas.forEach(sala => {
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <h2>${sala}</h2>
            <div class="total">${totales[sala].toFixed(0)}</div>
            <a href="${sala.toLowerCase().replace(' ', '')}.html" class="btn-detalles">Ver detalles</a>
        `;
        container.appendChild(card);
    });
};

// ===== TABLA ESPECÍFICA DE SALA =====

const actualizarTabla = (datos) => {
    const table = document.getElementById("tablaExcel");
    if (!table) return;

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    thead.innerHTML = "";
    tbody.innerHTML = "";

    const columnasDeseadas = [0, 1, 3, 4, 5, 6, 7, 8, 18];
    const headerRow = datos[0] || [];

    const trHeader = document.createElement("tr");
    columnasDeseadas.forEach((index, i) => {
        const th = document.createElement("th");
        th.textContent = i === 1 ? "Entrada" : headerRow[index] || "";
        trHeader.appendChild(th);
    });
    trHeader.innerHTML += "<th>Estadía</th><th>Minutos Restantes</th><th>Total</th>";
    thead.appendChild(trHeader);

    datos.slice(1).forEach(row => {
        if (row && row.includes("-")) {
            const tr = document.createElement("tr");
            const fechaHora = convertirAMPMaDate(row[1]);

            columnasDeseadas.forEach(index => {
                const td = document.createElement("td");
                td.textContent = row[index] || "";
                tr.appendChild(td);
            });

            const estadia = calcularEstadia(fechaHora);
            const tipoPago = row[6] || "";
            const minutosLimite = tipoPago === 'VISA' ? 120 : 180;
            const minutosRestantes = minutosLimite - (estadia.horas * 60 + estadia.minutos);
            const total = (parseFloat(row[9]) || 0) + 1;

            const tdEstadia = document.createElement("td");
            tdEstadia.textContent = `${estadia.horas}h ${estadia.minutos}m`;

            const tdMinutosRestantes = document.createElement("td");
            const tdTotal = document.createElement("td");
            tdTotal.textContent = total;

            if (minutosRestantes <= 0) {
                const tiempoExcedido = Math.abs(minutosRestantes);
                tdMinutosRestantes.textContent = `Excedido: ${Math.floor(tiempoExcedido/60)}h ${tiempoExcedido%60}m`;
                [tdEstadia, tdMinutosRestantes, tdTotal].forEach(td => td.style.backgroundColor = "#f1666d");
            } else if (minutosRestantes < 15) {
                tdMinutosRestantes.textContent = `Checkout en ${minutosRestantes}m`;
                [tdEstadia, tdMinutosRestantes, tdTotal].forEach(td => td.style.backgroundColor = "#ffcc54");
            } else {
                tdMinutosRestantes.textContent = `${minutosRestantes}m`;
            }

            tr.append(tdEstadia, tdMinutosRestantes, tdTotal);
            tbody.appendChild(tr);
        }
    });
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
    return hoy.toISOString().split('T')[0];
};

const obtenerHoraActual = () => {
    return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

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

const limpiarFiltro = () => {
    if (document.getElementById('cardsContainer')) {
        actualizarTablaGeneral();
    } else {
        const nombreSala = obtenerNombreSalaDesdeURL();
        filtrarSala(nombreSala);
    }
};

const actualizarContenido = () => cargarExcel();
const scrollArriba = () => window.scrollTo({ top: 0, behavior: "smooth" });
