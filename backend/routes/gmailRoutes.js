import express from "express";
import User from "../models/User.js";
import getGmailClient from "../services/gmailService.js";
import authMiddleware from "../middleware/authMiddleware.js";
import parseEmailMetadata from "../utils/emailParser.js";
import Email from "../models/Email.js";
import classifyEmail from "../services/emailClassifier.js";
import classifyEmailWithAI from "../services/aiService.js";

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

        const emailMetadata = parseEmailMetadata(response.data);

        res.json({
            success: true,
            message: "Gmail message fetched successfully",
            data: emailMetadata
        });
    } catch (error) {
        console.error("Gmail profile fetch failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch Gmail profile"
        });
    }
});

router.get("/messages", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user || !user.googleRefreshToken) {
            return res.status(401).json({
                success: false,
                message: "Google account is not connected"
            });
        }

        const gmail = getGmailClient(user.googleRefreshToken);

        const listResponse = await gmail.users.messages.list({
            userId: "me",
            maxResults: 5
        });

        const messages = listResponse.data.messages || [];

        const emailMetadata = await Promise.all(
            messages.map(async (message) => {
                const response = await gmail.users.messages.get({
                    userId: "me",
                    id: message.id,
                    format: "metadata",
                    metadataHeaders: [
                        "From",
                        "Subject",
                        "Date"
                    ]
                });

                const parsedEmail = parseEmailMetadata(response.data);
                const existingEmail = await Email.findOne({
                    userId: user._id,
                    messageId: parsedEmail.messageId
                });
                let category;
                let aiClassified = false;

                if (existingEmail?.aiClassified) {
                    category = existingEmail.category;
                    aiClassified = true;
                } else {
                    try {
                        const aiResult = await classifyEmailWithAI({
                            sender: parsedEmail.sender,
                            subject: parsedEmail.subject
                        });

                        category = aiResult.category;
                        aiClassified = aiResult.aiClassified;
                    } catch (error) {
                        console.error(
                            "AI classification failed:",
                            error.message
                        );

                        category = classifyEmail(parsedEmail);
                    }
                }

                return {
                    ...parsedEmail,
                    category,
                    aiClassified
                };
            })
        );
        const emailsToSave = emailMetadata.map((email) => ({
            userId: user._id,
            ...email
        }));

        await Email.bulkWrite(
            emailsToSave.map((email) => ({
                updateOne: {
                    filter: {
                        userId: email.userId,
                        messageId: email.messageId
                    },
                    update: {
                        $set: email
                    },
                    upsert: true
                }
            }))
        );
        res.json({
            success: true,
            message: "Gmail messages processed successfully",
            data: emailMetadata
        });
    } catch (error) {
        console.error("Gmail messages processing failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to process Gmail messages"
        });
    }
});
router.get("/messages/:messageId", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user || !user.googleRefreshToken) {
            return res.status(401).json({
                success: false,
                message: "Google account is not connected"
            });
        }

        const gmail = getGmailClient(user.googleRefreshToken);

        const response = await gmail.users.messages.get({
            userId: "me",
            id: req.params.messageId,
            format: "metadata",
            metadataHeaders: [
                "From",
                "Subject",
                "Date"
            ]
        });

        res.json({
            success: true,
            message: "Gmail message fetched successfully",
            data: response.data
        });
    } catch (error) {
        console.error("Gmail message fetch failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch Gmail message"
        });
    }
});

router.get("/emails", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const { category } = req.query;

        const filter = {
            userId: user._id
        };

        if (category) {
            filter.category = category;
        }

        const emails = await Email.find(filter)
            .sort({ date: -1 });

        res.json({
            success: true,
            message: "Emails fetched successfully",
            data: emails
        });
    } catch (error) {
        console.error("Email filtering failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch emails"
        });
    }
});

export default router;