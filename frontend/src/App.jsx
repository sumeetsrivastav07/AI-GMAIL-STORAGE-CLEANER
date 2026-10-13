import "./App.css";

const stats = [
    {
        icon: "✉",
        label: "Emails analyzed",
        value: "—",
        detail: "Waiting for live data",
        color: "blue"
    },
    {
        icon: "◈",
        label: "Promotional emails",
        value: "—",
        detail: "Waiting for live data",
        color: "purple"
    },
    {
        icon: "♡",
        label: "Protected emails",
        value: "—",
        detail: "Waiting for live data",
        color: "green"
    },
    {
        icon: "↗",
        label: "Emails cleaned",
        value: "—",
        detail: "Waiting for live data",
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

function App() {
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
                        <span>Rules & whitelist</span>
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
                        <div className="profile-avatar">C</div>

                        <div>
                            <h3>Your workspace</h3>
                            <p>Dashboard preview</p>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <p>
                        Workspace <span>/</span> Overview
                    </p>

                    <div className="preview-status">
                        <span className="status-dot"></span>
                        Dashboard preview
                    </div>
                </header>

                <div className="dashboard-content">
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
                        </div>

                        <div className="welcome-visual" aria-hidden="true">
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
                            {stats.map((stat) => (
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
                        <span>Dashboard foundation</span>
                    </footer>
                </div>
            </main>
        </div>
    );
}

export default App;