const express = require("express");
const cors = require("cors");

const inventarioRoutes = require("./routes/inventario.routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

// rutas
app.use("/api", inventarioRoutes);

// prueba
app.get("/", (req, res) => {
  res.send("API Inventario Textil funcionando 🚀");
});

// middleware de errores
app.use(errorHandler);

module.exports = app;
