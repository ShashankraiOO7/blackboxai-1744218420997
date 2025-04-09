const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const { Worker } = require('worker_threads');
const path = require('path');
const statusTracker = require('./statusTracker');
const logger = require('./logger');

// API Endpoints
const { validateBookingConfig } = require('./configValidator');
const { bookingLimiter, statusCheckLimiter } = require('./rateLimiter');
const { authenticateJWT, generateToken } = require('./authMiddleware');

const { hashPassword, comparePassword, checkRole } = require('./authMiddleware');

// Mock user database (in production, use a proper database)
const users = [];
let nextUserId = 1;

// Add initial admin user (in production, do this through registration)
(async () => {
    const hashedPassword = await hashPassword('admin123');
    users.push({
        id: nextUserId++,
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
    });
})();

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Authenticate and get JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "admin"
 *               password:
 *                 type: string
 *                 example: "password"
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "newuser"
 *               password:
 *                 type: string
 *                 example: "securepassword123"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: "user"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Username already exists
 */
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   role:
 *                     type: string
 *       403:
 *         description: Forbidden (admin access required)
 */
app.get('/api/admin/users', authenticateJWT, checkRole('admin'), (req, res) => {
    res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role
    })));
});

app.post('/api/register', async (req, res) => {
    const { username, password, email, role = 'user', captchaToken } = req.body;
    
    // Verify CAPTCHA token
    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            new URLSearchParams({
                secret: process.env.RECAPTCHA_SECRET,
                response: captchaToken
            })
        );
        
        if (!response.data.success) {
            return res.status(400).json({ message: 'CAPTCHA verification failed' });
        }
    } catch (error) {
        logger.error('CAPTCHA verification error', { error });
        return res.status(400).json({ message: 'CAPTCHA verification failed' });
    }
    
    if (users.some(u => u.username === username)) {
        return res.status(400).json({ message: 'Username already exists' });
    }
    
    try {
        const hashedPassword = await hashPassword(password);
        const newUser = {
            id: nextUserId++,
            username,
            password: hashedPassword,
            email,
            role,
            verified: false
        };
        users.push(newUser);
        
        // Generate verification token
        const verificationToken = jwt.sign(
            { userId: newUser.id, email: newUser.email },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '24h' }
        );
        
        // Send verification email
        await emailService.sendVerificationEmail(newUser.email, verificationToken);
        
        res.status(201).json({ 
            message: 'User registered successfully. Please check your email to verify your account.',
            verified: false
        });
    } catch (error) {
        logger.error('Registration failed', { error });
        res.status(500).json({ message: 'Registration failed' });
    }
});

/**
 * @swagger
 * /api/verify-email:
 *   get:
 *     summary: Verify email address
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
app.get('/api/verify-email', async (req, res) => {
    const { token } = req.query;
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }
        
        user.verified = true;
        logger.info(`Email verified for user ${user.username}`);
        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        logger.error('Email verification failed', { error });
        res.status(400).json({ message: 'Invalid or expired token' });
    }
});

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Authenticate and get JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "admin"
 *               password:
 *                 type: string
 *                 example: "admin123"
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials
 */
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    
    if (user && await comparePassword(password, user.password)) {
        const token = generateToken({ 
            id: user.id, 
            username: user.username, 
            role: user.role 
        });
        res.json({ token });
    } else {
        logger.warn('Failed login attempt', { username });
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

/**
 * @swagger
 * /api/start-booking:
 *   post:
 *     summary: Start a new Tatkal booking process
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credentials
 *               - journeyDetails
 *               - passengers
 *             properties:
 *               credentials:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                     example: "irctc_user"
 *                   password:
 *                     type: string
 *                     example: "secure_password"
 *               journeyDetails:
 *                 type: object
 *                 properties:
 *                   from:
 *                     type: string
 *                     example: "DELHI"
 *                   to:
 *                     type: string
 *                     example: "MUMBAI"
 *                   date:
 *                     type: string
 *                     pattern: '^\d{2}/\d{2}/\d{4}$'
 *                     example: "15/08/2023"
 *                   trainNumber:
 *                     type: string
 *                     example: "12345"
 *               passengers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     age:
 *                       type: integer
 *                       example: 30
 *                     gender:
 *                       type: string
 *                       enum: [M, F, O]
 *                       example: "M"
 *                     berth:
 *                       type: string
 *                       enum: [LB, UB, SL, SU]
 *                       example: "LB"
 *               options:
 *                 type: object
 *                 properties:
 *                   multiTab:
 *                     type: boolean
 *                     example: true
 *                   maxRetries:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 10
 *                     example: 5
 *     responses:
 *       200:
 *         description: Booking process started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Booking process started"
 *                 bookingId:
 *                   type: string
 *                   example: "1692028800000"
 *       400:
 *         description: Invalid input data
 *       429:
 *         description: Too many requests
 */
app.post('/api/start-booking', authenticateJWT, checkRole('user'), bookingLimiter, (req, res) => {
    const { credentials, journeyDetails, passengers, options } = req.body;
    
    // Validate input
    const validation = validateBookingConfig({
        credentials,
        journey: journeyDetails,
        passengers,
        options
    });
    
    if (!validation.valid) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid booking configuration',
            error: validation.error
        });
    }
    
    // Generate unique booking ID
    const bookingId = Date.now().toString();
    
    // Create worker thread
    const worker = new Worker(path.join(__dirname, 'booking.js'), {
        workerData: {
            config: {
                credentials,
                journey: journeyDetails,
                passengers,
                options
            }
        }
    });
    
    // Store reference to worker
    statusTracker.addBooking(bookingId, worker);
    
    // Handle messages from worker
    worker.on('message', (msg) => {
        if (msg.type === 'status') {
            statusTracker.updateStatus(bookingId, msg.status, msg);
        }
    });
    
    worker.on('error', (err) => {
        logger.error(`Booking ${bookingId} error: ${err.message}`, { error: err });
        statusTracker.updateStatus(bookingId, 'failed', { error: err.message });
    });
    
    worker.on('exit', (code) => {
        statusTracker.completeBooking(bookingId, code === 0);
    });
    
    res.json({
        status: 'success',
        message: 'Booking process started',
        bookingId
    });
});

/**
 * @swagger
 * /api/booking-status/{bookingId}:
 *   get:
 *     summary: Check status of a booking
 *     tags: [Booking]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: The booking ID
 *     responses:
 *       200:
 *         description: Booking status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [initializing, logging_in, filling_journey_details, booking_ticket, completed, failed]
 *                   example: "booking_ticket"
 *                 lastUpdate:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-08-15T10:30:00.000Z"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-08-15T10:25:00.000Z"
 *                 data:
 *                   type: object
 *                 error:
 *                   type: string
 *       404:
 *         description: Booking not found
 *       429:
 *         description: Too many requests
 */
app.get('/api/booking-status/:bookingId', authenticateJWT, statusCheckLimiter, (req, res) => {
    const status = statusTracker.getStatus(req.params.bookingId);
    if (!status) {
        return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(status);
});

// Cleanup completed bookings periodically
setInterval(() => {
    statusTracker.cleanupCompleted();
}, 3600000); // Run every hour

// Log server startup
logger.info('IRCTC Tatkal Booking Agent server started');


// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
