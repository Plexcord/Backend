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
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const router = express.Router();
require("dotenv").config();

const usersFilePath = path.join(__dirname, "../data/users.json");

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const saveUserSecret = (userId, secret) => {
  let users = {};
  if (fs.existsSync(usersFilePath)) {
    users = JSON.parse(fs.readFileSync(usersFilePath));
  }
  users[userId] = { secret };
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

const getUserSecret = (userId) => {
  if (!fs.existsSync(usersFilePath)) return null;
  const users = JSON.parse(fs.readFileSync(usersFilePath));
  return users[userId]?.secret || null;
};

router.get("/settings", (req, res) => {
  res.json({ clientId: CLIENT_ID, redirectUri: REDIRECT_URI });
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send({ error: "Code not found!" });

  try {
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const user = userResponse.data;

    const secret = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
    saveUserSecret(user.id, secret);

    res.json({ secret });
  } catch (error) {
    console.error("OAuth Error:", error);
    res.status(500).send({ error: "Authentication failed!" });
  }
});

router.post("/authenticate", (req, res) => {
  const { userId, secret } = req.body;
  if (!userId || !secret)
    return res.status(400).send({ error: "Missing information" });

  const storedSecret = getUserSecret(userId);
  if (storedSecret !== secret) {
    return res.status(401).send({ error: "Invalid authentication" });
  }

  res.json({ success: true, message: "Authentication successful" });
});

module.exports = router;
