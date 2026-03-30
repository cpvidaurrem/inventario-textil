module.exports = (err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: "Error interno del servidor",
    detalle: err.message,
  });
};
