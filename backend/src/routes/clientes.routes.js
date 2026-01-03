import { Router } from "express";
import {
    getUsers,
    getUser,
    createUser,
    deleteUser,
    editUser
} from "../controllers/user_controllers.js";
import { verificarToken } from "../middlewares/auth.middleware.js";

const router = Router();

// LISTAR CLIENTES
router.get("", verificarToken, getUsers);

// BUSCAR POR PLACA
router.get("/placa/:placa", verificarToken, getUser);

// CREAR
router.post("", verificarToken, createUser);

// EDITAR
router.put("/placa/:placa", verificarToken, editUser);

// ELIMINAR
router.delete("/placa/:placa", verificarToken, deleteUser);

export default router;
