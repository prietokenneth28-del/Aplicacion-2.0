import jwt from "jsonwebtoken";

export const login = (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({
            message: "Usuario y contraseña requeridos"
        });
    }

    const usuarios = [
        {
            user: process.env.USER_1_NAME,
            pass: process.env.USER_1_PASS
        },
        {
            user: process.env.USER_2_NAME,
            pass: process.env.USER_2_PASS
        }
    ];

    const valido = usuarios.find(
        u => u.user === usuario && u.pass === password
    );

    if (!valido) {
        return res.status(401).json({
            message: "Credenciales incorrectas"
        });
    }

    const token = jwt.sign(
        { usuario },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
    );

    res.json({
        message: "Login correcto",
        token
    });
};
