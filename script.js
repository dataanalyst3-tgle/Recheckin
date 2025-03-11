let jsonDataGlobal = [];

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnCargar").addEventListener("click", cargarExcel);
    document.getElementById("btnActualizar").addEventListener("click", actualizarContenido);
    document.getElementById("btnLimpiarFiltro").addEventListener("click", limpiarFiltro);
    document.getElementById("btnSubir").addEventListener("click", scrollArriba);

    document.querySelectorAll("#filtroSala button").forEach(button => {
        button.addEventListener("click", () => filtrarSala(button.dataset.sala));
    });

    document.querySelectorAll("#filtroEstado button").forEach(button => {
        button.addEventListener("click", () => filtrarPorEstado(button.dataset.estado));
    });

    window.addEventListener("scroll", () => {
        let btnSubir = document.getElementById("btnSubir");
        btnSubir.style.display = document.documentElement.scrollTop > 300 ? "flex" : "none";
    });

    setInterval(cargarExcel, 5 * 60 * 1000); // Actualizar cada 5 minutos
});

function obtenerFechaHoy() {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function obtenerHoraActual() {
    return new Date().toLocaleTimeString();
}

function convertirAMPMaDate(horaTexto) {
    const [hora, minuto, segundo, periodo] = horaTexto.split(/[: ]/);
    const date = new Date();
    date.setHours(periodo.toUpperCase() === 'P.M.' && parseInt(hora) !== 12 ? parseInt(hora) + 12 : hora === '12' && periodo.toUpperCase() === 'A.M.' ? '00' : hora, minuto, segundo);
    return date;
}

function calcularEstadia(fechaHora) {
    const fechaHoraEntrada = new Date(fechaHora);
    const diferencia = new Date() - fechaHoraEntrada;
    return {
        horas: Math.floor(diferencia / (1000 * 60 * 60)),
        minutos: Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60)),
        diferencia
    };
}

function calcularMinutosRestantes(estadia, tipoPago) {
    const minutosLimite = tipoPago === 'VISA' ? 120 : 180;
    return minutosLimite - (estadia.horas * 60 + estadia.minutos);
}


async function cargarExcel() {
    const fechaHoy = obtenerFechaHoy();
    const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NDE2MzgxNjEsImV4cCI6MTc0MTc3ODE2MSwicm9sZXMiOltdLCJ1c2VybmFtZSI6IjEzOTMifQ.STh8gdG0QjFVpgCUnSNEJ4PQmm5TB9pt5mc7IFcX0j9qclHF4V6B6eeB0mfcOQP8T0PGkPM8vsHrL6S9Or9T_xxJ4AXiXYCsGWO1eNKpT19VV2ZVnAxJDL7inq96Txl18l2yEZhxjjQZn_QVFzu9aDE-U1uEagO9xWGI1H0-AaXxbpbMX9KWm3OvtKIsVYWMexFe9kTIentDLroElyTPep8eLqJ8aBv6qob-4xq6PCIsqGuUFfCw9LkZkxb9JnXBZZ32LVRsqn5ugyqu2A5xmPVq9KClKHato7GjzglYU-DcMF16DBSnuQgBTo-i-5eCqHWC6WjNfYYpQ0DZs5psDtBypvXaHVhkIQDSJ1DizPwE6mInvFGWfms4XqyS9O2FqwdCxRC9_JlN1Jil5VUzDopweZ6cMl4A8g3f9QdxjJv1dl4CgEiJHQkKnl_wAJ5rex3JPFcy6Fyig1HjXrVstH-pbr1kfUF4XRAbVDFJPfAfXcB3SDBoy6eYFBGXM8xorYYu2_s62LZHo8kiu375vQ2CdkebdK5eT6cwq9uA9aMnJ0tTOPxWSe66bas0G-b5J_PkDntF1yTU5BBtDJM8HNJJFiXiZsE90fWNvPAKrc8hxyikqHgy_bZgreG5SCJEa0bZXeel3xB_V5qoX_R11MdwTIMDKwh8w6yA3_WIZAA";
    const url = `https://back.tgle.mx/api/check_ins/billing_report?from=${fechaHoy}%2000%3A00%3A00&to=${fechaHoy}%2023%3A59%3A59&token=${token}`;

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    jsonDataGlobal = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    actualizarTabla(jsonDataGlobal);
    document.getElementById("horaActualizacion").textContent = `Última actualización: ${obtenerHoraActual()}`;
}

