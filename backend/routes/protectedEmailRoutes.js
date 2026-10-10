import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import ProtectedEmail from "../models/ProtectedEmail.js";
import Email from "../models/Email.js";
const router = express.Router();


router.get("/", authMiddleware, async (req, res) => {
    try {
        const protectedEmails = await ProtectedEmail.find({
            userId: req.userId
        });

        const messageIds = protectedEmails.map(
            (email) => email.messageId
        );

        const emails = await Email.find({
            userId: req.userId,
            messageId: { $in: messageIds }
        }).select("messageId sender subject date");

        const emailMap = new Map(
            emails.map((email) => [
                email.messageId,
                email
            ])
        );

        const data = protectedEmails.map((item) => {
            const email = emailMap.get(item.messageId);

            return {
                messageId: item.messageId,
                sender: email?.sender || "Unknown sender",
                subject: email?.subject || "Unknown subject",
                date: email?.date || null
            };
        });

        res.json({
            success: true,
            message: "Protected emails fetched successfully",
            data
        });
    } catch (error) {
        console.error(
            "Protected emails fetch failed:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch protected emails"
        });
    }
});

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