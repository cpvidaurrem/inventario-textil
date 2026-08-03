const pool = require("../db");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");

// ENTRADA
const registrarEntrada = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { codigo_color, color, cantidad, id_almacen, descripcion } = req.body;

    await client.query("BEGIN");
    let qrCodes = [];

    for (let i = 0; i < cantidad; i++) {
      const codigo_unico = uuidv4(); // Generar un código único para cada caja

      const result = await client.query(
        `INSERT INTO cajas (codigo_color, color, id_almacen, codigo_unico, descripcion)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, codigo_unico`,
        [codigo_color, color, id_almacen, codigo_unico, descripcion || null],
      );

      const caja = result.rows[0];

      // Generar QR (solo con codigo_unico)
      const qrImage = await QRCode.toDataURL(caja.codigo_unico);

      qrCodes.push({
        id: caja.id,
        codigo_unico: caja.codigo_unico,
        qr: qrImage,
        descripcion: descripcion || null,
      });

      // Registrar el movimiento de ESTA caja específica
      await client.query(
        `INSERT INTO movimientos (tipo, codigo_color, cantidad, id_almacen, caja_id, usuario_id)
         VALUES ('ENTRADA', $1, 1, $2, $3, $4)`,
        [codigo_color, id_almacen, caja.id, req.usuario.id],
      );
    }

    await client.query("COMMIT");

    res.json({
      mensaje: "Entrada registrada correctamente",
      qrCodes,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// SALIDA (CORREGIDA)
const registrarSalida = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { codigo_color, cantidad, id_almacen } = req.body;

    await client.query("BEGIN");

    // Buscar cajas SOLO del almacén seleccionado
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

    // Marcar cajas como retiradas y registrar el movimiento de cada una
    for (let caja of cajas.rows) {
      await client.query(
        `UPDATE cajas 
         SET estado = 'RETIRADO' 
         WHERE id = $1`,
        [caja.id],
      );

      await client.query(
        `INSERT INTO movimientos (tipo, codigo_color, cantidad, id_almacen, caja_id, usuario_id)
         VALUES ('SALIDA', $1, 1, $2, $3, $4)`,
        [codigo_color, id_almacen, caja.id, req.usuario.id],
      );
    }

    await client.query("COMMIT");

    res.json({ mensaje: "Salida registrada correctamente" });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// INVENTARIO
const inventarioResumen = async (req, res, next) => {
  try {
    const { almacen, color } = req.query;

    let query = `
      SELECT 
        codigo_color,
        color,
        id_almacen,
        COUNT(*) as total
      FROM cajas
      WHERE estado = 'DISPONIBLE'
    `;

    const values = [];

    if (almacen) {
      values.push(almacen);
      query += ` AND id_almacen = $${values.length}`;
    }

    if (color) {
      values.push(color);
      query += ` AND color = $${values.length}`;
    }

    query += ` GROUP BY codigo_color, color, id_almacen ORDER BY color`;

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// LISTAR ALMACENES (para poblar selects de filtro)
const listarAlmacenes = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre FROM almacenes ORDER BY id`,
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// LISTAR COLORES DISTINTOS CON STOCK DISPONIBLE (para poblar select de filtro)
const listarColores = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT color FROM cajas WHERE estado = 'DISPONIBLE' ORDER BY color`,
    );

    res.json(result.rows.map((row) => row.color));
  } catch (error) {
    next(error);
  }
};

// BUSCAR
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

// HISTORIAL (MEJORADO)
const historialMovimientos = async (req, res, next) => {
  try {
    const { almacen, fecha } = req.query;

    let query = `
      SELECT 
        m.id,
        m.tipo,
        m.codigo_color,
        m.cantidad,
        m.fecha,
        a.nombre AS almacen,
        c.descripcion,
        u.nombre_completo AS usuario
      FROM movimientos m
      LEFT JOIN almacenes a ON m.id_almacen = a.id
      LEFT JOIN cajas c ON m.caja_id = c.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1=1
    `;

    const values = [];

    if (almacen) {
      values.push(almacen);
      query += ` AND m.id_almacen = $${values.length}`;
    }

    if (fecha) {
      values.push(fecha);
      query += ` AND DATE(m.fecha) = $${values.length}`;
    }

    query += ` ORDER BY m.fecha DESC`;

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const escanearQR = async (req, res, next) => {
  try {
    const { codigo_unico } = req.body;

    if (!codigo_unico) {
      return res.status(400).json({ error: "codigo_unico requerido" });
    }

    const result = await pool.query(
      `SELECT 
        c.id,
        c.codigo_color,
        c.color,
        c.estado,
        c.codigo_unico,
        c.descripcion,
        a.nombre AS almacen
      FROM cajas c
      LEFT JOIN almacenes a ON c.id_almacen = a.id
      WHERE c.codigo_unico = $1`,
      [codigo_unico],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Caja no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const salidaPorQR = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { codigo_unico } = req.body;

    if (!codigo_unico) {
      return res.status(400).json({ error: "codigo_unico requerido" });
    }

    await client.query("BEGIN");

    // Buscar la caja
    const result = await client.query(
      `SELECT * FROM cajas WHERE codigo_unico = $1`,
      [codigo_unico],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Caja no encontrada" });
    }

    const caja = result.rows[0];

    if (caja.estado === "RETIRADO") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "La caja ya fue retirada" });
    }

    // Marcar como retirada
    await client.query(
      `UPDATE cajas 
       SET estado = 'RETIRADO' 
       WHERE codigo_unico = $1`,
      [codigo_unico],
    );

    // Registrar movimiento
    await client.query(
      `INSERT INTO movimientos (tipo, codigo_color, cantidad, id_almacen, caja_id, usuario_id)
       VALUES ('SALIDA', $1, 1, $2, $3, $4)`,
      [caja.codigo_color, caja.id_almacen, caja.id, req.usuario.id],
    );
    await client.query("COMMIT");

    res.json({
      mensaje: "Salida registrada correctamente",
      caja,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

const salidaMultipleQR = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { codigos_unicos } = req.body;

    if (!Array.isArray(codigos_unicos) || codigos_unicos.length === 0) {
      return res.status(400).json({ error: "Lista de codigos requerida" });
    }

    await client.query("BEGIN");

    const resultados = [];
    const errores = [];

    for (let codigo of codigos_unicos) {
      codigo = codigo.trim(); // (extra seguridad)

      const result = await client.query(
        `SELECT * FROM cajas WHERE codigo_unico = $1`,
        [codigo],
      );

      if (result.rows.length === 0) {
        errores.push({ codigo, error: "No encontrada" });
        continue;
      }

      const caja = result.rows[0];

      // VALIDACIÓN
      if (caja.estado !== "DISPONIBLE") {
        errores.push({
          codigo,
          error: `No disponible (estado actual: ${caja.estado})`,
        });
        continue;
      }

      // Actualizar estado
      await client.query(
        `UPDATE cajas SET estado = 'RETIRADO' WHERE codigo_unico = $1`,
        [codigo],
      );

      // Registrar el movimiento de ESTA caja específica
      await client.query(
        `INSERT INTO movimientos (tipo, codigo_color, cantidad, id_almacen, caja_id, usuario_id)
         VALUES ('SALIDA', $1, 1, $2, $3, $4)`,
        [caja.codigo_color, caja.id_almacen, caja.id, req.usuario.id],
      );

      resultados.push(codigo);
    }

    await client.query("COMMIT");

    res.json({
      mensaje: "Proceso completado",
      retiradas: resultados,
      errores,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  registrarEntrada,
  registrarSalida,
  inventarioResumen,
  buscarCajas,
  historialMovimientos,
  escanearQR,
  salidaPorQR,
  salidaMultipleQR,
  listarAlmacenes,
  listarColores,
};
