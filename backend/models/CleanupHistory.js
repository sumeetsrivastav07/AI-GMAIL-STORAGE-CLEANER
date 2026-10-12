
import mongoose from "mongoose";

const cleanupHistorySchema = new mongoose.Schema(
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

        action: {
            type: String,
            enum: ["archive", "delete"],
            required: true
        },

        status: {
            type: String,
            enum: ["completed", "undone"],
            default: "completed"
        },

        previousLabels: {
            type: [String],
            default: []
        },

        undoneAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

cleanupHistorySchema.index({
    userId: 1,
    createdAt: -1
});

const CleanupHistory = mongoose.model(
    "CleanupHistory",
    cleanupHistorySchema
);

export default CleanupHistory;
