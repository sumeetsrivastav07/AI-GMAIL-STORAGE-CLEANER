
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;

    // Log detailed errors on the server, not in the API response.
    if (process.env.NODE_ENV !== "production") {
        console.error(err);
    } else {
        console.error(err.message || "Internal server error");
    }

    res.status(statusCode).json({
        success: false,
        message:
            statusCode >= 500
                ? "Internal server error"
                : err.message || "Request failed"
    });
};

export default errorHandler;
