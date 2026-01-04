import { fetchAuth } from "./helpers/fetchAuth.js";

/* ==============================
   GUARD CLAUSE (solo Control.html)
================================ */
if (!document.getElementById("BtnGuardarControl")) {
    // Este JS no corresponde a esta página
    throw new Error("control.js cargado fuera de Control.html");
}

/* ==============================
   ESTADO LOCAL (Control)
================================ */
let servicios = [];
let repuestos = [];
let insumos = [];

/* ==============================
   ELEMENTOS DOM
================================ */
const InputPlaca = document.getElementById("InputPlaca");
const BtnBuscarCliente = document.getElementById("BtnBuscarCliente");
const BtnGuardarControl = document.getElementById("BtnGuardarControl");
const BtnGenerarFactura = document.getElementById("BtnGenerarFactura");

const SelectMarcas = document.getElementById("SelectMarcas");
const InputModelo = document.getElementById("InputModelo");
const InputAño = document.getElementById("InputAño");
const InputNombre = document.getElementById("InputNombre");
const InputTelefono = document.getElementById("InputTelefono");

const ControlEstado = document.getElementById("ControlEstado");

const TablaServicios = document.getElementById("TablaServicios");
const TablaRepuestos = document.getElementById("TablaRepuestos");
const TablaInsumos = document.getElementById("TablaInsumos");

/* ==============================
   RENDER TABLAS (LOCAL)
================================ */
const renderTabla = (tbody, items) => {
    tbody.innerHTML = "";
    items.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.desc}</td>
            <td>$ ${Number(item.valor).toLocaleString("es-CO")}</td>
            <td>
                <button class="btn btn-danger btn-sm">Eliminar</button>
            </td>
        `;
        tr.querySelector("button").onclick = () => {
            items.splice(index, 1);
            renderTabla(tbody, items);
            recalcularTotales();
        };
        tbody.appendChild(tr);
    });
};

/* ==============================
   TOTALES
================================ */
const recalcularTotales = () => {
    const totalServicios = servicios.reduce((a, b) => a + Number(b.valor), 0);
    const totalRepuestos = repuestos.reduce((a, b) => a + Number(b.valor), 0);
    const totalInsumos = insumos.reduce((a, b) => a + Number(b.valor), 0);

    document.getElementById("totalServicios").innerText =
        totalServicios.toLocaleString("es-CO");
    document.getElementById("Total Repuestos").innerText =
        totalRepuestos.toLocaleString("es-CO");
    document.getElementById("Total Insumos").innerText =
        totalInsumos.toLocaleString("es-CO");
    document.getElementById("total").innerText =
        (totalServicios + totalRepuestos + totalInsumos).toLocaleString("es-CO");
};

/* ==============================
   BUSCAR CLIENTE
================================ */
BtnBuscarCliente.onclick = async () => {
    const placa = InputPlaca.value.trim().toUpperCase();
    if (!placa) return alert("Ingrese la placa");

    try {
        const cliente = await fetchAuth(`/clientes/placa/${placa}`);
        SelectMarcas.value = cliente.marca;
        InputModelo.value = cliente.modelo;
        InputAño.value = cliente.año ?? "";
        InputNombre.value = cliente.nombre;
        InputTelefono.value = cliente.telefono ?? "";
    } catch (e) {
        alert(e.message);
    }
};

/* ==============================
   GUARDAR CONTROL
================================ */
BtnGuardarControl.onclick = async () => {
    if (!InputPlaca.value) return alert("Ingrese la placa");

    try {
        await fetchAuth("/control", {
            method: "POST",
            body: {
                placa: InputPlaca.value.toUpperCase(),
                servicios,
                repuestos,
                insumos
            }
        });
        alert("Control guardado correctamente");
    } catch (e) {
        alert(e.message);
    }
};

/* ==============================
   GENERAR FACTURA
================================ */
BtnGenerarFactura.onclick = async () => {
    try {
        const data = await fetchAuth(
            `/control/${InputPlaca.value}/generar`,
            { method: "POST" }
        );
        localStorage.setItem("controlFactura", JSON.stringify(data));
        window.location.href = "Factura.html";
    } catch (e) {
        alert(e.message);
    }
};
