const { Router } = require("express");
const {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  cambiarEstadoUsuario,
  regenerarPassword,
} = require("../controllers/usuarios.controller");
const verificarToken = require("../middlewares/auth.middleware");
const verificarRol = require("../middlewares/rol.middleware");

const router = Router();

router.get(
  "/usuarios",
  verificarToken,
  verificarRol(["ADMIN"]),
  listarUsuarios,
);
router.post("/usuarios", verificarToken, verificarRol(["ADMIN"]), crearUsuario);
router.put(
  "/usuarios/:id",
  verificarToken,
  verificarRol(["ADMIN"]),
  editarUsuario,
);
router.patch(
  "/usuarios/:id/estado",
  verificarToken,
  verificarRol(["ADMIN"]),
  cambiarEstadoUsuario,
);
router.patch(
  "/usuarios/:id/password",
  verificarToken,
  verificarRol(["ADMIN"]),
  regenerarPassword,
);

module.exports = router;
