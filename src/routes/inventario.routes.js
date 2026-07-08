const { Router } = require("express");
const {
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
} = require("../controllers/inventario.controller");

const router = Router();

// rutas
router.post("/entrada", registrarEntrada);
router.post("/salida", registrarSalida);
router.get("/inventario", inventarioResumen);
router.get("/buscar", buscarCajas);
router.get("/historial", historialMovimientos);
router.post("/escanear", escanearQR);
router.post("/salida-qr", salidaPorQR);
router.post("/salida-multiple-qr", salidaMultipleQR);
router.get("/almacenes", listarAlmacenes);
router.get("/colores", listarColores);

module.exports = router;
