import OpenAI from "openai";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Asegúrate de poner esto en tu .env
});

// 1. Obtener URL de descarga desde Meta
async function getMediaUrl(mediaId) {
    const url = `https://graph.facebook.com/v18.0/${mediaId}`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${process.env.TOKEN_WHATSAPP}` }
    });
    const data = await response.json();
    return data.url;
}

// 2. Descargar y Transcribir Audio (Whisper)
export async function transcribirAudio(mediaId) {
    try {
        const mediaUrl = await getMediaUrl(mediaId);
        
        // Descargar el archivo como stream
        const response = await axios({
            method: 'get',
            url: mediaUrl,
            responseType: 'stream',
            headers: { 'Authorization': `Bearer ${process.env.TOKEN_WHATSAPP}` }
        });

        // Guardar temporalmente (Whisper requiere un archivo)
        const tempFilePath = path.join(__dirname, `temp_${mediaId}.ogg`);
        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Enviar a OpenAI Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
        });

        // Limpiar archivo temporal
        fs.unlinkSync(tempFilePath);

        return transcription.text;
    } catch (error) {
        console.error("Error transcribiendo:", error);
        throw error;
    }
}

// 3. Interpretar Intención y Extraer Datos (GPT-4)
export async function analizarIntencionFactura(texto, siguienteNumeroFactura) {
    const prompt = `
    Eres un asistente contable experto. Tu tarea es extraer información de un texto para crear una factura.
    
    El texto es: "${texto}"
    
    El siguiente número de factura disponible es: ${siguienteNumeroFactura}.
    
    Estructura de salida JSON requerida:
    {
        "placa": "AAA123 (convertir a mayúsculas y sin espacios)",
        "numeroFactura": ${siguienteNumeroFactura},
        "fechaFacturacion": "YYYY-MM-DD (fecha de hoy si no se especifica)",
        "fechaGarantia": "YYYY-MM-DD (calcular 30 días después si no se especifica)",
        "garantia": true/false (si no lo mencionan: false),
        "incluyeRepuestos": true/false (si no lo mencionan: false),
        "servicios": [{ "desc": "Descripción del servicio", "valor": 10000 }],
        "repuestos": [{ "desc": "Descripción del repuesto", "valor": 20000 }],
        "insumos": [{ "desc": "Descripción del insumo", "valor": 5000 }],
        "totales": {
            "totalServicios": 0,
            "totalRepuestos": 0,
            "totalInsumos": 0,
            "totalRogers": 0, 
            "totalOmar": 0 
        }
    }
    
    Reglas:
    - Si no dicen placa, devuelve null en ese campo.
    - Calcula los totales sumando los items.
    - totalRogers se calcula de la siguiente manera: (totalServicios * 0.60) + (totalRepuestos * 0.15).
    - totalOmar se calcula de la siguiente manera: (totalServicios * 0.40) + totalInsumos.
    - Responde SOLO con el JSON válido, sin markdown.
    `;

    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: prompt }],
        model: "gpt-3.5-turbo", // O gpt-3.5-turbo si prefieres economía
        response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
}