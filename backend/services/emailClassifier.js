import EMAIL_CATEGORIES from "../constants/emailCategories.js";

const classifyEmail = ({ sender, subject, labels }) => {
    const normalizedSender = sender.toLowerCase();
    const normalizedSubject = subject.toLowerCase();

    if (labels.includes("IMPORTANT")) {
        return EMAIL_CATEGORIES.IMPORTANT;
    }

    if (
        normalizedSender.includes("newsletter") ||
        normalizedSubject.includes("newsletter")
    ) {
        return EMAIL_CATEGORIES.NEWSLETTER;
    }

    if (
        normalizedSender.includes("noreply") ||
        normalizedSender.includes("no-reply") ||
        normalizedSubject.includes("offer") ||
        normalizedSubject.includes("sale") ||
        normalizedSubject.includes("discount")
    ) {
        return EMAIL_CATEGORIES.PROMOTIONAL;
    }

    if (labels.includes("CATEGORY_SOCIAL")) {
        return EMAIL_CATEGORIES.SOCIAL;
    }

    return EMAIL_CATEGORIES.OTHER;
};

export default classifyEmail;