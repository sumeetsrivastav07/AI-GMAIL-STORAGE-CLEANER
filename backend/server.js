import dns from "dns";
import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import { sendSuccess } from "./utils/apiResponse.js";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import gmailRoutes from "./routes/gmailRoutes.js";
import whitelistRoutes from "./routes/whitelistRoutes.js";
import ruleRoutes from "./routes/ruleRoutes.js";
import protectedEmailRoutes from "./routes/protectedEmailRoutes.js";
import cleanupRoutes from "./routes/cleanupRoutes.js";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { randomBytes } from "crypto";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

app.set("trust proxy", 1);
app.use((req, res, next) => {
    res.locals.cspNonce = randomBytes(16).toString("base64");
    next();
});
app.use(
    helmet({
        crossOriginOpenerPolicy: {
            policy: "same-origin-allow-popups"
        },
        contentSecurityPolicy: {
            directives: {
                scriptSrc: [
                    "'self'",
                    (req, res) => `'nonce-${res.locals.cspNonce}'`
                ]
            }
        }
    })
);
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Maximum 100 requests per IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again after 15 minutes."
    }
});

app.use("/api", apiLimiter);
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts. Please try again after 15 minutes."
    }
});

app.use("/api/auth", authLimiter);
app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/api/health", (req, res) => {
    sendSuccess(res, 200, "Backend is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/gmail", gmailRoutes);
app.use("/api/whitelist", whitelistRoutes);
app.use("/api/rules", ruleRoutes);
app.use("/api/protected-emails", protectedEmailRoutes);
app.use("/api/cleanup", cleanupRoutes);

connectDB();

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});