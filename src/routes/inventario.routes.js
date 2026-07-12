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
const verificarToken = require("../middlewares/auth.middleware");
const verificarRol = require("../middlewares/rol.middleware");

const router = Router();

// rutas
router.post(
  "/entrada",
  verificarToken,
  verificarRol(["ALMACEN", "ADMIN"]),
  registrarEntrada,
);
router.post(
  "/salida",
  verificarToken,
  verificarRol(["ALMACEN", "ADMIN"]),
  registrarSalida,
);
router.get(
  "/inventario",
  verificarToken,
  verificarRol(["ALMACEN", "ADMINISTRATIVO", "ADMIN"]),
  inventarioResumen,
);
router.get(
  "/buscar",
  verificarToken,
  verificarRol(["ALMACEN", "ADMINISTRATIVO", "ADMIN"]),
  buscarCajas,
);
router.get(
  "/historial",
  verificarToken,
  verificarRol(["ALMACEN", "ADMINISTRATIVO", "ADMIN"]),
  historialMovimientos,
);
router.post(
  "/escanear",
  verificarToken,
  verificarRol(["ALMACEN", "ADMINISTRATIVO", "ADMIN"]),
  escanearQR,
);
router.post(
  "/salida-qr",
  verificarToken,
  verificarRol(["ALMACEN", "ADMIN"]),
  salidaPorQR,
);
router.post(
  "/salida-multiple-qr",
  verificarToken,
  verificarRol(["ALMACEN", "ADMIN"]),
  salidaMultipleQR,
);
router.get(
  "/almacenes",
  verificarToken,
  verificarRol(["ALMACEN", "ADMINISTRATIVO", "ADMIN"]),
  listarAlmacenes,
);
router.get(
  "/colores",
  verificarToken,
  verificarRol(["ALMACEN", "ADMINISTRATIVO", "ADMIN"]),
  listarColores,
);

module.exports = router;
