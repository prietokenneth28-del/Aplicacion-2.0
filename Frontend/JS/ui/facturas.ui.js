import {
    obtenerSiguienteFactura,
    obtenerFacturaCompleta,
    guardarFactura,
    editarFactura,
    eliminarFactura 
} from "../api/facturas.api.js";

import { calcularTotalesFactura } from "../services/totales.service.js";
import { crearTablaEditable } from "./tablas.ui.js";
//FUNCION REQUERIDA PARA CONSEGUIR CLIENTE
import {
    obtenerClientePorPlaca,
} from "../api/clientes.api.js";

import { cargarFormularioCliente } 
    from "./helpers/formClientes.helper.js";

const API_URL =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "http://localhost:2000"
        : "https://aplicacion-2-0.onrender.com";

// Inputs
const InputFactura = document.getElementById("InputFactura");
const InputFechaFacturacion = document.getElementById("InputFechaFacturacion");
const InputFechaGarantia = document.getElementById("InputFechaGarantia");
const CheckGarantia = document.getElementById("CheckGarantia");
const CheckFacturas = document.getElementById("CheckFacturas");

// Botones
const BtnNuevaFactura = document.getElementById("BtnNuevaFactura");
const BtnBuscarFactura = document.getElementById("BtnBuscarFactura");
const BtnGuardarFactura = document.getElementById("BtnGuardarFactura")
const BtnEditarFactura = document.getElementById("BtnEditarFactura")
const BtnEliminarFactura = document.getElementById("BtnEliminarFactura")
const BtnExportarPDF = document.getElementById("BtnExportarPDF");

// Estado
let servicios = [];
let repuestos = [];
let insumos   = [];


//Estado inicial de los botones:
BtnGuardarFactura.disabled = true;
BtnEditarFactura.disabled = true;
BtnEliminarFactura.disabled = true;



const controlFactura = localStorage.getItem("controlFactura");

if (controlFactura) {
    const data = JSON.parse(controlFactura);

    // ---------------- CLIENTE ----------------
    InputPlaca.value = data.cliente.placa;
    SelectMarcas.value = data.cliente.marca;
    InputModelo.value = data.cliente.modelo;
    InputAño.value = data.cliente.año;
    InputNombre.value = data.cliente.nombre;
    InputTelefono.value = data.cliente.telefono;

    // ---------------- LIMPIAR ----------------
    arregloServicios = [];
    arregloRepuestos = [];
    arregloInsumos = [];

    // ---------------- DETALLE ----------------
    arregloServicios = data.servicios || [];
    arregloRepuestos = data.repuestos || [];
    arregloInsumos = data.insumos || [];

    redibujartabla(TablaServicios, arregloServicios);
    redibujartabla(TablaRepuestos, arregloRepuestos);
    redibujartabla(TablaInsumos, arregloInsumos);

    calcularTotalGeneral();

    // Evitar recarga accidental
    localStorage.removeItem("controlFactura");
}

// Nueva factura
BtnNuevaFactura.addEventListener("click", async () => {
    try {
        const next = await obtenerSiguienteFactura();
        InputFactura.value = next;
        InputFactura.disabled = true;

        const hoy = new Date().toISOString().split("T")[0];
        InputFechaFacturacion.value = hoy;

        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() + 31);
        InputFechaGarantia.value = fecha.toISOString().split("T")[0];


        BtnNuevaFactura.disabled = false;
        BtnBuscarFactura.disabled = true;
        BtnGuardarFactura.disabled = false;

    } catch (error) {
        alert(error.message);
    }
});

// Buscar factura
let clienteFactura = null;

BtnBuscarFactura.addEventListener("click", async () => {
    try {
        const factura = await obtenerFacturaCompleta(InputFactura.value);

        // ---------------- CHECKBOXES ----------------
        CheckGarantia.checked = factura.garantiacondicion;
        CheckFacturas.checked = factura.repuestoscondicion;

        // ---------------- FECHAS ----------------
        InputFechaFacturacion.value = factura.fechaexp.split("T")[0];
        const fecha = new Date(InputFechaFacturacion.value + "T00:00:00");

        // Sumar 30 días de garantía
        fecha.setDate(fecha.getDate() + 30);

        InputFechaGarantia.value = fecha.toISOString().split("T")[0];

        // ---------------- CLIENTE ----------------
        const cliente = await obtenerClientePorPlaca(factura.placa);
        cargarFormularioCliente(cliente);

        // ---------------- DETALLE ----------------
        const serviciosDB = [];
        const repuestosDB = [];
        const insumosDB = [];

        factura.detalle.forEach(item => {
            const obj = {
                desc: item.descripcion,
                valor: Number(item.valor)
            };

            if (item.tipo === "SERVICIO") serviciosDB.push(obj);
            if (item.tipo === "REPUESTO") repuestosDB.push(obj);
            if (item.tipo === "INSUMO")   insumosDB.push(obj);
        });

        // 🔥 CARGA REAL EN LAS TABLAS (CLAVE)
        tablaServicios.setItems(serviciosDB);
        tablaRepuestos.setItems(repuestosDB);
        tablaInsumos.setItems(insumosDB);

        // ---------------- ESTADO GLOBAL ----------------
        servicios = serviciosDB;
        repuestos = repuestosDB;
        insumos   = insumosDB;

        // ---------------- TOTALES ----------------
        recalcular();

        // ---------------- BOTONES ----------------
        BtnGuardarFactura.disabled = true;
        BtnEditarFactura.disabled = false;
        BtnEliminarFactura.disabled = false;

    } catch (error) {
        alert(error.message);

        tablaServicios.clear();
        tablaRepuestos.clear();
        tablaInsumos.clear();

        BtnGuardarFactura.disabled = true;
        BtnEditarFactura.disabled = true;
        BtnEliminarFactura.disabled = true;
    }
});


