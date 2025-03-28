let jsonDataGlobal = [];
let datosFiltradosGlobal = [];

document.addEventListener("DOMContentLoaded", () => {
    const btnCargar = document.getElementById("btnCargar");
    const btnActualizar = document.getElementById("btnActualizar");
    const btnLimpiarFiltro = document.getElementById("btnLimpiarFiltro");
    const btnSubir = document.getElementById("btnSubir");

    btnCargar.addEventListener("click", cargarExcel);
    btnActualizar.addEventListener("click", actualizarContenido);
    btnLimpiarFiltro.addEventListener("click", limpiarFiltro);
    btnSubir.addEventListener("click", scrollArriba);

    document.querySelectorAll("#filtroSala button").forEach(button => {
        button.addEventListener("click", () => filtrarSala(button.dataset.sala));
    });

    document.querySelectorAll("#filtroEstado button").forEach(button => {
        button.addEventListener("click", () => filtrarPorEstado(button.dataset.estado));
    });

    window.addEventListener("scroll", () => {
        btnSubir.style.display = document.documentElement.scrollTop > 300 ? "flex" : "none";
    });

    setInterval(cargarExcel, 5 * 60 * 1000); // Actualizar cada 5 minutos
});

const obtenerFechaHoy = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

const obtenerHoraActual = () => new Date().toLocaleTimeString();

const convertirAMPMaDate = (horaTexto) => {
    const [hora, minuto, segundo, periodo] = horaTexto.split(/[: ]/);
    const date = new Date();
    date.setHours(periodo.toUpperCase() === 'P.M.' && parseInt(hora) !== 12 ? parseInt(hora) + 12 : hora === '12' && periodo.toUpperCase() === 'A.M.' ? '00' : hora, minuto, segundo);
    return date;
};

const calcularEstadia = (fechaHora) => {
    const diferencia = new Date() - new Date(fechaHora);
    return {
        horas: Math.floor(diferencia / (1000 * 60 * 60)),
        minutos: Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60)),
        diferencia
    };
};

const calcularMinutosRestantes = (estadia, tipoPago) => {
    const minutosLimite = tipoPago === 'VISA' ? 120 : 180;
    return minutosLimite - (estadia.horas * 60 + estadia.minutos);
};

const cargarExcel = async () => {
    const fechaHoy = obtenerFechaHoy();
    const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NDMxNzQ4NDgsImV4cCI6MTc0MzMxNDg0OCwicm9sZXMiOltdLCJ1c2VybmFtZSI6IjEzOTMifQ.zWz8g4ixM75jeVyVvsjGV3sVZWATI6Zn5d5HrWK72bR2nR5OEPaWQODAbzWrqZA8K2InlgqZrQ5onZhZIUkFwynv26LfVYGBxGwswVKlnZgdXt2TbtPhZiCITPXAXi-zMYpGGThT41Xvf_bcojDjBywAoyhNnttqF3ZPlfa4hpJcXlHsfJDU3VIYcRSwqinE78uy7WVwDthcOPbog1adCl9xhodcRrzJE3sPVOgayYqiut4SFX6pcS58GQEtkqkH4Ht1FFid_EZvkKUjisWWZvinaqlvJ-SALn0NBfiJAT4piHgO9QR5Jn_L8g84Fg5Oxpivf6h8icjsH2dYeTjIX4j6muWsimeb3w0DZBsi8z5LIv7Qxt6_CrOtIZTLowQ7u4Dl857xdgnt4eq9OIOG4qcQXN4rbeYRbLycFUsgT5TOMnac7VRfzSRnMdNivhAhYrQFmJDR3VWv3zYmMZcytcmIy2dHuJBj2mXIlWbVFr-VbtDIIyIp1aTgllSHv20H4XdtauIq1VcupqLRknOQo2RYQT00vi2e6eQI6yjbbu9OPQnUQN-iU5v9IWyelmcG7Z4ZPO1CyN3RMqpAPBlFWIVqQEYJL4WxVTdp6D6XvT4Kr9rbmcnMMi47ng8NBN5R4b0CVee-XXdDAN7jDkepJ8oWa4MeU_tGm_0GNcLz5pI";
    const url = `https://back.tgle.mx/api/check_ins/billing_report?from=${fechaHoy}%2000%3A00%3A00&to=${fechaHoy}%2023%3A59%3A59&token=${token}`;

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    jsonDataGlobal = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    datosFiltradosGlobal = jsonDataGlobal.filter((row, index) => {
        if (index === 0) return true;
        const tipoPago = row[6] || "";
        return tipoPago.startsWith("WALK") || tipoPago.startsWith("VISA") || tipoPago.startsWith("PRIORITY PASS");
    });

    actualizarTabla(datosFiltradosGlobal);
    document.getElementById("horaActualizacion").textContent = `Última actualización: ${obtenerHoraActual()}`;
};

