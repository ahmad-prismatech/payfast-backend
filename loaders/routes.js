const express = require("express");
const Routes = require("../routes/index");

module.exports = function (app) {
  app.use(express.json());
  app.use("/", Routes);
};