BtnGuardarFactura.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();   
    try {
        if (!InputFactura.value || !InputPlaca.value) {
            return alert("Datos incompletos");
        }

        const totales = calcularTotalesFactura({
            servicios,
            repuestos,
            insumos,
            garantia: CheckGarantia.checked,
            incluyeRepuestos: CheckFacturas.checked
        });

        const factura = {
            placa: document.getElementById("InputPlaca").value.trim().toUpperCase(),
            numeroFactura: InputFactura.value,
            fechaFacturacion: InputFechaFacturacion.value,
            fechaGarantia: InputFechaGarantia.value,
            garantia: CheckGarantia.checked,
            incluyeRepuestos: CheckFacturas.checked,
            servicios,
            repuestos,
            insumos,
            totales
        };

        await guardarFactura(factura);

        alert("Factura guardada correctamente");

        // Limpieza básica
        InputFactura.disabled = false;
        document.getElementById("FormInformacionFactura").reset();

    } catch (error) {
        alert(error.message);
    }
});

BtnEditarFactura.addEventListener("click", async () => {
    if (!confirm("¿Desea actualizar esta factura?")) return;

    try {
        const totales = calcularTotalesFactura({
            servicios,
            repuestos,
            insumos,
            garantia: CheckGarantia.checked,
            incluyeRepuestos: CheckFacturas.checked
        });

        const factura = {
            placa: document.getElementById("InputPlaca").value.trim().toUpperCase(),
            fechaFacturacion: InputFechaFacturacion.value,
            fechaGarantia: InputFechaGarantia.value,
            garantia: CheckGarantia.checked,
            incluyeRepuestos: CheckFacturas.checked,
            servicios,
            repuestos,
            insumos,
            totales
        };

        await editarFactura(InputFactura.value, factura);

        alert("Factura actualizada correctamente");

    } catch (error) {
        alert(error.message);
    }
});

BtnEliminarFactura.addEventListener("click", async () => {
    if (!confirm("¿Está seguro de eliminar esta factura? Esta acción no se puede deshacer.")) {
        return;
    }

    try {
        await eliminarFactura(InputFactura.value);

        alert("Factura eliminada correctamente");

        // ---------------- LIMPIEZA TOTAL ----------------
        document.getElementById("FormInformacionFactura").reset();
        document.getElementById("FormInfomacionCliente").reset();

        InputFactura.disabled = false;

        tablaServicios.clear();
        tablaRepuestos.clear();
        tablaInsumos.clear();

        servicios = [];
        repuestos = [];
        insumos = [];

        document.getElementById("totalServicios").innerText = "0";
        document.getElementById("totalRepuestos").innerText = "0";
        document.getElementById("totalInsumos").innerText = "0";
        document.getElementById("total").innerText = "0";

        // Botones
        BtnGuardarFactura.disabled = true;
        BtnEditarFactura.disabled = true;
        BtnEliminarFactura.disabled = true;

    } catch (error) {
        alert(error.message);
    }
});

BtnExportarPDF.addEventListener("click", () => {
    if (!InputFactura.value) {
        return alert("No hay factura seleccionada");
    }
    const token = localStorage.getItem("token");
    window.open(
        `${API_URL}/facturas/${InputFactura.value}/pdf?token=${token}`,
        "_blank"
    );
});





// Recalcular totales
const recalcular = () => {
    const totales = calcularTotalesFactura({
        servicios,
        repuestos,
        insumos,
        garantia: CheckGarantia.checked,
        incluyeRepuestos: CheckFacturas.checked
    });

    document.getElementById("totalServicios").innerText =
        totales.totalServicios.toLocaleString("es-CO");
    document.getElementById("Total Repuestos").innerText =
        totales.totalRepuestos.toLocaleString("es-CO");
    document.getElementById("Total Insumos").innerText =
        totales.totalInsumos.toLocaleString("es-CO");
    document.getElementById("total").innerText =
        totales.total.toLocaleString("es-CO");

};

// SERVICIOS
const tablaServicios = crearTablaEditable({
    form: document.getElementById("FormIngresoServicios"),
    inputDesc: document.getElementById("inputServiciosDescripcion"),
    inputValor: document.getElementById("inputServiciosValor"),
    tablaBody: document.getElementById("TablaServicios"),
    onChange: (data) => {
        servicios = data;
        recalcular();
    }
});

// REPUESTOS
const tablaRepuestos = crearTablaEditable({
    form: document.getElementById("FormIngresoRepuestos"),
    inputDesc: document.getElementById("inputRepuestosDescripcion"),
    inputValor: document.getElementById("inputRepuestosValor"),
    tablaBody: document.getElementById("TablaRepuestos"),
    onChange: (data) => {
        repuestos = data;
        recalcular();
    }
});

// INSUMOS
const tablaInsumos = crearTablaEditable({
    form: document.getElementById("FormIngresoInsumos"),
    inputDesc: document.getElementById("inputInsumosDescripcion"),
    inputValor: document.getElementById("inputInsumosValor"),
    tablaBody: document.getElementById("TablaInsumos"),
    onChange: (data) => {
        insumos = data;
        recalcular();
    }
});

InputFechaFacturacion.addEventListener("change", () => {
  if (!InputFechaFacturacion.value) return;

  const fecha = new Date(InputFechaFacturacion.value + "T00:00:00");

  // Sumar 30 días de garantía
  fecha.setDate(fecha.getDate() + 30);

  InputFechaGarantia.value = fecha.toISOString().split("T")[0];
});
