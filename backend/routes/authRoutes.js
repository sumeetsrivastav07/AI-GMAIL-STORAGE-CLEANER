import express from "express";
import { google } from "googleapis";
import oauth2Client from "../config/googleOAuth.js";
import User from "../models/User.js";
import OAuthHandoff from "../models/OAuthHandoff.js";
import generateToken from "../utils/jwt.js";
import { randomBytes, createHash } from "crypto";

const router = express.Router();

const FRONTEND_ORIGIN =
    process.env.FRONTEND_URL || "http://localhost:5173";

const STATE_COOKIE = "clearmail_oauth_state";
const HANDOFF_COOKIE = "clearmail_oauth_handoff";

const isSecure = FRONTEND_ORIGIN.startsWith("https://");

const cookieOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax"
};

// Read a specific cookie without requiring cookie-parser.
const getCookie = (req, name) => {
    const cookies = (req.headers.cookie || "").split(";");

    const cookie = cookies
        .map((item) => item.trim())
        .find((item) => item.startsWith(`${name}=`));

    if (!cookie) {
        return null;
    }

    try {
        return decodeURIComponent(
            cookie.slice(name.length + 1)
        );
    } catch {
        return null;
    }
};

const createHashValue = (value) => {
    return createHash("sha256")
        .update(value)
        .digest("hex");
};

const redirectToFrontend = (res, status) => {
    const redirectUrl = new URL(FRONTEND_ORIGIN);

    redirectUrl.searchParams.set("oauth", status);

    return res.redirect(redirectUrl.toString());
};

// Step 1: Start Google OAuth.
router.get("/google", (req, res) => {
    const state = randomBytes(32).toString("hex");

    res.cookie(STATE_COOKIE, state, {
        ...cookieOptions,
        path: "/api/auth/google/callback",
        maxAge: 10 * 60 * 1000
    });

    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        state,
        scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.modify"
        ],
        include_granted_scopes: true
    });

    return res.redirect(authorizationUrl);
});

// Step 2: Handle Google's callback.
router.get("/google/callback", async (req, res) => {
    try {
        const { code, state, error } = req.query;

        const savedState = getCookie(req, STATE_COOKIE);

        res.clearCookie(STATE_COOKIE, {
            ...cookieOptions,
            path: "/api/auth/google/callback"
        });

        if (error) {
            return redirectToFrontend(res, "error");
        }

        if (
            !code ||
            !state ||
            !savedState ||
            state !== savedState
        ) {
            return redirectToFrontend(res, "error");
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
                    ? {
                        googleRefreshToken: tokens.refresh_token
                    }
                    : {})
            });
        } else if (tokens.refresh_token) {
            user.googleRefreshToken = tokens.refresh_token;
            await user.save();
        }

        // Create a random, one-time authentication handoff.
        const handoffCode = randomBytes(32).toString("hex");

        const codeHash = createHashValue(handoffCode);

        await OAuthHandoff.create({
            codeHash,
            userId: user._id,
            expiresAt: new Date(Date.now() + 60 * 1000)
        });

        // Keep the raw handoff code inside an HttpOnly cookie.
        res.cookie(HANDOFF_COOKIE, handoffCode, {
            ...cookieOptions,
            path: "/api/auth/exchange",
            maxAge: 60 * 1000
        });

        return redirectToFrontend(res, "success");

    } catch (error) {
        console.error(
            "Google OAuth callback failed:",
            error.message
        );

        return redirectToFrontend(res, "error");
    }
});

// Step 3: Exchange the one-time handoff for the application JWT.
router.post("/exchange", async (req, res) => {
    try {
        const handoffCode = getCookie(req, HANDOFF_COOKIE);

        res.clearCookie(HANDOFF_COOKIE, {
            ...cookieOptions,
            path: "/api/auth/exchange"
        });

        if (!handoffCode) {
            return res.status(401).json({
                success: false,
                message: "Authentication handoff is missing or expired"
            });
        }

        const codeHash = createHashValue(handoffCode);

        // Atomically consume the one-time handoff.
        const handoff = await OAuthHandoff.findOneAndDelete({
            codeHash,
            expiresAt: { $gt: new Date() }
        });

        if (!handoff) {
            return res.status(401).json({
                success: false,
                message: "Authentication handoff is invalid or expired"
            });
        }

        const user = await User.findById(handoff.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found"
            });
        }

        const token = generateToken(user._id);

        return res.status(200).json({
            success: true,
            token,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(
            "OAuth handoff exchange failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Authentication could not be completed"
        });
    }
});

export default router;

