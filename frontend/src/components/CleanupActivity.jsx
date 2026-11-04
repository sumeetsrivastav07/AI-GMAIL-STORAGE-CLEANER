import { useCallback, useEffect, useState } from "react";
import "./CleanupActivity.css";
const BACKEND_ORIGIN = "";

function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function prettyAction(action) {
    if (!action) return "Unknown action";
    return action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
}

function CleanupActivity({ token }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [undoingId, setUndoingId] = useState("");
    const [notice, setNotice] = useState("");

    const fetchHistory = useCallback(async (signal) => {
        if (!token) {
            setHistory([]);
            setError("");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${BACKEND_ORIGIN}/api/cleanup/history`, {
                headers: { Authorization: `Bearer ${token}` },
                signal,
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Could not load cleanup history.");
            }

            const records = result.data?.history;
            if (!Array.isArray(records)) {
                throw new Error("Cleanup history response has an unexpected format.");
            }

            setHistory(records);
        } catch (err) {
            if (err.name !== "AbortError") {
                setError(err.message || "Could not load cleanup activity.");
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const controller = new AbortController();
        fetchHistory(controller.signal);
        return () => controller.abort();
    }, [fetchHistory]);

    const handleUndo = async (record) => {
        if (!token || !record?._id || undoingId) return;

        setUndoingId(record._id);
        setError("");
        setNotice("");

        try {
            const response = await fetch(
                `${BACKEND_ORIGIN}/api/cleanup/undo/${encodeURIComponent(record._id)}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Undo failed. Please try again.");
            }

            setNotice(`Undo completed for message ${record.messageId}.`);
            await fetchHistory();
        } catch (err) {
            setError(err.message || "Undo failed. Please try again.");
        } finally {
            setUndoingId("");
        }
    };

    return (
        <article className="panel activity-panel">
            <div className="panel-heading">
                <div>
                    <h2>Cleanup activity</h2>
                    <p>Review your recent cleanup actions.</p>
                </div>
                <span className="panel-tag">{history.length} records</span>
            </div>

            {notice && <p className="activity-notice" role="status">{notice}</p>}
            {error && <p className="activity-error" role="alert">{error}</p>}
            {loading && <p className="activity-message">Loading cleanup activity...</p>}

            {!loading && !error && history.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">↻</div>
                    <h3>No cleanup activity yet</h3>
                    <p>Your recorded cleanup actions will appear here.</p>
                </div>
            )}

            {!loading && history.length > 0 && (
                <div className="activity-list">
                    {history.map((record) => {
                        const canUndo = record.status === "completed";
                        const isUndoing = undoingId === record._id;

                        return (
                            <section className="activity-record" key={record._id}>
                                <div className="activity-record-main">
                                    <div className="activity-record-title">
                                        <span className={`activity-action action-${String(record.action || "unknown").toLowerCase()}`}>
                                            {prettyAction(record.action)}
                                        </span>
                                        <span className={`activity-status status-${String(record.status || "unknown").toLowerCase()}`}>
                                            {record.status || "unknown"}
                                        </span>
                                    </div>
                                    <p className="activity-message-id">
                                        <strong>Message ID:</strong> {record.messageId || "Unavailable"}
                                    </p>
                                    <p className="activity-timestamp">
                                        <strong>When:</strong> {formatDate(record.createdAt)}
                                    </p>
                                    {Array.isArray(record.previousLabels) && record.previousLabels.length > 0 && (
                                        <p className="activity-labels">
                                            <strong>Previous labels:</strong> {record.previousLabels.join(", ")}
                                        </p>
                                    )}
                                    {record.undoneAt && (
                                        <p className="activity-timestamp">
                                            <strong>Undone:</strong> {formatDate(record.undoneAt)}
                                        </p>
                                    )}
                                </div>

                                {canUndo && (
                                    <button
                                        type="button"
                                        className="activity-undo-button"
                                        onClick={() => handleUndo(record)}
                                        disabled={Boolean(undoingId)}
                                    >
                                        {isUndoing ? "Undoing..." : "Undo"}
                                    </button>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </article>
    );
}

export default CleanupActivity;
