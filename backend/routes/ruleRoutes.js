import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Rule from "../models/Rule.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { sender, action } = req.body;

        if (!sender || !action) {
            return res.status(400).json({
                success: false,
                message: "Sender and action are required"
            });
        }

        const normalizedSender = sender.trim().toLowerCase();

        const rule = await Rule.create({
            userId: req.userId,
            sender: normalizedSender,
            action
        });

        res.status(201).json({
            success: true,
            message: "Rule created successfully",
            data: rule
        });
    } catch (error) {
        console.error("Rule creation failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to create rule"
        });
    }
});

export default router;