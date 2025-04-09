class StatusTracker {
    constructor() {
        this.bookings = new Map();
    }

    addBooking(bookingId, worker) {
        this.bookings.set(bookingId, {
            worker,
            status: 'initializing',
            lastUpdate: new Date(),
            createdAt: new Date()
        });
        return bookingId;
    }

    updateStatus(bookingId, status, data = {}) {
        const booking = this.bookings.get(bookingId);
        if (booking) {
            booking.status = status;
            booking.lastUpdate = new Date();
            booking.data = data;
            return true;
        }
        return false;
    }

    getStatus(bookingId) {
        const booking = this.bookings.get(bookingId);
        if (!booking) return null;
        
        return {
            status: booking.status,
            lastUpdate: booking.lastUpdate,
            createdAt: booking.createdAt,
            data: booking.data || null,
            error: booking.error || null
        };
    }

    completeBooking(bookingId, success = true, error = null) {
        const booking = this.bookings.get(bookingId);
        if (booking) {
            booking.status = success ? 'completed' : 'failed';
            booking.completedAt = new Date();
            if (error) booking.error = error;
            return true;
        }
        return false;
    }

    cleanupCompleted(expiryHours = 24) {
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() - expiryHours);
        
        for (const [bookingId, booking] of this.bookings.entries()) {
            if (booking.completedAt && booking.completedAt < expiryTime) {
                this.bookings.delete(bookingId);
            }
        }
    }
}

module.exports = new StatusTracker();
