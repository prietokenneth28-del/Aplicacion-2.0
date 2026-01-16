import {pool} from '../db.js';
import { generarFacturaPDF } from "../services/facturaPdf.service.js";

export const getFacturaCompleta = async (req, res) => {
    const { numeroFactura } = req.params;
    
    try {
        // 1️⃣ Factura
        const facturaRes = await pool.query(`
            SELECT *
            FROM total_facturas
            WHERE numeroFactura = $1
        `, [numeroFactura]);

        if (facturaRes.rows.length === 0) {
            return res.status(404).json({ message: "Factura no encontrada" });
        }

        const factura = facturaRes.rows[0];

        // 2️⃣ Cliente
        const clienteRes = await pool.query(`
            SELECT nombre, placa, marca, modelo, telefono
            FROM clientes
            WHERE placa = $1
        `, [factura.placa]);

        const cliente = clienteRes.rows[0];

        // 3️⃣ Detalle
        const detalleRes = await pool.query(`
            SELECT tipo, descripcion, valor
            FROM factura_detalle
            WHERE factura_id = $1
        `, [factura.id]);

        // 4️⃣ RESPUESTA COMPLETA
        res.json({
            numerofactura: factura.numerofactura,
            fechaexp: factura.fechaexp,
            placa: factura.placa,
            cliente,
            detalle: detalleRes.rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error al obtener factura completa"
        });
    }
};



