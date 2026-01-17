import { fetchAuth } from "../helpers/fetchAuth";

  
  // Función para cargar todos los clientes desde la API
        async function cargarClientes() {
    try {
        // fetchAuth ya devuelve el JSON procesado, no el objeto Response
        const clientes = await fetchAuth('/clientes/placa/clientes');
        
        // Asignamos directamente
        todosClientes = clientes;
        
        // Actualizar contador
        document.getElementById('clienteCount').textContent = clientes.length;
        document.getElementById('totalCount').textContent = clientes.length;
        
        // Mostrar clientes
        mostrarClientes(clientes);
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('No se pudo cargar la lista de clientes');
    }
}
        
        // Función para mostrar clientes en la tabla
        function mostrarClientes(clientes) {
            const tablaBody = document.getElementById('tablaClientes');
            const loadingRow = document.getElementById('loadingRow');
            const emptyState = document.getElementById('emptyState');
            const noResultsState = document.getElementById('noResultsState');
            const paginationControls = document.getElementById('paginationControls');
            
            // Ocultar loading
            if (loadingRow) loadingRow.style.display = 'none';
            
            // Mostrar estado vacío si no hay clientes
            if (clientes.length === 0) {
                tablaBody.innerHTML = '';
                
                // Verificar si es búsqueda sin resultados o lista vacía
                const searchTerm = document.getElementById('InputBuscarCliente').value.trim();
                if (searchTerm) {
                    noResultsState.style.display = 'block';
                    emptyState.style.display = 'none';
                    document.getElementById('searchTerm').textContent = searchTerm;
                } else {
                    emptyState.style.display = 'block';
                    noResultsState.style.display = 'none';
                }
                
                paginationControls.style.display = 'none';
                document.getElementById('currentCount').textContent = '0';
                return;
            }
            
            // Ocultar estados vacíos
            emptyState.style.display = 'none';
            noResultsState.style.display = 'none';
            
            // Paginación
            const totalPages = Math.ceil(clientes.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, clientes.length);
            const clientesPaginados = clientes.slice(startIndex, endIndex);
            
            // Actualizar información de paginación
            document.getElementById('currentCount').textContent = `${startIndex + 1}-${endIndex}`;
            
            // Mostrar controles de paginación si es necesario
            if (totalPages > 1) {
                paginationControls.style.display = 'flex';
                document.getElementById('btnPrevPage').disabled = currentPage === 1;
                document.getElementById('btnNextPage').disabled = currentPage === totalPages;
            } else {
                paginationControls.style.display = 'none';
            }
            
            // Generar filas de la tabla
            let html = '';
            
            clientesPaginados.forEach(cliente => {
                html += `
                    <tr>
                        <td>
                            <span class="placa-badge">${cliente.placa}</span>
                        </td>
                        <td class="fw-medium">${cliente.nombre || 'No especificado'}</td>
                        <td>${cliente.telefono || 'No especificado'}</td>
                        <td>${cliente.marca || 'No especificado'}</td>
                        <td>${cliente.modelo || 'No especificado'}</td>
                        <td>${cliente.año || 'No especificado'}</td>
                        <td class="text-end table-actions">
                            <button class="btn btn-sm btn-outline-primary action-btn btn-editar" data-placa="${cliente.placa}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger action-btn btn-eliminar" data-placa="${cliente.placa}" data-nombre="${cliente.nombre || 'Cliente'}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            tablaBody.innerHTML = html;
            
            // Agregar event listeners a los botones
            document.querySelectorAll('.btn-editar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const placa = btn.getAttribute('data-placa');
                    // Redirigir a Control.html con la placa como parámetro
                    window.location.href = `Control.html?placa=${placa}`;
                });
            });
            
            document.querySelectorAll('.btn-eliminar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const placa = btn.getAttribute('data-placa');
                    const nombre = btn.getAttribute('data-nombre');
                    
                    clienteAEliminar = { placa, nombre };
                    document.getElementById('clienteEliminarNombre').textContent = nombre;
                    document.getElementById('clienteEliminarPlaca').textContent = placa;
                    
                    // Mostrar modal de confirmación
                    const modal = new bootstrap.Modal(document.getElementById('modalConfirmarEliminar'));
                    modal.show();
                });
            });
        }
        
        // Función para filtrar clientes por nombre
        function filtrarClientes() {
            const searchTerm = document.getElementById('InputBuscarCliente').value.trim().toLowerCase();
            
            if (!searchTerm) {
                // Si no hay término de búsqueda, mostrar todos los clientes
                mostrarClientes(todosClientes);
                return;
            }
            
            // Filtrar clientes por nombre
            const clientesFiltrados = todosClientes.filter(cliente => 
                cliente.nombre && cliente.nombre.toLowerCase().includes(searchTerm)
            );
            
            // Reiniciar paginación al filtrar
            currentPage = 1;
            mostrarClientes(clientesFiltrados);
        }
        
        // Función para eliminar un cliente
        async function eliminarCliente() {
    if (!clienteAEliminar) return;
    
    try {
        // Usamos fetchAuth para que maneje la URL base (localhost:2000) y el token automáticamente.
        // NOTA: Quitamos '/api' porque tu ruta en backend es '/clientes/placa/:placa'
        await fetchAuth(`/clientes/placa/${clienteAEliminar.placa}`, {
            method: 'DELETE'
        });
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmarEliminar'));
        modal.hide();
        
        // Mostrar mensaje de éxito
        mostrarExito(`Cliente ${clienteAEliminar.nombre} eliminado correctamente`);
        
        // Recargar la lista de clientes
        await cargarClientes();
        
        // Limpiar referencia
        clienteAEliminar = null;
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('No se pudo eliminar el cliente');
    }
}
        
        // Función para mostrar mensaje de éxito
        function mostrarExito(mensaje) {
            // Crear toast de éxito
            const toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            
            const toastHTML = `
                <div class="toast align-items-center text-bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="d-flex">
                        <div class="toast-body">
                            <i class="bi bi-check-circle me-2"></i> ${mensaje}
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                </div>
            `;
            
            toastContainer.innerHTML = toastHTML;
            document.body.appendChild(toastContainer);
            
            // Mostrar toast
            const toastElement = toastContainer.querySelector('.toast');
            const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
            toast.show();
            
            // Remover toast después de que se oculte
            toastElement.addEventListener('hidden.bs.toast', () => {
                document.body.removeChild(toastContainer);
            });
        }
        
        // Función para mostrar mensaje de error
        function mostrarError(mensaje) {
            // Crear toast de error
            const toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            
            const toastHTML = `
                <div class="toast align-items-center text-bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="d-flex">
                        <div class="toast-body">
                            <i class="bi bi-exclamation-triangle me-2"></i> ${mensaje}
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                </div>
            `;
            
            toastContainer.innerHTML = toastHTML;
            document.body.appendChild(toastContainer);
            
            // Mostrar toast
            const toastElement = toastContainer.querySelector('.toast');
            const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
            toast.show();
            
            // Remover toast después de que se oculte
            toastElement.addEventListener('hidden.bs.toast', () => {
                document.body.removeChild(toastContainer);
            });
        }
        
        // Configurar event listeners
        document.addEventListener('DOMContentLoaded', () => {
            // Cargar clientes al iniciar
            cargarClientes();
            
            // Configurar búsqueda en tiempo real
            const inputBuscar = document.getElementById('InputBuscarCliente');
            let timeoutId;
            
            inputBuscar.addEventListener('input', () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(filtrarClientes, 300); // Debounce de 300ms
            });
            
            // Configurar botón de nuevo cliente
            document.getElementById('BtnNuevoCliente').addEventListener('click', () => {
                window.location.href = 'Control.html';
            });
            
            document.getElementById('BtnNuevoClienteEmpty')?.addEventListener('click', () => {
                window.location.href = 'Control.html';
            });
            
            // Configurar botón de limpiar búsqueda
            document.getElementById('BtnLimpiarBusqueda')?.addEventListener('click', () => {
                document.getElementById('InputBuscarCliente').value = '';
                filtrarClientes();
            });
            
            // Configurar paginación
            document.getElementById('btnPrevPage').addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    const searchTerm = document.getElementById('InputBuscarCliente').value.trim();
                    
                    if (searchTerm) {
                        const clientesFiltrados = todosClientes.filter(cliente => 
                            cliente.nombre && cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                        mostrarClientes(clientesFiltrados);
                    } else {
                        mostrarClientes(todosClientes);
                    }
                }
            });
            
            document.getElementById('btnNextPage').addEventListener('click', () => {
                const searchTerm = document.getElementById('InputBuscarCliente').value.trim();
                let clientesAMostrar = todosClientes;
                
                if (searchTerm) {
                    clientesAMostrar = todosClientes.filter(cliente => 
                        cliente.nombre && cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
                
                const totalPages = Math.ceil(clientesAMostrar.length / itemsPerPage);
                
                if (currentPage < totalPages) {
                    currentPage++;
                    mostrarClientes(clientesAMostrar);
                }
            });
            
            // Configurar confirmación de eliminación
            document.getElementById('btnConfirmarEliminar').addEventListener('click', eliminarCliente);
        });