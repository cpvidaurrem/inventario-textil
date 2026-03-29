const { Router } = require("express");
const {
  crearCaja,
  obtenerCajas,
  buscarCajas,
  registrarSalida,
  inventarioResumen,
} = require("../controllers/cajas.controller");

const router = Router();

router.post("/cajas", crearCaja);
router.get("/cajas", obtenerCajas);
router.get("/cajas/buscar", buscarCajas);
router.post("/salidas", registrarSalida);
router.get("/inventario", inventarioResumen);

module.exports = router;
