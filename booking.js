const puppeteer = require('puppeteer');
const { setTimeout } = require('timers/promises');
const { parentPort } = require('worker_threads');
const logger = require('./logger');

// Status reporting helper
function reportStatus(status, data = {}) {
  if (parentPort) {
    parentPort.postMessage({ type: 'status', status, ...data });
  } else {
    console.log(`[STATUS] ${status}`, data);
  }
}

class IRCTCBookingAgent {
    constructor(config) {
        this.config = config;
        this.maxRetries = 5;
        this.timeout = 30000; // 30 seconds
        this.browser = null;
        this.pages = [];
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        // Create multiple pages for parallel attempts
        for (let i = 0; i < (this.config.multiTab ? 3 : 1); i++) {
            const page = await this.browser.newPage();
            await page.setViewport({ width: 1200, height: 800 });
            this.pages.push(page);
        }
    }

    async login(page) {
        try {
            await page.goto('https://www.irctc.co.in/nget/train-search', {
                waitUntil: 'networkidle2',
                timeout: this.timeout
            });

            // Fill login form
            await page.type('#userId', this.config.credentials.username);
            await page.type('#pwd', this.config.credentials.password);
            
            // Solve captcha manually (in real implementation would use a service)
            logger.info('Waiting for manual captcha solution...');
            await page.waitForSelector('#loginHeader', { timeout: 120000 });
            
            // Click login button
            await page.click('.search_btn');
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            
            return true;
        } catch (error) {
            logger.error('Login failed', { error });
            return false;
        }
    }

    async fillJourneyDetails(page) {
        try {
            // Fill from station
            await page.type('#origin > span > input', this.config.journey.from);
            await page.waitForSelector('#pr_id_1_list > li', { visible: true });
            await page.click('#pr_id_1_list > li');
            
            // Fill to station
            await page.type('#destination > span > input', this.config.journey.to);
            await page.waitForSelector('#pr_id_2_list > li', { visible: true });
            await page.click('#pr_id_2_list > li');
            
            // Fill date
            await page.click('.ng-tns-c58-10');
            await page.keyboard.type(this.config.journey.date);
            
            // Fill train number if specified
            if (this.config.journey.trainNumber) {
                await page.type('#journeyQuota > div > div > app-autocomplete > span > input', this.config.journey.trainNumber);
                await page.waitForSelector('#pr_id_4_list > li', { visible: true });
                await page.click('#pr_id_4_list > li');
            }
            
            // Select Tatkal quota
            await page.select('#journeyQuota', 'TQ');
            
            return true;
        } catch (error) {
            logger.error('Failed to fill journey details', { error });
            return false;
        }
    }

    async bookTicket(page) {
        let attempts = 0;
        let success = false;
        
        while (attempts < this.maxRetries && !success) {
            attempts++;
            logger.info(`Booking attempt ${attempts} of ${this.maxRetries}`);
            
            try {
                // Search trains
                await page.click('.search_btn.train_Search');
                await page.waitForSelector('.ui-table-scrollable-body', { timeout: this.timeout });
                
                // Select train (simplified - would need more logic)
                await page.click('.ui-table-scrollable-body tr:first-child .ui-button');
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                
                // Fill passenger details
                for (let i = 0; i < this.config.passengers.length; i++) {
                    const passenger = this.config.passengers[i];
                    const prefix = `#passenger${i+1}`;
                    
                    await page.type(`${prefix}Name`, passenger.name);
                    await page.type(`${prefix}Age`, passenger.age);
                    await page.select(`${prefix}BerthChoice`, passenger.berth);
                    await page.select(`${prefix}Gender`, passenger.gender);
                }
                
                // Submit booking
                await page.click('#validate');
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                
                // Make payment (simplified)
                await page.click('#payments:enabled');
                success = true;
            } catch (error) {
                logger.warn(`Attempt ${attempts} failed`, { error });
                await setTimeout(5000); // Wait 5 seconds before retry
            }
        }
        
        return success;
    }

    async run() {
        try {
            reportStatus('initializing');
            await this.initialize();
            const results = await Promise.all(
                this.pages.map(async (page, i) => {
                    reportStatus('logging_in', { attempt: i+1 });
                    if (!await this.login(page)) {
                      reportStatus('login_failed', { attempt: i+1 });
                      return false;
                    }
                    
                    reportStatus('filling_journey_details');
                    if (!await this.fillJourneyDetails(page)) {
                      reportStatus('journey_details_failed');
                      return false;
                    }
                    
                    reportStatus('booking_ticket');
                    const result = await this.bookTicket(page);
                    reportStatus(result ? 'booking_success' : 'booking_failed');
                    return result;
                })
            );
            
            const success = results.some(r => r);
            if (success) {
              reportStatus('completed', { success: true });
            } else {
              reportStatus('completed', { success: false, reason: 'All attempts failed' });
            }
            
            await setTimeout(5000); // Wait before closing
            await this.browser.close();
            return success;
        } catch (error) {
            logger.error('Fatal error in booking process', { error });
            if (this.browser) await this.browser.close();
            return false;
        }
    }
}

// Example config (would come from API in real implementation)
const config = {
    credentials: {
        username: 'YOUR_IRCTC_USERNAME',
        password: 'YOUR_IRCTC_PASSWORD'
    },
    journey: {
        from: 'DELHI',
        to: 'MUMBAI',
        date: '15/08/2023',
        trainNumber: ''
    },
    passengers: [{
        name: 'John Doe',
        age: '30',
        gender: 'M',
        berth: 'LB'
    }],
    multiTab: true
};

// Run the booking agent
const agent = new IRCTCBookingAgent(config);
agent.run().then(success => {
    process.exit(success ? 0 : 1);
});
