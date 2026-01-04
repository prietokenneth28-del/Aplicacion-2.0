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



//Inputs para ingresar la informacion:
const inputServiciosDescripcion = document.getElementById("inputServiciosDescripcion");
const inputServiciosValor = document.getElementById("inputServiciosValor");
const inputRepuestosDescripcion = document.getElementById("inputRepuestosDescripcion");
const inputRepuestosValor = document.getElementById("inputRepuestosValor");
const inputInsumosDescripcion = document.getElementById("inputInsumosDescripcion");
const inputInsumosValor = document.getElementById("inputInsumosValor");

//Tablas:
const TablaServicios = document.getElementById("TablaServicios");
const TablaRepuestos = document.getElementById("TablaRepuestos");
const TablaInsumos = document.getElementById("TablaInsumos");



const placaEditar = localStorage.getItem("editarControlPlaca");

if (placaEditar) {
    cargarControlParaEdicion(placaEditar);
}


let servicios = [];
let repuestos = [];
let insumos = [];

const renderTabla = (tbody, items) => {
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

    // -------- ELIMINAR --------
    tr.querySelector(".btnEliminar").onclick = () => {
      items.splice(index, 1);
      renderTabla(tbody, items);
      calcularTotales();
    };

    // -------- EDITAR --------
    tr.querySelector(".btnEditar").onclick = () => {
      const nuevoDesc = prompt("Editar descripción", item.desc);
      const nuevoValor = prompt("Editar valor", item.valor);

      if (nuevoDesc && nuevoValor) {
        items[index] = {
          desc: nuevoDesc,
          valor: Number(nuevoValor)
        };
        renderTabla(tbody, items);
        calcularTotales();
      }
    };

    tbody.appendChild(tr);
  });
};





const calcularTotales = () => {
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
}




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
  if (!InputPlaca.value) return alert("Ingrese la placa");

  await fetchAuth("/control", {
    method: "POST",
    body: {
      placa: InputPlaca.value,
      servicios,
      repuestos,
      insumos
    }
  });

  alert("Control guardado correctamente");
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
    // ---------------- DETALLE ----------------

    renderTabla(TablaServicios, servicios);
    renderTabla(TablaRepuestos, repuestos);
    renderTabla(TablaInsumos, insumos);

    calcularTotales();

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

      data.detalle.forEach(d => {
        const item = { desc: d.descripcion, valor: d.valor };

        if (d.tipo === "SERVICIO") servicios.push(item);
        if (d.tipo === "REPUESTO") repuestos.push(item);
        if (d.tipo === "INSUMO") insumos.push(item);
      });

      renderTabla(TablaServicios, servicios);
      renderTabla(TablaRepuestos, repuestos);
      renderTabla(TablaInsumos, insumos);

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

        // ---------- DETALLE ----------
        data.detalle.forEach(d => {
            const item = { desc: d.descripcion, valor: d.valor };

            if (d.tipo === "SERVICIO") servicios.push(item);
            if (d.tipo === "REPUESTO") repuestos.push(item);
            if (d.tipo === "INSUMO") insumos.push(item);
        });
        if (data.estado === "FACTURADO") {
            bloquearEdicion();
        }
        renderTabla(TablaServicios, servicios);
        renderTabla(TablaRepuestos, repuestos);
        renderTabla(TablaInsumos, insumos);

        calcularTotales();

        // ---------- BLOQUEO SI FACTURADO ----------
        if (data.estado === "FACTURADO") {
            bloquearEdicion();
        }

        localStorage.removeItem("editarControlPlaca");

    } catch (error) {
        alert(error.message);
    }
};


        document.getElementById("FormIngresoInsumos").addEventListener("submit", e => {
        e.preventDefault();

        const desc = inputInsumosDescripcion.value;
        const valor = inputInsumosValor.value;

        if (!desc) return;

        servicios.push({ desc, valor });

        renderTabla(TablaInsumos, servicios);
        calcularTotales();

        e.target.reset();
        });


        document.getElementById("FormIngresoRepuestos").addEventListener("submit", e => {
        e.preventDefault();

        const desc = inputRepuestosDescripcion.value;
        const valor = inputRepuestosValor.value;

        if (!desc) return;

        servicios.push({ desc, valor });

        renderTabla(TablaRepuestos, servicios);
        calcularTotales();

        e.target.reset();
        });


    document.getElementById("FormIngresoServicios").addEventListener("submit", e => {
    e.preventDefault();

    const desc = inputServiciosDescripcion.value;
    const valor = inputServiciosValor.value;

    if (!desc) return;

    servicios.push({ desc, valor });

    renderTabla(TablaServicios, servicios);
    calcularTotales();

    e.target.reset();
    });

const bloquearEdicion = () => {
  document
    .querySelectorAll("input, select, button")
    .forEach(el => {
      if (!el.id.includes("BtnGenerarFactura")) {
        el.disabled = true;
      }
    });
};
