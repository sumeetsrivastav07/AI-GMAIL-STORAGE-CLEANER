
import { useEffect, useState } from "react";
import "./EmailList.css";

const BACKEND_ORIGIN = "http://localhost:5000";

const categories = [
    { label: "All categories", value: "" },
    { label: "Promotional", value: "promotional" },
    { label: "Newsletter", value: "newsletter" },
    { label: "Important", value: "important" },
    { label: "Social", value: "social" },
    { label: "Other", value: "other" }
];

function EmailList({ token }) {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);

    const [protectedIds, setProtectedIds] = useState([]);
    const [protectionLoading, setProtectionLoading] = useState(false);
    const [protectionError, setProtectionError] = useState("");

    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState("");
    const [actionError, setActionError] = useState("");

    // Fetch saved emails, filtered by category when selected.
    useEffect(() => {
        if (!token) {
            setEmails([]);
            setSelectedIds([]);
            setError("");
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchEmails = async () => {
            setLoading(true);
            setError("");

            try {
                const query = selectedCategory
                    ? `?category=${encodeURIComponent(selectedCategory)}`
                    : "";

                const response = await fetch(
                    `${BACKEND_ORIGIN}/api/gmail/emails${query}`,
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
                    throw new Error("Invalid email data received");
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
    }, [token, selectedCategory]);

    // Fetch the IDs of emails protected by this user.
    useEffect(() => {
        if (!token) {
            setProtectedIds([]);
            setProtectionError("");
            setProtectionLoading(false);
            return;
        }

        let cancelled = false;

        const fetchProtectedEmails = async () => {
            setProtectionLoading(true);
            setProtectionError("");

            try {
                const response = await fetch(
                    `${BACKEND_ORIGIN}/api/protected-emails`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Failed to fetch protected emails"
                    );
                }

                if (!Array.isArray(result.data)) {
                    throw new Error(
                        "Invalid protected-email data received"
                    );
                }

                if (!cancelled) {
                    setProtectedIds(
                        result.data.map((email) => email.messageId)
                    );
                }
            } catch (error) {
                if (!cancelled) {
                    setProtectedIds([]);
                    setProtectionError(
                        error.message || "Could not check protected emails"
                    );
                }
            } finally {
                if (!cancelled) {
                    setProtectionLoading(false);
                }
            }
        };

        fetchProtectedEmails();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredEmails = emails.filter((email) => {
        const sender = email.sender || "";
        const subject = email.subject || "";

        return `${sender} ${subject}`
            .toLowerCase()
            .includes(normalizedSearch);
    });

    const allVisibleSelected =
        filteredEmails.length > 0 &&
        filteredEmails.every((email) =>
            selectedIds.includes(email.messageId)
        );

    const toggleEmail = (messageId) => {
        setSelectedIds((previousIds) =>
            previousIds.includes(messageId)
                ? previousIds.filter((id) => id !== messageId)
                : [...previousIds, messageId]
        );

        setActionMessage("");
        setActionError("");
    };

    const toggleAllVisible = () => {
        const visibleIds = filteredEmails.map(
            (email) => email.messageId
        );

        if (allVisibleSelected) {
            setSelectedIds((previousIds) =>
                previousIds.filter(
                    (id) => !visibleIds.includes(id)
                )
            );
        } else {
            setSelectedIds((previousIds) => [
                ...new Set([...previousIds, ...visibleIds])
            ]);
        }

        setActionMessage("");
        setActionError("");
    };

    const clearSelection = () => {
        setSelectedIds([]);
        setActionMessage("");
        setActionError("");
    };

    const handleCleanup = async (action) => {
        if (!token || selectedIds.length === 0 || actionLoading) {
            return;
        }

        const actionLabel =
            action === "archive" ? "archive" : "move to Trash";

        const confirmed = window.confirm(
            `Are you sure you want to ${actionLabel} ${selectedIds.length} selected email(s)? Protected and whitelisted emails will be skipped.`
        );

        if (!confirmed) {
            return;
        }

        setActionLoading(true);
        setActionMessage("");
        setActionError("");

        try {
            const response = await fetch(
                `${BACKEND_ORIGIN}/api/cleanup/bulk`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messageIds: selectedIds,
                        action,
                        confirmed: true
                    })
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Cleanup operation failed"
                );
            }

            const processedIds = result.data?.messageIds || [];
            const skippedIds =
                result.data?.protectedSkippedMessageIds || [];

            setEmails((previousEmails) =>
                previousEmails.filter(
                    (email) => !processedIds.includes(email.messageId)
                )
            );

            setSelectedIds(skippedIds);

            setActionMessage(
                `${result.message}. Processed: ${result.data.processedCount}; skipped: ${result.data.protectedSkippedCount}.`
            );
        } catch (error) {
            setActionError(
                error.message || "Cleanup operation failed"
            );
        } finally {
            setActionLoading(false);
        }
    };

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
                    <p>Search, filter and manage saved emails</p>
                </div>

                <span className="email-total">
                    {loading
                        ? "Loading..."
                        : `${filteredEmails.length} emails`}
                </span>
            </div>

            <div className="email-controls">
                <input
                    className="email-search-input"
                    type="search"
                    placeholder="Search sender or subject..."
                    aria-label="Search emails by sender or subject"
                    value={searchTerm}
                    onChange={(event) =>
                        setSearchTerm(event.target.value)
                    }
                />

                <select
                    className="email-category-select"
                    aria-label="Filter emails by category"
                    value={selectedCategory}
                    onChange={(event) =>
                        setSelectedCategory(event.target.value)
                    }
                >
                    {categories.map((category) => (
                        <option
                            key={category.value || "all"}
                            value={category.value}
                        >
                            {category.label}
                        </option>
                    ))}
                </select>
            </div>

            {token && !loading && !error && emails.length > 0 && (
                <div className="selection-toolbar">
                    <label className="select-all-label">
                        <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleAllVisible}
                            disabled={filteredEmails.length === 0}
                        />
                        <span>Select all visible</span>
                    </label>

                    <div className="selection-summary">
                        <span>{selectedIds.length} selected</span>

                        {selectedIds.length > 0 && (
                            <button
                                type="button"
                                className="clear-selection-button"
                                onClick={clearSelection}
                                disabled={actionLoading}
                            >
                                Clear selection
                            </button>
                        )}
                    </div>
                </div>
            )}

            {selectedIds.length > 0 && (
                <div className="email-action-toolbar">
                    <p>Manage {selectedIds.length} selected email(s)</p>

                    <div className="email-action-buttons">
                        <button
                            type="button"
                            className="email-action-button archive-button"
                            onClick={() => handleCleanup("archive")}
                            disabled={actionLoading || !token}
                        >
                            {actionLoading ? "Processing..." : "Archive selected"}
                        </button>

                        <button
                            type="button"
                            className="email-action-button trash-button"
                            onClick={() => handleCleanup("delete")}
                            disabled={actionLoading || !token}
                        >
                            {actionLoading ? "Processing..." : "Move to Trash"}
                        </button>
                    </div>
                </div>
            )}

            {actionMessage && (
                <div className="cleanup-action-success" role="status">
                    {actionMessage}
                </div>
            )}

            {actionError && (
                <div className="email-list-error" role="alert">
                    {actionError}
                </div>
            )}

            {protectionError && token && (
                <div className="email-list-error" role="alert">
                    Protected-email indicators could not be loaded.
                    Cleanup safeguards are still enforced by the backend.
                </div>
            )}

            {!protectionError && protectionLoading && token && (
                <p className="protection-loading">
                    Checking protected emails...
                </p>
            )}

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
                    {selectedCategory
                        ? "No saved emails found in this category."
                        : "No saved emails found. Fetch your Gmail messages through the backend first."}
                </div>
            )}

            {!loading &&
                !error &&
                emails.length > 0 &&
                filteredEmails.length === 0 && (
                    <div className="email-list-message">
                        No emails match your search.
                    </div>
                )}

            {!loading && !error && filteredEmails.length > 0 && (
                <div className="email-list">
                    {filteredEmails.map((email) => {
                        const isSelected = selectedIds.includes(
                            email.messageId
                        );

                        const isProtected = protectedIds.includes(
                            email.messageId
                        );

                        return (
                            <article
                                className={`email-item ${
                                    isSelected ? "selected" : ""
                                }`}
                                key={email.messageId}
                            >
                                <input
                                    className="email-select-checkbox"
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={actionLoading}
                                    onChange={() =>
                                        toggleEmail(email.messageId)
                                    }
                                    aria-label={`Select email: ${
                                        email.subject || "No subject"
                                    }`}
                                />

                                <div className="email-item-main">
                                    <div className="email-sender-row">
                                        <h3>
                                            {email.sender || "Unknown sender"}
                                        </h3>

                                        {isProtected && (
                                            <span className="protected-badge">
                                                <span aria-hidden="true">✓</span>
                                                Protected
                                            </span>
                                        )}
                                    </div>

                                    <p className="email-subject">
                                        {email.subject || "(No subject)"}
                                    </p>

                                    <div className="email-item-meta">
                                        <span className="email-category">
                                            {email.category || "other"}
                                        </span>

                                        <span>{formatDate(email.date)}</span>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {selectedIds.length > 0 && (
                <p className="selection-note">
                    Protected or whitelisted emails are skipped by the
                    backend. Cleanup actions require confirmation.
                </p>
            )}
        </section>
    );
}

export default EmailList;
