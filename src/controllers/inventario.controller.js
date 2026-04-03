const pool = require("../db");

// 📥 ENTRADA
const registrarEntrada = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { codigo_color, color, cantidad, id_almacen } = req.body;

    await client.query("BEGIN");

    for (let i = 0; i < cantidad; i++) {
      await client.query(
        `INSERT INTO cajas (codigo_color, color, id_almacen)
         VALUES ($1, $2, $3)`,
        [codigo_color, color, id_almacen],
      );
    }

    await client.query(
      `INSERT INTO movimientos (tipo, codigo_color, cantidad, id_almacen)
       VALUES ('ENTRADA', $1, $2, $3)`,
      [codigo_color, cantidad, id_almacen],
    );

    await client.query("COMMIT");

    res.json({ mensaje: "Entrada registrada correctamente" });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// 📤 SALIDA (CORREGIDA)
const registrarSalida = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { codigo_color, cantidad, id_almacen } = req.body;

    await client.query("BEGIN");

    // 🔍 Buscar cajas SOLO del almacén seleccionado
    const cajas = await client.query(
      `SELECT id FROM cajas 
       WHERE codigo_color = $1 
       AND id_almacen = $2
       AND estado = 'DISPONIBLE'
       LIMIT $3`,
      [codigo_color, id_almacen, cantidad],
    );

    if (cajas.rows.length < cantidad) {
      return res.status(400).json({
        error: "Stock insuficiente en este almacén",
      });
    }

    // 🔄 Marcar cajas como retiradas
    for (let caja of cajas.rows) {
      await client.query(
        `UPDATE cajas 
         SET estado = 'RETIRADO' 
         WHERE id = $1`,
        [caja.id],
      );
    }

    // 📝 Registrar movimiento CON almacén
    await client.query(
      `INSERT INTO movimientos (tipo, codigo_color, cantidad, id_almacen)
       VALUES ('SALIDA', $1, $2, $3)`,
      [codigo_color, cantidad, id_almacen],
    );

    await client.query("COMMIT");

    res.json({ mensaje: "Salida registrada correctamente" });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// 📊 INVENTARIO
const inventarioResumen = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        codigo_color,
        color,
        id_almacen,
        COUNT(*) as total
      FROM cajas
      WHERE estado = 'DISPONIBLE'
      GROUP BY codigo_color, color, id_almacen
      ORDER BY color
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// 🔍 BUSCAR
const buscarCajas = async (req, res, next) => {
  try {
    const { codigo, color } = req.query;

    let query = `
      SELECT c.id, c.codigo_color, c.color, a.nombre AS almacen, c.estado
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
    next(error);
  }
};

// 📜 HISTORIAL (MEJORADO)
const historialMovimientos = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id,
        m.tipo,
        m.codigo_color,
        m.cantidad,
        m.fecha,
        a.nombre AS almacen
      FROM movimientos m
      LEFT JOIN almacenes a ON m.id_almacen = a.id
      ORDER BY m.fecha DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registrarEntrada,
  registrarSalida,
  inventarioResumen,
  buscarCajas,
  historialMovimientos,
};
