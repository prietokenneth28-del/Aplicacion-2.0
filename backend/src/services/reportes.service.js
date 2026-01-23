import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { pool } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mismos colores que usas en bill_controllers.js
const COLORS = {
    primary: "#1e3a8a",      // Azul oscuro
    secondary: "#64748b",    // Gris texto secundario
    accent: "#3b82f6",       // Azul brillante
    background: "#f1f5f9",   // Fondo general del PDF (gris muy claro)
    white: "#ffffff",        // Blanco puro para las tarjetas
    border: "#cbd5e1",       // Borde suave
    success: "#059669",      // Verde
    textMain: "#0f172a",     // Color oscuro para los números (Casi negro)
    headerBg: "#1e40af",
    headerText: "#ffffff",
    rowAlt: "#f8fafc"
};

export const generarPDFInterno = async (desde, hasta) => {
    // 1. CONSULTAS (Reutilizando tu lógica)
    const [facturasRes, totalesRes, insumosRes] = await Promise.all([
        pool.query(`SELECT numeroFactura, fechaExp, totalRogers, totalInsumos, totalOmar FROM total_facturas WHERE fechaExp BETWEEN $1 AND $2 ORDER BY fechaExp ASC`, [desde, hasta]),
        pool.query(`SELECT COALESCE(SUM(totalRogers), 0) AS total_rogers, COALESCE(SUM(totalInsumos), 0) AS total_insumos, COALESCE(SUM(totalOmar), 0) AS total_omar, COUNT(*) AS cantidad_facturas FROM total_facturas WHERE fechaExp BETWEEN $1 AND $2`, [desde, hasta]),
        pool.query(`SELECT tf.numeroFactura, tf.fechaExp, fd.descripcion, fd.valor FROM factura_detalle fd JOIN total_facturas tf ON tf.id = fd.factura_id WHERE fd.tipo = 'INSUMO' AND tf.fechaExp BETWEEN $1 AND $2 ORDER BY tf.fechaExp ASC`, [desde, hasta])
    ]);

         const facturas = facturasRes.rows;
         const totales = totalesRes.rows[0];
         const insumos = insumosRes.rows;
 
         // 2. CONFIGURACIÓN PDF
         const doc = new PDFDocument({ 
             margin: 50, 
             size: "A4",
             bufferPages: true,
             layout: 'portrait',
             font: 'Helvetica'
         });
 
         // Variables de Layout
         const PAGE_WIDTH = doc.page.width;
         const PAGE_HEIGHT = doc.page.height;
         const MARGIN = 50;
         const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
         const PAGE_BREAK_Y = PAGE_HEIGHT - 120; 
 
         // Helpers
         const formatCurrency = (val) => `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
         const formatDate = (date) => new Date(date).toLocaleDateString('es-CO');
 
         // --- HEADER ---
         const drawHeader = () => {
             const logoPath = path.join(__dirname, "../assets/logo.png");
             if (fs.existsSync(logoPath)) {
                 doc.image(logoPath, MARGIN, 45, { width: 60 });
             }
 
             doc.fillColor(COLORS.primary)
                .fontSize(18)
                .font('Helvetica-Bold')
                .text("ROGERS PRIETO", 120, 50)
                .fontSize(10)
                .font('Helvetica')
                .fillColor(COLORS.secondary)
                .text("INFORME FINANCIERO Y CONTABLE", 120, 70);
 
             doc.roundedRect(PAGE_WIDTH - 250, 45, 200, 50, 4)
                .fill(COLORS.background);
             
             doc.fillColor(COLORS.primary)
                .fontSize(8)
                .font('Helvetica-Bold')
                .text("PERIODO DEL REPORTE", PAGE_WIDTH - 240, 55)
                .font('Helvetica')
                .fontSize(10)
                .text(`${formatDate(desde)}  —  ${formatDate(hasta)}`, PAGE_WIDTH - 240, 70);
         };
        const fileName = `Resumen_Contable_${Date.now()}.pdf`;
            const reportsDir = path.join(__dirname, '../../public/reports');

            // Asegurar que la carpeta exista
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }

            const filePath = path.join(reportsDir, fileName);
            const writeStream = fs.createWriteStream(filePath); // <--- AQUÍ SE DEFINE writeStream

            doc.pipe(writeStream);
         // --- FOOTER ---
         const drawFooter = () => {
             const pages = doc.bufferedPageRange();
             for (let i = 0; i < pages.count; i++) {
                 doc.switchToPage(i);
                 const footerY = PAGE_HEIGHT - 50;
                 
                 doc.moveTo(MARGIN, footerY).lineTo(PAGE_WIDTH - MARGIN, footerY)
                    .strokeColor(COLORS.border).lineWidth(1).stroke();
 
                 doc.fontSize(8).fillColor(COLORS.secondary)
                    .text(`Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, MARGIN, footerY + 10)
                    .text(`Página ${i + 1} de ${pages.count}`, PAGE_WIDTH - 100, footerY + 10, { align: 'right' });
             }
         };
 
         const checkPageBreak = (y) => {
             if (y > PAGE_BREAK_Y) {
                 doc.addPage();
                 drawHeader();
                 return 130;
             }
             return y;
         };
 
         // ================= 1. DASHBOARD DE KPIS (CORREGIDO) =================
         drawHeader();
         let currentY = 130;
 
         doc.fillColor(COLORS.primary)
            .fontSize(14)
            .font('Helvetica-Bold')
            .text("RESUMEN EJECUTIVO", MARGIN, currentY);
         
         currentY += 25;
 
         // Configuración de Tarjetas
         const cardWidth = (CONTENT_WIDTH - 30) / 4; 
         const cardHeight = 80; // Un poco más altas para que quepa bien el número
         
         // FUNCIÓN DRAW CARD MEJORADA: Fondo blanco, texto oscuro
         const drawCard = (x, title, value, barColor) => {
             // 1. Fondo BLANCO (Esto asegura que se vea el texto)
             doc.roundedRect(x, currentY, cardWidth, cardHeight, 5)
                .fill(COLORS.white);
             
             // 2. Barra de color superior (Acento)
             doc.path(`M${x},${currentY + 5} L${x},${currentY} L${x + cardWidth},${currentY} L${x + cardWidth},${currentY + 5}`)
                .fill(barColor);
 
             // 3. Borde sutil gris alrededor
             doc.strokeColor(COLORS.border)
                .roundedRect(x, currentY, cardWidth, cardHeight, 5)
                .stroke();
 
             // 4. Título (Texto Gris)
             doc.fillColor(COLORS.secondary)
                .fontSize(7) // Un poco más pequeño para que quepa "TOTAL INSUMOS"
                .font('Helvetica-Bold')
                .text(title.toUpperCase(), x + 10, currentY + 20);
 
             // 5. VALOR (Texto Negro/Oscuro Grande)
             doc.fillColor(COLORS.textMain) // Usamos color oscuro explícito
                .fontSize(13) // Fuente grande
                .text(value, x + 10, currentY + 45, { width: cardWidth - 20 });
         };
 
         // Dibujar las 4 tarjetas
         drawCard(MARGIN, "FACTURAS", totales.cantidad_facturas, COLORS.primary);
         drawCard(MARGIN + cardWidth + 10, "TOTAL ROGERS", formatCurrency(totales.total_rogers), COLORS.accent);
         drawCard(MARGIN + (cardWidth + 10) * 2, "TOTAL INSUMOS", formatCurrency(totales.total_insumos), COLORS.success);
         
         // Color especial para Gran Total
         drawCard(MARGIN + (cardWidth + 10) * 3, "TOTAL OMAR", formatCurrency(totales.total_omar), "#059669");
 
         currentY += 100;
 
         // ================= 2. TABLA DE FACTURAS =================
         currentY = checkPageBreak(currentY + 40);
         doc.fillColor(COLORS.primary).fontSize(12).font('Helvetica-Bold').text("DETALLE DE FACTURAS", MARGIN, currentY);
         currentY += 20;
 
         const colFacturas = [
             { name: "N° FACT", width: 60, align: "left" },
             { name: "FECHA", width: 80, align: "left" },
             { name: "ROGERS", width: 90, align: "right" },
             { name: "INSUMOS", width: 90, align: "right" },
             { name: "OMAR", width: 90, align: "right" },
             { name: "TOTAL", width: 0, align: "right" }
         ];
 
         const drawTableHeader = (columns, y) => {
             doc.rect(MARGIN, y, CONTENT_WIDTH, 25).fill(COLORS.headerBg);
             let x = MARGIN + 10;
             columns.forEach(col => {
                 const w = col.width || (CONTENT_WIDTH - (x - MARGIN) - 10);
                 doc.fillColor(COLORS.headerText).fontSize(8).font('Helvetica-Bold').text(col.name, x, y + 8, { width: w, align: col.align });
                 x += w;
             });
             return y + 25;
         };
 
         currentY = drawTableHeader(colFacturas, currentY);
 
         facturas.forEach((f, i) => {
             currentY = checkPageBreak(currentY);
             if (currentY === 130) currentY = drawTableHeader(colFacturas, currentY);
 
             if (i % 2 === 0) doc.rect(MARGIN, currentY, CONTENT_WIDTH, 20).fill(COLORS.rowAlt);
 
             let x = MARGIN + 10;
             const totalRow = Number(f.totalrogers) + Number(f.totalinsumos) + Number(f.totalomar);
 
             doc.fillColor(COLORS.textMain).fontSize(9).font('Helvetica');
             doc.text(f.numerofactura, x, currentY + 6, { width: 60 }); x += 60;
             doc.text(formatDate(f.fechaexp), x, currentY + 6, { width: 80 }); x += 80;
             doc.text(formatCurrency(f.totalrogers), x, currentY + 6, { width: 90, align: "right" }); x += 90;
             doc.text(formatCurrency(f.totalinsumos), x, currentY + 6, { width: 90, align: "right" }); x += 90;
             doc.text(formatCurrency(f.totalomar), x, currentY + 6, { width: 90, align: "right" }); x += 90;
             
             doc.font('Helvetica-Bold')
                .text(formatCurrency(totalRow), x, currentY + 6, { width: (CONTENT_WIDTH - x + MARGIN - 10), align: "right" });
 
             currentY += 20;
         });
 
         // ================= 3. TABLA DE INSUMOS =================
         currentY += 30;
         currentY = checkPageBreak(currentY + 40);
 
         doc.fillColor(COLORS.primary).fontSize(12).font('Helvetica-Bold').text("DESGLOSE DE INSUMOS", MARGIN, currentY);
         currentY += 20;
 
         const colInsumos = [
             { name: "FACTURA", width: 70, align: "left" },
             { name: "FECHA", width: 80, align: "left" },
             { name: "DESCRIPCIÓN", width: 280, align: "left" },
             { name: "VALOR", width: 0, align: "right" }
         ];
 
         currentY = drawTableHeader(colInsumos, currentY);
 
         insumos.forEach((ins, i) => {
             currentY = checkPageBreak(currentY);
             if (currentY === 130) currentY = drawTableHeader(colInsumos, currentY);
 
             if (i % 2 === 0) doc.rect(MARGIN, currentY, CONTENT_WIDTH, 20).fill(COLORS.rowAlt);
 
             let x = MARGIN + 10;
             doc.fillColor(COLORS.textMain).fontSize(9).font('Helvetica');
             doc.text(ins.numerofactura, x, currentY + 6, { width: 70 }); x += 70;
             doc.text(formatDate(ins.fechaexp), x, currentY + 6, { width: 80 }); x += 80;
             
             const desc = ins.descripcion.length > 55 ? ins.descripcion.substring(0, 52) + "..." : ins.descripcion;
             doc.text(desc, x, currentY + 6, { width: 280 }); x += 280;
             doc.text(formatCurrency(ins.valor), x, currentY + 6, { width: (CONTENT_WIDTH - x + MARGIN - 10), align: "right" });
 
             currentY += 20;
         });
 
 
         doc.end();

    // Esperar a que se escriba el archivo
    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(fileName));
        writeStream.on('error', reject);
    });
};