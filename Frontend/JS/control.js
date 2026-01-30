import { fetchAuth } from "./helpers/fetchAuth.js";
import {
    obtenerClientePorPlaca,
    crearCliente,
    editarCliente,
    eliminarCliente
} from "./api/clientes.api.js";
import { cargarFormulario } from "./ui/clientes.ui.js";

// IMPORTAMOS LAS NUEVAS UTILIDADES DE UI
import { mostrarToast, confirmarAccion } from "./ui/utils.ui.js";

/* ======================================================
   ELEMENTOS DOM
====================================================== */
// Botones principales
const BtnGuardarControl   = document.getElementById("BtnGuardarControl");
const BtnGenerarFactura   = document.getElementById("BtnGenerarFactura");
const BtnBuscarCliente    = document.getElementById("BtnBuscarCliente");
const BtnGuardarCliente   = document.getElementById("BtnGuardarCliente");
const BtnEditarCliente    = document.getElementById("BtnEditarCliente");
const BtnEliminarCliente  = document.getElementById("BtnEliminarCliente");
const BtnNuevoControl     = document.getElementById("BtnNuevoControl");
// Estado inicial
BtnGuardarCliente.disabled = true;
BtnEditarCliente.disabled = true;
BtnEliminarCliente.disabled = true;


// Inputs cliente
const InputPlaca    = document.getElementById("InputPlaca");
const SelectMarcas  = document.getElementById("SelectMarcas");
const InputModelo   = document.getElementById("InputModelo");
const InputAño      = document.getElementById("InputAño");
const InputNombre   = document.getElementById("InputNombre");
const InputTelefono = document.getElementById("InputTelefono");

// Inputs detalle
const inputServiciosDescripcion = document.getElementById("inputServiciosDescripcion");
const inputServiciosValor       = document.getElementById("inputServiciosValor");
const inputRepuestosDescripcion = document.getElementById("inputRepuestosDescripcion");
const inputRepuestosValor       = document.getElementById("inputRepuestosValor");
const inputInsumosDescripcion   = document.getElementById("inputInsumosDescripcion");
const inputInsumosValor         = document.getElementById("inputInsumosValor");

// Tablas
const TablaServicios  = document.getElementById("TablaServicios");
const TablaRepuestos  = document.getElementById("TablaRepuestos");
const TablaInsumos    = document.getElementById("TablaInsumos");
const tablaControles  = document.getElementById("tablaControles");

// Estado visual
const ControlEstado = document.getElementById("ControlEstado");



// Formularios:
const FormInfomacionCliente = document.getElementById("FormInfomacionCliente")


/* ======================================================
   ESTADO GLOBAL
====================================================== */
let servicios  = [];
let repuestos  = [];
let insumos    = [];

let modoEdicion = null; // { tipo, index }

/* ======================================================
   HELPERS UI
====================================================== */
const cargarInputs = (tipo, item) => {
  if (tipo === "SERVICIO") {
    inputServiciosDescripcion.value = item.desc;
    inputServiciosValor.value = item.valor;
  }
  if (tipo === "REPUESTO") {
    inputRepuestosDescripcion.value = item.desc;
    inputRepuestosValor.value = item.valor;
  }
  if (tipo === "INSUMO") {
    inputInsumosDescripcion.value = item.desc;
    inputInsumosValor.value = item.valor;
  }
};

const activarModoEdicion = (boton) => {
  boton.innerText = "Actualizar";
  boton.classList.replace("btn-primary", "btn-warning");
};

const desactivarModoEdicion = (boton) => {
  boton.innerText = "+";
  boton.classList.replace("btn-warning", "btn-primary");
  modoEdicion = null;
};

const mostrarEstadoControl = (estado) => {
  if (estado === "PENDIENTE") {
    ControlEstado.innerHTML = `<span class="badge bg-warning text-dark">Control pendiente</span>`;
  } else if (estado === "FACTURADO") {
    ControlEstado.innerHTML = `<span class="badge bg-success">Control facturado</span>`;
  } else {
    ControlEstado.innerHTML = "";
  }
};

