export const cargarFormularioCliente = (data) => {
    document.getElementById("InputPlaca").value = data.placa;
    document.getElementById("SelectMarcas").value = data.marca;
    document.getElementById("InputModelo").value = data.modelo;
    document.getElementById("InputAño").value = data.año;
    document.getElementById("InputNombre").value = data.nombre;
    document.getElementById("InputTelefono").value = data.telefono;
};