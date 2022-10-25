const express = require("express");
const app = express();

const colors = require("./loaders/colors");
const config = require("./config/config");

require("dotenv").config();
require("./loaders/morgan")(app);
require("./loaders/cors")(app);
require("./loaders/routes")(app);

app.get("/", (req, res) => {
  res.send("initial route running");
});

async function startServer() {
  app
    .listen(config.PORT, () => {
      console.log(
        colors.fg.cyan,
        `
      ########################################
      🛡️  Server is listening on port: ${config.PORT}  🛡️
      ########################################
      `,
        colors.reset
      );
    })
    .on("error", (err) => {
      console.log("Server Starting Error: ", err);
      process.exit(1);
    });
}

startServer();