export const getNextFacturaNumber = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT COALESCE(MAX(numeroFactura), 0) + 1 AS next_factura
            FROM total_facturas
        `);

        res.json({ nextFactura: rows[0].next_factura });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener número de factura" });
    }
};


export const crearFactura = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            placa,
            numeroFactura,
            fechaFacturacion,
            fechaGarantia,
            garantia,
            incluyeRepuestos,
            servicios,
            repuestos,
            insumos,
            totales
        } = req.body;

        if (
            !placa ||
            !numeroFactura ||
            !fechaFacturacion ||
            !Array.isArray(servicios) 
        ) {
            return res.status(400).json({
                message: "Datos de factura incompletos"
            });
        }

        await client.query("BEGIN");

        // 1️⃣ Encabezado
        const facturaResult = await client.query(
            `
            INSERT INTO total_facturas (
                placa,
                fechaExp,
                fechaGarantia,
                totalRepuestos,
                totalServicios,
                totalInsumos,
                totalOmar,
                totalRogers,
                garantiaCondicion,
                repuestosCondicion,
                numeroFactura
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING id
            `,
            [
                placa,
                fechaFacturacion,
                fechaGarantia,
                totales.totalRepuestos,
                totales.totalServicios,
                totales.totalInsumos,
                totales.totalOmar,
                totales.totalRogers,
                garantia,
                incluyeRepuestos,
                numeroFactura
            ]
        );

        const facturaId = facturaResult.rows[0].id;

        // 2️⃣ Detalle
        const insertarDetalle = async (items, tipo) => {
            for (const item of items) {
                await client.query(
                    `
                    INSERT INTO factura_detalle (
                        factura_id,
                        tipo,
                        descripcion,
                        valor
                    )
                    VALUES ($1,$2,$3,$4)
                    `,
                    [facturaId, tipo, item.desc, item.valor]
                );
            }
        };

        await insertarDetalle(servicios, "SERVICIO");
        await insertarDetalle(repuestos, "REPUESTO");
        await insertarDetalle(insumos, "INSUMO");

        await client.query("COMMIT");

        
        await pool.query(
            `UPDATE control_facturas
            SET estado = 'FACTURADO'
            WHERE placa = $1
            AND estado = 'PENDIENTE'`,
            [placa]
        );
        res.status(201).json({
            message: "Factura guardada correctamente",
            facturaId
        });

    } catch (error) {
        await client.query("ROLLBACK");

        // Error por duplicado de numeroFactura
        if (error.code === "23505") {
            return res.status(409).json({
                message: "El número de factura ya existe"
            });
        }

        console.error(error);
        res.status(500).json({ message: "Error al guardar la factura" });

    } finally {
        client.release();
    }
};

export const editarFacturaCompleta = async (req, res) => {
    const { numeroFactura } = req.params;
    const client = await pool.connect();

    try {
        const {
            placa,
            fechaFacturacion,
            fechaGarantia,
            garantia,
            incluyeRepuestos,
            servicios = [],
            repuestos = [],
            insumos = [],
            totales
        } = req.body;

        await client.query("BEGIN");

        // 1️⃣ Obtener ID de factura
        const facturaRes = await client.query(
            `SELECT id FROM total_facturas WHERE numeroFactura = $1`,
            [numeroFactura]
        );

        if (facturaRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Factura no encontrada" });
        }

        const facturaId = facturaRes.rows[0].id;

        // 2️⃣ Actualizar encabezado
        await client.query(
            `
            UPDATE total_facturas SET
                placa = $1,
                fechaExp = $2,
                fechaGarantia = $3,
                totalRepuestos = $4,
                totalServicios = $5,
                totalInsumos = $6,
                totalOmar = $7,
                totalRogers = $8,
                garantiaCondicion = $9,
                repuestosCondicion = $10
            WHERE numeroFactura = $11
            `,
            [
                placa,
                fechaFacturacion,
                fechaGarantia,
                totales.totalRepuestos,
                totales.totalServicios,
                totales.totalInsumos,
                totales.totalOmar,
                totales.totalRogers,
                garantia,
                incluyeRepuestos,
                numeroFactura
            ]
        );

        // 3️⃣ Eliminar detalle anterior
        await client.query(
            `DELETE FROM factura_detalle WHERE factura_id = $1`,
            [facturaId]
        );

        // 4️⃣ Insertar nuevo detalle
        const insertarDetalle = async (items, tipo) => {
            for (const item of items) {
                await client.query(
                    `
                    INSERT INTO factura_detalle
                        (factura_id, tipo, descripcion, valor)
                    VALUES ($1, $2, $3, $4)
                    `,
                    [facturaId, tipo, item.desc, item.valor]
                );
            }
        };

        await insertarDetalle(servicios, "SERVICIO");
        await insertarDetalle(repuestos, "REPUESTO");
        await insertarDetalle(insumos, "INSUMO");

        await client.query("COMMIT");

        res.json({ message: "Factura actualizada correctamente" });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ message: "Error al actualizar factura" });
    } finally {
        client.release();
    }
};

export const eliminarFacturaCompleta = async (req, res) => {
    const { numeroFactura } = req.params;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1️⃣ Obtener ID de la factura
        const facturaRes = await client.query(
            `SELECT id FROM total_facturas WHERE numeroFactura = $1`,
            [numeroFactura]
        );

        if (facturaRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Factura no encontrada" });
        }

        const facturaId = facturaRes.rows[0].id;

        // 2️⃣ Eliminar detalle
        await client.query(
            `DELETE FROM factura_detalle WHERE factura_id = $1`,
            [facturaId]
        );

        // 3️⃣ Eliminar encabezado
        await client.query(
            `DELETE FROM total_facturas WHERE id = $1`,
            [facturaId]
        );

        await client.query("COMMIT");

        res.json({ message: "Factura eliminada correctamente" });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ message: "Error al eliminar factura" });
    } finally {
        client.release();
    }
};


export const exportarFacturaPDF = async (req, res) => {
    const { numeroFactura } = req.params;

    try {
        const facturaRes = await pool.query(
            `SELECT * FROM total_facturas WHERE numeroFactura = $1`,
            [numeroFactura]
        );

        if (facturaRes.rows.length === 0) {
            return res.status(404).json({ message: "Factura no encontrada" });
        }

        const factura = facturaRes.rows[0];

        const clienteRes = await pool.query(
            `SELECT * FROM clientes WHERE placa = $1`,
            [factura.placa]
        );

        const detalleRes = await pool.query(
            `SELECT tipo, descripcion, valor FROM factura_detalle WHERE factura_id = $1`,
            [factura.id]
        );

        generarFacturaPDF(
            factura,
            clienteRes.rows[0],
            detalleRes.rows,
            res
        );

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al generar PDF" });
    }
};

export const resumenFacturasPorFecha = async (req, res) => {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
        return res.status(400).json({
            message: "Debe especificar fecha desde y hasta"
        });
    }

    try {
        // ---------------- FACTURAS RESUMEN ----------------
        const facturasRes = await pool.query(`
            SELECT
                tf.numeroFactura,
                tf.fechaExp,
                tf.totalInsumos,
                tf.totalOmar,
                tf.totalRogers
            FROM total_facturas tf
            WHERE tf.fechaExp BETWEEN $1 AND $2
            ORDER BY tf.numeroFactura ASC
        `, [desde, hasta]);

        // ---------------- TOTALES ----------------
        const totalesRes = await pool.query(`
            SELECT
                COALESCE(SUM(totalInsumos),0) AS total_insumos,
                COALESCE(SUM(totalOmar),0)    AS total_omar,
                COALESCE(SUM(totalRogers),0)  AS total_rogers
            FROM total_facturas
            WHERE fechaExp BETWEEN $1 AND $2
        `, [desde, hasta]);

        // ---------------- INSUMOS ----------------
        const insumosRes = await pool.query(`
            SELECT
                tf.numeroFactura,
                tf.fechaExp,
                fd.descripcion,
                fd.valor
            FROM factura_detalle fd
            JOIN total_facturas tf ON tf.id = fd.factura_id
            WHERE fd.tipo = 'INSUMO'
              AND tf.fechaExp BETWEEN $1 AND $2
            ORDER BY tf.fechaExp ASC
        `, [desde, hasta]);

        res.json({
            totales: totalesRes.rows[0],
            facturas: facturasRes.rows,
            insumos: insumosRes.rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error al generar resumen contable"
        });
    }
};


export const exportarInsumosPDF = async (req, res) => {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
        return res.status(400).json({
            message: "Debe especificar fecha desde y hasta"
        });
    }

    try {
        const insumosRes = await pool.query(`
            SELECT
                tf.numeroFactura,
                tf.fechaExp,
                fd.descripcion,
                fd.valor
            FROM factura_detalle fd
            JOIN total_facturas tf ON tf.id = fd.factura_id
            WHERE fd.tipo = 'INSUMO'
              AND tf.fechaExp BETWEEN $1 AND $2
            ORDER BY tf.fechaExp ASC
        `, [desde, hasta]);

        const insumos = insumosRes.rows;

        const totalInsumos = insumos.reduce(
            (acc, i) => acc + Number(i.valor), 0
        );

        // ---------------- PDF ----------------
        const doc = new PDFDocument({ margin: 40, size: "A4" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename=insumos_${desde}_a_${hasta}.pdf`
        );

        doc.pipe(res);

        // ---------- TÍTULO ----------
        doc
            .fontSize(18)
            .text("REPORTE DE INSUMOS", { align: "center" })
            .moveDown(0.5);

        doc
            .fontSize(11)
            .text(`Periodo: ${desde} a ${hasta}`, { align: "center" })
            .moveDown(2);

        // ---------- TABLA ----------
        const colFactura = 40;
        const colFecha = 110;
        const colDesc = 200;
        const colValor = 460;
        let y = doc.y;

        doc.fontSize(10)
            .text("Factura", colFactura, y)
            .text("Fecha", colFecha, y)
            .text("Descripción", colDesc, y)
            .text("Valor", colValor, y, { align: "right" });

        y += 15;
        doc.moveTo(40, y).lineTo(550, y).stroke();
        y += 5;

        insumos.forEach(i => {

            if (y > 720) {
                doc.addPage();
                y = 60;
            }

            doc.fontSize(9)
                .text(i.numerofactura, colFactura, y)
                .text(i.fechaexp.toISOString().split("T")[0], colFecha, y)
                .text(i.descripcion, colDesc, y, { width: 240 })
                .text(
                    `$ ${Number(i.valor).toLocaleString("es-CO")}`,
                    colValor,
                    y,
                    { align: "right" }
                );

            y += 18;
        });

        // ---------- TOTAL ----------
        doc.moveDown(2);

        doc
            .fontSize(12)
            .text(
                `TOTAL INSUMOS: $ ${totalInsumos.toLocaleString("es-CO")}`,
                { align: "right" }
            );

        doc.end();

        }catch (error) {
    console.error("ERROR PDF INSUMOS 👉", error);
    res.status(500).json({
        message: error.message
    });
}

};


