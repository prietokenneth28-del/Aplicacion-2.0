import dotenv from "dotenv";
dotenv.config();

import express from "express";
import corsMiddleware from "./middlewares/cors.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import clientRoutes from "./routes/clientes.routes.js";
import billRoutes from "./routes/facturas.routes.js";
import helmet from "helmet";
import controlRoutes from "./routes/control.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(corsMiddleware);
app.use(helmet());
// Rutas
app.use("/clientes", clientRoutes);
app.use("/facturas", billRoutes);
app.use("/auth", authRoutes);
app.use("/control", controlRoutes);
app.use("/webhook", webhookRoutes);
app.use('/public', express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 2000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
