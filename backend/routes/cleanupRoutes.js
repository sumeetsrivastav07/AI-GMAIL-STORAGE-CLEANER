import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Email from "../models/Email.js";
import User from "../models/User.js";
import getGmailClient from "../services/gmailService.js";


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


router.post("/archive", authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.body;

        if (!messageId) {
            return res.status(400).json({
                success: false,
                message: "Message ID is required"
            });
        }

        const user = await User.findById(req.userId);

        if (!user || !user.googleRefreshToken) {
            return res.status(401).json({
                success: false,
                message: "Google account is not connected"
            });
        }

        const email = await Email.findOne({
            userId: req.userId,
            messageId
        });

        if (!email) {
            return res.status(404).json({
                success: false,
                message: "Email not found"
            });
        }

        const gmail = getGmailClient(user.googleRefreshToken);

        await gmail.users.messages.modify({
            userId: "me",
            id: messageId,
            requestBody: {
                removeLabelIds: ["INBOX"]
            }
        });

        await Email.findOneAndUpdate(
            {
                userId: req.userId,
                messageId
            },
            {
                $pull: {
                    labels: "INBOX"
                }
            }
        );

        res.json({
            success: true,
            message: "Email archived successfully",
            data: {
                messageId
            }
        });
    } catch (error) {
        console.error("Archive operation failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to archive email"
        });
    }
});

router.post("/delete", authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.body;

        if (!messageId) {
            return res.status(400).json({
                success: false,
                message: "Message ID is required"
            });
        }

        const user = await User.findById(req.userId);

        if (!user || !user.googleRefreshToken) {
            return res.status(401).json({
                success: false,
                message: "Google account is not connected"
            });
        }

        const email = await Email.findOne({
            userId: req.userId,
            messageId
        });

        if (!email) {
            return res.status(404).json({
                success: false,
                message: "Email not found"
            });
        }

        const gmail = getGmailClient(user.googleRefreshToken);

        await gmail.users.messages.trash({
            userId: "me",
            id: messageId
        });

        email.labels = email.labels.filter(
            (label) => label !== "INBOX"
        );

        if (!email.labels.includes("TRASH")) {
            email.labels.push("TRASH");
        }

        await email.save();

        res.json({
            success: true,
            message: "Email moved to trash successfully",
            data: {
                messageId
            }
        });
    } catch (error) {
        console.error("Delete operation failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to delete email"
        });
    }
});

export default router;