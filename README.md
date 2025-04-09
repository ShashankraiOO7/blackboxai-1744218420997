
Built by https://www.blackbox.ai

---

```markdown
# IRCTC Tatkal Booking Agent

## Project Overview
The IRCTC Tatkal Booking Agent is a web-based application that automates the booking of Tatkal train tickets on the IRCTC platform. It leverages Puppeteer for browser automation, providing users with a streamlined interface to input their booking details. The application conducts multiple parallel booking attempts to maximize the chances of securing tickets during high-demand periods.

## Installation

To set up the project locally, follow these steps:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/yourusername/irctc-tatkal-booking-agent.git
   cd irctc-tatkal-booking-agent
   ```

2. **Install Dependencies**:

   Ensure you have Node.js installed (version 16.0.0 or higher). Then, run:

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:

   Create a `.env` file in the root directory of your project and set your environment variables. For example:

   ```env
   JWT_SECRET=your_jwt_secret
   RECAPTCHA_SECRET=your_recaptcha_secret
   BASE_URL=http://localhost:3000
   ```

4. **Start the Server**:

   You can start the server using:

   ```bash
   npm start
   ```

5. **Access the Application**:

   Open your browser and navigate to `http://localhost:3000` to use the booking agent.

## Usage

1. Enter your IRCTC username and password in the Login section.
2. Provide the journey details including from station, to station, journey date, and (optionally) train number.
3. Input passenger details by clicking on “Add Passenger” for multiple travelers.
4. Choose booking options like auto retry and multi-tab options if desired.
5. Click on "Start Booking" to initiate the booking process.
6. Monitor the booking status from the status panel that appears.

## Features

- **Automated Booking**: Automatically attempts to book Tatkal tickets as soon as booking opens.
- **Multi-Tab Booking**: Supports simultaneous booking attempts in multiple tabs to enhance success rates.
- **User Authentication**: Secure user authentication with JWT for API access.
- **Progress Monitoring**: Real-time status updates during the booking process.
- **Error Handling**: Built-in mechanisms for handling validation and authentication errors.

## Dependencies

The project uses the following dependencies, as specified in the `package.json`:

- `axios`: ^1.6.2
- `bcrypt`: ^5.1.1
- `express`: ^4.18.2
- `express-rate-limit`: ^6.7.0
- `jsonwebtoken`: ^9.0.2
- `joi`: ^17.9.2
- `nodemailer`: ^6.9.7
- `puppeteer`: ^20.8.1
- `swagger-jsdoc`: ^6.2.8
- `swagger-ui-express`: ^5.0.0
- `winston`: ^3.11.0

For installation of these dependencies, use:

```bash
npm install
```

## Project Structure

Here's a brief overview of the project's folder structure:

```
irctc-tatkal-booking-agent/
│
├── index.html                # Frontend UI for booking agent
├── server.js                 # Express server and API routes
├── booking.js                # Puppeteer script for booking tickets
├── configValidator.js        # Input validation for booking configuration
├── emailService.js           # Email service for sending notifications
├── logger.js                 # Logger configuration using Winston
├── rateLimiter.js            # Middleware for rate limiting API calls
├── statusTracker.js          # Manages booking statuses
├── authMiddleware.js         # Middleware for handling authentication
└── package.json              # Project metadata and dependencies
```

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

## Acknowledgements

- Puppeteer for browser automation.
- Express for creating the server.
- Winston for logging.
- Nodemailer for sending emails.
```

This README.md file provides a clear and structured overview of the IRCTC Tatkal Booking Agent project, including steps to install, use, and understand its features and dependencies.