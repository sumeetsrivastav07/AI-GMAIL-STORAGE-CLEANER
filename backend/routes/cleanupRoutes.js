import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Email from "../models/Email.js";
import User from "../models/User.js";
import getGmailClient from "../services/gmailService.js";
import evaluateEmailRule from "../services/ruleEvaluationService.js";
import CleanupHistory from "../models/CleanupHistory.js";
import mongoose from "mongoose";

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
        const { messageId, confirmed } = req.body;

        if (!messageId) {
            return res.status(400).json({
                success: false,
                message: "Message ID is required"
            });
        }

        if (confirmed !== true) {
            return res.status(400).json({
                success: false,
                message: "Cleanup confirmation is required"
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

        // Check protected email and whitelisted sender
        const evaluation = await evaluateEmailRule({
            userId: req.userId,
            messageId,
            sender: email.sender
        });

        if (evaluation.action === "protect") {
            return res.status(403).json({
                success: false,
                message: `Cleanup blocked: ${evaluation.reason}`
            });
        }

        // Save the original labels for future undo
        const previousLabels = [...(email.labels || [])];

        // Archive the email in Gmail
        const gmail = getGmailClient(user.googleRefreshToken);

        await gmail.users.messages.modify({
            userId: "me",
            id: messageId,
            requestBody: {
                removeLabelIds: ["INBOX"]
            }
        });

        // Synchronize MongoDB labels
        email.labels = previousLabels.filter(
            (label) => label !== "INBOX"
        );

        await email.save();

        // Record the completed cleanup action
        const historyEntry = await CleanupHistory.create({
            userId: req.userId,
            messageId,
            action: "archive",
            status: "completed",
            previousLabels
        });

        res.json({
            success: true,
            message: "Email archived successfully",
            data: {
                messageId,
                historyId: historyEntry._id
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
        const { messageId, confirmed } = req.body;

        if (!messageId) {
            return res.status(400).json({
                success: false,
                message: "Message ID is required"
            });
        }

        if (confirmed !== true) {
            return res.status(400).json({
                success: false,
                message: "Cleanup confirmation is required"
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

        // Block protected emails and whitelisted senders
        const evaluation = await evaluateEmailRule({
            userId: req.userId,
            messageId,
            sender: email.sender
        });

        if (evaluation.action === "protect") {
            return res.status(403).json({
                success: false,
                message: `Cleanup blocked: ${evaluation.reason}`
            });
        }

        // Save the original labels for future undo
        const previousLabels = [...(email.labels || [])];

        const gmail = getGmailClient(user.googleRefreshToken);

        // Move the email to Gmail Trash
        await gmail.users.messages.trash({
            userId: "me",
            id: messageId
        });

        // Update the local email record
        email.labels = previousLabels.filter(
            (label) => label !== "INBOX"
        );

        if (!email.labels.includes("TRASH")) {
            email.labels.push("TRASH");
        }

        await email.save();

        // Record the completed action
        const historyEntry = await CleanupHistory.create({
            userId: req.userId,
            messageId,
            action: "delete",
            status: "completed",
            previousLabels
        });

        res.json({
            success: true,
            message: "Email moved to trash successfully",
            data: {
                messageId,
                historyId: historyEntry._id
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


router.post("/bulk", authMiddleware, async (req, res) => {
    try {
        const { messageIds, action, confirmed } = req.body;

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one message ID is required"
            });
        }

        if (!["archive", "delete"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be archive or delete"
            });
        }

        if (confirmed !== true) {
            return res.status(400).json({
                success: false,
                message: "Cleanup confirmation is required"
            });
        }

        const uniqueMessageIds = [...new Set(messageIds)];

        const user = await User.findById(req.userId);

        if (!user || !user.googleRefreshToken) {
            return res.status(401).json({
                success: false,
                message: "Google account is not connected"
            });
        }

        const emails = await Email.find({
            userId: req.userId,
            messageId: { $in: uniqueMessageIds }
        });

        if (emails.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No valid emails found"
            });
        }

        // Check every email's protection status
        const evaluations = await Promise.all(
            emails.map(async (email) => {
                const evaluation = await evaluateEmailRule({
                    userId: req.userId,
                    messageId: email.messageId,
                    sender: email.sender
                });

                return { email, evaluation };
            })
        );

        const protectedEmails = evaluations
            .filter(({ evaluation }) => evaluation.action === "protect")
            .map(({ email }) => email);

        const eligibleEmails = evaluations
            .filter(({ evaluation }) => evaluation.action !== "protect")
            .map(({ email }) => email);

        const protectedSkippedMessageIds = protectedEmails.map(
            (email) => email.messageId
        );

        if (eligibleEmails.length === 0) {
            return res.status(403).json({
                success: false,
                message: "All selected emails are protected or whitelisted",
                data: {
                    protectedSkippedCount: protectedEmails.length,
                    protectedSkippedMessageIds
                }
            });
        }

        const validMessageIds = eligibleEmails.map(
            (email) => email.messageId
        );

        // Preserve the original labels for history and future undo
        const historyRecords = eligibleEmails.map((email) => ({
            userId: req.userId,
            messageId: email.messageId,
            action,
            status: "completed",
            previousLabels: [...(email.labels || [])]
        }));

        const gmail = getGmailClient(user.googleRefreshToken);

        if (action === "archive") {
            await gmail.users.messages.batchModify({
                userId: "me",
                requestBody: {
                    ids: validMessageIds,
                    removeLabelIds: ["INBOX"]
                }
            });

            await Email.updateMany(
                {
                    userId: req.userId,
                    messageId: { $in: validMessageIds }
                },
                {
                    $pull: {
                        labels: "INBOX"
                    }
                }
            );
        }

        if (action === "delete") {
            await gmail.users.messages.batchModify({
                userId: "me",
                requestBody: {
                    ids: validMessageIds,
                    addLabelIds: ["TRASH"],
                    removeLabelIds: ["INBOX"]
                }
            });

            await Email.updateMany(
                {
                    userId: req.userId,
                    messageId: { $in: validMessageIds }
                },
                {
                    $pull: {
                        labels: "INBOX"
                    }
                }
            );

            await Email.updateMany(
                {
                    userId: req.userId,
                    messageId: { $in: validMessageIds }
                },
                {
                    $addToSet: {
                        labels: "TRASH"
                    }
                }
            );
        }

        // Save one history record for each processed email
        const createdHistory = await CleanupHistory.insertMany(
            historyRecords
        );

        res.json({
            success: true,
            message: protectedEmails.length > 0
                ? `Bulk ${action} completed; protected emails were skipped`
                : `Bulk ${action} operation completed`,
            data: {
                requestedCount: uniqueMessageIds.length,
                processedCount: validMessageIds.length,
                protectedSkippedCount: protectedEmails.length,
                protectedSkippedMessageIds,
                messageIds: validMessageIds,
                historyCount: createdHistory.length,
                historyIds: createdHistory.map((entry) => entry._id)
            }
        });
    } catch (error) {
        console.error(
            "Bulk cleanup operation failed:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to complete bulk cleanup operation"
        });
    }
});

router.get("/history", authMiddleware, async (req, res) => {
    try {
        const history = await CleanupHistory.find({
            userId: req.userId
        })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            message: "Cleanup history fetched successfully",
            data: {
                count: history.length,
                history
            }
        });
    } catch (error) {
        console.error(
            "Cleanup history fetch failed:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch cleanup history"
        });
    }
});


router.post("/undo/:historyId", authMiddleware, async (req, res) => {
    try {
        const { historyId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(historyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid history ID"
            });
        }

        // Find this history record for the authenticated user
        const history = await CleanupHistory.findOne({
            _id: historyId,
            userId: req.userId
        });

        if (!history) {
            return res.status(404).json({
                success: false,
                message: "Cleanup history record not found"
            });
        }

        if (history.status !== "completed") {
            return res.status(409).json({
                success: false,
                message: "This cleanup action has already been undone"
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
            messageId: history.messageId
        });

        if (!email) {
            return res.status(404).json({
                success: false,
                message: "Email not found in database"
            });
        }

        const gmail = getGmailClient(user.googleRefreshToken);

        const previousLabels = history.previousLabels || [];

        // Restore a deleted email from Gmail Trash
        if (history.action === "delete") {
            await gmail.users.messages.untrash({
                userId: "me",
                id: history.messageId
            });
        }

        // Restore Inbox only if the email originally had that label
        if (previousLabels.includes("INBOX")) {
            await gmail.users.messages.modify({
                userId: "me",
                id: history.messageId,
                requestBody: {
                    addLabelIds: ["INBOX"]
                }
            });
        }

        // Restore the labels saved before cleanup
        email.labels = [...previousLabels];
        await email.save();

        // Mark the history entry as undone
        history.status = "undone";
        history.undoneAt = new Date();
        await history.save();

        res.json({
            success: true,
            message: "Cleanup action undone successfully",
            data: {
                messageId: history.messageId,
                action: history.action,
                status: history.status
            }
        });
    } catch (error) {
        console.error("Cleanup undo failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to undo cleanup action"
        });
    }
});



export default router;