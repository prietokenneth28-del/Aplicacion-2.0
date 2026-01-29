import {
    obtenerClientePorPlaca,
    crearCliente,
    editarCliente,
    eliminarCliente
} from "../api/clientes.api.js";
 
import { mostrarToast, confirmarAccion } from "./utils.ui.js";

// Inputs
const InputPlaca = document.getElementById("InputPlaca");
const SelectMarcas = document.getElementById("SelectMarcas");
const InputModelo = document.getElementById("InputModelo");
const InputAño = document.getElementById("InputAño");
const InputNombre = document.getElementById("InputNombre");
const InputTelefono = document.getElementById("InputTelefono");
const BtnHistorialCliente = document.getElementById("BtnHistorialCliente");
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
    //InputPlaca.value = data.placa;
    SelectMarcas.value = data.marca;
    InputModelo.value = data.modelo;
    InputAño.value = data.año;
    InputNombre.value = data.nombre;
    InputTelefono.value = data.telefono;
};

// Buscar cliente

BtnBuscarCliente.addEventListener("click", async () => {
    const placa = InputPlaca.value.trim().toUpperCase();
    
    // CAMBIO: Alert por Toast Warning
    if (!placa) return mostrarToast("Por favor, ingrese una placa para buscar.", "warning");

    try {
        const cliente = await obtenerClientePorPlaca(placa);
        cargarFormulario(cliente);

        BtnGuardarCliente.disabled = true;
        BtnEditarCliente.disabled = false;
        BtnEliminarCliente.disabled = false;
        if(BtnNuevaFactura) BtnNuevaFactura.disabled = false;
        if(BtnHistorialCliente) BtnHistorialCliente.disabled = false;

        // Opcional: Toast informativo
        mostrarToast("Cliente encontrado exitosamente", "success");

    } catch (error) {
        // CAMBIO: Alert por Toast Danger
        mostrarToast(error.message, "danger");
        
        // Habilitar guardar si no existe
        BtnGuardarCliente.disabled = false;
        BtnEditarCliente.disabled = true;
        BtnEliminarCliente.disabled = true;
    }
});

// Guardar cliente
BtnGuardarCliente.addEventListener("click", async () => {
    try {
        await crearCliente(obtenerDatosFormulario());
        
        // CAMBIO: Alert por Toast Success
        mostrarToast("Cliente registrado con éxito", "success");

        BtnGuardarCliente.disabled = true;
        BtnEditarCliente.disabled = false;
        BtnEliminarCliente.disabled = false;
        if(BtnNuevaFactura) BtnNuevaFactura.disabled = false;

    } catch (error) {
        mostrarToast(error.message, "danger");
    }
});

// Editar cliente
BtnEditarCliente.addEventListener("click", () => {
    // CAMBIO: Lógica asíncrona con Modal
    confirmarAccion("¿Está seguro que desea actualizar los datos de este cliente?", async () => {
        try {
            await editarCliente(InputPlaca.value, obtenerDatosFormulario());
            mostrarToast("Cliente actualizado correctamente", "success");
        } catch (error) {
            mostrarToast("Error al actualizar: " + error.message, "danger");
        }
    });
});

// Eliminar cliente
BtnEliminarCliente.addEventListener("click", () => {
    // CAMBIO: Lógica asíncrona con Modal
    confirmarAccion("¿Desea eliminar permanentemente este cliente del sistema?", async () => {
        try {
            await eliminarCliente(InputPlaca.value);
            mostrarToast("Cliente eliminado correctamente", "success");

            document.getElementById("FormInfomacionCliente").reset();

            BtnGuardarCliente.disabled = true;
            BtnEditarCliente.disabled = true;
            BtnEliminarCliente.disabled = true;
            if(BtnNuevaFactura) BtnNuevaFactura.disabled = true;

        } catch (error) {
            mostrarToast("No se pudo eliminar: " + error.message, "danger");
        }
    });
});

