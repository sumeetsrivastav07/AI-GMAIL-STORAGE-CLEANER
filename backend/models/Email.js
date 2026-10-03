import mongoose from "mongoose";

const emailSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        messageId: {
            type: String,
            required: true
        },

        threadId: {
            type: String,
            required: true
        },

        sender: {
            type: String,
            required: true
        },

        subject: {
            type: String,
            default: ""
        },

        date: {
            type: Date
        },

        labels: {
            type: [String],
            default: []
        },

        category: {
            type: String,
            enum: [
                "promotional",
                "newsletter",
                "important",
                "social",
                "other"
            ],
            default: "other"
        },

        aiClassified: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

emailSchema.index(
    { userId: 1, messageId: 1 },
    { unique: true }
);

const Email = mongoose.model("Email", emailSchema);

export default Email;