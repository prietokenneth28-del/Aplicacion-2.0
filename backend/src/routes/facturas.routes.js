import { Router } from "express"; 
import {
    crearFactura,
    getFacturaCompleta,
    getNextFacturaNumber,
    editarFacturaCompleta,
    eliminarFacturaCompleta,
    exportarFacturaPDF,
    resumenFacturasPorFecha,
    exportarResumenContableCompletoPDF
} from "../controllers/bill_controllers.js";
import { verificarToken } from "../middlewares/auth.middleware.js";

const router = Router();

// ---------- RUTAS ESPECÍFICAS ----------
router.get("/next", verificarToken, getNextFacturaNumber);

router.get("/resumen", verificarToken, resumenFacturasPorFecha);

router.get("/nfactura/:numeroFactura", verificarToken, getFacturaCompleta);
// ó: router.get("/completa/:numeroFactura", verificarToken, getFacturaCompleta);

router.post("", verificarToken, crearFactura);

// ---------- RUTAS GENÉRICAS ----------
router.put("/:numeroFactura", verificarToken, editarFacturaCompleta);

router.delete("/:numeroFactura", verificarToken, eliminarFacturaCompleta);

router.get("/:numeroFactura/pdf", verificarToken, exportarFacturaPDF);

router.get("/resumen/pdf", verificarToken, exportarResumenContableCompletoPDF);

export default router;
