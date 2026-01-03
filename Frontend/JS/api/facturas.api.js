import { fetchAuth } from "../helpers/fetchAuth.js";

// Obtener siguiente número de factura
export const obtenerSiguienteFactura = async () => {
    const data = await fetchAuth("/facturas/next");
    return data.nextFactura;
};

// Obtener factura completa por número
export const obtenerFacturaCompleta = (numero) =>
    fetchAuth(`/facturas/nfactura/${numero}`);

// Guardar factura
export const guardarFactura = (factura) =>
    fetchAuth("/facturas", {
        method: "POST",
        body: factura
    });

// Editar factura
export const editarFactura = (numero, factura) =>
    fetchAuth(`/facturas/${numero}`, {
        method: "PUT",
        body: factura
    });

// Eliminar factura
export const eliminarFactura = (numero) =>
    fetchAuth(`/facturas/${numero}`, {
        method: "DELETE"
    });
