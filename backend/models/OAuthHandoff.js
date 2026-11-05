import mongoose from "mongoose";

const oauthHandoffSchema = new mongoose.Schema(
    {
        codeHash: {
            type: String,
            required: true,
            unique: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        expiresAt: {
            type: Date,
            required: true,
            expires: 0
        }
    },
    {
        timestamps: true
    }
);

const OAuthHandoff = mongoose.model(
    "OAuthHandoff",
    oauthHandoffSchema
);

export default OAuthHandoff;