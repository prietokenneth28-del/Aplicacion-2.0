import { fetchAuth } from "./helpers/fetchAuth.js";

document.addEventListener("DOMContentLoaded", () => {
const API_URL = "https://aplicacion-2-0.onrender.com";

    console.log("Contabilidad cargada ✅");

    const fechaDesde = document.getElementById("fechaDesde");
    const fechaHasta = document.getElementById("fechaHasta");
    const btnFiltrar = document.getElementById("btnFiltrar");
    const btnExportarInsumosPDF = document.getElementById("btnExportarInsumosPDF");

    const lblTotalInsumos = document.getElementById("lblTotalInsumos");
    const lblTotalOmar = document.getElementById("lblTotalOmar");
    const lblTotalRogers = document.getElementById("lblTotalRogers");

    const tablaFacturas = document.getElementById("tablaFacturas");
    const tablaInsumos = document.getElementById("tablaInsumos");

    const btnEditarFactura = document.getElementById("btnEditarFactura");
    const btnEliminarFactura = document.getElementById("btnEliminarFactura");
    //Select para filtro de fecha:
    const selectFiltroFecha = document.getElementById("SelectFiltroFecha");



    selectFiltroFecha.addEventListener("change", () => {
        aplicarFiltroFecha(selectFiltroFecha.value);
        btnFiltrar.click();
    });


    const aplicarFiltroFecha = (filtro) => {
            const hoy = new Date();
            let desde = null;
            let hasta = null;

            switch (filtro) {
                case "Hoy":
                    desde = new Date(hoy);
                    hasta = new Date(hoy);
                    break;

                case "Ayer":
                    desde = new Date(hoy);
                    desde.setDate(hoy.getDate() - 1);
                    hasta = new Date(desde);
                    break;

                case "Esta semana":
                    desde = new Date(hoy);
                    desde.setDate(hoy.getDate() - hoy.getDay()); // domingo
                    hasta = new Date(hoy);
                    break;

                case "Semana pasada":
                    desde = new Date(hoy);
                    desde.setDate(hoy.getDate() - hoy.getDay() - 7);
                    hasta = new Date(desde);
                    hasta.setDate(desde.getDate() + 6);
                    break;

                case "Este mes":
                    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                    hasta = new Date(hoy);
                    break;

                default:
                    return;
            }

            fechaDesde.value = formatearFecha(desde);
            fechaHasta.value = formatearFecha(hasta);
};

        const formatearFecha = (fecha) => {
            return fecha.toISOString().split("T")[0];
        };


    let facturaSeleccionada = null;
            btnEditarFactura.onclick = () => {
                if (!facturaSeleccionada) {
                    return alert("No hay factura seleccionada");
                }

                // Redirige al módulo principal de facturación
                window.location.href = `Factura.html?factura=${facturaSeleccionada}`;
            };

            btnEliminarFactura.onclick = async () => {
        if (!facturaSeleccionada) {
            return alert("No hay factura seleccionada");
        }

        const confirmar = confirm(
            "⚠️ ¿Está seguro de eliminar esta factura?\nEsta acción NO se puede deshacer."
        );

        if (!confirmar) return;

        try {
            await fetchAuth(`/facturas/${facturaSeleccionada}`, {
                method: "DELETE"
            });

            alert("Factura eliminada correctamente");

            // Cerrar modal
            bootstrap.Modal.getInstance(
                document.getElementById("modalFactura")
            ).hide();

            // Limpiar selección
            facturaSeleccionada = null;

            // Volver a ejecutar el filtro actual
            document.getElementById("btnFiltrar").click();

        } catch (error) {
            alert(error.message);
        }
    };



    // ================= FILTRAR =================
    btnFiltrar.addEventListener("click", async () => {

        if (!fechaDesde.value || !fechaHasta.value) {
            return alert("Seleccione un rango de fechas");
        }

        try {
            const data = await fetchAuth(
                `/facturas/resumen?desde=${fechaDesde.value}&hasta=${fechaHasta.value}`
            );

            // Totales
            lblTotalInsumos.innerText =
                `$ ${Number(data.totales.total_insumos).toLocaleString("es-CO")}`;

            lblTotalOmar.innerText =
                `$ ${Number(data.totales.total_omar).toLocaleString("es-CO")}`;

            lblTotalRogers.innerText =
                `$ ${Number(data.totales.total_rogers).toLocaleString("es-CO")}`;

            // Tabla facturas
            tablaFacturas.innerHTML = "";

            data.facturas.forEach(f => {
                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${f.numerofactura}</td>
                    <td>${f.fechaexp.split("T")[0]}</td>
                    <td>$ ${Number(f.totalrogers).toLocaleString("es-CO")}</td>
                    <td>$ ${Number(f.totalinsumos).toLocaleString("es-CO")}</td>
                    <td>$ ${Number(f.totalomar).toLocaleString("es-CO")}</td>
                    <td>
                        <button class="btn btn-sm btn-info verFacturaBtn"
                            data-numero="${f.numerofactura}">
                            Ver
                        </button>
                    </td>
                `;

                tablaFacturas.appendChild(tr);
            });

            // Delegación de eventos (MUY IMPORTANTE)
            tablaFacturas.querySelectorAll(".verFacturaBtn").forEach(btn => {
                btn.onclick = () => verFactura(btn.dataset.numero);
            });

            // Tabla insumos
            tablaInsumos.innerHTML = "";

            if (Array.isArray(data.insumos)) {
                data.insumos.forEach(i => {
                    const tr = document.createElement("tr");

                    tr.innerHTML = `
                        <td>${i.numerofactura}</td>
                        <td>${i.fechaexp.split("T")[0]}</td>
                        <td>${i.descripcion}</td>
                        <td>$ ${Number(i.valor).toLocaleString("es-CO")}</td>
                    `;

                    tablaInsumos.appendChild(tr);
                });
            }

        } catch (error) {
            alert(error.message);
        }
    });

    const renderGrupo = (titulo, items) => {
        if (items.length === 0) return "";

        return `
            <div class="mb-3">
                <h6 class="text-secondary">${titulo}</h6>
                <ul class="list-group">
                    ${items.map(i => `
                        <li class="list-group-item d-flex justify-content-between">
                            <span>${i.descripcion}</span>
                            <span>$ ${Number(i.valor).toLocaleString("es-CO")}</span>
                        </li>
                    `).join("")}
                </ul>
            </div>
        `;
    };
    // ================= VER FACTURA =================
    const verFactura = async (numeroFactura) => {
        facturaSeleccionada = numeroFactura;
        
        try {
            const data = await fetchAuth(
                `/facturas/nfactura/${numeroFactura}`
            );
                const servicios = [];
                const repuestos = [];
                const insumos = [];

                data.detalle.forEach(d => {
                    if (d.tipo === "SERVICIO") servicios.push(d);
                    if (d.tipo === "REPUESTO") repuestos.push(d);
                    if (d.tipo === "INSUMO") insumos.push(d);
                });

            document.getElementById("detalleFactura").innerHTML = `
                <div class="mb-3">
                    <h6 class="text-primary">Datos del cliente</h6>
                    <div><b>Nombre:</b> ${data.cliente.nombre}</div>
                    <div><b>Placa:</b> ${data.placa}</div>
                    <div><b>Vehículo:</b> ${data.cliente.marca} ${data.cliente.modelo}</div>
                </div>

                <hr>

                <div class="mb-3">
                    <h6 class="text-primary">Datos de la factura</h6>
                    <div><b>N° Factura:</b> ${data.numerofactura}</div>
                    <div><b>Fecha:</b> ${data.fechaexp.split("T")[0]}</div>
                </div>

                <hr>

            <div>
                <h6 class="text-primary">Detalle</h6>

                ${renderGrupo("Servicios", servicios)}
                ${renderGrupo("Repuestos", repuestos)}
                ${renderGrupo("Insumos", insumos)}
            </div>
            `;
            const btnVerPDF = document.getElementById("btnVerPDF");
            const token = localStorage.getItem("token");

            btnVerPDF.onclick = () => {
                window.open(
                `${API_URL}/facturas/${numeroFactura}/pdf?token=${token}`,
                "_blank"
                );

            };
            new bootstrap.Modal(
                document.getElementById("modalFactura")
            ).show();

        } catch (error) {
            alert(error.message);
        }
    };

    btnExportarInsumosPDF.addEventListener("click", () => {

        if (!fechaDesde.value || !fechaHasta.value) {
            return alert("Seleccione un rango de fechas");
        }

        const token = localStorage.getItem("token");

        window.open(
        `${API_URL}/facturas/resumen/pdf?desde=${fechaDesde.value}&hasta=${fechaHasta.value}&token=${token}`,
        "_blank"
        );
    });


});
