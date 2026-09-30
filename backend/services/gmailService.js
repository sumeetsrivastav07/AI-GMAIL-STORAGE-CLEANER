import { google } from "googleapis";
import googleConfig from "../config/google.js";

const getGmailClient = (refreshToken) => {
    const oauth2Client = new google.auth.OAuth2(
        googleConfig.clientId,
        googleConfig.clientSecret,
        googleConfig.redirectUri
    );

    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    return google.gmail({
        version: "v1",
        auth: oauth2Client
    });
};

export default getGmailClient;