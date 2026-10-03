import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Whitelist from "../models/Whitelist.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { sender } = req.body;

        if (!sender) {
            return res.status(400).json({
                success: false,
                message: "Sender is required"
            });
        }

        const normalizedSender = sender.trim().toLowerCase();

        const existingSender = await Whitelist.findOne({
            userId: req.userId,
            sender: normalizedSender
        });

        if (existingSender) {
            return res.status(409).json({
                success: false,
                message: "Sender is already whitelisted"
            });
        }

        const whitelistEntry = await Whitelist.create({
            userId: req.userId,
            sender: normalizedSender
        });

        res.status(201).json({
            success: true,
            message: "Sender added to whitelist",
            data: whitelistEntry
        });
    } catch (error) {
        console.error("Whitelist creation failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to add sender to whitelist"
        });
    }
});

export default router;