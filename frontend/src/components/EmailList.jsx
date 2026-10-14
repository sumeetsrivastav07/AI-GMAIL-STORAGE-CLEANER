
import { useEffect, useState } from "react";
import "./EmailList.css";

const BACKEND_ORIGIN = "http://localhost:5000";

function EmailList({ token }) {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token) {
            setEmails([]);
            setError("");
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchEmails = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `${BACKEND_ORIGIN}/api/gmail/emails`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Failed to fetch emails"
                    );
                }

                if (!Array.isArray(result.data)) {
                    throw new Error(
                        "Invalid email data received from server"
                    );
                }

                if (!cancelled) {
                    setEmails(result.data);
                }
            } catch (error) {
                if (!cancelled) {
                    setEmails([]);
                    setError(
                        error.message || "Could not load emails"
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchEmails();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return "Date unavailable";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleDateString();
    };

    return (
        <section className="email-list-section">
            <div className="email-list-heading">
                <div>
                    <h2>Your emails</h2>
                    <p>Emails saved in your workspace</p>
                </div>

                <span className="email-total">
                    {loading ? "Loading..." : `${emails.length} emails`}
                </span>
            </div>

            {!token && (
                <div className="email-list-message">
                    Connect Gmail to view your emails.
                </div>
            )}

            {loading && (
                <div className="email-list-message">
                    Loading your emails...
                </div>
            )}

            {error && (
                <div className="email-list-error" role="alert">
                    {error}
                </div>
            )}

            {!loading && !error && token && emails.length === 0 && (
                <div className="email-list-message">
                    No saved emails found. Fetch your Gmail messages
                    through the backend first.
                </div>
            )}

            {!loading && !error && emails.length > 0 && (
                <div className="email-list">
                    {emails.map((email) => (
                        <article
                            className="email-item"
                            key={email.messageId}
                        >
                            <div className="email-item-main">
                                <h3>
                                    {email.sender || "Unknown sender"}
                                </h3>

                                <p className="email-subject">
                                    {email.subject || "(No subject)"}
                                </p>

                                <div className="email-item-meta">
                                    <span className="email-category">
                                        {email.category || "other"}
                                    </span>

                                    <span>
                                        {formatDate(email.date)}
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export default EmailList;
