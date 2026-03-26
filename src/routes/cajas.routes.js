const { Router } = require("express");
const { crearCaja } = require("../controllers/cajas.controller");

const router = Router();

router.post("/cajas", crearCaja);

module.exports = router;
