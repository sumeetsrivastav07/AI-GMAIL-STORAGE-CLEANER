import "dotenv/config";
import express from "express";

const app = express();

const PORT = process.env.PORT || 5000;
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Backend is running"
    });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});