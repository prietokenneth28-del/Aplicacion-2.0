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
        /* ================= FACTURAS ================= */
        const facturasRes = await pool.query(`
            SELECT
                numeroFactura,
                fechaExp,
                totalRogers,
                totalInsumos,
                totalOmar
            FROM total_facturas
            WHERE fechaExp BETWEEN $1 AND $2
            ORDER BY fechaExp ASC
        `, [desde, hasta]);

        /* ================= TOTALES ================= */
        const totalesRes = await pool.query(`
            SELECT
                COALESCE(SUM(totalRogers),0)  AS total_rogers,
                COALESCE(SUM(totalInsumos),0) AS total_insumos,
                COALESCE(SUM(totalOmar),0)    AS total_omar
            FROM total_facturas
            WHERE fechaExp BETWEEN $1 AND $2
        `, [desde, hasta]);

        /* ================= INSUMOS ================= */
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

        const facturas = facturasRes.rows;
        const totales = totalesRes.rows[0];
        const insumos = insumosRes.rows;

        /* ================= PDF ================= */
        const doc = new PDFDocument({ margin: 40, size: "A4" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename=resumen_contable_${desde}_a_${hasta}.pdf`
        );

        doc.pipe(res);

        /* =====================================================
           TÍTULO
        ===================================================== */
        doc
            .fontSize(18)
            .text("RESUMEN CONTABLE", { align: "center" })
            .moveDown(0.5);

        doc
            .fontSize(11)
            .text(`Periodo: ${desde} a ${hasta}`, { align: "center" })
            .moveDown(2);

        /* =====================================================
           TABLA RESUMEN FACTURAS
        ===================================================== */
        doc.fontSize(14).text("Resumen de facturas");
        doc.moveDown(1);

        const colFactura = 40;
        const colFecha = 110;
        const colRogers = 220;
        const colInsumos = 320;
        const colOmar = 430;

        let y = doc.y;

        doc.fontSize(10)
            .text("Factura", colFactura, y)
            .text("Fecha", colFecha, y)
            .text("Rogers", colRogers, y)
            .text("Insumos", colInsumos, y)
            .text("Omar", colOmar, y);

        y += 15;
        doc.moveTo(40, y).lineTo(550, y).stroke();
        y += 5;

        facturas.forEach(f => {
            if (y > 720) {
                doc.addPage();
                y = 60;
            }

            doc.fontSize(9)
                .text(f.numerofactura, colFactura, y)
                .text(f.fechaexp.toISOString().split("T")[0], colFecha, y)
                .text(`$ ${Number(f.totalrogers).toLocaleString("es-CO")}`, colRogers, y)
                .text(`$ ${Number(f.totalinsumos).toLocaleString("es-CO")}`, colInsumos, y)
                .text(`$ ${Number(f.totalomar).toLocaleString("es-CO")}`, colOmar, y);

            y += 18;
        });

        /* ================= TOTALES ================= */
        doc.moveDown(2);
        doc.fontSize(12)
            .text(`TOTAL ROGERS: $ ${Number(totales.total_rogers).toLocaleString("es-CO")}`, { align: "right" })
            .text(`TOTAL INSUMOS: $ ${Number(totales.total_insumos).toLocaleString("es-CO")}`, { align: "right" })
            .text(`TOTAL OMAR: $ ${Number(totales.total_omar).toLocaleString("es-CO")}`, { align: "right" });

        /* =====================================================
           NUEVA PÁGINA – DETALLE DE INSUMOS
        ===================================================== */
        doc.addPage();

        doc.fontSize(16).text("Detalle de insumos", { align: "center" });
        doc.moveDown(1);

        const colIFactura = 40;
        const colIFecha = 100;
        const colIDesc = 200;
        const colIValor = 460;

        y = doc.y;

        doc.fontSize(10)
            .text("Factura", colIFactura, y)
            .text("Fecha", colIFecha, y)
            .text("Descripción", colIDesc, y)
            .text("Valor", colIValor, y, { align: "right" });

        y += 15;
        doc.moveTo(40, y).lineTo(550, y).stroke();
        y += 5;

        let totalInsumos = 0;

        insumos.forEach(i => {
            if (y > 720) {
                doc.addPage();
                y = 60;
            }

            totalInsumos += Number(i.valor);

            doc.fontSize(9)
                .text(i.numerofactura, colIFactura, y)
                .text(i.fechaexp.toISOString().split("T")[0], colIFecha, y)
                .text(i.descripcion, colIDesc, y, { width: 240 })
                .text(
                    `$ ${Number(i.valor).toLocaleString("es-CO")}`,
                    colIValor,
                    y,
                    { align: "right" }
                );

            y += 18;
        });

        doc.moveDown(2);
        doc.fontSize(12)
            .text(
                `TOTAL INSUMOS: $ ${totalInsumos.toLocaleString("es-CO")}`,
                { align: "right" }
            );

        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error al exportar resumen contable"
        });
    }
};