const actualizarTabla = (datos) => {
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
        th.textContent = i === 1 ? "Entrada" : headerRow[index] || "";
        trHeader.appendChild(th);
    });

    trHeader.innerHTML += "<th>Estadía</th><th>Minutos Restantes</th><th>Total</th>";
    thead.appendChild(trHeader);

    const totalesPorSala = { "AIFA": 0, "HAVEN": 0, "TGLE": 0, "L 19": 0, "TERRAZA": 0 };

    jsonDataGlobal.slice(1).forEach(row => {
        if (row.includes("-")) {
            const sala = row[4] || "Sin Sala";
            const valorColumna9 = parseFloat(row[9]) || 0;
            const total = valorColumna9 + 1;

            if (totalesPorSala.hasOwnProperty(sala)) {
                totalesPorSala[sala] += total;
            }
        }
    });

    datos.slice(1).forEach(row => {
        if (row.includes("-")) {
            const tr = document.createElement("tr");
            const fechaHora = row[1] ? convertirAMPMaDate(row[1]) : null;

            columnasDeseadas.forEach(index => {
                const cellElement = document.createElement("td");
                cellElement.textContent = row[index] || "";
                tr.appendChild(cellElement);
            });

            const estadia = fechaHora ? calcularEstadia(fechaHora) : { horas: 0, minutos: 0, diferencia: 0 };
            const tdEstadia = document.createElement("td");
            tdEstadia.textContent = `${estadia.horas}h ${estadia.minutos}m`;

            const tipoPago = row[6] || "";
            const minutosRestantes = calcularMinutosRestantes(estadia, tipoPago);
            const tdMinutosRestantes = document.createElement("td");

            const valorColumna9 = parseFloat(row[9]) || 0;
            const total = valorColumna9 + 1;
            const tdTotal = document.createElement("td");
            tdTotal.textContent = total;

            if (minutosRestantes <= 0) {
                const tiempoExcedido = Math.abs(minutosRestantes);
                const horasExcedidas = Math.floor(tiempoExcedido / 60);
                const minutosExcedidos = tiempoExcedido % 60;
                tdMinutosRestantes.textContent = `Tiempo excedido por ${horasExcedidas}h ${minutosExcedidos}m`;
                [tdEstadia, tdMinutosRestantes, tdTotal].forEach(td => td.style.backgroundColor = "#f1666d");
            } else if (minutosRestantes < 15) {
                tdMinutosRestantes.textContent = `Realizar checkout. ${minutosRestantes}m restantes`;
                [tdEstadia, tdMinutosRestantes, tdTotal].forEach(td => td.style.backgroundColor = "#ffcc54");
            } else {
                tdMinutosRestantes.textContent = `${minutosRestantes}m`;
            }

            tr.appendChild(tdEstadia);
            tr.appendChild(tdMinutosRestantes);
            tr.appendChild(tdTotal);
            tbody.appendChild(tr);
        }
    });

    const totalesSalaContainer = document.getElementById("totalesSala");
    totalesSalaContainer.innerHTML = "";

    for (const sala in totalesPorSala) {
        const p = document.createElement("p");
        p.textContent = `${totalesPorSala[sala].toFixed(0)}`;
        totalesSalaContainer.appendChild(p);
    }
};

const filtrarSala = (sala) => {
    const datosFiltrados = datosFiltradosGlobal.filter((row, index) => {
        return index === 0 || (row.includes("-") && row[jsonDataGlobal[0].indexOf('Sala')] === sala);
    });
    actualizarTabla(datosFiltrados);
};

const filtrarPorEstado = (estado) => {
    const filas = document.querySelectorAll("#tablaExcel tbody tr");
    filas.forEach(fila => {
        const color = fila.children[fila.children.length - 3].style.backgroundColor;
        fila.style.display = (estado === "excedido" && color === "rgb(241, 102, 109)") ||
            (estado === "recheck" && color === "rgb(255, 204, 84)") ? "" : "none";
    });
};

const limpiarFiltro = () => actualizarTabla(datosFiltradosGlobal);
const actualizarContenido = () => cargarExcel();
const scrollArriba = () => window.scrollTo({ top: 0, behavior: "smooth" });
