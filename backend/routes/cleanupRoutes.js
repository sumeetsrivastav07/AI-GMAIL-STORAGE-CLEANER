import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Email from "../models/Email.js";

const router = express.Router();

router.post("/selection", authMiddleware, async (req, res) => {
    try {
        const { messageIds } = req.body;

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one message ID is required"
            });
        }

        const emails = await Email.find({
            userId: req.userId,
            messageId: { $in: messageIds }
        });

        if (emails.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No valid emails found"
            });
        }

        res.json({
            success: true,
            message: "Emails selected successfully",
            data: {
                selectedCount: emails.length,
                emails
            }
        });
    } catch (error) {
        console.error(
            "Email selection failed:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to select emails"
        });
    }
});

export default router;