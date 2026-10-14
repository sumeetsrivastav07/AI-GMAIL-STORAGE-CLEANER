
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
    }, [token, selectedCategory]);

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
    };

    const clearSelection = () => {
        setSelectedIds([]);
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
                    <p>Search, filter and select saved emails</p>
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
                        <span>
                            {selectedIds.length} selected
                        </span>

                        {selectedIds.length > 0 && (
                            <button
                                type="button"
                                className="clear-selection-button"
                                onClick={clearSelection}
                            >
                                Clear selection
                            </button>
                        )}
                    </div>
                </div>
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
                                    onChange={() =>
                                        toggleEmail(email.messageId)
                                    }
                                    aria-label={`Select email: ${
                                        email.subject || "No subject"
                                    }`}
                                />

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
                        );
                    })}
                </div>
            )}

            {selectedIds.length > 0 && (
                <p className="selection-note">
                    Selection is preserved when you change your search
                    or category filter.
                </p>
            )}
        </section>
    );
}

export default EmailList;