function actualizarTabla(datos) {
    const table = document.getElementById("tablaExcel");
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    thead.innerHTML = "";
    tbody.innerHTML = "";

    const columnasDeseadas = [0, 1, 3, 4, 5, 6, 7, 8, 18];
    const headerRow = datos[0];
    const trHeader = document.createElement("tr");

    columnasDeseadas.forEach((index, i) => {
        const th = document.createElement("th");
        // Cambiar el nombre de la columna 1 a "Entrada"
        if (i === 1) {
            th.textContent = "Entrada";
        } else {
            th.textContent = headerRow[index] || "";
        }
        trHeader.appendChild(th);
    });

    // Agregar las columnas adicionales
    trHeader.innerHTML += "<th>Estadía</th><th>Minutos Restantes</th><th>Total</th>";
    thead.appendChild(trHeader);

    // Objeto para almacenar los totales por sala (inicializado con 0)
    const totalesPorSala = {
        "AIFA": 0,
        "HAVEN": 0,
        "TGLE": 0,
        "L 19": 0,
        "TERRAZA": 0
    };

    datos.slice(1).forEach(row => {
        if (row.includes("-")) {
            const tr = document.createElement("tr");
            const fechaHora = row[1] ? convertirAMPMaDate(row[1]) : null;
            columnasDeseadas.forEach(index => {
                const cellElement = document.createElement("td");
                cellElement.textContent = row[index] || "";
                tr.appendChild(cellElement);
            });

            // Calcular la estadía
            const estadia = fechaHora ? calcularEstadia(fechaHora) : { horas: 0, minutos: 0, diferencia: 0 };
            const tdEstadia = document.createElement("td");
            tdEstadia.textContent = `${estadia.horas}h ${estadia.minutos}m`;
            tr.appendChild(tdEstadia);

            // Calcular minutos restantes
            const tipoPago = row[6] || "";
            const minutosRestantes = calcularMinutosRestantes(estadia, tipoPago);
            const tdMinutosRestantes = document.createElement("td");

            // Calcular el Total (columna 9 + 1)
            const valorColumna9 = parseFloat(row[9]) || 0;
            const total = valorColumna9 + 1;
            const tdTotal = document.createElement("td");
            tdTotal.textContent = total;

            // Aplicar colores según las condiciones
            if (minutosRestantes <= 0) {
                const tiempoExcedido = Math.abs(minutosRestantes);
                const horasExcedidas = Math.floor(tiempoExcedido / 60);
                const minutosExcedidos = tiempoExcedido % 60;
                tdMinutosRestantes.textContent = `Tiempo excedido por ${horasExcedidas}h ${minutosExcedidos}m`;

                // Pintar las tres columnas de rojo
                tdEstadia.style.backgroundColor = "#f1666d";
                tdMinutosRestantes.style.backgroundColor = "#f1666d";
                tdTotal.style.backgroundColor = "#f1666d";
            } else if (minutosRestantes < 15) {
                tdMinutosRestantes.textContent = `Realizar checkout. ${minutosRestantes}m restantes`;

                // Pintar las tres columnas de amarillo
                tdEstadia.style.backgroundColor = "#ffcc54";
                tdMinutosRestantes.style.backgroundColor = "#ffcc54";
                tdTotal.style.backgroundColor = "#ffcc54";
            } else {
                tdMinutosRestantes.textContent = `${minutosRestantes}m`;
            }

            // Añadir las celdas en el orden correcto
            tr.appendChild(tdMinutosRestantes); // Minutos Restantes
            tr.appendChild(tdTotal); // Total
            tbody.appendChild(tr);

            // Calcular totales por sala
            const sala = row[4] || "Sin Sala";
            if (totalesPorSala.hasOwnProperty(sala)) {
                totalesPorSala[sala] += total;
            }
        }
    });

    // Mostrar los totales por sala en el orden definido
    const totalesSalaContainer = document.getElementById("totalesSala");
    totalesSalaContainer.innerHTML = "";

    for (const sala in totalesPorSala) {
        const total = totalesPorSala[sala];
        const p = document.createElement("p");
        p.textContent = `${total.toFixed(0)}`;
        totalesSalaContainer.appendChild(p);
    }
}

function filtrarSala(sala) {
    const datosFiltrados = jsonDataGlobal.filter((row, index) => {
        return index === 0 || (row.includes("-") && row[jsonDataGlobal[0].indexOf('Sala')] === sala);
    });
    actualizarTabla(datosFiltrados);
}

function filtrarPorEstado(estado) {
    const filas = document.querySelectorAll("#tablaExcel tbody tr");
    filas.forEach(fila => {
        const color = fila.children[fila.children.length - 3].style.backgroundColor; // Ajuste para la columna "Estadía"
        fila.style.display = (estado === "excedido" && color === "rgb(241, 102, 109)") ||
            (estado === "recheck" && color === "rgb(255, 204, 84)") ? "" : "none";
    });
}

function limpiarFiltro() {
    actualizarTabla(jsonDataGlobal);
}

function actualizarContenido() {
    cargarExcel();
}

function scrollArriba() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}