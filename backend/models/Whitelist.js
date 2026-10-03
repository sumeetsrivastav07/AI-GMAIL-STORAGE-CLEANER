import mongoose from "mongoose";

const whitelistSchema = new mongoose.Schema(
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
        }
    },
    { timestamps: true }
);

whitelistSchema.index(
    { userId: 1, sender: 1 },
    { unique: true }
);

const Whitelist = mongoose.model("Whitelist", whitelistSchema);

export default Whitelist;