const bloquearEdicion = () => {
  document.querySelectorAll("input, select, button").forEach(el => {
    if (!el.id.includes("BtnGenerarFactura")) el.disabled = true;
  });
};


const obtenerDatosFormulario = () => ({
    placa: InputPlaca.value.trim().toUpperCase(),
    marca: SelectMarcas.value,
    modelo: InputModelo.value,
    año: InputAño.value,
    nombre: InputNombre.value,
    telefono: InputTelefono.value
});


/* ======================================================
   TABLAS
====================================================== */
const renderTabla = (tbody, items, tipo) => {
  tbody.innerHTML = "";

  items.forEach((item, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.desc}</td>
      <td>$ ${Number(item.valor).toLocaleString("es-CO")}</td>
      <td class="d-flex gap-1 justify-content-center">
        <button class="btn btn-warning btn-sm btnEditar">✏️</button>
        <button class="btn btn-danger btn-sm btnEliminar">🗑️</button>
      </td>
    `;

    tr.querySelector(".btnEliminar").onclick = () => {
      items.splice(index, 1);
      renderTabla(tbody, items, tipo);
      calcularTotales();
    };

    tr.querySelector(".btnEditar").onclick = () => {
      modoEdicion = { tipo, index };
      cargarInputs(tipo, item);

      const boton =
        tipo === "SERVICIO" ? document.querySelector("#FormIngresoServicios button") :
        tipo === "REPUESTO" ? document.querySelector("#FormIngresoRepuestos button") :
                              document.querySelector("#FormIngresoInsumos button");

      activarModoEdicion(boton);
    };

    tbody.appendChild(tr);
  });
};

/* ======================================================
   TOTALES
====================================================== */
const calcularTotales = () => {
  const totalServicios = servicios.reduce((a, b) => a + Number(b.valor), 0);
  const totalRepuestos = repuestos.reduce((a, b) => a + Number(b.valor), 0);
  const totalInsumos   = insumos.reduce((a, b) => a + Number(b.valor), 0);

  document.getElementById("totalServicios").innerText = totalServicios.toLocaleString("es-CO");
  document.getElementById("Total Repuestos").innerText = totalRepuestos.toLocaleString("es-CO");
  document.getElementById("Total Insumos").innerText   = totalInsumos.toLocaleString("es-CO");
  document.getElementById("total").innerText =
    (totalServicios + totalRepuestos + totalInsumos).toLocaleString("es-CO");
};

/* ======================================================
   API – CONTROL
====================================================== */
const cargarControlParaEdicion = async (placa) => {
  try {
    const data = await fetchAuth(`/control/${placa}/editar`);

    servicios = [];
    repuestos = [];
    insumos   = [];

    InputPlaca.value    = data.cliente.placa;
    SelectMarcas.value  = data.cliente.marca;
    InputPlaca.readOnly = true;
    InputModelo.value   = data.cliente.modelo;
    InputAño.value      = data.cliente.año ?? "";
    InputNombre.value   = data.cliente.nombre;
    InputTelefono.value = data.cliente.telefono ?? "";

    data.detalle.forEach(d => {
        const item = { desc: d.descripcion, valor: d.valor };
        if (d.tipo === "SERVICIO") servicios.push(item);
        if (d.tipo === "REPUESTO") repuestos.push(item);
        if (d.tipo === "INSUMO")   insumos.push(item);
    });

    renderTabla(TablaServicios, servicios, "SERVICIO");
    renderTabla(TablaRepuestos, repuestos, "REPUESTO");
    renderTabla(TablaInsumos, insumos, "INSUMO");

    calcularTotales();
    mostrarEstadoControl(data.estado);

    if (data.estado === "FACTURADO") bloquearEdicion();
  } catch (error) {
    mostrarToast("Error cargando control para edición: " + error.message, "danger");
  }
};

BtnNuevoControl.onclick  = () => { 
  localStorage.removeItem("editarControlPlaca");
  window.location.href = "Control.html";
};

/* ======================================================
   EVENTOS
====================================================== */
// Buscar cliente
BtnBuscarCliente.onclick = async () => {
    const placa = InputPlaca.value.trim().toUpperCase();
    if (!placa) return mostrarToast("Ingrese una placa", "warning");

    try {
        const cliente = await obtenerClientePorPlaca(placa);
        cargarFormulario(cliente);

        BtnGuardarCliente.disabled = true;
        BtnEditarCliente.disabled = false;
        BtnEliminarCliente.disabled = false;
        
        mostrarToast("Cliente encontrado", "success");
    } catch (error) {
        mostrarToast(error.message, "danger");
        BtnGuardarCliente.disabled = false;
        BtnEditarCliente.disabled = true;
        BtnEliminarCliente.disabled = true;
    }
};

// Guardar control
BtnGuardarControl.onclick = async () => {
  // Validación simple
  
  if(!InputPlaca.value.trim()) return mostrarToast("La placa es obligatoria", "warning");
  InputPlaca.readOnly = false;

  try {
      await fetchAuth("/control", {
        method: "POST",
        body: { placa: InputPlaca.value, servicios, repuestos, insumos }
      });
    
      // Limpieza de UI
      TablaServicios.innerHTML = "";
      TablaRepuestos.innerHTML = "";
      TablaInsumos.innerHTML = "";
      
      FormInfomacionCliente.reset();
      
      // RESTAURAR ESTADO DEL INPUT PLACA
      InputPlaca.classList.remove("bg-light");
      
      // Limpiar datos temporales
      servicios = []; repuestos = []; insumos = [];
      calcularTotales();
      
      mostrarToast("Control guardado correctamente ✅", "success");
      
      // Recargar historial para ver cambios reflejados
      cargarHistorial(); 

  } catch (error) {
      console.error(error);
      mostrarToast("Error al guardar el control", "danger");
  }
};

// Generar factura
BtnGenerarFactura.onclick = async () => {
  try {
      const data = await fetchAuth(`/control/${InputPlaca.value}/generar`, { method: "POST" });
      localStorage.setItem("controlFactura", JSON.stringify(data));
      window.location.href = "Factura.html";
  } catch (error) {
      mostrarToast("Error al generar pre-factura: " + error.message, "danger");
  }
};

// Guardar cliente
BtnGuardarCliente.addEventListener("click", async () => {
    try {
        await crearCliente(obtenerDatosFormulario());
        mostrarToast("Cliente registrado con éxito", "success");

        BtnGuardarCliente.disabled = true;
        BtnEditarCliente.disabled = false;
        BtnEliminarCliente.disabled = false;

    } catch (error) {
        mostrarToast(error.message, "danger");
    }
});

// Editar cliente (MODIFICADO)
BtnEditarCliente.addEventListener("click", () => {
    confirmarAccion("¿Desea actualizar la información de este cliente?", async () => {
        try {
            await editarCliente(InputPlaca.value, obtenerDatosFormulario());
            mostrarToast("Cliente actualizado exitosamente", "success");
        } catch (error) {
            mostrarToast(error.message, "danger");
        }
    });
});

// Eliminar cliente (MODIFICADO)
BtnEliminarCliente.addEventListener("click", () => {
    confirmarAccion("¿Está seguro que desea eliminar este cliente?", async () => {
        try {
            await eliminarCliente(InputPlaca.value);
            mostrarToast("Cliente eliminado correctamente", "success");

            document.getElementById("FormInfomacionCliente").reset();

            BtnGuardarCliente.disabled = true;
            BtnEditarCliente.disabled = true;
            BtnEliminarCliente.disabled = true;

        } catch (error) {
            mostrarToast(error.message, "danger");
        }
    });
});


// Historial
const cargarHistorial = async () => {
  try {
      const data = await fetchAuth("/control");
      tablaControles.innerHTML = "";

      data.forEach(c => {
        tablaControles.innerHTML += `
          <tr>
            <td>${c.placa}</td>
            <td>${c.nombre}</td>
            <td>${c.marca} ${c.modelo}</td>
            <td><span class="badge ${c.estado === "PENDIENTE" ? "bg-warning text-dark" : "bg-success"}">${c.estado}</span></td>
            <td>${c.fecha_creacion.split("T")[0]}</td>
            <td class="d-flex gap-1">
            <button
                class="btn btn-sm btn-primary btnEditarControl"
                data-placa="${c.placa}">
                ✏️
            </button>

            <button
                class="btn btn-sm btn-danger btnEliminarControl"
                data-placa="${c.placa}">
                🗑️
            </button>
            </td>
          </tr>
        `;
      });
  } catch (error) {
      console.error("Error cargando historial", error);
      // No mostramos toast aquí para no saturar al cargar la página
  }
};

tablaControles.addEventListener("click", async e => {

    // ---------- EDITAR ----------
    if (e.target.classList.contains("btnEditarControl")) {
        const placa = e.target.dataset.placa;
        localStorage.setItem("editarControlPlaca", placa);
        window.location.href = "Control.html";
    }

    // ---------- ELIMINAR (MODIFICADO) ----------
    if (e.target.classList.contains("btnEliminarControl")) {
        const placa = e.target.dataset.placa;

        confirmarAccion(`¿Eliminar el control de la placa ${placa}?`, async () => {
            try {
                await fetchAuth(`/control/${placa}`, { method: "DELETE" });

                // --- 1. LIMPIEZA DE FORMULARIO SI ES EL QUE SE ESTABA EDITANDO ---
                if (InputPlaca.value === placa) {
                    TablaServicios.innerHTML = "";
                    TablaRepuestos.innerHTML = "";
                    TablaInsumos.innerHTML = "";
                    FormInfomacionCliente.reset();

                    servicios = []; 
                    repuestos = []; 
                    insumos = [];
                    calcularTotales();
                }

                localStorage.removeItem("editarControlPlaca");
                
                // Limpiar URL si tenía parámetros (opcional)
                window.history.replaceState(null, "", window.location.pathname);

                mostrarToast("Control eliminado correctamente", "success");
                cargarHistorial();

            } catch (error) {
                mostrarToast(error.message, "danger");
            }
        });
    }
});

// Manejadores de formularios de items (sin cambios mayores, solo optimización visual si se requiere)
// Ejemplo para Servicios
document.getElementById("FormIngresoServicios").addEventListener("submit", (e) => {
    e.preventDefault();
    const desc = inputServiciosDescripcion.value.trim();
    const valor = inputServiciosValor.value;
    if (!desc) return;

    // CORRECCIÓN: Usar Number(valor)
    if (modoEdicion && modoEdicion.tipo === "SERVICIO") {
        servicios[modoEdicion.index] = { desc, valor: Number(valor) }; 
        desactivarModoEdicion(e.target.querySelector("button"));
    } else {
        servicios.push({ desc, valor: Number(valor) });
    }
    renderTabla(TablaServicios, servicios, "SERVICIO");
    calcularTotales();
    e.target.reset();
});

document.getElementById("FormIngresoRepuestos").addEventListener("submit", (e) => {
    e.preventDefault();
    const desc = inputRepuestosDescripcion.value.trim();
    const valor = inputRepuestosValor.value;
    if (!desc) return;

    if (modoEdicion && modoEdicion.tipo === "REPUESTO") {
        repuestos[modoEdicion.index] = { desc, valor: Number(valor) };
        desactivarModoEdicion(e.target.querySelector("button"));
    } else {
        repuestos.push({ desc, valor: Number(valor) });
    }
    renderTabla(TablaRepuestos, repuestos, "REPUESTO");
    calcularTotales();
    e.target.reset();
});


document.getElementById("FormIngresoInsumos").addEventListener("submit", (e) => {
    e.preventDefault();
    const desc = inputInsumosDescripcion.value.trim();
    const valor = inputInsumosValor.value;
    if (!desc) return;

    if (modoEdicion && modoEdicion.tipo === "INSUMO") {
        insumos[modoEdicion.index] = { desc, valor: Number(valor) };
        desactivarModoEdicion(e.target.querySelector("button"));
    } else {
        insumos.push({ desc, valor: Number(valor) });
    }
    renderTabla(TablaInsumos, insumos, "INSUMO");
    calcularTotales();
    e.target.reset();
});


// Cargar si viene en modo edición
const placaEditar = localStorage.getItem("editarControlPlaca");
if (placaEditar) cargarControlParaEdicion(placaEditar);

cargarHistorial();


