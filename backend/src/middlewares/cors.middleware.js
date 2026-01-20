import cors from "cors";

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const isDev = process.env.NODE_ENV === "development";

        const allowedOriginsDev = [
            process.env.FRONTEND_DEV,
            process.env.FRONTEND_DEV_ALT
        ];

        // MODIFICACIÓN AQUÍ: Agregamos FRONTEND_DEV a producción también
        const allowedOriginsProd = [
            process.env.FRONTEND_PROD,
            "http://127.0.0.1:5500", // Tu IP local (Live Server)
            "http://localhost:5500"   // Alternativa local
        ];

        const allowedOrigins = isDev
            ? allowedOriginsDev
            : allowedOriginsProd;

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log("Bloqueado por CORS:", origin); // Útil para depurar en los logs de Render
            callback(null, false);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

export default cors(corsOptions);
