import {pool} from '../db.js';


export const getUsers = async (req, res) => {
    const {rows} = await pool.query('SELECT * FROM clientes')
    res.json(rows)
};

export const getUser = async(req, res) => {
    const { placa } = req.params;
    const {rows} = await pool.query(`
        SELECT id, nombre, placa, INITCAP(marca) as marca, modelo, año, telefono 
        FROM clientes 
        WHERE placa = $1
    `,[placa])

    if(rows.length === 0){
        return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json(rows[0]);
};

export const createUser = async (req, res) => {
    try {
        const { placa, marca, modelo, año, nombre, telefono } = req.body;

        await pool.query(
            `
            INSERT INTO clientes (placa, marca, modelo, año, nombre, telefono)
            VALUES ($1,$2,$3,$4,$5,$6)
            `,
            [placa, marca, modelo, año, nombre, telefono]
        );

        res.status(201).json({
            message: "Cliente registrado correctamente"
        });

    } catch (error) {

        // 🔴 PLACA DUPLICADA
        if (error.code === "23505") {
            return res.status(409).json({
                message: "La placa ya existe en el sistema"
            });
        }

        console.error(error);
        res.status(500).json({
            message: "Error interno al registrar el cliente"
        });
    }
};


export const deleteUser = async(req, res) => {
    const { placa } = req.params;
    const {rows} = await pool.query('DELETE FROM clientes WHERE placa = $1 RETURNING *',[placa])
    var rowCount = rows.length;
    if(rowCount===0){
        return res.status(404).json({ message: "Cliente no encontrado" });
    }
     res.json({ message: "Cliente Eliminado" });
}

export const editUser = async (req, res) => {
    const { placa } = req.params;
    const data = req.body;

    const telefono = data.telefono === "" ? null : data.telefono;
    const año = data.año === "" ? null : data.año;

    const result = await pool.query(
        `UPDATE clientes 
         SET modelo = $2, nombre = $3, telefono = $4, marca = $5, año = $6 
         WHERE placa = $1 
         RETURNING *`,
        [placa, data.modelo, data.nombre, telefono, data.marca, año]
    );

    if (result.rowCount === 0) {
        return res.status(404).json({ message: "Cliente no encontrado" });
    }

    res.json({
        message: "Cliente actualizado correctamente",
        cliente: result.rows[0]
    });
};
