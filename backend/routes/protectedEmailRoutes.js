import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import ProtectedEmail from "../models/ProtectedEmail.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.body;

        if (!messageId) {
            return res.status(400).json({
                success: false,
                message: "Message ID is required"
            });
        }

        const existingEmail = await ProtectedEmail.findOne({
            userId: req.userId,
            messageId
        });

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "Email is already protected"
            });
        }

        const protectedEmail = await ProtectedEmail.create({
            userId: req.userId,
            messageId
        });

        res.status(201).json({
            success: true,
            message: "Email protected successfully",
            data: protectedEmail
        });
    } catch (error) {
        console.error(
            "Protected email creation failed:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to protect email"
        });
    }
});

export default router;