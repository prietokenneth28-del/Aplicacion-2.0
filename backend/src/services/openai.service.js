import OpenAI from "openai";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. CLIENTE OPENAI (Solo para Audio/Whisper)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

// 2. CLIENTE DEEPSEEK (Para la inteligencia/Lógica)
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com', 
    apiKey: process.env.DEEPSEEK_API_KEY 
});

// Helper: Obtener URL de descarga desde Meta
async function getMediaUrl(mediaId) {
    const url = `https://graph.facebook.com/v18.0/${mediaId}`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${process.env.TOKEN_WHATSAPP}` }
    });
    const data = await response.json();
    return data.url;
}

// FUNCION 1: Transcribir Audio (Usa OpenAI Whisper)
// DeepSeek no tiene modelo de audio, así que mantenemos Whisper aquí.
export async function transcribirAudio(mediaId) {
    try {
        const mediaUrl = await getMediaUrl(mediaId);
        
        // Descargar el archivo
        const response = await axios({
            method: 'get',
            url: mediaUrl,
            responseType: 'stream',
            headers: { 'Authorization': `Bearer ${process.env.TOKEN_WHATSAPP}` }
        });

        const tempFilePath = path.join(__dirname, `temp_${mediaId}.ogg`);
        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Enviamos a OPENAI (Whisper)
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
        });

        // Limpieza
        fs.unlinkSync(tempFilePath);

        return transcription.text;
    } catch (error) {
        console.error("Error transcribiendo:", error);
        throw error;
    }
}

// FUNCION 2: Analizar Intención (AHORA USA DEEPSEEK V3)
export async function analizarIntencionFactura(texto, siguienteNumeroFactura) {
    const prompt = `
    Eres un asistente contable experto. Tu tarea es extraer información de un texto para crear una factura.
    
    Texto del usuario: "${texto}"
    
    Contexto:
    - Siguiente número de factura: ${siguienteNumeroFactura}
    - Fecha hoy: ${new Date().toISOString().split('T')[0]}
    
    Genera un JSON válido con esta estructura:
    {
        "placa": "PLACA (Mayúsculas, sin espacios)",
        "numeroFactura": ${siguienteNumeroFactura},
        "fechaFacturacion": "YYYY-MM-DD",
        "fechaGarantia": "YYYY-MM-DD (Calcula 1 mes después si no se dice)",
        "garantia": false,
        "incluyeRepuestos": false,
        "servicios": [{ "desc": "Descripcion", "valor": 0 }],
        "repuestos": [{ "desc": "Descripcion", "valor": 0 }],
        "insumos": [{ "desc": "Descripcion", "valor": 0 }],
        "totales": {
            "totalServicios": 0,
            "totalRepuestos": 0,
            "totalInsumos": 0,
            "totalRogers": 0, 
            "totalOmar": 0 
        }
    }
    
    Reglas de Negocio:
    1. Si no hay placa, devuelve "placa": null.
    2. Calcula los totales sumando los arrays.
    3. 'totalRogers' = (totalServicios * 0.60) + (totalRepuestos * 0.15).
    4. 'totalOmar' = (totalServicios * 0.40) + totalInsumos.
    5. Responde SOLO el JSON, sin bloques de código ni markdown.
    `;

    try {
        // Usamos el cliente DEEPSEEK
        const completion = await deepseek.chat.completions.create({
            messages: [
                { role: "system", content: "Eres una API que solo responde en JSON." },
                { role: "user", content: prompt }
            ],
            model: "deepseek-chat", // Modelo V3 (muy económico y capaz)
            response_format: { type: "json_object" },
            temperature: 0.1 // Temperatura baja para datos precisos
        });

        const contenido = completion.choices[0].message.content;
        
        // DeepSeek a veces pone markdown ```json ... ```, lo limpiamos por si acaso
        const jsonLimpio = contenido.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(jsonLimpio);

    } catch (error) {
        console.error("Error en DeepSeek:", error);
        return null; 
    }
}