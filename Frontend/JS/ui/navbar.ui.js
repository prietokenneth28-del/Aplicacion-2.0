document.addEventListener('DOMContentLoaded', () => {
    // 1. Resaltar Link Activo
    const path = window.location.pathname;
    const paginaActual = path.split("/").pop(); // Ej: "Factura.html"

    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Si el href coincide con la página actual, le ponemos la clase active
        if (href === paginaActual) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

});