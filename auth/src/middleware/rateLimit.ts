import rateLimit from "express-rate-limit";

export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: 429,
        message: "Too many login attempts, please try again after 15 minutes",
    },
    handler: (req, res, _next, options) => {
        res.status(options.statusCode).json(options.message);
    },
});