import { fetchAuth } from "./helpers/fetchAuth.js";

// ---------------- BOTONES ----------------
const BtnGuardarControl = document.getElementById("BtnGuardarControl");
const BtnGenerarFactura = document.getElementById("BtnGenerarFactura");

// ---------------- INPUTS ----------------
const InputPlaca = document.getElementById("InputPlaca");

// ---------------- ARREGLOS EXISTENTES ----------------
/*
  Estos arreglos YA existen porque usas la misma lógica
  que Factura.html:
    arregloServicios
    arregloRepuestos
    arregloInsumos
*/

// ================= GUARDAR CONTROL =================
BtnGuardarControl.onclick = async () => {
    if (!InputPlaca.value) {
        return alert("Ingrese la placa");
    }

    try {
        await fetchAuth("/control", {
            method: "POST",
            body: {
                placa: InputPlaca.value,
                servicios: arregloServicios,
                repuestos: arregloRepuestos,
                insumos: arregloInsumos
            }
        });

        alert("Control guardado correctamente");

    } catch (error) {
        alert(error.message);
    }
};

// ================= GENERAR FACTURA =================
BtnGenerarFactura.onclick = async () => {
    if (!InputPlaca.value) {
        return alert("Ingrese la placa");
    }

    try {
        const data = await fetchAuth(
            `/control/${InputPlaca.value}/generar`,
            { method: "POST" }
        );

        // Guardar temporalmente
        localStorage.setItem(
            "controlFactura",
            JSON.stringify(data)
        );

        // Redirigir
        window.location.href = "Factura.html";

    } catch (error) {
        alert(error.message);
    }
};
