 // Iniciando las variables:
const formDetalle = document.getElementById("FormIngresoServicios");
const inputServiciosDescripcion = document.getElementById("inputServiciosDescripcion");
const inputServiciosValor = document.getElementById("inputServiciosValor");
const TablaServicios = document.getElementById("TablaServicios");

// FORMULARIO DATOS DEL CLIENTE:
const InputPlaca =  document.getElementById("InputPlaca");
const SelectMarcas = document.getElementById("SelectMarcas");
const InputModelo = document.getElementById("InputModelo");
const InputAño = document.getElementById("InputAño");
const InputNombre = document.getElementById("InputNombre");
const InputTelefono = document.getElementById("InputTelefono");

// FORMULARIO DATOS DE LA FACTURA:
const InputFactura = document.getElementById("InputFactura");
const InputFechaFacturacion = document.getElementById("InputFechaFacturacion");
const InputFechaGarantia = document.getElementById("InputFechaGarantia");
const CheckGarantia = document.getElementById("CheckGarantia");    
const CheckFacturas = document.getElementById("CheckFacturas");

//FORMULARIO REGISTRO DE REPUESTOS:
const FormIngresoRepuestos = document.getElementById("FormIngresoRepuestos");
const inputRepuestosDescripcion = document.getElementById("inputRepuestosDescripcion");
const inputRepuestosValor = document.getElementById("inputRepuestosValor");
const TablaRepuestos = document.getElementById("TablaRepuestos");

//FORMULARIO REGISTRO DE INSUMOS:
const FormIngresoInsumos = document.getElementById("FormIngresoInsumos");
const inputInsumosDescripcion = document.getElementById("inputInsumosDescripcion");
const inputInsumosValor = document.getElementById("inputInsumosValor");
const TablaInsumos = document.getElementById("TablaInsumos");



// Formularios contenedores:
const FormInfomacionCliente = document.getElementById("FormInfomacionCliente");
const FormInformacionFactura = document.getElementById("FormInformacionFactura"); 

// Declaración de las listas:
let arregloRepuestos = [];
let arregloInsumos = [];
let arregloServicios  = [];
let arregloDetalle = [];
let arregloFacturas = JSON.parse(localStorage.getItem("Facturas")) || [];

