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
    const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NDI0MzIyMDgsImV4cCI6MTc0MjU3MjIwOCwicm9sZXMiOltdLCJ1c2VybmFtZSI6IjEzOTMifQ.ocoGmd4EzG8-_Dtb1pGxAFiwebakVlXdxbqUxfrE5BQy-1MbIyy67CXhxXJ8It0_4zMgsyUYLxZaUldS3ciFA5b1LXQauRoqWWebJk_To-HsYPkMtB8NS6OFbdZp5Z4hiCPsKT7rYHdXpot5twEQNxPecsqfR-n5E3i9Cgzzv1nDnOWp_mVoph_OdfplfpoLLisk_In6lQ35pwvWZ9yihREcozNyUUMnWZCd9NLtaCH-nNUygBEudzt5uxRwl02sdZbPAZfg-ifNq8Q_lZdiux8hvf_cb1OkuAcPtJquVZqBnzoWaoGYehlQK-lGaVDhPrpHRr4b3ztQq4orAQ8p9PQPs6U-5o5RDYQDEuyiu96WcBBH0dsi47MlFUE8yQCIEDmKR-1m2h8QFUmJo488RPedP4JbVkSjjHjFaCDakUSBbQG10pHafb8Wl2p6tFK5lOx3yFwg8J6nRTiGBPD6dN3ZhAvXy1pwraugNFsMq2h5wjw_kDXCUch3x4_6XSHktiFquiX9tKhkMs2Z-EwDwi2LOTvisl4uX66ogHK-PYgA5RufKWCx73CdSZs-sGdfYkFNvR3La6kQPPxXP-uU4XC0pq6CtIOrqKJTAKOq2ig67R4-NGqPFLJRyikp2yVH0AhqayIWfrjuGdMGLKMM3F72ZTP5fDv49fW5KtsMsBk";
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
