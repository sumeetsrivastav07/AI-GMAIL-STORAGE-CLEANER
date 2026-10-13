
import express from "express";
import { google } from "googleapis";
import oauth2Client from "../config/googleOAuth.js";
import User from "../models/User.js";
import generateToken from "../utils/jwt.js";

const router = express.Router();

const FRONTEND_ORIGIN =
    process.env.FRONTEND_URL || "http://localhost:5173";

// Send the login result to the frontend popup's opener
const sendOAuthPopupMessage = (
    res,
    payload,
    statusCode = 200
) => {
    const safePayload = JSON.stringify(payload)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");

    res.status(statusCode).type("html").send(`
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <title>Google Sign-in</title>
            </head>
            <body>
                <p id="message">Completing sign-in...</p>

                <script>
                    const payload = ${safePayload};

                    if (window.opener && !window.opener.closed) {
                        window.opener.postMessage(
                            payload,
                            ${JSON.stringify(FRONTEND_ORIGIN)}
                        );

                        window.close();
                    } else {
                        document.getElementById("message").textContent =
                            payload.type === "oauth-success"
                                ? "Sign-in complete. Return to your dashboard."
                                : payload.message;
                    }
                </script>
            </body>
        </html>
    `);
};

router.get("/google", (req, res) => {
    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.modify"
        ],
        include_granted_scopes: true
    });

    res.redirect(authorizationUrl);
});

router.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return sendOAuthPopupMessage(
                res,
                {
                    type: "oauth-error",
                    message: "Authorization code is missing"
                },
                400
            );
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
                email: data.email,
                ...(tokens.refresh_token
                    ? { googleRefreshToken: tokens.refresh_token }
                    : {})
            });
        } else if (tokens.refresh_token) {
            user.googleRefreshToken = tokens.refresh_token;
            await user.save();
        }

        const token = generateToken(user._id);

        return sendOAuthPopupMessage(res, {
            type: "oauth-success",
            token,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error(
            "Google OAuth callback failed:",
            error.message
        );

        return sendOAuthPopupMessage(
            res,
            {
                type: "oauth-error",
                message: "Google authentication failed"
            },
            500
        );
    }
});

export default router;
