/* ======================================================
   IMPORTS
====================================================== */
import {
  obtenerSiguienteFactura,
  obtenerFacturaCompleta,
  guardarFactura,
  editarFactura,
  eliminarFactura
} from "../api/facturas.api.js";

import { calcularTotalesFactura } from "../services/totales.service.js";
import { crearTablaEditable } from "./tablas.ui.js";

import { obtenerClientePorPlaca } from "../api/clientes.api.js";
import { cargarFormularioCliente } from "./helpers/formClientes.helper.js";
import { fetchAuth } from "../helpers/fetchAuth.js";

/* ======================================================
   CONSTANTES
====================================================== */
const API_URL =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:2000"
    : "https://aplicacion-2-0.onrender.com";

/* ======================================================
   ESTADO GLOBAL (⚠️ SIEMPRE ARRIBA)
====================================================== */
let servicios = [];
let repuestos = [];
let insumos   = [];

/* ======================================================
   ELEMENTOS DOM
====================================================== */
// Inputs factura
const InputFactura          = document.getElementById("InputFactura");
const InputFechaFacturacion = document.getElementById("InputFechaFacturacion");
const InputFechaGarantia    = document.getElementById("InputFechaGarantia");
const CheckGarantia         = document.getElementById("CheckGarantia");
const CheckFacturas         = document.getElementById("CheckFacturas");

// Botones
const BtnNuevaFactura   = document.getElementById("BtnNuevaFactura");
const BtnBuscarFactura  = document.getElementById("BtnBuscarFactura");
const BtnGuardarFactura = document.getElementById("BtnGuardarFactura");
const BtnEditarFactura  = document.getElementById("BtnEditarFactura");
const BtnEliminarFactura= document.getElementById("BtnEliminarFactura");
const BtnExportarPDF    = document.getElementById("BtnExportarPDF");

/* ======================================================
   GUARD CLAUSE (si no es Factura.html, salir)
====================================================== */
/* ======================================================
   TABLAS EDITABLES
====================================================== */
const tablaServicios = crearTablaEditable({
  form: document.getElementById("FormIngresoServicios"),
  inputDesc: document.getElementById("inputServiciosDescripcion"),
  inputValor: document.getElementById("inputServiciosValor"),
  tablaBody: document.getElementById("TablaServicios"),
  onChange: data => {
    servicios = data;
    recalcular();
  }
});

const tablaRepuestos = crearTablaEditable({
  form: document.getElementById("FormIngresoRepuestos"),
  inputDesc: document.getElementById("inputRepuestosDescripcion"),
  inputValor: document.getElementById("inputRepuestosValor"),
  tablaBody: document.getElementById("TablaRepuestos"),
  onChange: data => {
    repuestos = data;
    recalcular();
  }
});

const tablaInsumos = crearTablaEditable({
  form: document.getElementById("FormIngresoInsumos"),
  inputDesc: document.getElementById("inputInsumosDescripcion"),
  inputValor: document.getElementById("inputInsumosValor"),
  tablaBody: document.getElementById("TablaInsumos"),
  onChange: data => {
    insumos = data;
    recalcular();
  }
});

/* ======================================================
   FUNCIONES
====================================================== */
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

/* ======================================================
   ESTADO INICIAL DE BOTONES
====================================================== */
BtnGuardarFactura.disabled = true;
BtnEditarFactura.disabled  = true;
BtnEliminarFactura.disabled= true;

/* ======================================================
   CARGA AUTOMÁTICA DESDE CONTROL
====================================================== */
const controlFactura = localStorage.getItem("controlFactura");

if (controlFactura) {
  (async () => {
    const data = JSON.parse(controlFactura);

    // Cliente
    cargarFormularioCliente(data.cliente);

    // Detalle
    servicios = data.servicios || [];
    repuestos = data.repuestos || [];
    insumos   = data.insumos   || [];

    tablaServicios.setItems(servicios);
    tablaRepuestos.setItems(repuestos);
    tablaInsumos.setItems(insumos);

    // 🔥 Obtener siguiente factura
    const next = await obtenerSiguienteFactura();
    InputFactura.value = next;
    InputFactura.disabled = true;

    // Fechas
    const hoy = new Date().toISOString().split("T")[0];
    InputFechaFacturacion.value = hoy;

    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + 30);
    InputFechaGarantia.value = fecha.toISOString().split("T")[0];

    recalcular();

    BtnGuardarFactura.disabled = false;

    localStorage.removeItem("controlFactura");
  })();
}


/* ======================================================
   EVENTOS
====================================================== */
// Nueva factura
BtnNuevaFactura.addEventListener("click", async () => {
  const next = await obtenerSiguienteFactura();
  InputFactura.value = next;
  InputFactura.disabled = true;

  const hoy = new Date().toISOString().split("T")[0];
  InputFechaFacturacion.value = hoy;

  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() + 30);
  InputFechaGarantia.value = fecha.toISOString().split("T")[0];

  BtnBuscarFactura.disabled = true;
  BtnGuardarFactura.disabled = false;
});

// Buscar factura
BtnBuscarFactura.addEventListener("click", async () => {
  const factura = await obtenerFacturaCompleta(InputFactura.value);

  CheckGarantia.checked = factura.garantiacondicion;
  CheckFacturas.checked = factura.repuestoscondicion;

  InputFechaFacturacion.value = factura.fechaexp.split("T")[0];
  const fecha = new Date(InputFechaFacturacion.value + "T00:00:00");
  fecha.setDate(fecha.getDate() + 30);
  InputFechaGarantia.value = fecha.toISOString().split("T")[0];

  const cliente = await obtenerClientePorPlaca(factura.placa);
  cargarFormularioCliente(cliente);

  const s = [], r = [], i = [];
  factura.detalle.forEach(d => {
    const obj = { desc: d.descripcion, valor: Number(d.valor) };
    if (d.tipo === "SERVICIO") s.push(obj);
    if (d.tipo === "REPUESTO") r.push(obj);
    if (d.tipo === "INSUMO")   i.push(obj);
  });

  servicios = s; repuestos = r; insumos = i;

  tablaServicios.setItems(s);
  tablaRepuestos.setItems(r);
  tablaInsumos.setItems(i);

  recalcular();

  BtnGuardarFactura.disabled = true;
  BtnEditarFactura.disabled  = false;
  BtnEliminarFactura.disabled= false;
});

// Guardar factura
BtnGuardarFactura.addEventListener("click", async () => {
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
  await fetchAuth(`/control/${factura.placa}/facturar`, { method: "PUT" });

  alert("Factura guardada correctamente");
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


// Eliminar factura
BtnEliminarFactura.addEventListener("click", async () => {
  if (!confirm("¿Eliminar factura?")) return;
  await eliminarFactura(InputFactura.value);
  alert("Factura eliminada");
  location.reload();
});

// Exportar PDF
BtnExportarPDF.addEventListener("click", () => {
  if (!InputFactura.value) return alert("No hay factura");
  const token = localStorage.getItem("token");
  window.open(`${API_URL}/facturas/${InputFactura.value}/pdf?token=${token}`);
});

// Fecha → garantía
InputFechaFacturacion.addEventListener("change", () => {
  const fecha = new Date(InputFechaFacturacion.value + "T00:00:00");
  fecha.setDate(fecha.getDate() + 30);
  InputFechaGarantia.value = fecha.toISOString().split("T")[0];
});
