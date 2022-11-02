const express = require("express");
const app = express();
const axios = require("axios");
const crypto = require("crypto");

const colors = require("./loaders/colors");
const config = require("./config/config");

require("dotenv").config();
require("./loaders/morgan")(app);
require("./loaders/cors")(app);

app.get("/", (req, res) => {
  res.status(200).json({ status: "initial route running" });
});

app.post("/signature", async (req, res) => {
  try {
    const { data, passPhrase } = req.body;
    // Create parameter string
    let pfOutput = "";
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        if (data[key] !== "") {
          pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(
            /%20/g,
            "+"
          )}&`;
        }
      }
    }

    // Remove last ampersand
    let getString = pfOutput.slice(0, -1);
    if (passPhrase !== null) {
      getString += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(
        /%20/g,
        "+"
      )}`;
    }
    const signature = crypto.createHash("md5").update(getString).digest("hex");
    res.status(200).json({
      status: "200",
      message: "Signature created",
      data: signature,
    });
  } catch (err) {
    res.status(500).json({
      status: "500",
      message: "Unexpected error: " + err,
    });
  }
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
