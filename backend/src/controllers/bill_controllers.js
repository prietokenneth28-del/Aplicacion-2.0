import {pool} from '../db.js';
import { generarFacturaPDF } from "../services/facturaPdf.service.js";
import PDFDocument from "pdfkit";






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
            ORDER BY tf.fechaExp ASC
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


export const exportarResumenContableCompletoPDF = async (req, res) => {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
        return res.status(400).json({
            message: "Debe especificar fecha desde y hasta"
        });
    }

    try {
        /* ================= CONSULTAS A LA BASE DE DATOS ================= */
        const [facturasRes, totalesRes, insumosRes] = await Promise.all([
            pool.query(`
                SELECT
                    numeroFactura,
                    fechaExp,
                    totalRogers,
                    totalInsumos,
                    totalOmar
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
                SELECT
                    tf.numeroFactura,
                    tf.fechaExp,
                    fd.descripcion,
                    fd.valor
                FROM factura_detalle fd
                JOIN total_facturas tf ON tf.id = fd.factura_id
                WHERE fd.tipo = 'INSUMO'
                  AND tf.fechaExp BETWEEN $1 AND $2
                ORDER BY tf.fechaExp ASC, fd.descripcion ASC
            `, [desde, hasta])
        ]);

        const facturas = facturasRes.rows;
        const totales = totalesRes.rows[0];
        const insumos = insumosRes.rows;

        /* ================= CONFIGURACIÓN PDF ================= */
        const doc = new PDFDocument({ 
            margin: 40, 
            size: "A4",
            bufferPages: true // Permite manejar números de página
        });

        // Configurar headers de respuesta
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename=Resumen_Contable_${desde}_${hasta}.pdf`
        );

        doc.pipe(res);

        /* ================= VARIABLES DE ESTILO ================= */
        const colores = {
            primario: '#2c3e50',
            secundario: '#34495e',
            acento: '#3498db',
            exito: '#27ae60',
            fondo: '#f8f9fa',
            borde: '#dee2e6'
        };

        let pageCount = 0;

        // Configurar fuentes (si tienes fuentes personalizadas)
        // doc.font('Helvetica-Bold');
        // doc.font('Helvetica');

        /* ================= FUNCIÓN PARA ENCABEZADO ================= */
        const drawHeader = (pageNumber) => {
            // Fondo del encabezado
            doc.rect(40, 20, 515, 60)
               .fill(colores.fondo);
            
            // Logo o nombre de la empresa (si tienes logo, puedes usar .image())
            doc.fillColor(colores.primario)
               .fontSize(16)
               .font('Helvetica-Bold')
               .text('NOMBRE DE LA EMPRESA', 50, 30);
            
            doc.fillColor(colores.secundario)
               .fontSize(10)
               .font('Helvetica')
               .text('Sistema de Gestión Contable', 50, 50);
            
            // Fecha de generación
            const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            doc.fillColor('#7f8c8d')
               .fontSize(9)
               .text(`Generado: ${fechaGeneracion}`, 400, 35, { align: 'right' })
               .text(`Página ${pageNumber}`, 400, 50, { align: 'right' });
            
            // Línea divisoria
            doc.moveTo(40, 85)
               .lineTo(555, 85)
               .lineWidth(1)
               .strokeColor(colores.borde)
               .stroke();
        };

        /* ================= FUNCIÓN PARA PIE DE PÁGINA ================= */
        const drawFooter = () => {
            const footerY = doc.page.height - 50;
            
            doc.moveTo(40, footerY)
               .lineTo(555, footerY)
               .lineWidth(0.5)
               .strokeColor(colores.borde)
               .stroke();
            
            doc.fillColor('#7f8c8d')
               .fontSize(8)
               .text('Documento confidencial - Uso interno', 40, footerY + 10)
               .text('© 2024 Nombre Empresa. Todos los derechos reservados.', 
                     400, footerY + 10, { align: 'right' });
        };

        /* ================= FUNCIÓN PARA DIBUJAR TABLA ================= */
        const drawTableHeader = (headers, positions, startY) => {
            doc.fillColor('#ffffff')
               .rect(40, startY, 515, 25)
               .fill();
            
            doc.fillColor(colores.primario)
               .fontSize(10)
               .font('Helvetica-Bold');
            
            headers.forEach((header, index) => {
                doc.text(header, positions[index], startY + 8);
            });
            
            // Línea inferior del encabezado
            doc.moveTo(40, startY + 25)
               .lineTo(555, startY + 25)
               .strokeColor(colores.primario)
               .stroke();
            
            return startY + 25;
        };

        /* ================= PÁGINA PRINCIPAL ================= */
        // Encabezado
        pageCount++;
        drawHeader(pageCount);

        // Título principal
        doc.moveDown(4);
        doc.fillColor(colores.primario)
           .fontSize(20)
           .font('Helvetica-Bold')
           .text('RESUMEN CONTABLE', { align: 'center' });
        
        doc.fillColor(colores.secundario)
           .fontSize(12)
           .text(`Período: ${formatearFecha(desde)} - ${formatearFecha(hasta)}`, { align: 'center' });
        
        doc.moveDown(2);

        /* ================= TARJETAS DE RESUMEN ================= */
        const tarjetaWidth = 170;
        const tarjetaHeight = 80;
        const startX = 45;
        
        // Tarjeta 1: Total Facturas
        doc.roundedRect(startX, doc.y, tarjetaWidth, tarjetaHeight, 5)
           .fill(colores.fondo);
        
        doc.fillColor(colores.primario)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('TOTAL FACTURAS', startX + 15, doc.y + 15);
        
        doc.fillColor(colores.acento)
           .fontSize(18)
           .text(totales.cantidad_facturas || 0, startX + 15, doc.y + 35);
        
        // Tarjeta 2: Total General
        doc.roundedRect(startX + tarjetaWidth + 10, doc.y, tarjetaWidth, tarjetaHeight, 5)
           .fill(colores.fondo);
        
        const totalGeneral = Number(totales.total_rogers) + 
                            Number(totales.total_insumos) + 
                            Number(totales.total_omar);
        
        doc.fillColor(colores.primario)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('TOTAL GENERAL', startX + tarjetaWidth + 25, doc.y + 15);
        
        doc.fillColor(colores.exito)
           .fontSize(18)
           .text(`$${totalGeneral.toLocaleString('es-CO')}`, 
                startX + tarjetaWidth + 25, doc.y + 35);
        
        doc.moveDown(6);

        /* ================= TABLA DE FACTURAS ================= */
        doc.fillColor(colores.primario)
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('DETALLE DE FACTURAS');
        
        doc.moveDown(0.5);
        
        const posicionesFacturas = [50, 120, 230, 340, 450];
        let y = drawTableHeader(
            ['FACTURA', 'FECHA', 'ROGERS', 'INSUMOS', 'OMAR'],
            posicionesFacturas,
            doc.y
        );
        
        doc.fontSize(9)
           .font('Helvetica');
        
        facturas.forEach((f, index) => {
            if (y > 650) {
                doc.addPage();
                pageCount++;
                drawHeader(pageCount);
                y = 100;
                y = drawTableHeader(
                    ['FACTURA', 'FECHA', 'ROGERS', 'INSUMOS', 'OMAR'],
                    posicionesFacturas,
                    y
                );
            }
            
            // Color de fondo alternado para filas
            if (index % 2 === 0) {
                doc.fillColor(colores.fondo)
                   .rect(40, y, 515, 20)
                   .fill();
            }
            
            doc.fillColor('#2c3e50')
               .text(f.numerofactura, posicionesFacturas[0], y + 5)
               .text(formatearFecha(f.fechaexp), posicionesFacturas[1], y + 5)
               .text(formatearMoneda(f.totalrogers), posicionesFacturas[2], y + 5)
               .text(formatearMoneda(f.totalinsumos), posicionesFacturas[3], y + 5)
               .text(formatearMoneda(f.totalomar), posicionesFacturas[4], y + 5);
            
            y += 20;
        });
        
        // Total después de la tabla
        doc.moveDown(1);
        doc.fillColor(colores.secundario)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text(`Total Rogers: ${formatearMoneda(totales.total_rogers)}`, { align: 'right' })
           .text(`Total Insumos: ${formatearMoneda(totales.total_insumos)}`, { align: 'right' })
           .text(`Total Omar: ${formatearMoneda(totales.total_omar)}`, { align: 'right' });
        
        // Línea de total general
        doc.moveDown(0.5);
        doc.strokeColor(colores.acento)
           .lineWidth(1)
           .moveTo(350, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        
        doc.fillColor(colores.primario)
           .fontSize(12)
           .text(`TOTAL GENERAL: ${formatearMoneda(totalGeneral)}`, { align: 'right' });

        /* ================= PÁGINA DE DETALLE DE INSUMOS ================= */
        if (insumos.length > 0) {
            doc.addPage();
            pageCount++;
            drawHeader(pageCount);
            
            doc.moveDown(4);
            doc.fillColor(colores.primario)
               .fontSize(18)
               .font('Helvetica-Bold')
               .text('DETALLE DE INSUMOS POR FACTURA', { align: 'center' });
            
            doc.fillColor(colores.secundario)
               .fontSize(11)
               .text(`Total de ítems: ${insumos.length}`, { align: 'center' });
            
            doc.moveDown(1);
            
            const posicionesInsumos = [50, 110, 180, 470];
            y = drawTableHeader(
                ['FACTURA', 'FECHA', 'DESCRIPCIÓN', 'VALOR'],
                posicionesInsumos,
                doc.y
            );
            
            let totalInsumos = 0;
            let currentFactura = '';
            
            insumos.forEach((i, index) => {
                if (y > 650) {
                    doc.addPage();
                    pageCount++;
                    drawHeader(pageCount);
                    y = 100;
                    y = drawTableHeader(
                        ['FACTURA', 'FECHA', 'DESCRIPCIÓN', 'VALOR'],
                        posicionesInsumos,
                        y
                    );
                }
                
                // Resaltar cambio de factura
                if (currentFactura !== i.numerofactura) {
                    currentFactura = i.numerofactura;
                    doc.fillColor('#e8f4f8')
                       .rect(40, y, 515, 20)
                       .fill();
                } else if (index % 2 === 0) {
                    doc.fillColor(colores.fondo)
                       .rect(40, y, 515, 20)
                       .fill();
                }
                
                totalInsumos += Number(i.valor);
                
                doc.fillColor('#2c3e50')
                   .fontSize(9)
                   .text(i.numerofactura, posicionesInsumos[0], y + 5)
                   .text(formatearFecha(i.fechaexp), posicionesInsumos[1], y + 5)
                   .text(i.descripcion, posicionesInsumos[2], y + 5, { width: 280 })
                   .text(formatearMoneda(i.valor), posicionesInsumos[3], y + 5, { align: 'right' });
                
                y += 20;
            });
            
            // Resumen de insumos
            doc.moveDown(1);
            doc.fillColor(colores.exito)
               .fontSize(12)
               .font('Helvetica-Bold')
               .text(`TOTAL INSUMOS: ${formatearMoneda(totalInsumos)}`, { align: 'right' });
        }

        /* ================= PIE DE PÁGINA FINAL ================= */
        drawFooter();

        doc.end();

    } catch (error) {
        console.error('Error al exportar resumen contable:', error);
        res.status(500).json({
            message: "Error al exportar resumen contable",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/* ================= FUNCIONES AUXILIARES ================= */
function formatearFecha(fecha) {
    if (!fecha) return '--/--/----';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatearMoneda(valor) {
    const numero = Number(valor) || 0;
    return `$${numero.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
}

