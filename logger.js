const winston = require('winston');
const { combine, timestamp, printf } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        new winston.transports.File({ 
            filename: 'booking-system.log',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        })
    ]
});

// Add colors for console output
winston.addColors({
    error: 'red',
    warn: 'yellow',
    info: 'cyan',
    debug: 'green'
});

module.exports = logger;
