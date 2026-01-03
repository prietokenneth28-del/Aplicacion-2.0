import { fetchAuth } from "../helpers/fetchAuth.js";

// Obtener cliente por placa
export const obtenerClientePorPlaca = (placa) =>
    fetchAuth(`/clientes/placa/${placa}`);

// Crear cliente
export const crearCliente = (cliente) =>
    fetchAuth(`/clientes`, {
        method: "POST",
        body: cliente
    });

// Editar cliente
export const editarCliente = (placa, cliente) =>
    fetchAuth(`/clientes/placa/${placa}`, {
        method: "PUT",
        body: cliente
    });

// Eliminar cliente
export const eliminarCliente = (placa) =>
    fetchAuth(`/clientes/placa/${placa}`, {
        method: "DELETE"
    });
