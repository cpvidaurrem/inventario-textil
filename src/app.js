const express = require("express");
const cors = require("cors");

const inventarioRoutes = require("./routes/inventario.routes");
const authRoutes = require("./routes/auth.routes");
const usuariosRoutes = require("./routes/usuarios.routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

// rutas
app.use("/api", inventarioRoutes);
app.use("/api", authRoutes);
app.use("/api", usuariosRoutes);

// prueba
app.get("/", (req, res) => {
  res.send("API Inventario Textil funcionando 🚀");
});

// middleware de errores
app.use(errorHandler);

module.exports = app;
