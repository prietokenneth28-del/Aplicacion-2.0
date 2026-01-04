import { Router } from "express";
import {
    guardarControl,
    obtenerControlPorPlaca,
    generarFacturaDesdeControl,
    eliminarControl
} from "../controllers/control.controller.js";
import { verificarToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("", verificarToken, guardarControl);
router.get("/:placa", verificarToken, obtenerControlPorPlaca);
router.post("/:placa/generar", verificarToken, generarFacturaDesdeControl);
router.delete("/:placa", verificarToken, eliminarControl);

export default router;
