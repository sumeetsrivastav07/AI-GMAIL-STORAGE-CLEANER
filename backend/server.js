import dns from "dns";
import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

const PORT = process.env.PORT || 5000;
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Backend is running"
    });
});



connectDB();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});