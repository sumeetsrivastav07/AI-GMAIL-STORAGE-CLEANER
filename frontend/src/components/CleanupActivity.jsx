
import { useEffect, useState } from "react";
import "./CleanupActivity.css";

const BACKEND_ORIGIN = "http://localhost:5000";

function CleanupActivity({ token }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token) {
            setHistory([]);
            return;
        }

        const controller = new AbortController();

        async function fetchHistory() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `${BACKEND_ORIGIN}/api/cleanup/history`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controller.signal,
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Could not load cleanup history"
                    );
                }

                // We will map the returned data after verifying
                // the exact response shape from your backend.
                const records = Array.isArray(result.data)
                    ? result.data
                    : result.data?.history;

                if (!Array.isArray(records)) {
                    throw new Error(
                        "Unexpected history response format"
                    );
                }

                setHistory(records);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err.message || "Could not load activity");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchHistory();

        return () => controller.abort();
    }, [token]);

    return (
        <article className="panel activity-panel">
            <div className="panel-heading">
                <div>
                    <h2>Cleanup activity</h2>
                    <p>Review your recent cleanup actions.</p>
                </div>
                <span className="panel-tag">History</span>
            </div>

            {loading && <p>Loading cleanup activity...</p>}

            {error && <p role="alert">{error}</p>}

            {!loading && !error && history.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">↻</div>
                    <h3>No cleanup activity yet</h3>
                    <p>Your recorded cleanup actions will appear here.</p>
                </div>
            )}

            {!loading && !error && history.length > 0 && (
                <p>
                    Retrieved {history.length} cleanup record(s).
                    Next, we will display their action details and timestamps.
                </p>
            )}
        </article>
    );
}

export default CleanupActivity;
