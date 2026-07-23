import { generarPDFInterno } from "../services/reportes.service.js";
import { transcribirAudio, analizarIntencionFactura } from "../services/openai.service.js";
import { crearFacturaInterna } from "../services/facturas.service.js"; 
import { pool } from "../db.js";

// Helpers de Fecha
const getDates = (filter) => {
    const now = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    
    if (filter === 'hoy') {
        return { desde: formatDate(now), hasta: formatDate(now) };
    }
    if (filter === 'ayer') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return { desde: formatDate(yesterday), hasta: formatDate(yesterday) };
    }
    if (filter === 'semana') {
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Lunes
        return { desde: formatDate(firstDay), hasta: formatDate(new Date()) };
    }
    if (filter === 'semana_pasada') {
        const daysSinceMonday = (now.getDay() + 6) % 7; // Lunes = 0
        const currentMonday = new Date(now);
        currentMonday.setDate(now.getDate() - daysSinceMonday);
        const lastMonday = new Date(currentMonday);
        lastMonday.setDate(currentMonday.getDate() - 7);
        const lastSunday = new Date(currentMonday);
        lastSunday.setDate(currentMonday.getDate() - 1);
        return { desde: formatDate(lastMonday), hasta: formatDate(lastSunday) };
    }
    if (filter === 'mes') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return { desde: formatDate(firstDay), hasta: formatDate(new Date()) };
    }
    return null;
};

// 1. Enviar Mensaje de Texto Simple (NUEVO: Para confirmar la factura)
const sendTextWhatsapp = async (toNumber, textBody) => {
    const url = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;
    
    await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.TOKEN_WHATSAPP}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: toNumber,
            type: "text",
            text: { body: textBody }
        })
    });
};

// 2. Enviar Mensaje de Lista (Menú)
const sendInteractiveList = async (toNumber) => {
    const url = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;
    
    const body = {
        messaging_product: "whatsapp",
        to: toNumber,
        type: "interactive",
        interactive: {
            type: "list",
            header: { type: "text", text: "📊 Contabilidad" },
            body: { text: "Selecciona el periodo para el reporte:" },
            footer: { text: "Rogers Prieto App" },
            action: {
                button: "Ver Filtros",
                sections: [
                    {
                        title: "Filtros Rápidos",
                        rows: [
                            { id: "filter_hoy", title: "Hoy", description: "Reporte del día actual" },
                            { id: "filter_ayer", title: "Ayer", description: "Reporte del día anterior" },
                            { id: "filter_semana", title: "Esta Semana", description: "Lunes a la fecha" },
                            { id: "filter_semana_pasada", title: "Semana Pasada", description: "Lunes a domingo anterior" },
                            { id: "filter_mes", title: "Este Mes", description: "Mes en curso" }
                        ]
                    }
                ]
            }
        }
    };

    await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.TOKEN_WHATSAPP}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
};

// 3. Enviar Documento PDF
const sendPdfWhatsapp = async (toNumber, pdfFileName) => {
    const url = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;
    const pdfLink = `${process.env.PUBLIC_URL || 'https://aplicacion-2-0.onrender.com'}/public/reports/${pdfFileName}`;

    await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.TOKEN_WHATSAPP}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: toNumber,
            type: "document",
            document: {
                link: pdfLink,
                filename: `Reporte_Contable.pdf`,
                caption: "Aquí tienes tu resumen contable 📄"
            }
        })
    });
};

export const receiveWebhook = async (req, res) => {
    try {
        const body = req.body;
        
        if (body.object === "whatsapp_business_account") {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message) {
                const from = message.from;
                
                // --- FLUJO 1: MENU REPORTES (".") ---
                if (message.type === "text" && message.text.body === ".") {
                    await sendInteractiveList(from);
                } 
                
                // --- FLUJO 2: SELECCIÓN DE LISTA ---
                else if (message.type === "interactive" && message.interactive.type === "list_reply") {
                    const selectionId = message.interactive.list_reply.id;
                    const filterMap = {
                        'filter_hoy': 'hoy',
                        'filter_ayer': 'ayer',
                        'filter_semana': 'semana',
                        'filter_semana_pasada': 'semana_pasada',
                        'filter_mes': 'mes'
                    };

                    const filter = filterMap[selectionId];
                    if (filter) {
                        const { desde, hasta } = getDates(filter);
                        const fileName = await generarPDFInterno(desde, hasta);
                        await sendPdfWhatsapp(from, fileName);
                    }
                }

                // --- FLUJO 3: INTELIGENCIA ARTIFICIAL (AUDIO) ---
                else if (message.type === "audio") {
                    try {
                        // Notificar que se está procesando (Opcional, para UX)
                        // await sendTextWhatsapp(from, "Escuchando y procesando tu audio... 🎧");

                        const mediaId = message.audio.id;
                        
                        // A. Transcribir
                        const texto = await transcribirAudio(mediaId); //
                        console.log("Texto transcrito:", texto);
                        
                        // B. Obtener consecutivo
                        const resNum = await pool.query('SELECT COALESCE(MAX(numeroFactura), 0) + 1 AS next FROM total_facturas');
                        const nextFactura = resNum.rows[0].next;

                        // C. Analizar con GPT
                        const datosFactura = await analizarIntencionFactura(texto, nextFactura); //

                        if (!datosFactura.placa) {
                            await sendTextWhatsapp(from, "❌ No pude identificar la placa del vehículo en el audio. Por favor intenta de nuevo.");
                        } else {
                            // D. GUARDAR EN BD USANDO EL SERVICIO CORRECTO
                            const nuevaFacturaId = await crearFacturaInterna(datosFactura); //

                            // E. Confirmar al usuario
                            const mensajeConfirmacion = `✅ Factura #${datosFactura.numeroFactura} creada exitosamente.\n\n🚗 Placa: ${datosFactura.placa}\n💰 Total: $${(datosFactura.totales.totalRogers + datosFactura.totales.totalOmar).toLocaleString()}`;
                            
                            await sendTextWhatsapp(from, mensajeConfirmacion);
                        }
                    } catch (err) {
                        console.error("Error procesando audio:", err);
                        await sendTextWhatsapp(from, "⚠️ Hubo un error procesando tu audio. Verifica que sea claro.");
                    }
                }
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Error Webhook:", error);
        res.sendStatus(500);
    }
};

export const verifyWebhook = (req, res) => {
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === verifyToken) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
};