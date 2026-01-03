import cors from "cors";

const corsOptions = {
    origin: (origin, callback) => {

        if (!origin) return callback(null, true);

        const isDev = process.env.NODE_ENV === "development";

        const allowedOriginsDev = [
            process.env.FRONTEND_DEV,
            process.env.FRONTEND_DEV_ALT
        ];

        const allowedOriginsProd = [
            process.env.FRONTEND_PROD
        ];

        const allowedOrigins = isDev
            ? allowedOriginsDev
            : allowedOriginsProd;

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false); // 👈 evita "Failed to fetch"
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

export default cors(corsOptions);
