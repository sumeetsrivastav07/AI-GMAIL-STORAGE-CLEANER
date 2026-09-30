import express from "express";
import User from "../models/User.js";
import getGmailClient from "../services/gmailService.js";

const router = express.Router();

router.get("/profile", async (req, res) => {
    try {
        const user = await User.findOne({
            email: "sumeetsrivastav0728@gmail.com"
        });

        if (!user || !user.googleRefreshToken) {
            return res.status(401).json({
                success: false,
                message: "Google account is not connected"
            });
        }

        const gmail = getGmailClient(user.googleRefreshToken);

        const response = await gmail.users.getProfile({
            userId: "me"
        });

        res.json({
            success: true,
            message: "Gmail profile fetched successfully",
            data: response.data
        });
    } catch (error) {
        console.error("Gmail profile fetch failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch Gmail profile"
        });
    }
});

export default router;