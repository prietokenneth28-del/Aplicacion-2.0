// Frontend/JS/ui/utils.ui.js

/**
 * Muestra un Toast de Bootstrap
 * @param {string} mensaje - El mensaje a mostrar
 * @param {string} tipo - 'success', 'danger', 'warning', 'info'
 */
export const mostrarToast = (mensaje, tipo = 'success') => {
    // 1. Crear el contenedor si no existe
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1100'; // Asegurar que esté encima de todo
        document.body.appendChild(toastContainer);
    }

    // 2. HTML del Toast
    const toastHTML = `
        <div class="toast align-items-center text-bg-${tipo} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${obtenerIcono(tipo)} me-2"></i> ${mensaje}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    // 3. Insertar y mostrar
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = toastHTML.trim();
    const toastElement = tempDiv.firstChild;
    toastContainer.appendChild(toastElement);

    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();

    // Limpiar el DOM cuando se oculte
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
};

/**
 * Muestra un Modal de Confirmación
 * @param {string} mensaje - Pregunta a realizar
 * @param {Function} callbackConfirmar - Función a ejecutar si dice "Sí"
 */
export const confirmarAccion = (mensaje, callbackConfirmar) => {
    // 1. Crear modal si no existe (o usar uno genérico en el HTML)
    let modalElement = document.getElementById('modalConfirmacionGenerico');
    
    // Si no existe en el HTML, lo creamos dinámicamente
    if (!modalElement) {
        const modalHTML = `
        <div class="modal fade" id="modalConfirmacionGenerico" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-warning-subtle">
                        <h5 class="modal-title text-warning-emphasis"><i class="bi bi-exclamation-triangle-fill me-2"></i>Confirmación</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p id="modalMensajeTexto" class="fs-5"></p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="btnConfirmarAccionModal">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modalElement = document.getElementById('modalConfirmacionGenerico');
    }

    // 2. Configurar mensaje y evento
    document.getElementById('modalMensajeTexto').textContent = mensaje;
    const btnConfirmar = document.getElementById('btnConfirmarAccionModal');
    
    // Clonar el botón para eliminar eventos previos (evita ejecuciones múltiples)
    const nuevoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(nuevoBtn, btnConfirmar);

    const modal = new bootstrap.Modal(modalElement);

    nuevoBtn.addEventListener('click', () => {
        callbackConfirmar(); // Ejecutar la acción
        modal.hide();
    });

    modal.show();
};

const obtenerIcono = (tipo) => {
    switch(tipo) {
        case 'success': return 'bi-check-circle-fill';
        case 'danger': return 'bi-exclamation-octagon-fill';
        case 'warning': return 'bi-exclamation-triangle-fill';
        default: return 'bi-info-circle-fill';
    }
}