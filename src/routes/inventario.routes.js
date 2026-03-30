const { Router } = require("express");
const {
  registrarEntrada,
  registrarSalida,
  inventarioResumen,
  buscarCajas,
  historialMovimientos,
} = require("../controllers/inventario.controller");

const router = Router();

// rutas
router.post("/entrada", registrarEntrada);
router.post("/salida", registrarSalida);
router.get("/inventario", inventarioResumen);
router.get("/buscar", buscarCajas);
router.get("/historial", historialMovimientos);

module.exports = router;
