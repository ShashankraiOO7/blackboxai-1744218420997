const rateLimit = require('express-rate-limit');
const logger = require('./logger');

const bookingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 booking requests per windowMs
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            status: 'error',
            message: 'Too many booking attempts, please try again later'
        });
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false // Disable X-RateLimit-* headers
});

const statusCheckLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // Limit each IP to 60 status checks per minute
    handler: (req, res) => {
        logger.warn(`Status check rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            status: 'error',
            message: 'Too many status checks, please slow down'
        });
    }
});

module.exports = {
    bookingLimiter,
    statusCheckLimiter
};
