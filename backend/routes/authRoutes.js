import express from "express";
import { google } from "googleapis";
import oauth2Client from "../config/googleOAuth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/google", (req, res) => {
    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
            "openid",
            "email",
            "profile"
        ],
        include_granted_scopes: true
    });

    res.redirect(authorizationUrl);
});

router.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Authorization code is missing"
            });
        }

        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: "v2"
        });

        const { data } = await oauth2.userinfo.get();
        let user = await User.findOne({
            googleId: data.id
        });

        if (!user) {
            user = await User.create({
                googleId: data.id,
                name: data.name,
                email: data.email
            });
        }
        res.json({
            success: true,
            message: "Google authentication successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Google OAuth callback failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Google authentication failed"
        });
    }
});
export default router;