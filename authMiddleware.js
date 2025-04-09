const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('./logger');

const SALT_ROUNDS = 10;

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        
        jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
            if (err) {
                logger.warn('JWT verification failed', { error: err.message });
                return res.sendStatus(403);
            }
            
            req.user = user;
            next();
        });
    } else {
        logger.warn('Authentication attempt without token');
        res.sendStatus(401);
    }
};

const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

const checkRole = (requiredRole) => {
    return (req, res, next) => {
        if (req.user?.role !== requiredRole) {
            logger.warn(`Unauthorized access attempt by ${req.user?.username} to ${requiredRole}-only endpoint`);
            return res.sendStatus(403);
        }
        next();
    };
};

const generateToken = (user) => {
    return jwt.sign(user, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
};

module.exports = {
    authenticateJWT,
    generateToken,
    checkRole,
    hashPassword,
    comparePassword,
    invalidateToken,
    verifyActiveSession
};
