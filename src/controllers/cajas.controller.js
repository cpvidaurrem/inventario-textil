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

module.exports = { crearCaja };
