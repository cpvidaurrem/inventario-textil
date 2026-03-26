const express = require("express");
const cors = require("cors");
const cajasRoutes = require("./routes/cajas.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Inventario Textil funcionando");
});

app.use("/api", cajasRoutes);

module.exports = app;
