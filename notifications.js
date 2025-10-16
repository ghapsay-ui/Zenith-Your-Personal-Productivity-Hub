/**
 * Zenith Notification Manager
 * Handles browser notifications for task reminders
 */

const NotificationManager = {
    /**
     * Checks if the browser supports notifications
     * @returns {boolean} - True if notifications are supported
     */
    isSupported() {
        return 'Notification' in window;
    },

    /**
     * Gets current notification permission status
     * @returns {string} - 'granted', 'denied', or 'default'
     */
    getPermissionStatus() {
        if (!this.isSupported()) {
            return 'unsupported';
        }
        return Notification.permission;
    },

    /**
     * Requests notification permission from the user
     * @returns {Promise<boolean>} - True if permission granted
     */
    async requestPermission() {
        if (!this.isSupported()) {
            console.warn('Notifications not supported in this browser');
            return false;
        }

        if (Notification.permission === 'granted') {
            console.info('Notification permission already granted');
            return true;
        }

        if (Notification.permission === 'denied') {
            console.warn('Notification permission was previously denied');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            
            // Save permission status
            const prefs = StorageManager.loadNotificationPrefs();
            prefs.permission = permission;
            StorageManager.saveNotificationPrefs(prefs);

            if (permission === 'granted') {
                console.info('✓ Notification permission granted');
                return true;
            } else {
                console.warn('Notification permission denied by user');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    },

    /**
     * Sends a browser notification
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     * @returns {Notification|null} - Notification object or null
     */
    async sendNotification(title, options = {}) {
        if (!this.isSupported()) {
            console.warn('Notifications not supported');
            return null;
        }

        if (Notification.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return null;
        }

        try {
            const notification = new Notification(title, {
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234A90E2"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">✓</text></svg>',
                badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234A90E2"/></svg>',
                requireInteraction: false,
                silent: false,
                ...options
            });

            // Auto-close after 10 seconds if not interacted with
            setTimeout(() => {
                notification.close();
            }, 10000);

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            return null;
        }
    },

    /**
     * Checks if a task needs a reminder notification
     * @param {Task} task - Task to check
     * @param {Object} prefs - Notification preferences
     * @returns {Object|null} - Notification details or null
     */
    shouldNotify(task, prefs) {
        // Skip if notifications disabled
        if (!prefs.enabled) {
            return null;
        }

        // Skip if task has no due date
        if (!task.dueDate) {
            return null;
        }

        // Skip if task is completed
        if (task.status === Task.Status.COMPLETED) {
            return null;
        }

        const now = new Date();
        const dueDate = new Date(task.dueDate);
        const timeDiff = dueDate - now;
        
        // Convert to hours
        const hoursUntilDue = timeDiff / (1000 * 60 * 60);

        // Check if overdue
        if (hoursUntilDue < 0 && prefs.overdue) {
            const daysOverdue = Math.abs(Math.floor(hoursUntilDue / 24));
            const hoursOverdue = Math.abs(Math.floor(hoursUntilDue % 24));
            
            let overdueText;
            if (daysOverdue > 0) {
                overdueText = `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
            } else {
                overdueText = `${hoursOverdue} hour${hoursOverdue > 1 ? 's' : ''} overdue`;
            }

            return {
                type: 'overdue',
                title: '⚠️ Task Overdue',
                body: `"${task.title}" is ${overdueText}!`,
                tag: `${task.id}-overdue`,
                priority: task.priority
            };
        }

        // Check if due within 1 hour
        if (hoursUntilDue > 0 && hoursUntilDue <= 1 && prefs.oneHourBefore) {
            const minutesUntilDue = Math.floor(timeDiff / (1000 * 60));
            return {
                type: '1hour',
                title: '🔔 Task Due Soon',
                body: `"${task.title}" is due in ${minutesUntilDue} minutes!`,
                tag: `${task.id}-1hour`,
                priority: task.priority
            };
        }

        // Check if due within 24 hours
        if (hoursUntilDue > 1 && hoursUntilDue <= 24 && prefs.oneDayBefore) {
            const hours = Math.floor(hoursUntilDue);
            return {
                type: '24hours',
                title: '📅 Upcoming Task',
                body: `"${task.title}" is due in ${hours} hour${hours > 1 ? 's' : ''}`,
                tag: `${task.id}-24hours`,
                priority: task.priority
            };
        }

        return null;
    },

    /**
     * Checks if we should send notification based on history
     * @param {string} taskId - Task ID
     * @param {string} notificationType - Type of notification
     * @param {number} cooldownMinutes - Cooldown period in minutes
     * @returns {boolean} - True if should notify
     */
    canNotify(taskId, notificationType, cooldownMinutes = 60) {
        const lastNotified = StorageManager.getLastNotificationTime(taskId);
        
        if (!lastNotified) {
            return true; // Never notified before
        }

        const now = new Date();
        const timeSinceLastNotification = now - lastNotified;
        const cooldownMs = cooldownMinutes * 60 * 1000;

        return timeSinceLastNotification >= cooldownMs;
    },

    /**
     * Checks all tasks and sends appropriate notifications
     * @param {Task[]} tasks - Array of tasks to check
     */
    async checkTaskReminders(tasks) {
        if (!this.isSupported()) {
            return;
        }

        if (Notification.permission !== 'granted') {
            return;
        }

        const prefs = StorageManager.loadNotificationPrefs();
        
        if (!prefs.enabled) {
            console.info('Notifications disabled by user preferences');
            return;
        }

        let notificationsSent = 0;

        for (const task of tasks) {
            const notificationDetails = this.shouldNotify(task, prefs);
            
            if (!notificationDetails) {
                continue;
            }

            // Check cooldown period
            const canSendNotification = this.canNotify(task.id, notificationDetails.type, 60);
            
            if (!canSendNotification) {
                continue;
            }

            // Send the notification
            const notification = await this.sendNotification(
                notificationDetails.title,
                {
                    body: notificationDetails.body,
                    tag: notificationDetails.tag,
                    data: {
                        taskId: task.id,
                        type: notificationDetails.type
                    }
                }
            );

            if (notification) {
                // Handle notification click
                notification.onclick = () => {
                    window.focus();
                    
                    // Scroll to and highlight the task
                    const taskElement = document.getElementById(task.id);
                    if (taskElement) {
                        taskElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                        
                        // Add temporary highlight effect
                        taskElement.style.boxShadow = '0 0 20px rgba(74, 144, 226, 0.8)';
                        setTimeout(() => {
                            taskElement.style.boxShadow = '';
                        }, 2000);
                    }
                    
                    notification.close();
                };

                // Update notification history
                StorageManager.saveNotificationHistory(task.id, new Date().toISOString());
                notificationsSent++;
                
                console.info(`✓ Notification sent for task: "${task.title}"`);
            }
        }

        if (notificationsSent > 0) {
            console.info(`Sent ${notificationsSent} notification${notificationsSent > 1 ? 's' : ''}`);
        }

        // Cleanup notification history for non-existent tasks
        const activeTaskIds = tasks.map(t => t.id);
        StorageManager.cleanupNotificationHistory(activeTaskIds);
    },

    /**
     * Starts periodic checking for task reminders
     * @param {Task[]} tasks - Tasks to monitor
     * @param {number} intervalMinutes - Check interval in minutes
     * @returns {number} - Interval ID
     */
    startPeriodicCheck(tasks, intervalMinutes = 60) {
        // Initial check
        this.checkTaskReminders(tasks);

        // Set up periodic checks
        const intervalMs = intervalMinutes * 60 * 1000;
        const intervalId = setInterval(() => {
            this.checkTaskReminders(tasks);
        }, intervalMs);

        console.info(`✓ Notification monitoring started (checking every ${intervalMinutes} minutes)`);
        return intervalId;
    },

    /**
     * Stops periodic notification checking
     * @param {number} intervalId - Interval ID to clear
     */
    stopPeriodicCheck(intervalId) {
        if (intervalId) {
            clearInterval(intervalId);
            console.info('Notification monitoring stopped');
        }
    },

    /**
     * Sends a test notification
     * @returns {Promise<boolean>} - True if successful
     */
    async sendTestNotification() {
        const notification = await this.sendNotification(
            '✅ Test Notification',
            {
                body: 'Zenith notifications are working correctly!',
                tag: 'test-notification',
                requireInteraction: false
            }
        );

        if (notification) {
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            return true;
        }
        
        return false;
    },

    /**
     * Updates the notification status display in UI
     */
    updateStatusDisplay() {
        const statusText = document.getElementById('notificationStatusText');
        if (!statusText) return;

        const permission = this.getPermissionStatus();
        
        switch (permission) {
            case 'granted':
                statusText.textContent = '✅ Enabled';
                statusText.style.color = 'var(--color-success)';
                break;
            case 'denied':
                statusText.textContent = '❌ Blocked';
                statusText.style.color = 'var(--color-danger)';
                break;
            case 'default':
                statusText.textContent = '⚠️ Not Set';
                statusText.style.color = 'var(--color-warning)';
                break;
            case 'unsupported':
                statusText.textContent = '❌ Not Supported';
                statusText.style.color = 'var(--color-text-secondary)';
                break;
        }
    },

    /**
     * Initializes notification system
     * @param {Task[]} tasks - Task list to monitor
     * @returns {Promise<number|null>} - Interval ID or null
     */
    async initialize(tasks) {
        if (!this.isSupported()) {
            console.warn('Notifications not supported in this browser');
            return null;
        }

        // Load saved preferences
        const prefs = StorageManager.loadNotificationPrefs();
        
        // Update UI
        this.updateStatusDisplay();

        // If enabled and permission granted, start monitoring
        if (prefs.enabled && Notification.permission === 'granted') {
            return this.startPeriodicCheck(tasks, 60);
        }

        // If enabled but permission not granted, request it
        if (prefs.enabled && Notification.permission === 'default') {
            const granted = await this.requestPermission();
            if (granted) {
                return this.startPeriodicCheck(tasks, 60);
            }
        }

        return null;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
