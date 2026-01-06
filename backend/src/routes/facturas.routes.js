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


router.get("/next", verificarToken, getNextFacturaNumber);
router.get("/resumen", verificarToken, resumenFacturasPorFecha);
router.get("/resumen/pdf", verificarToken, exportarResumenContableCompletoPDF);


router.get("/nfactura/:numeroFactura", verificarToken, getFacturaCompleta);
router.get("/:numeroFactura/pdf", verificarToken, exportarFacturaPDF);

router.post("", verificarToken, crearFactura);
router.put("/:numeroFactura", verificarToken, editarFacturaCompleta);
router.delete("/:numeroFactura", verificarToken, eliminarFacturaCompleta);


export default router;