// Funcion para redibujarTabla:
const redibujartabla = (Tabla, arreglo, inputDesc, inputValor) => {
    Tabla.innerHTML = "";

    arreglo.forEach((detalle) => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${detalle.desc}</td>
            <td>${detalle.valor}</td>
        `;

        const tdAcciones = document.createElement("td");

        // EDITAR
        const btnEditar = document.createElement("button");
        btnEditar.className = "btn btn-warning btn-sm me-1";
        btnEditar.textContent = "Editar";
        btnEditar.onclick = () =>
            editarDetalle(detalle.desc, arreglo, Tabla, inputDesc, inputValor);

        // ELIMINAR
        const btnEliminar = document.createElement("button");
        btnEliminar.className = "btn btn-danger btn-sm";
        btnEliminar.textContent = "Eliminar";
        btnEliminar.onclick = () => {
            const index = arreglo.findIndex(d => d.desc === detalle.desc);
            if (index !== -1) {
                arreglo.splice(index, 1);
                redibujartabla(Tabla, arreglo, inputDesc, inputValor);
                calcularTotalGeneral();
            }
        };

        tdAcciones.append(btnEditar, btnEliminar);
        fila.appendChild(tdAcciones);
        Tabla.appendChild(fila);
    });

    calcularTotalGeneral();
};


// Funcion para borrar los datos de servicios
const eliminarFiloByDetalle = (desc, Tabla, arreglo) => {
    const index = arreglo.findIndex(d => d.desc === desc);
    if (index !== -1) {
        arreglo.splice(index, 1);
        redibujartabla(Tabla, arreglo);
    }
};
    // Funcion editar los datos de servicios
    const editarDetalle = (desc, arreglo, Tabla, inputDesc, inputValor) => {
        const index = arreglo.findIndex(item => item.desc === desc);
        if (index === -1) return;

        // Pasar valores al formulario
        inputDesc.value = arreglo[index].desc;
        inputValor.value = arreglo[index].valor;

        // Eliminar del arreglo para que se reemplace al guardar
        arreglo.splice(index, 1);
        redibujartabla(Tabla, arreglo);
    };


//
// ------------Subiendo valores a la TABLA DE SERVICIOS---------------
formDetalle.onsubmit = (e) => {
    e.preventDefault();

    arregloServicios.push({
        desc: inputServiciosDescripcion.value,
        valor: inputServiciosValor.value
    });

    redibujartabla(
        TablaServicios,
        arregloServicios,
        inputServiciosDescripcion,
        inputServiciosValor
    );

    formDetalle.reset();
};


// ------------Subiendo valores a la TABLA DE REPUESTOS---------------
FormIngresoRepuestos.onsubmit = (e) => {
    e.preventDefault();

    arregloRepuestos.push({
        desc: inputRepuestosDescripcion.value,
        valor: inputRepuestosValor.value
    });

    redibujartabla(
        TablaRepuestos,
        arregloRepuestos,
        inputRepuestosDescripcion,
        inputRepuestosValor
    );

    FormIngresoRepuestos.reset();
};


// ------------Subiendo valores a la TABLA DE INSUMOS---------------
FormIngresoInsumos.onsubmit = (e) => {
    e.preventDefault();

    arregloInsumos.push({
        desc: inputInsumosDescripcion.value,
        valor: inputInsumosValor.value
    });

    redibujartabla(
        TablaInsumos,
        arregloInsumos,
        inputInsumosDescripcion,
        inputInsumosValor
    );

    FormIngresoInsumos.reset();
};


    BotonGuardar.onclick = () => { 
        // Información de cada factura:
    let objFactura = {
        Placa: InputPlaca.value,
        Marca: SelectMarcas.value,
        Modelo: InputModelo.value,
        Año: InputAño.value, 
        Nombre: InputNombre.value,
        Telefono: InputTelefono.value,
        NumeroFactura: InputFactura.value,
        FechaFacturacion: InputFechaFacturacion.value,
        FechaGarantia: InputFechaGarantia.value,
        Garantia: CheckGarantia.checked,
        IncluyeRepuestos: CheckFacturas.checked,
        Servicios: [...arregloServicios],
        Repuestos: [...arregloRepuestos],
        Insumos: [...arregloInsumos],
    };  
    arregloFacturas.push(objFactura);

    // Guardar en el Localstorage
    localStorage.setItem("Facturas", JSON.stringify(arregloFacturas));
    cargarFacturas();
    // Limpiar Formularios:
    FormInfomacionCliente.reset();
    FormInformacionFactura.reset();
    formDetalle.reset();

    // Borrar los datos contenidos en la tabla:
        arregloServicios = [];
        arregloRepuestos = [];
        arregloInsumos = [];

        
        redibujartabla(TablaServicios, arregloServicios);
        redibujartabla(TablaRepuestos, arregloRepuestos);
        redibujartabla(TablaInsumos, arregloInsumos);

    alert("Factura guardada con éxito");
};

// Configuracion de la fecha de garantia:
InputFechaFacturacion.onchange = () => {
    if (InputFechaFacturacion.value) {
        const fecha1 = new Date(InputFechaFacturacion.value);
        // Sumar 30 días
        fecha1.setDate(fecha1.getDate() + 31); // +31 para compensar desfase horario común en JS
        InputFechaGarantia.value = fecha1.toISOString().split("T")[0];
    }
};


const calcularTotal = (arreglo) => {
    return arreglo.reduce((total, item) => {
        return total + Number(item.valor);
    }, 0);
};


const calcularTotalGeneral = () => {
    const totalServicios = calcularTotal(arregloServicios);
    const totalRepuestos = calcularTotal(arregloRepuestos);
    const totalInsumos = calcularTotal(arregloInsumos);

    const total = totalServicios + totalRepuestos + totalInsumos;

    document.getElementById("totalServicios").innerText = totalServicios.toFixed(2);
    document.getElementById("Total Repuestos").innerText = totalRepuestos.toFixed(2);
    document.getElementById("Total Insumos").innerText = totalInsumos.toFixed(2);
    document.getElementById("total").innerText = total.toFixed(2);
};

// Geneta la vista previa de la factura:
const generarVistaFactura = () => {
    const html = `
        <h5>Factura #${InputFactura.value}</h5>
        <p><b>Cliente:</b> ${InputNombre.value}</p>
        <p><b>Vehículo:</b> ${SelectMarcas.value} ${InputModelo.value}</p>
        <hr>
        <h6>Servicios</h6>
        <ul>${arregloServicios.map(s => `<li>${s.desc} - $${s.valor}</li>`).join("")}</ul>
        <h6>Repuestos</h6>
        <ul>${arregloRepuestos.map(r => `<li>${r.desc} - $${r.valor}</li>`).join("")}</ul>
        <h6>Insumos</h6>
        <ul>${arregloInsumos.map(i => `<li>${i.desc} - $${i.valor}</li>`).join("")}</ul>
        <hr>
        <h4>Total: $${document.getElementById("total").innerText}</h4>
    `;

    document.getElementById("vistaFactura").innerHTML = html;
    new bootstrap.Modal(document.getElementById("modalFactura")).show();
};








