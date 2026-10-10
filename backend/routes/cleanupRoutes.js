import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Email from "../models/Email.js";
import User from "../models/User.js";
import getGmailClient from "../services/gmailService.js";
import evaluateEmailRule from "../services/ruleEvaluationService.js";

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
        email.labels = email.labels.filter(
            (label) => label !== "INBOX"
        );

        await email.save();

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

        // Check whether the email or sender is protected
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

        // Move the email to Gmail Trash
        const gmail = getGmailClient(user.googleRefreshToken);

        await gmail.users.messages.trash({
            userId: "me",
            id: messageId
        });

        // Synchronize MongoDB labels
        email.labels = (email.labels || []).filter(
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

router.post("/bulk", authMiddleware, async (req, res) => {
    try {
        const { messageIds, action, confirmed } = req.body;

        // 1. Validate message IDs
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one message ID is required"
            });
        }

        // 2. Validate action
        if (!["archive", "delete"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be archive or delete"
            });
        }

        // 3. Require confirmation
        if (confirmed !== true) {
            return res.status(400).json({
                success: false,
                message: "Cleanup confirmation is required"
            });
        }

        // 4. Remove duplicate message IDs
        const uniqueMessageIds = [...new Set(messageIds)];

        // 5. Find authenticated user
        const user = await User.findById(req.userId);

        if (!user || !user.googleRefreshToken) {
            return res.status(401).json({
                success: false,
                message: "Google account is not connected"
            });
        }

        // 6. Fetch only emails belonging to this user
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

        // 7. Evaluate protection for every selected email
        const evaluations = await Promise.all(
            emails.map(async (email) => {
                const evaluation = await evaluateEmailRule({
                    userId: req.userId,
                    messageId: email.messageId,
                    sender: email.sender
                });

                return {
                    email,
                    evaluation
                };
            })
        );

        // 8. Separate protected and eligible emails
        const protectedEmails = evaluations
            .filter(({ evaluation }) =>
                evaluation.action === "protect"
            )
            .map(({ email }) => email);

        const eligibleEmails = evaluations
            .filter(({ evaluation }) =>
                evaluation.action !== "protect"
            )
            .map(({ email }) => email);

        const protectedSkippedMessageIds = protectedEmails.map(
            (email) => email.messageId
        );

        // 9. Stop if all emails are protected
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

        // 10. Connect to Gmail
        const gmail = getGmailClient(user.googleRefreshToken);

        // 11. Archive eligible emails
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

        // 12. Move eligible emails to Trash
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

        // 13. Return operation results
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
                messageIds: validMessageIds
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

export default router;