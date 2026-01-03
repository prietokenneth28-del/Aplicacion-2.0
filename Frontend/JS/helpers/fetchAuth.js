const API_URL =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "http://localhost:2000"
        : "https://aplicacion-2-0.onrender.com";



export const fetchAuth = async (
    endpoint,
    { method = "GET", body = null, headers = {} } = {}
) => {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const config = {
        method,
        headers: {
            "Authorization": `Bearer ${token}`,
            ...headers
        }
    };

    if (body) {
        config.headers["Content-Type"] = "application/json";
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    // 🔒 Token inválido o expirado
    if (response.status === 401) {
        localStorage.removeItem("token");
        alert("Sesión expirada, vuelva a iniciar sesión");
        window.location.href = "login.html";
        return;
    }

    if (!response.ok) {
        throw new Error(data.message || "Error en la petición");
    }

    return data;
};

