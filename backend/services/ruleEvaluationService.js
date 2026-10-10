import Whitelist from "../models/Whitelist.js";
import Rule from "../models/Rule.js";
import ProtectedEmail from "../models/ProtectedEmail.js";

const evaluateEmailRule = async ({
    userId,
    messageId,
    sender
}) => {
    const senderMatch = sender.match(/<([^<>]+)>/);

    const normalizedSender = (
        senderMatch ? senderMatch[1] : sender
    ).trim().toLowerCase();

    // 1. Check if email is protected
    const protectedEmail = await ProtectedEmail.findOne({
        userId,
        messageId
    });

    if (protectedEmail) {
        return {
            action: "protect",
            reason: "Email is protected"
        };
    }

    // 2. Check if sender is whitelisted
    const whitelistedSender = await Whitelist.findOne({
        userId,
        sender: normalizedSender
    });

    if (whitelistedSender) {
        return {
            action: "protect",
            reason: "Sender is whitelisted"
        };
    }

    // 3. Check user's active rule
    const rule = await Rule.findOne({
        userId,
        sender: normalizedSender,
        enabled: true
    });

    if (rule) {
        return {
            action: rule.action,
            reason: "User rule matched"
        };
    }

    // 4. No rule matched
    return {
        action: "none",
        reason: "No rule matched"
    };
};

export default evaluateEmailRule;