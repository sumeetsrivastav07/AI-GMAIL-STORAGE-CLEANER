import { GoogleGenAI } from "@google/genai";

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

    return response.text.trim().toLowerCase();
};

export default classifyEmailWithAI;