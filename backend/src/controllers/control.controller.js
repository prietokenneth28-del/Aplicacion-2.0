import { pool } from "../db.js";

/* =====================================================
   CREAR / ACTUALIZAR CONTROL POR PLACA
===================================================== */
export const guardarControl = async (req, res) => {
    const client = await pool.connect();

    try {
        const { placa, servicios = [], repuestos = [], insumos = [] } = req.body;

        if (!placa) {
            return res.status(400).json({ message: "Placa requerida" });
        }

        await client.query("BEGIN");

        // 1️⃣ Verificar si existe control
        let controlRes = await client.query(
            `SELECT id FROM control_facturas WHERE placa = $1`,
            [placa]
        );

        let controlId;

        if (controlRes.rows.length === 0) {
            const insertRes = await client.query(
                `INSERT INTO control_facturas (placa)
                 VALUES ($1)
                 RETURNING id`,
                [placa]
            );
            controlId = insertRes.rows[0].id;
        } else {
            controlId = controlRes.rows[0].id;

            // Limpiar detalle previo
            await client.query(
                `DELETE FROM control_factura_detalle WHERE control_id = $1`,
                [controlId]
            );
        }

        // 2️⃣ Insertar detalle
        const insertarDetalle = async (items, tipo) => {
            for (const item of items) {
                await client.query(
                    `INSERT INTO control_factura_detalle
                     (control_id, tipo, descripcion, valor)
                     VALUES ($1,$2,$3,$4)`,
                    [controlId, tipo, item.desc, item.valor]
                );
            }
        };

        await insertarDetalle(servicios, "SERVICIO");
        await insertarDetalle(repuestos, "REPUESTO");
        await insertarDetalle(insumos, "INSUMO");

        await client.query("COMMIT");

        res.json({ message: "Control guardado correctamente" });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ message: "Error al guardar control" });
    } finally {
        client.release();
    }
};


export const obtenerControlPorPlaca = async (req, res) => {
    const { placa } = req.params;

    try {
        const controlRes = await pool.query(
            `SELECT id FROM control_facturas WHERE placa = $1`,
            [placa]
        );

        if (controlRes.rows.length === 0) {
            return res.status(404).json({ message: "Control no encontrado" });
        }

        const controlId = controlRes.rows[0].id;

        const detalleRes = await pool.query(
            `SELECT tipo, descripcion, valor
             FROM control_factura_detalle
             WHERE control_id = $1`,
            [controlId]
        );

        res.json(detalleRes.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener control" });
    }
};


export const generarFacturaDesdeControl = async (req, res) => {
    const { placa } = req.params;

    try {
        // 1️⃣ Cliente
        const clienteRes = await pool.query(
            `SELECT * FROM clientes WHERE placa = $1`,
            [placa]
        );

        if (clienteRes.rows.length === 0) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }

        // 2️⃣ Control
        const controlRes = await pool.query(
            `SELECT id FROM control_facturas WHERE placa = $1`,
            [placa]
        );

        if (controlRes.rows.length === 0) {
            return res.status(404).json({ message: "No hay control para esta placa" });
        }

        const controlId = controlRes.rows[0].id;

        // 3️⃣ Detalle
        const detalleRes = await pool.query(
            `SELECT tipo, descripcion, valor
             FROM control_factura_detalle
             WHERE control_id = $1`,
            [controlId]
        );

        const servicios = [];
        const repuestos = [];
        const insumos = [];

        detalleRes.rows.forEach(d => {
            const item = { desc: d.descripcion, valor: d.valor };
            if (d.tipo === "SERVICIO") servicios.push(item);
            if (d.tipo === "REPUESTO") repuestos.push(item);
            if (d.tipo === "INSUMO") insumos.push(item);
        });

        res.json({
            cliente: clienteRes.rows[0],
            servicios,
            repuestos,
            insumos
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al generar factura" });
    }
};


export const eliminarControl = async (req, res) => {
    const { placa } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM control_facturas WHERE placa = $1`,
            [placa]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Control no encontrado" });
        }

        res.json({ message: "Control eliminado" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al eliminar control" });
    }
};


export const resumenControl = async (req, res) => {
  const { placa } = req.params;

  const controlRes = await pool.query(
    `SELECT id, estado FROM control_facturas WHERE placa = $1`,
    [placa]
  );

    if (controlRes.rows.length === 0) {
    return res.json({ existe: false });
  }

  const controlId = controlRes.rows[0].id;

  const detalleRes = await pool.query(
    `SELECT tipo, descripcion, valor
     FROM control_factura_detalle
     WHERE control_id = $1`,
    [controlId]
  );

  res.json({
    existe: true,
    estado: controlRes.rows[0].estado,
    detalle: detalleRes.rows
  });
};


export const historialControles = async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      cf.placa,
      cf.estado,
      cf.fecha_creacion,
      c.nombre,
      c.marca,
      c.modelo
    FROM control_facturas cf
    JOIN clientes c ON c.placa = cf.placa
    ORDER BY cf.fecha_creacion DESC
  `);

  res.json(rows);
};


export const obtenerControlEditable = async (req, res) => {
    const { placa } = req.params;

    // 1️⃣ Control
    const controlRes = await pool.query(
        `SELECT id, estado
         FROM control_facturas
         WHERE placa = $1`,
        [placa]
    );

    if (controlRes.rows.length === 0) {
        return res.status(404).json({ message: "Control no existe" });
    }

    const { id: controlId, estado } = controlRes.rows[0];

    // 2️⃣ Cliente
    const clienteRes = await pool.query(
        `SELECT *
         FROM clientes
         WHERE placa = $1`,
        [placa]
    );

    // 3️⃣ Detalle
    const detalleRes = await pool.query(
        `SELECT tipo, descripcion, valor
         FROM control_factura_detalle
         WHERE control_id = $1`,
        [controlId]
    );

    res.json({
        estado,
        cliente: clienteRes.rows[0],
        detalle: detalleRes.rows
    });
};
