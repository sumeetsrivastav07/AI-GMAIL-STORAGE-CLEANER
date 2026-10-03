import { GoogleGenAI } from "@google/genai";
import validateEmailCategory from "../utils/validateEmailCategory.js";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const classifyEmailWithAI = async ({ sender, subject }) => {
    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `
Classify this email into exactly one category:

- promotional
- newsletter
- important
- social
- other

Sender: ${sender}
Subject: ${subject}

Return only the category name.
        `
    });

    const category = response.text.trim().toLowerCase();

    return {
        category: validateEmailCategory(category),
        aiClassified: true
    };
};

export default classifyEmailWithAI;