import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// Configuración de rutas (para ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ... (Tus importaciones arriba se mantienen igual) ...

// ================= ESTILOS CORPORATIVOS MEJORADOS =================
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

export const exportarResumenContableCompletoPDF = async (req, res) => {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
        return res.status(400).json({ message: "Debe especificar fecha desde y hasta" });
    }

    try {
        // 1. CONSULTAS A BD (Sin cambios)
        const [facturasRes, totalesRes, insumosRes] = await Promise.all([
            pool.query(`
                SELECT numeroFactura, fechaExp, totalRogers, totalInsumos, totalOmar
                FROM total_facturas
                WHERE fechaExp BETWEEN $1 AND $2
                ORDER BY fechaExp ASC
            `, [desde, hasta]),
            
            pool.query(`
                SELECT 
                    COALESCE(SUM(totalRogers), 0)  AS total_rogers,
                    COALESCE(SUM(totalInsumos), 0) AS total_insumos,
                    COALESCE(SUM(totalOmar), 0)    AS total_omar,
                    COUNT(*)                       AS cantidad_facturas
                FROM total_facturas
                WHERE fechaExp BETWEEN $1 AND $2
            `, [desde, hasta]),
            
            pool.query(`
                SELECT tf.numeroFactura, tf.fechaExp, fd.descripcion, fd.valor
                FROM factura_detalle fd
                JOIN total_facturas tf ON tf.id = fd.factura_id
                WHERE fd.tipo = 'INSUMO' AND tf.fechaExp BETWEEN $1 AND $2
                ORDER BY tf.fechaExp ASC, fd.descripcion ASC
            `, [desde, hasta])
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

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=Resumen_Contable_${desde}_${hasta}.pdf`);

        doc.pipe(res);

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
        drawCard(MARGIN + (cardWidth + 10) * 3, "GRAN TOTAL", formatCurrency(totales.total_omar), "#059669");

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

    } catch (error) {
        console.error('Error al exportar resumen contable:', error);
        res.status(500).json({
            message: "Error al exportar resumen contable",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};