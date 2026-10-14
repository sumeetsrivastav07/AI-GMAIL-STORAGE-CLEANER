
import "./CategoryBreakdown.css";

function CategoryBreakdown({ categoryCounts = {} }) {
    const categories = Object.entries(categoryCounts || {})
        .map(([name, count]) => ({
            name,
            count: Math.max(0, Number(count) || 0),
        }))
        .sort((a, b) => b.count - a.count);

    const totalEmails = categories.reduce(
        (total, category) => total + category.count,
        0
    );

    return (
        <section className="category-breakdown">
            <div className="category-breakdown-header">
                <div>
                    <h2>Email Categories</h2>
                    <p>Understand your inbox at a glance</p>
                </div>

                <span className="category-total">
                    {totalEmails.toLocaleString()} emails
                </span>
            </div>

            {categories.length === 0 || totalEmails === 0 ? (
                <p className="category-empty">
                    No categorized emails yet. Analyze your Gmail to see
                    the breakdown here.
                </p>
            ) : (
                <div className="category-breakdown-list">
                    {categories.map((category, index) => {
                        const percentage =
                            (category.count / totalEmails) * 100;

                        return (
                            <div
                                className="category-breakdown-item"
                                key={category.name}
                                style={{ "--category-index": index }}
                            >
                                <div className="category-breakdown-labels">
                                    <span className="category-name">
                                        {category.name
                                            .replace(/[_-]/g, " ")
                                            .replace(/\b\w/g, (letter) =>
                                                letter.toUpperCase()
                                            )}
                                    </span>

                                    <span className="category-count">
                                        {category.count.toLocaleString()}
                                        {" · "}
                                        {percentage.toFixed(1)}%
                                    </span>
                                </div>

                                <div
                                    className="category-progress-track"
                                    role="progressbar"
                                    aria-label={`${category.name} emails`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Number(
                                        percentage.toFixed(1)
                                    )}
                                >
                                    <div
                                        className="category-progress-fill"
                                        style={{
                                            width: `${percentage}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default CategoryBreakdown;
