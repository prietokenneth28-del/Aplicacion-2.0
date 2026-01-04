import dotenv from "dotenv";
dotenv.config();

import express from "express";
import corsMiddleware from "./middlewares/cors.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import clientRoutes from "./routes/clientes.routes.js";
import billRoutes from "./routes/facturas.routes.js";
import helmet from "helmet";
import controlRoutes from "./routes/control.routes.js";




const app = express();

app.use(express.json());
app.use(corsMiddleware);
app.use(helmet());
// Rutas
app.use("/clientes", clientRoutes);
app.use("/facturas", billRoutes);
app.use("/auth", authRoutes);
app.use("/control", controlRoutes);
const PORT = process.env.PORT || 2000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
