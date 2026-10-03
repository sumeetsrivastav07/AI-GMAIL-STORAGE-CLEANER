import mongoose from "mongoose";

const ruleSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        sender: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        action: {
            type: String,
            enum: ["archive", "delete", "protect"],
            required: true
        },

        enabled: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const Rule = mongoose.model("Rule", ruleSchema);

export default Rule;