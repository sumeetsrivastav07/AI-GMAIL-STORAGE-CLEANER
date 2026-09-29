import dns from "dns";
import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import { sendSuccess } from "./utils/apiResponse.js";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";


dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

const PORT = process.env.PORT || 5000;
app.get("/api/health", (req, res) => {
    sendSuccess(res, 200, "Backend is running");
});

app.use("/api/auth", authRoutes);

app.get("/api/test-protected", authMiddleware, (req, res) => {
    res.json({
        success: true,
        message: "You accessed a protected route",
        userId: req.userId
    });
});


connectDB();




app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});