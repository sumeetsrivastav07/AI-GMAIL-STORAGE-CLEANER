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

router.delete("/:sender", authMiddleware, async (req, res) => {
    try {
        const normalizedSender = req.params.sender.trim().toLowerCase();

        const deletedSender = await Whitelist.findOneAndDelete({
            userId: req.userId,
            sender: normalizedSender
        });

        if (!deletedSender) {
            return res.status(404).json({
                success: false,
                message: "Sender not found in whitelist"
            });
        }

        res.json({
            success: true,
            message: "Sender removed from whitelist",
            data: deletedSender
        });
    } catch (error) {
        console.error("Whitelist deletion failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to remove sender from whitelist"
        });
    }
});

export default router;