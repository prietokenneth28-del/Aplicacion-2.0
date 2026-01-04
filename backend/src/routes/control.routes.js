import { Router } from "express";
import {
    guardarControl,
    obtenerControlPorPlaca,
    generarFacturaDesdeControl,
    eliminarControl,
    historialControles,
    obtenerControlEditable
} from "../controllers/control.controller.js";
import { verificarToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("", verificarToken, guardarControl);
router.get("/:placa", verificarToken, obtenerControlPorPlaca);
router.post("/:placa/generar", verificarToken, generarFacturaDesdeControl);
router.delete("/:placa", verificarToken, eliminarControl);
router.get("", verificarToken, historialControles);
router.get("/:placa/editar", verificarToken, obtenerControlEditable);

export default router;
