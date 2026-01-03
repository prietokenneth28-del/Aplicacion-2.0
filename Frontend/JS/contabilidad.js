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

    // ================= VER FACTURA =================
    const verFactura = async (numeroFactura) => {
        facturaSeleccionada = numeroFactura;
        
        try {
            const data = await fetchAuth(
                `/facturas/nfactura/${numeroFactura}`
            );

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
                    <ul class="list-group">
                        ${data.detalle.map(d => `
                            <li class="list-group-item d-flex justify-content-between">
                                <span><b>${d.tipo}</b> – ${d.descripcion}</span>
                                <span>$ ${Number(d.valor).toLocaleString("es-CO")}</span>
                            </li>
                        `).join("")}
                    </ul>
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

    // ================= EXPORTAR INSUMOS =================
    btnExportarInsumosPDF.addEventListener("click", () => {

        if (!fechaDesde.value || !fechaHasta.value) {
            return alert("Seleccione un rango de fechas");
        }

            const token = localStorage.getItem("token");

    window.open(
    `${API_URL}/facturas/insumos/pdf?desde=${fechaDesde.value}&hasta=${fechaHasta.value}&token=${token}`,
    "_blank"
    );
   
    });

});
