// Plexcord Cloud, the API for the Plexcord client mod
// Copyright (C) 2025 MutanPlex
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
require("dotenv").config();
const httpPort = process.env.HTTP_PORT;
const httpsPort = process.env.HTTPS_PORT;

const oauthRouter = require("./routes/oauth");
app.use(bodyParser.raw({ type: "application/octet-stream", limit: "10mb" }));

const options = {
  key: fs.readFileSync(process.env.SSL_KEY),
  cert: fs.readFileSync(process.env.SSL_CERT),
};

app.use(express.static(path.join(__dirname, "pages")));

app.use((req, res, next) => {
  const allowedOrigins = [
    "https://discord.com",
    "https://ptb.discord.com",
    "https://canary.discord.com",
    "https://discordapp.com",
    "https://ptb.discordapp.com",
    "https://canary.discordapp.com",
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, if-none-match"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use("/v1/oauth", oauthRouter);

app.get("/v1/settings", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  let authy;
  try {
    authy = Buffer.from(authHeader, "base64").toString("utf-8");
  } catch (err) {
    return res
      .status(400)
      .json({ error: "Invalid authorization header format" });
  }

  const [Peppetter, userId] = authy.split(":");
  if (!userId) {
    return res.status(400).json({ error: "Invalid authorization credentials" });
  }

  const filePath = path.join(__dirname, "settings", `${userId}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).send();
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    const value = data.value;
    const written = data.written.toString();

    if (req.get("if-none-match") === written) {
      return res.status(304).send();
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("ETag", written);

    return res.send(value);
  } catch (err) {
    console.error("File system error:", err);
    return res
      .status(500)
      .json({ error: "Failed to retrieve settings from file" });
  }
});

app.delete("/v1", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  let authy;
  try {
    authy = Buffer.from(authHeader, "base64").toString("utf-8");
  } catch (err) {
    return res
      .status(400)
      .json({ error: "Invalid authorization header format" });
  }

  const [Peppetter, userId] = authy.split(":");
  if (!userId) {
    return res.status(400).json({ error: "Invalid authorization credentials" });
  }

  const filePath = path.join(__dirname, "settings", `${userId}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ error: "Settings file not found for this user" });
    }
    fs.unlinkSync(filePath);

    const usersFilePath = path.join(__dirname, "data", "users.json");
    if (fs.existsSync(usersFilePath)) {
      const users = JSON.parse(fs.readFileSync(usersFilePath));
      delete users[userId];
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    }

    return res.status(204).send();
  } catch (err) {
    console.error("File system error:", err);
    return res.status(500).json({ error: "Failed to delete settings file" });
  }
});

app.get("/quoter", (req, res) => {

  res.json([

    "506074187014602752",

    "1120045713867423835",

    "1207087393929171095",

    "825069530376044594",

    "921098159348924457",

    "929208515883569182"

  ]);

});





app.delete("/v1/settings", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  let authy;
  try {
    authy = Buffer.from(authHeader, "base64").toString("utf-8");
  } catch (err) {
    return res
      .status(400)
      .json({ error: "Invalid authorization header format" });
  }

  const [Peppetter, userId] = authy.split(":");
  if (!userId) {
    return res.status(400).json({ error: "Invalid authorization credentials" });
  }

  const filePath = path.join(__dirname, "settings", `${userId}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ error: "Settings file not found for this user" });
    }
    fs.unlinkSync(filePath);
    return res.status(204).send();
  } catch (err) {
    console.error("File system error:", err);
    return res.status(500).json({ error: "Failed to delete settings file" });
  }
});

app.put("/v1/settings", async (req, res) => {
  if (req.get("Content-Type") !== "application/octet-stream") {
    return res
      .status(415)
      .json({ error: "Content type must be application/octet-stream" });
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  let authy;
  try {
    authy = Buffer.from(authHeader, "base64").toString("utf-8");
  } catch (err) {
    return res
      .status(400)
      .json({ error: "Invalid authorization header format" });
  }

  const [Peppetter, userId] = authy.split(":");
  if (!userId) {
    return res.status(400).json({ error: "Invalid authorization credentials" });
  }

  const now = Date.now();
  const filePath = path.join(__dirname, "settings", `${userId}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(
        filePath,
        JSON.stringify({ value: req.body, written: now }, null, 2)
      );
    } else {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      data.value = req.body;
      data.written = now;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    return res.json({ written: now });
  } catch (err) {
    console.error("File system error:", err);
    return res.status(500).json({ error: "Failed to save settings to file" });
  }
});

app.get("/", (req, res) => {
  res.redirect("https://plexcord.club/cloud");
});

app.get("/gdpr", (req, res) => {
  res.sendFile(__dirname + "/pages/gdpr.html");
});
app.get("/privacy", (req, res) => {
  res.sendFile(__dirname + "/pages/privacy.html");
});

http.createServer(app).listen(httpPort, () => {
  console.log(`Application is running on HTTP at http://127.0.0.1:${httpPort}`);
});

https.createServer(options, app).listen(httpsPort, () => {
  console.log(
    `Application is running on HTTPS at https://127.0.0.1:${httpsPort}`
  );
});
