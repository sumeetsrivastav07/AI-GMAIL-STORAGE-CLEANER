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

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();
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