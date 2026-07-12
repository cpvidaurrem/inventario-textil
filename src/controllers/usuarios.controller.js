const pool = require("../db");
const bcrypt = require("bcrypt");

const ROLES_VALIDOS = ["ALMACEN", "ADMINISTRATIVO", "ADMIN"];

// Genera una contraseña aleatoria de 8 caracteres (minúsculas y números)
const generarPasswordAleatoria = () => {
  const caracteres = "abcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";

  for (let i = 0; i < 8; i++) {
    const indice = Math.floor(Math.random() * caracteres.length);
    password += caracteres[indice];
  }

  return password;
};

// LISTAR USUARIOS
const listarUsuarios = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre_completo, email, celular, rol, activo, fecha_creacion
       FROM usuarios
       ORDER BY fecha_creacion DESC`,
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// CREAR USUARIO
const crearUsuario = async (req, res, next) => {
  try {
    const { nombre_completo, email, celular, rol } = req.body;

    if (
      !nombre_completo?.trim() ||
      !email?.trim() ||
      !celular?.trim() ||
      !rol
    ) {
      return res.status(400).json({
        error: "Todos los campos son obligatorios",
      });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const passwordGenerada = generarPasswordAleatoria();
    const password_hash = await bcrypt.hash(passwordGenerada, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (nombre_completo, email, password_hash, celular, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre_completo, email, celular, rol, activo, fecha_creacion`,
      [nombre_completo, email, password_hash, celular, rol],
    );

    const usuarioCreado = result.rows[0];

    res.status(201).json({
      mensaje: "Usuario creado correctamente",
      usuario: usuarioCreado,
      passwordGenerada,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Ese email ya está en uso por otro usuario",
      });
    }
    next(error);
  }
};

// EDITAR USUARIO
const editarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre_completo, email, celular, rol } = req.body;

    if (
      !nombre_completo?.trim() ||
      !email?.trim() ||
      !celular?.trim() ||
      !rol
    ) {
      return res.status(400).json({
        error: "Todos los campos son obligatorios",
      });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    // Bloquear que un usuario cambie su propio rol
    if (req.usuario.id === parseInt(id, 10) && rol !== req.usuario.rol) {
      return res.status(400).json({
        error: "No puedes cambiar tu propio rol",
      });
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET nombre_completo = $1, email = $2, celular = $3, rol = $4
       WHERE id = $5
       RETURNING id, nombre_completo, email, celular, rol, activo, fecha_creacion`,
      [nombre_completo, email, celular, rol, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      mensaje: "Usuario actualizado correctamente",
      usuario: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Ese email ya está en uso por otro usuario",
      });
    }
    next(error);
  }
};

// CAMBIAR ESTADO (ACTIVAR/DESACTIVAR)
const cambiarEstadoUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== "boolean") {
      return res.status(400).json({
        error: "El campo 'activo' es obligatorio y debe ser true o false",
      });
    }

    // Bloquear que un usuario se desactive a sí mismo
    if (req.usuario.id === parseInt(id, 10) && activo === false) {
      return res.status(400).json({
        error: "No puedes desactivar tu propio usuario",
      });
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET activo = $1
       WHERE id = $2
       RETURNING id, nombre_completo, email, celular, rol, activo, fecha_creacion`,
      [activo, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      mensaje: "Estado actualizado correctamente",
      usuario: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// REGENERAR CONTRASEÑA
const regenerarPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const passwordGenerada = generarPasswordAleatoria();
    const password_hash = await bcrypt.hash(passwordGenerada, 10);

    const result = await pool.query(
      `UPDATE usuarios
       SET password_hash = $1
       WHERE id = $2
       RETURNING id, nombre_completo, email, celular, rol, activo, fecha_creacion`,
      [password_hash, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      mensaje: "Contraseña regenerada correctamente",
      usuario: result.rows[0],
      passwordGenerada,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  cambiarEstadoUsuario,
  regenerarPassword,
};
