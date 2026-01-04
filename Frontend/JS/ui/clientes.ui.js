import {
    obtenerClientePorPlaca,
    crearCliente,
    editarCliente,
    eliminarCliente
} from "../api/clientes.api.js";

const isFacturaPage = document.getElementById("InputFactura");

if (!isFacturaPage) {
    // No estamos en Factura.html
    return;
}

// Inputs
const InputPlaca = document.getElementById("InputPlaca");
const SelectMarcas = document.getElementById("SelectMarcas");
const InputModelo = document.getElementById("InputModelo");
const InputAño = document.getElementById("InputAño");
const InputNombre = document.getElementById("InputNombre");
const InputTelefono = document.getElementById("InputTelefono");

// Botones
const BtnBuscarCliente = document.getElementById("BtnBuscarCliente");
const BtnGuardarCliente = document.getElementById("BtnGuardarCliente");
const BtnEditarCliente = document.getElementById("BtnEditarCliente");
const BtnEliminarCliente = document.getElementById("BtnEliminarCliente");
const BtnNuevaFactura = document.getElementById("BtnNuevaFactura");

// Estado inicial
BtnGuardarCliente.disabled = true;
BtnEditarCliente.disabled = true;
BtnEliminarCliente.disabled = true;

if (BtnNuevaFactura) {
    BtnNuevaFactura.disabled = true;
}


//Form:
const FormInfomacionCliente = document.getElementById("FormInfomacionCliente");


// Helpers
const obtenerDatosFormulario = () => ({
    placa: InputPlaca.value.trim().toUpperCase(),
    marca: SelectMarcas.value,
    modelo: InputModelo.value,
    año: InputAño.value,
    nombre: InputNombre.value,
    telefono: InputTelefono.value
});

export const cargarFormulario = (data) => {
    InputPlaca.value = data.placa;
    SelectMarcas.value = data.marca;
    InputModelo.value = data.modelo;
    InputAño.value = data.año;
    InputNombre.value = data.nombre;
    InputTelefono.value = data.telefono;
};

// Buscar cliente

BtnBuscarCliente.addEventListener("click", async () => {
    const placa = InputPlaca.value.trim().toUpperCase();
    if (!placa) return alert("Ingrese una placa");

    try {
        const cliente = await obtenerClientePorPlaca(placa);
        cargarFormulario(cliente);

        BtnGuardarCliente.disabled = true;
        BtnEditarCliente.disabled = false;
        BtnEliminarCliente.disabled = false;
        BtnNuevaFactura.disabled = false;

    } catch (error) {
        alert(error.message);
        BtnGuardarCliente.disabled = false;
        BtnEditarCliente.disabled = true;
        BtnEliminarCliente.disabled = true;
    }
});

// Guardar cliente
BtnGuardarCliente.addEventListener("click", async () => {
    try {
        await crearCliente(obtenerDatosFormulario());
        alert("Cliente registrado con éxito");

        BtnGuardarCliente.disabled = true;
        BtnEditarCliente.disabled = false;
        BtnEliminarCliente.disabled = false;
        BtnNuevaFactura.disabled = false;

    } catch (error) {
        alert(error.message);
    }
});
// Editar cliente
BtnEditarCliente.addEventListener("click", async () => {
    if (!confirm("¿Desea editar este cliente?")) return;

    try {
        await editarCliente(InputPlaca.value, obtenerDatosFormulario());
        alert("Cliente actualizado");
    } catch (error) {
        alert(error.message);
    }
});

// Eliminar cliente
BtnEliminarCliente.addEventListener("click", async () => {
    if (!confirm("¿Desea eliminar este cliente?")) return;

    try {
        await eliminarCliente(InputPlaca.value);
        alert("Cliente eliminado");

        document.getElementById("FormInfomacionCliente").reset();

        BtnGuardarCliente.disabled = true;
        BtnEditarCliente.disabled = true;
        BtnEliminarCliente.disabled = true;
        BtnNuevaFactura.disabled = true;

    } catch (error) {
        alert(error.message);
    }
});

