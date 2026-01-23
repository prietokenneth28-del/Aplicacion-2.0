import { Router } from "express";
import { verifyWebhook, receiveWebhook } from "../controllers/webhook.controller.js";

const router = Router();

// Meta usa la misma URL para GET (verificar) y POST (enviar datos)
router.get("/", verifyWebhook);
router.post("/", receiveWebhook);

export default router;