/* ======================================================
   IMPORTS
====================================================== */
import {
  obtenerSiguienteFactura,
  obtenerFacturaCompleta,
  guardarFactura,
  editarFactura,
  eliminarFactura,
  obtenerHistorialPorPlaca
} from "../api/facturas.api.js";


import { calcularTotalesFactura } from "../services/totales.service.js";
import { crearTablaEditable } from "./tablas.ui.js";

import { obtenerClientePorPlaca } from "../api/clientes.api.js";
import { cargarFormularioCliente } from "./helpers/formClientes.helper.js";
import { fetchAuth } from "../helpers/fetchAuth.js";

/* ======================================================
   CONSTANTES
====================================================== */
const API_URL = "https://aplicacion-2-0.onrender.com";

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
const InputPlaca            = document.getElementById("InputPlaca");
// Botones
const BtnNuevaFactura   = document.getElementById("BtnNuevaFactura");
const BtnBuscarFactura  = document.getElementById("BtnBuscarFactura");
const BtnGuardarFactura = document.getElementById("BtnGuardarFactura");
const BtnEditarFactura  = document.getElementById("BtnEditarFactura");
const BtnEliminarFactura= document.getElementById("BtnEliminarFactura");
const BtnExportarPDF    = document.getElementById("BtnExportarPDF");
const BtnHistorialCliente = document.getElementById("BtnHistorialCliente");
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

async function cargarDatosDelCliente(placa) {
    try {
        const cliente = await obtenerClientePorPlaca(placa);
        
        if (cliente) {
            // 2. Rellenar el formulario de Factura
            // IMPORTANTE: Verifica que estos IDs coincidan con los de tu HTML en Factura.html
            const inputPlaca = document.getElementById('InputPlaca'); 
            const inputNombre = document.getElementById('InputNombre');
            const inputTelefono = document.getElementById('InputTelefono');
            const SelectMarcas = document.getElementById("SelectMarcas");
            const InputModelo = document.getElementById("InputModelo");
            const InputAño = document.getElementById("InputAño");

            if(inputPlaca) inputPlaca.value = cliente.placa;
            if(inputNombre) inputNombre.value = cliente.nombre;
            if(inputTelefono) inputTelefono.value = cliente.telefono;
            if (SelectMarcas) SelectMarcas.value = cliente.marca;
            if (InputModelo) InputModelo.value = cliente.modelo;
            if (InputAño) InputAño.value = cliente.año;

            if(inputPlaca) inputPlaca.readOnly = true;
            BtnNuevaFactura.disabled = false;
            BtnNuevaFactura.click();
            BtnHistorialCliente.disabled = false;   
            console.log("Cliente cargado en factura exitosamente");
        }
    } catch (error) {
        console.error("No se pudo cargar el cliente:", error);
        alert("No se pudo cargar la información del cliente automáticamente.");
    }
}

/* ======================================================
   ESTADO INICIAL DE BOTONES
====================================================== */
BtnGuardarFactura.disabled  = true;
BtnEditarFactura.disabled   = true;
BtnEliminarFactura.disabled = true;
BtnExportarPDF.disabled     = true;
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

  BtnBuscarFactura.disabled  = true;
  BtnGuardarFactura.disabled = false;
  CheckFacturas.checked      = false;
  CheckGarantia.checked      = false;

    servicios = [];
    repuestos = [];
    insumos   = [];

    tablaServicios.setItems(servicios);
    tablaRepuestos.setItems(repuestos);
    tablaInsumos.setItems(insumos);
    recalcular();
});

// Buscar factura
BtnBuscarFactura.addEventListener("click", async () => {
  const factura = await obtenerFacturaCompleta(InputFactura.value);
  CheckGarantia.checked = factura.garantiaCondicion;
  CheckFacturas.checked = factura.repuestosCondicion;

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
  BtnExportarPDF.disabled    = false;
  InputFactura.disabled      = true;
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
  InputPlaca.readOnly     = false;
  BtnExportarPDF.disabled = false;
  alert("Factura guardada correctamente ✅");
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

        alert("Factura actualizada correctamente ✅");

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
BtnExportarPDF.addEventListener("click", async () => {
  if (!InputFactura.value) return alert("No hay factura");

  const token = localStorage.getItem("token");
  const factura = InputFactura.value;

  const pdfLink = `${API_URL}/facturas/${factura}/pdf?token=${token}`;

  const response = await fetch(`${API_URL}/facturas/whatsapp/enviar-factura`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pdfLink,
      factura,
      telefono: "573125306913",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    alert("Error enviando PDF");
  } else {
    alert("PDF enviado por WhatsApp ✅");
  }
});


// Fecha → garantía
InputFechaFacturacion.addEventListener("change", () => {
  const fecha = new Date(InputFechaFacturacion.value + "T00:00:00");
  fecha.setDate(fecha.getDate() + 30);
  InputFechaGarantia.value = fecha.toISOString().split("T")[0];
});

BtnHistorialCliente.addEventListener("click", async () => {
    const placa = document.getElementById("InputPlaca").value.trim();
    if (!placa) return;

    const tablaBody = document.getElementById("tablaHistorialCliente");
    const emptyState = document.getElementById("historialEmptyState");
    
    // Mostrar estado de carga
    tablaBody.innerHTML = '<tr><td colspan="5" class="text-center p-3">Cargando historial...</td></tr>';
    emptyState.classList.add("d-none");
    
    const modal = new bootstrap.Modal(document.getElementById("modalHistorialCliente"));
    modal.show();

    try {
        const historial = await obtenerHistorialPorPlaca(placa);
        
        tablaBody.innerHTML = "";

        if (historial.length === 0) {
            emptyState.classList.remove("d-none");
            return;
        }

        historial.forEach(f => {
            const tr = document.createElement("tr");
            const total = Number(f.totalservicios) + Number(f.totalrepuestos) + Number(f.totalinsumos);
            
            tr.innerHTML = `
                <td><span class="badge bg-primary">#${f.numerofactura}</span></td>
                <td>${f.fechaexp.split("T")[0]}</td>
                <td><small class="text-muted">${f.placa}</small></td>
                <td class="text-end fw-bold text-success">$ ${total.toLocaleString("es-CO")}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-light btn-ver-historial" data-factura="${f.numerofactura}">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            `;
            tablaBody.appendChild(tr);
        });

        // Funcionalidad para cargar una factura antigua desde el historial
        document.querySelectorAll(".btn-ver-historial").forEach(btn => {
            btn.addEventListener("click", () => {
                document.getElementById("InputFactura").value = btn.dataset.factura;
                BtnBuscarFactura.disabled = false;
                BtnBuscarFactura.click();
                modal.hide();
            });
        });

    } catch (error) {
        tablaBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger p-3">Error: ${error.message}</td></tr>`;
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const placaParam = urlParams.get('placa');

    if (placaParam) {
        await cargarDatosDelCliente(placaParam);
        InputFactura.disabled = true;
    }
});

