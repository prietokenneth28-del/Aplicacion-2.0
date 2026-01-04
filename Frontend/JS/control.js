import { fetchAuth } from "./helpers/fetchAuth.js";

// ---------------- BOTONES ----------------
const BtnGuardarControl = document.getElementById("BtnGuardarControl");
const BtnGenerarFactura = document.getElementById("BtnGenerarFactura");

// ---------------- INPUTS ----------------
const InputPlaca = document.getElementById("InputPlaca");

// ---------------- ARREGLOS EXISTENTES ----------------
const BtnBuscarCliente = document.getElementById("BtnBuscarCliente");

// Inputs cliente
const SelectMarcas = document.getElementById("SelectMarcas");
const InputModelo = document.getElementById("InputModelo");
const InputAño = document.getElementById("InputAño");
const InputNombre = document.getElementById("InputNombre");
const InputTelefono = document.getElementById("InputTelefono");


const placaEditar = localStorage.getItem("editarControlPlaca");

if (placaEditar) {
    cargarControlParaEdicion(placaEditar);
}


const redibujartabla = (tbody, items) => {
    tbody.innerHTML = "";
    items.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.desc}</td>
            <td>$ ${Number(item.valor).toLocaleString("es-CO")}</td>
            <td>
                <button class="btn btn-danger btn-sm">Eliminar</button>
            </td>
        `;
        tr.querySelector("button").onclick = () => {
            items.splice(index, 1);
            renderTabla(tbody, items);
            recalcularTotales();
        };
        tbody.appendChild(tr);
    });
};

const calcularTotalGeneral = () => {
    const totalServicios = servicios.reduce((a, b) => a + Number(b.valor), 0);
    const totalRepuestos = repuestos.reduce((a, b) => a + Number(b.valor), 0);
    const totalInsumos = insumos.reduce((a, b) => a + Number(b.valor), 0);

    document.getElementById("totalServicios").innerText =
        totalServicios.toLocaleString("es-CO");
    document.getElementById("Total Repuestos").innerText =
        totalRepuestos.toLocaleString("es-CO");
    document.getElementById("Total Insumos").innerText =
        totalInsumos.toLocaleString("es-CO");
    document.getElementById("total").innerText =
        (totalServicios + totalRepuestos + totalInsumos).toLocaleString("es-CO");
};





// ================= BUSCAR CLIENTE =================
BtnBuscarCliente.onclick = async () => {
    const placa = InputPlaca.value.trim();

    if (!placa) {
        return alert("Ingrese la placa");
    }

    try {
        const cliente = await fetchAuth(`/clientes/placa/${placa}`);

        // Rellenar campos
        SelectMarcas.value = cliente.marca;
        InputModelo.value = cliente.modelo;
        InputAño.value = cliente.año ?? "";
        InputNombre.value = cliente.nombre;
        InputTelefono.value = cliente.telefono ?? "";

    } catch (error) {
        alert(error.message);
    }
};


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


const ControlEstado = document.getElementById("ControlEstado");

const mostrarEstadoControl = (estado) => {
  if (estado === "PENDIENTE") {
    ControlEstado.innerHTML =
      `<span class="badge bg-warning text-dark">
        Control pendiente
      </span>`;
  } else if (estado === "FACTURADO") {
    ControlEstado.innerHTML =
      `<span class="badge bg-success">
        Control facturado
      </span>`;
  } else {
    ControlEstado.innerHTML = "";
  }
};



let placaTimeout;

InputPlaca.addEventListener("input", () => {
  clearTimeout(placaTimeout);

  placaTimeout = setTimeout(async () => {
    const placa = InputPlaca.value.trim();
    if (placa.length < 3) return;

    try {
      const data = await fetchAuth(`/control/${placa}/resumen`);

      if (!data.existe) {
        ControlEstado.innerHTML = "";
        return;
      }

      mostrarEstadoControl(data.estado);

      // Limpiar
      arregloServicios = [];
      arregloRepuestos = [];
      arregloInsumos = [];

      data.detalle.forEach(d => {
        const item = { desc: d.descripcion, valor: d.valor };

        if (d.tipo === "SERVICIO") arregloServicios.push(item);
        if (d.tipo === "REPUESTO") arregloRepuestos.push(item);
        if (d.tipo === "INSUMO") arregloInsumos.push(item);
      });

      redibujartabla(TablaServicios, arregloServicios);
      redibujartabla(TablaRepuestos, arregloRepuestos);
      redibujartabla(TablaInsumos, arregloInsumos);

    } catch (e) {
      console.error(e);
    }
  }, 500);
});



const tablaControles = document.getElementById("tablaControles");

const cargarHistorial = async () => {
  const data = await fetchAuth("/control");

  tablaControles.innerHTML = "";

  data.forEach(c => {
    tablaControles.innerHTML += `
        <tr>
            <td>${c.placa}</td>
            <td>${c.nombre}</td>
            <td>${c.marca} ${c.modelo}</td>
            <td>
            <span class="badge ${c.estado === "PENDIENTE" ? "bg-warning text-dark" : "bg-success"}">
                ${c.estado}
            </span>
            </td>
            <td>${c.fecha_creacion.split("T")[0]}</td>
            <td>
            <button class="btn btn-sm btn-primary btnEditarControl"
                    data-placa="${c.placa}">
                Editar
            </button>
            </td>
        </tr>
        `;
  });
};

cargarHistorial();


const cargarControlParaEdicion = async (placa) => {
    try {
        const data = await fetchAuth(`/control/${placa}/editar`);

        // ---------- CLIENTE ----------
        InputPlaca.value = data.cliente.placa;
        SelectMarcas.value = data.cliente.marca;
        InputModelo.value = data.cliente.modelo;
        InputAño.value = data.cliente.año ?? "";
        InputNombre.value = data.cliente.nombre;
        InputTelefono.value = data.cliente.telefono ?? "";

        // ---------- LIMPIAR ----------
        arregloServicios = [];
        arregloRepuestos = [];
        arregloInsumos = [];

        // ---------- DETALLE ----------
        data.detalle.forEach(d => {
            const item = { desc: d.descripcion, valor: d.valor };

            if (d.tipo === "SERVICIO") arregloServicios.push(item);
            if (d.tipo === "REPUESTO") arregloRepuestos.push(item);
            if (d.tipo === "INSUMO") arregloInsumos.push(item);
        });

        redibujartabla(TablaServicios, arregloServicios);
        redibujartabla(TablaRepuestos, arregloRepuestos);
        redibujartabla(TablaInsumos, arregloInsumos);

        calcularTotalGeneral();

        // ---------- BLOQUEO SI FACTURADO ----------
        if (data.estado === "FACTURADO") {
            bloquearEdicion();
        }

        localStorage.removeItem("editarControlPlaca");

    } catch (error) {
        alert(error.message);
    }
};


