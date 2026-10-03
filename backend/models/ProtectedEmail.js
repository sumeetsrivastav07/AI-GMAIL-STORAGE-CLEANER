import mongoose from "mongoose";

const protectedEmailSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        messageId: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

protectedEmailSchema.index(
    { userId: 1, messageId: 1 },
    { unique: true }
);

const ProtectedEmail = mongoose.model(
    "ProtectedEmail",
    protectedEmailSchema
);

export default ProtectedEmail;