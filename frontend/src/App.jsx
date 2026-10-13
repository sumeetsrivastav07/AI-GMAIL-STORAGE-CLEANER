
import { useEffect, useRef, useState } from "react";
import "./App.css";

const BACKEND_ORIGIN = "http://localhost:5000";
const TOKEN_KEY = "clearmail_token";
const USER_KEY = "clearmail_user";

const baseStats = [
    {
        icon: "✉",
        label: "Emails analyzed",
        value: "—",
        detail: "Saved email records",
        color: "blue"
    },
    {
        icon: "◈",
        label: "Promotional emails",
        value: "—",
        detail: "Coming next",
        color: "purple"
    },
    {
        icon: "♡",
        label: "Protected emails",
        value: "—",
        detail: "Coming next",
        color: "green"
    },
    {
        icon: "↗",
        label: "Emails cleaned",
        value: "—",
        detail: "Coming next",
        color: "orange"
    }
];

const categories = [
    "Promotional",
    "Newsletter",
    "Important",
    "Social",
    "Other"
];

function readStoredUser() {
    try {
        return JSON.parse(
            sessionStorage.getItem(USER_KEY) || "null"
        );
    } catch {
        return null;
    }
}

function App() {
    const [authToken, setAuthToken] = useState(
        () => sessionStorage.getItem(TOKEN_KEY) || ""
    );

    const [authUser, setAuthUser] = useState(readStoredUser);
    const [isConnecting, setIsConnecting] = useState(false);
    const [authError, setAuthError] = useState("");

    const [emailStats, setEmailStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState("");

    const popupRef = useRef(null);

    const isAuthenticated = Boolean(authToken && authUser);

    // Receive Google OAuth result from the login popup.
    useEffect(() => {
        const handleAuthMessage = (event) => {
            if (event.origin !== BACKEND_ORIGIN) {
                return;
            }

            if (
                !popupRef.current ||
                event.source !== popupRef.current
            ) {
                return;
            }

            const result = event.data;

            if (
                result?.type === "oauth-success" &&
                result.token &&
                result.user
            ) {
                sessionStorage.setItem(
                    TOKEN_KEY,
                    result.token
                );

                sessionStorage.setItem(
                    USER_KEY,
                    JSON.stringify(result.user)
                );

                setAuthToken(result.token);
                setAuthUser(result.user);
                setAuthError("");
                setIsConnecting(false);
                popupRef.current = null;
                return;
            }

            if (result?.type === "oauth-error") {
                setAuthError(
                    result.message || "Google sign-in failed."
                );

                setIsConnecting(false);
                popupRef.current = null;
            }
        };

        window.addEventListener("message", handleAuthMessage);

        return () => {
            window.removeEventListener(
                "message",
                handleAuthMessage
            );
        };
    }, []);

    // Fetch real email statistics when a JWT is available.
    useEffect(() => {
        if (!authToken) {
            setEmailStats(null);
            setStatsLoading(false);
            setStatsError("");
            return;
        }

        let cancelled = false;

        const fetchEmailStats = async () => {
            setStatsLoading(true);
            setStatsError("");

            try {
                const response = await fetch(
                    `${BACKEND_ORIGIN}/api/gmail/stats`,
                    {
                        headers: {
                            Authorization: `Bearer ${authToken}`
                        }
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        "Could not fetch email statistics"
                    );
                }

                if (
                    typeof result.data?.analyzedEmails !== "number"
                ) {
                    throw new Error(
                        "The statistics response has an invalid format"
                    );
                }

                if (!cancelled) {
                    setEmailStats(result.data.analyzedEmails);
                }
            } catch (error) {
                if (!cancelled) {
                    setEmailStats(null);
                    setStatsError(
                        error.message ||
                        "Could not load email statistics"
                    );
                }
            } finally {
                if (!cancelled) {
                    setStatsLoading(false);
                }
            }
        };

        fetchEmailStats();

        return () => {
            cancelled = true;
        };
    }, [authToken]);

    const handleConnectGmail = () => {
        setAuthError("");
        setIsConnecting(true);

        const popup = window.open(
            `${BACKEND_ORIGIN}/api/auth/google`,
            "clearmail-google-login",
            "popup=yes,width=520,height=720"
        );

        if (!popup) {
            setIsConnecting(false);
            setAuthError(
                "Sign-in popup was blocked. Allow popups and try again."
            );
            return;
        }

        popupRef.current = popup;
    };

    const handleSignOut = () => {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);

        setAuthToken("");
        setAuthUser(null);
        setEmailStats(null);
        setStatsError("");
        setAuthError("");
        setIsConnecting(false);

        if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close();
        }

        popupRef.current = null;
    };

    const displayStats = baseStats.map((stat, index) => {
        if (index !== 0) {
            return stat;
        }

        return {
            ...stat,
            value: statsLoading
                ? "..."
                : emailStats !== null
                    ? String(emailStats)
                    : "—",
            detail: statsLoading
                ? "Loading saved records..."
                : statsError
                    ? "Could not load count"
                    : isAuthenticated
                        ? "Saved email records"
                        : "Sign in to view statistics"
        };
    });

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-icon">C</div>

                    <div>
                        <h2>ClearMail</h2>
                        <p>Gmail Storage Cleaner</p>
                    </div>
                </div>

                <p className="nav-heading">WORKSPACE</p>

                <nav className="navigation">
                    <div className="nav-item active">
                        <span className="nav-icon">▦</span>
                        <span>Overview</span>
                    </div>

                    <div className="nav-item">
                        <span className="nav-icon">✉</span>
                        <span>Emails</span>
                    </div>

                    <div className="nav-item">
                        <span className="nav-icon">↻</span>
                        <span>Cleanup history</span>
                    </div>

                    <div className="nav-item">
                        <span className="nav-icon">◇</span>
                        <span>Rules &amp; whitelist</span>
                    </div>
                </nav>

                <div className="sidebar-bottom">
                    <div className="privacy-card">
                        <div className="privacy-icon">✓</div>

                        <div>
                            <h3>Your inbox, your control</h3>
                            <p>
                                Protection checks help keep important
                                emails safe.
                            </p>
                        </div>
                    </div>

                    <div className="workspace-profile">
                        <div className="profile-avatar">
                            {authUser?.name
                                ? authUser.name.charAt(0).toUpperCase()
                                : "C"}
                        </div>

                        <div>
                            <h3>
                                {authUser?.name || "Your workspace"}
                            </h3>
                            <p>
                                {isAuthenticated
                                    ? authUser.email
                                    : "Not signed in"}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <p>
                        Workspace <span>/</span> Overview
                    </p>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px"
                        }}
                    >
                        <div className="preview-status">
                            <span
                                className="status-dot"
                                style={{
                                    background: isAuthenticated
                                        ? "#28a779"
                                        : "#e5a63b"
                                }}
                            />

                            {isAuthenticated
                                ? "Gmail connected"
                                : "Not connected"}
                        </div>

                        <button
                            type="button"
                            onClick={
                                isAuthenticated
                                    ? handleSignOut
                                    : handleConnectGmail
                            }
                            disabled={isConnecting}
                            style={{
                                border: "none",
                                borderRadius: "9px",
                                padding: "11px 15px",
                                background: isAuthenticated
                                    ? "#eef2f8"
                                    : "#2259d6",
                                color: isAuthenticated
                                    ? "#43516a"
                                    : "#ffffff",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: isConnecting
                                    ? "wait"
                                    : "pointer",
                                opacity: isConnecting ? 0.7 : 1
                            }}
                        >
                            {isConnecting
                                ? "Waiting for Google..."
                                : isAuthenticated
                                    ? "Sign out"
                                    : "Connect Gmail"}
                        </button>
                    </div>
                </header>

                <div className="dashboard-content">
                    {authError && (
                        <div
                            role="alert"
                            style={{
                                marginBottom: "18px",
                                padding: "12px 15px",
                                borderRadius: "10px",
                                background: "#fff0f0",
                                color: "#b42318",
                                fontSize: "12px"
                            }}
                        >
                            {authError}
                        </div>
                    )}

                    {statsError && isAuthenticated && (
                        <div
                            role="alert"
                            style={{
                                marginBottom: "18px",
                                padding: "12px 15px",
                                borderRadius: "10px",
                                background: "#fff8e8",
                                color: "#875b12",
                                fontSize: "12px"
                            }}
                        >
                            Email statistics couldn't load: {statsError}
                        </div>
                    )}

                    <section className="welcome-section">
                        <div className="welcome-copy">
                            <p className="eyebrow">
                                YOUR EMAIL WORKSPACE
                            </p>

                            <h1>
                                A calmer inbox
                                <br />
                                starts with <span>clarity.</span>
                            </h1>

                            <p className="welcome-description">
                                Understand your inbox, review cleanup
                                activity, and keep important emails
                                protected.
                            </p>

                            {!isAuthenticated && (
                                <p
                                    style={{
                                        marginTop: "12px",
                                        fontSize: "12px",
                                        color: "#64718b"
                                    }}
                                >
                                    Connect your Google account to get
                                    started.
                                </p>
                            )}
                        </div>

                        <div
                            className="welcome-visual"
                            aria-hidden="true"
                        >
                            <div className="visual-circle circle-one"></div>
                            <div className="visual-circle circle-two"></div>

                            <div className="mail-illustration">
                                <div className="mail-top">
                                    <span>✉</span>
                                    <span className="mail-dot"></span>
                                </div>

                                <div className="mail-line line-long"></div>
                                <div className="mail-line line-short"></div>

                                <div className="mail-check">✓</div>
                            </div>

                            <div className="floating-label">
                                <span>✓</span> Protected first
                            </div>
                        </div>
                    </section>

                    <section className="stats-section">
                        <div className="section-heading">
                            <div>
                                <h2>Inbox at a glance</h2>
                                <p>
                                    A summary of your email activity.
                                </p>
                            </div>
                        </div>

                        <div className="stats-grid">
                            {displayStats.map((stat) => (
                                <article
                                    className="stat-card"
                                    key={stat.label}
                                >
                                    <div
                                        className={`stat-icon ${stat.color}`}
                                    >
                                        {stat.icon}
                                    </div>

                                    <p className="stat-label">
                                        {stat.label}
                                    </p>

                                    <h3 className="stat-value">
                                        {stat.value}
                                    </h3>

                                    <p className="stat-detail">
                                        {stat.detail}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="dashboard-panels">
                        <article className="panel activity-panel">
                            <div className="panel-heading">
                                <div>
                                    <h2>Cleanup activity</h2>
                                    <p>
                                        Review your recent cleanup actions.
                                    </p>
                                </div>

                                <span className="panel-tag">History</span>
                            </div>

                            <div className="empty-state">
                                <div className="empty-icon">↻</div>

                                <h3>No activity displayed yet</h3>

                                <p>
                                    Your cleanup history will appear here
                                    when the dashboard connects to the API.
                                </p>
                            </div>
                        </article>

                        <article className="panel category-panel">
                            <div className="panel-heading">
                                <div>
                                    <h2>Email categories</h2>
                                    <p>
                                        See how your emails are organized.
                                    </p>
                                </div>
                            </div>

                            <div className="category-list">
                                {categories.map((category, index) => (
                                    <div
                                        className="category-row"
                                        key={category}
                                    >
                                        <span
                                            className={`category-dot category-${index}`}
                                        ></span>

                                        <span className="category-name">
                                            {category}
                                        </span>

                                        <span className="category-count">
                                            —
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <p className="category-footnote">
                                Counts will appear after API integration.
                            </p>
                        </article>
                    </section>

                    <footer className="dashboard-footer">
                        <span>ClearMail · Gmail Storage Cleaner</span>
                        <span>
                            {isAuthenticated
                                ? "Google account connected"
                                : "Dashboard preview"}
                        </span>
                    </footer>
                </div>
            </main>
        </div>
    );
}

export default App;
