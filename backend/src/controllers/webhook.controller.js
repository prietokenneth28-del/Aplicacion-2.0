import { pool } from "../db.js";

// VERIFICACIÓN DEL WEBHOOK (Meta te pedirá esto al configurarlo)
export const verifyWebhook = (req, res) => {
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN; 

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === verifyToken) {
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400); // Bad Request si falta algo
    }
};

// RECEPCIÓN DE MENSAJES
export const receiveWebhook = async (req, res) => {
    try {
        const body = req.body;

        // Verificar si es un evento de WhatsApp
        if (body.object === "whatsapp_business_account") {
            // Recorrer las entradas (puede haber varios mensajes en un paquete)
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    const value = change.value;

                    // Verificar que sea un mensaje y no una notificación de estado (leído/enviado)
                    if (value.messages && value.messages.length > 0) {
                        const message = value.messages[0];
                        
                        const from = message.from; // Número de quien envía (tú)
                        const type = message.type;
                        let text = "";

                        // Extraer el texto si es tipo texto
                        if (type === "text") {
                            text = message.text.body;
                        }

                        console.log(`Mensaje recibido de ${from}: ${text}`);

                        // --- AQUÍ HACES LA PETICIÓN A TU BASE DE DATOS ---
                        // Ejemplo: Guardar en una tabla de auditoría o procesar comandos
                        await pool.query(
                            `INSERT INTO historial_whatsapp (numero, mensaje, fecha_recibido) 
                             VALUES ($1, $2, NOW())`,
                            [from, text]
                        );
                    }
                }
            }
            res.sendStatus(200); // Siempre responder 200 a Meta rápidamente
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Error en webhook:", error);
        res.sendStatus(500);
    }
};

