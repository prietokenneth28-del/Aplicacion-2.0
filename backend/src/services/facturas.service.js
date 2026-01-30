import { pool } from '../db.js';

export const crearFacturaInterna = async (datos) => {
    const client = await pool.connect();
    try {
        const {
            placa, numeroFactura, fechaFacturacion, fechaGarantia,
            garantia, incluyeRepuestos, servicios, repuestos, insumos, totales
        } = datos;

        await client.query("BEGIN");

        // Insertar Encabezado
        const facturaResult = await client.query(
            `INSERT INTO total_facturas (
                placa, fechaExp, fechaGarantia, totalRepuestos, totalServicios,
                totalInsumos, totalOmar, totalRogers, garantiaCondicion,
                repuestosCondicion, numeroFactura
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            [
                placa, fechaFacturacion, fechaGarantia, totales.totalRepuestos,
                totales.totalServicios, totales.totalInsumos, totales.totalOmar,
                totales.totalRogers, garantia, incluyeRepuestos, numeroFactura
            ]
        );

        const facturaId = facturaResult.rows[0].id;

        // Insertar Detalles
        const insertarDetalle = async (items, tipo) => {
            for (const item of items) {
                await client.query(
                    `INSERT INTO factura_detalle (factura_id, tipo, descripcion, valor)
                     VALUES ($1,$2,$3,$4)`,
                    [facturaId, tipo, item.desc, item.valor]
                );
            }
        };

        await insertarDetalle(servicios, "SERVICIO");
        await insertarDetalle(repuestos, "REPUESTO");
        await insertarDetalle(insumos, "INSUMO");

        await client.query("COMMIT");
        
        // Actualizar control
        await pool.query(
            `UPDATE control_facturas SET estado = 'FACTURADO' WHERE placa = $1 AND estado = 'PENDIENTE'`,
            [placa]
        );

        return facturaId;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};