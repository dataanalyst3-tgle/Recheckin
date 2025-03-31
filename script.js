let jsonDataGlobal = [];
let datosFiltradosGlobal = [];

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
        const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NDM0MzM5NjEsImV4cCI6MTc0MzU3Mzk2MSwicm9sZXMiOltdLCJ1c2VybmFtZSI6IjEzOTMifQ.BfhiNSFmi6gDzJi7nbYVHEXDndBjhYBCUQ1uHpDiGpTl3JOtLXuMX-LBDjBqfEE61dyGgOCN-QPFQYfKyS0yFqFW86ms-7IZ7tjidbEXDOFm0yAqxMh4qInidTF-i9CKdNJUXGPPDbJf1wRv_mYE-_RJZk23qfZVHSnYG6j75gTW5OU3mtgaFNNU1u02ZPHk9t-dvo9j3hJ7xIvEfwA2OlWs2qD5JVwJ0VCWnJCCmEHh0m4uET9lVGRAMwH7HGHhizHoK7d-DVAmYp4_oHzUUS86nBgFDJIc9iUUkRszmzLI5lxwtZqrVowp49a1tjaIhzdQMe0xUo0n3kj9P5wFhADObTBCaouEOp1RBedZ3zoKQnFqg04mBHAWN3-7Q2N3J947Y4dJdATEB7dllba6tVp7JiQ1T1LBQre1cawfZ4quj0NAo2EFh98CtxEkyTE7kBZbJ3vOqNFH7FKyJQtSwgXi8vVa_5DZGbsNr5htZQ-vCo6JLY_FFsNupGv2of7FCdMuMylhh0h1FF4dctu6CKvInqLzwiqyP9zQ3ja3aNbhTejK3wQzt8luaKgQ_70G2NvE5wvMoZMunGzM9ypOz7xffYOxox_G-gaKu1fuBGzoyaPP_ZenG4Rvb1uMVfFAHnUHSJls0jERz-IG2N5F8nV2H5mbdQMwefCnzRU20nI"; // Reemplaza con tu token real
        const url = `https://back.tgle.mx/api/check_ins/billing_report?from=${fechaHoy}%2000:00:00&to=${fechaHoy}%2023:59:59&token=${token}`;

        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonDataGlobal = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Filtrar solo los tipos de pago relevantes para las tablas
        datosFiltradosGlobal = jsonDataGlobal.filter((row, index) => {
            if (index === 0) return true; // Mantener headers
            const tipoPago = row[6] || "";
            return tipoPago.startsWith("WALK") || tipoPago.startsWith("VISA") || tipoPago.startsWith("PRIORITY PASS");
        });

        // Manejo de vista según la página
        if (document.getElementById('cardsContainer')) {
            generarCardsResumen();
            actualizarTabla(datosFiltradosGlobal); // Mostrar tabla completa en index
            actualizarTotalGeneral(); // Actualizar total general
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

    // Usar jsonDataGlobal para contar TODOS los registros
    const total = jsonDataGlobal.slice(1).reduce((sum, row) => {
        if (row && row.includes("-")) {
            const salaRow = (row[4] || "").toUpperCase();
            const salaBuscada = sala === 'L 19' ? ['L 19', 'L19'] : [sala.toUpperCase()];

            if (salaBuscada.includes(salaRow)) {
                return sum + (parseFloat(row[9]) || 0) + 1;
            }
        }
        return sum;
    }, 0);

    totalElement.querySelector('.total-value').textContent = total.toFixed(0);
};

const actualizarTotalGeneral = () => {
    const totalElement = document.getElementById('salaTotal');
    if (!totalElement) return;

    // Usar jsonDataGlobal para contar TODOS los registros
    const total = jsonDataGlobal.slice(1).reduce((sum, row) => {
        if (row && row.includes("-")) {
            return sum + (parseFloat(row[9]) || 0) + 1;
        }
        return sum;
    }, 0);

    totalElement.querySelector('.total-value').textContent = total.toFixed(0);
};

const filtrarSala = (sala) => {
    const salaBuscada = sala === 'L 19' ? ['L 19', 'L19'] : [sala.toUpperCase()];

    const datosFiltrados = datosFiltradosGlobal.filter((row, index) => {
        if (index === 0) return true; // Mantener headers
        if (!row || !row.includes("-")) return false; // Filtrar vacíos

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
    const salas = ["AIFA", "HAVEN", "TGLE", "L 19", "TERRAZA"];
    const totales = {};

    salas.forEach(sala => totales[sala] = 0);

    // Usar jsonDataGlobal para contar TODOS los registros
    jsonDataGlobal.slice(1).forEach(row => {
        if (row && row.includes("-")) {
            let sala = (row[4] || "").toUpperCase();
            if (sala === 'L19') sala = 'L 19';

            const total = (parseFloat(row[9]) || 0) + 1;
            if (salas.includes(sala)) totales[sala] += total;
        }
    });

    // Crear cards
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

const actualizarTabla = (datos) => {
    const table = document.getElementById("tablaExcel") || document.getElementById("tablaGeneral");
    if (!table) return;

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    thead.innerHTML = "";
    tbody.innerHTML = "";

    const columnasDeseadas = [0, 1, 3, 4, 5, 6, 7, 8, 18];
    const headerRow = datos[0] || [];

    // Crear headers
    const trHeader = document.createElement("tr");
    columnasDeseadas.forEach((index, i) => {
        const th = document.createElement("th");
        th.textContent = i === 1 ? "Entrada" : headerRow[index] || "";
        trHeader.appendChild(th);
    });
    trHeader.innerHTML += "<th>Estadía</th><th>Minutos Restantes</th><th>Total</th>";
    thead.appendChild(trHeader);

    // Llenar tabla
    (datos.slice(1) || []).forEach(row => {
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

// ===== FILTROS Y UTILIDADES =====

const filtrarPorEstado = (estado) => {
    const filas = document.querySelectorAll("#tablaGeneral tbody tr, #tablaExcel tbody tr");
    filas.forEach(fila => {
        const color = fila.children[fila.children.length - 3].style.backgroundColor;
        fila.style.display = (estado === "excedido" && color === "rgb(241, 102, 109)") ||
                           (estado === "recheck" && color === "rgb(255, 204, 84)") ? "" : "none";
    });
};

const limpiarFiltro = () => {
    if (document.getElementById('cardsContainer')) {
        actualizarTabla(datosFiltradosGlobal);
    } else {
        const nombreSala = obtenerNombreSalaDesdeURL();
        filtrarSala(nombreSala);
    }
};

const actualizarContenido = () => cargarExcel();
const scrollArriba = () => window.scrollTo({ top: 0, behavior: "smooth" });
