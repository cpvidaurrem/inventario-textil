const pool = require("../db");

const crearCaja = async (req, res) => {
  try {
    const { codigo_color, color, id_almacen } = req.body;

    const result = await pool.query(
      "INSERT INTO cajas (codigo_color, color, id_almacen) VALUES ($1, $2, $3) RETURNING *",
      [codigo_color, color, id_almacen],
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear caja" });
  }
};

const obtenerCajas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.codigo_color, c.color, a.nombre AS almacen, c.fecha_registro
      FROM cajas c
      JOIN almacenes a ON c.id_almacen = a.id
      ORDER BY c.id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener cajas" });
  }
};

const buscarCajas = async (req, res) => {
  try {
    const { codigo, color } = req.query;

    let query = `
      SELECT c.id, c.codigo_color, c.color, a.nombre AS almacen
      FROM cajas c
      JOIN almacenes a ON c.id_almacen = a.id
      WHERE 1=1
    `;

    const values = [];

    if (codigo) {
      values.push(`%${codigo}%`);
      query += ` AND c.codigo_color ILIKE $${values.length}`;
    }

    if (color) {
      values.push(`%${color}%`);
      query += ` AND c.color ILIKE $${values.length}`;
    }

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en búsqueda" });
  }
};

const registrarSalida = async (req, res) => {
  try {
    const { codigo_color, cantidad } = req.body;

    // Ver cuántas cajas existen
    const cajas = await pool.query(
      "SELECT * FROM cajas WHERE codigo_color = $1 LIMIT $2",
      [codigo_color, cantidad],
    );

    if (cajas.rows.length < cantidad) {
      return res.status(400).json({ error: "No hay suficientes cajas" });
    }

    // Eliminar las cajas (simula salida)
    for (let caja of cajas.rows) {
      await pool.query("DELETE FROM cajas WHERE id = $1", [caja.id]);
    }

    res.json({ mensaje: "Salida registrada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar salida" });
  }
};

const inventarioResumen = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        codigo_color,
        color,
        id_almacen,
        COUNT(*) as total_cajas
      FROM cajas
      GROUP BY codigo_color, color, id_almacen
      ORDER BY color
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en inventario" });
  }
};

module.exports = { crearCaja, obtenerCajas, buscarCajas, registrarSalida, inventarioResumen };
