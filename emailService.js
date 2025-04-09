const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
    constructor(config) {
        this.transporter = nodemailer.createTransport({
            service: config.service,
            auth: {
                user: config.auth.user,
                pass: config.auth.pass
            }
        });
        this.from = config.from;
    }

    async sendVerificationEmail(to, verificationToken) {
        try {
            await this.transporter.sendMail({
                from: this.from,
                to,
                subject: 'Verify your email address',
                html: `
                    <h1>Email Verification</h1>
                    <p>Please click the link below to verify your email address:</p>
                    <a href="${process.env.BASE_URL}/verify-email?token=${verificationToken}">
                        Verify Email
                    </a>
                    <p>The link will expire in 24 hours.</p>
                `
            });
            logger.info(`Verification email sent to ${to}`);
        } catch (error) {
            logger.error('Failed to send verification email', { error });
        }
    }

    async sendBookingNotification(to, bookingDetails) {
        try {
            await this.transporter.sendMail({
                from: this.from,
                to,
                subject: 'IRCTC Booking Status',
                html: `
                    <h1>Booking ${bookingDetails.status}</h1>
                    <p>Your booking from ${bookingDetails.from} to ${bookingDetails.to} is ${bookingDetails.status}</p>
                    ${bookingDetails.status === 'completed' ? 
                        `<p>PNR: ${bookingDetails.pnr || 'Not available yet'}</p>` : 
                        `<p>We'll notify you when there are updates</p>`
                    }
                `
            });
            logger.info(`Booking notification sent to ${to}`);
        } catch (error) {
            logger.error('Failed to send booking notification', { error });
        }
    }
}

module.exports = EmailService;
