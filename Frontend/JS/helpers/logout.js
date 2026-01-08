const BtnLogout = document.getElementById("BtnLogout");

if (BtnLogout) {
  BtnLogout.addEventListener("click", () => {
    const confirmar = confirm("¿Deseas cerrar sesión?");
    if (!confirmar) return;

    // Eliminar token y datos temporales
    localStorage.removeItem("token");
    localStorage.removeItem("controlFactura");
    localStorage.removeItem("editarControlPlaca");

    // Redirigir al login
    window.location.href = "index.html";
  });
}
