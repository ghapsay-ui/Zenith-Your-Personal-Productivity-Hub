/**
 * Zenith Storage Manager
 * Handles localStorage operations with data integrity and error recovery
 */

// Storage key constants
const STORAGE_KEY = 'zenith_tasks';
const NOTIFICATION_PREFS_KEY = 'zenith_notification_prefs';
const NOTIFICATION_HISTORY_KEY = 'zenith_notification_history';

/**
 * Enhanced localStorage Operations with Data Integrity
 */
const StorageManager = {
    /**
     * Safely loads tasks from localStorage with validation and error recovery
     * @returns {Task[]} - Array of Task instances or empty array
     */
    loadTasks() {
        try {
            // Check localStorage availability
            if (!this.isAvailable()) {
                console.warn('localStorage not available');
                return [];
            }

            const rawData = localStorage.getItem(STORAGE_KEY);

            if (!rawData) {
                console.info('No existing tasks found');
                return [];
            }

            // Parse JSON with error handling
            let parsedData;
            try {
                parsedData = JSON.parse(rawData);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                
                // Attempt to recover from backup
                const recovered = this.recoverFromBackup();
                if (recovered) {
                    return this.loadTasks(); // Recursive call with backup
                }
                
                // If recovery fails, clear corrupted data
                this.clearCorruptedData(rawData);
                return [];
            }

            // Validate data structure
            if (!Array.isArray(parsedData)) {
                console.error('Invalid data structure: not an array');
                this.clearCorruptedData(rawData);
                return [];
            }

            // Convert to Task instances with validation
            const tasks = [];
            const invalidTasks = [];

            parsedData.forEach((taskData, index) => {
                try {
                    const task = Task.fromJSON(taskData);
                    tasks.push(task);
                } catch (error) {
                    console.error(`Invalid task at index ${index}:`, error);
                    invalidTasks.push({ index, data: taskData, error: error.message });
                }
            });

            // Report invalid tasks
            if (invalidTasks.length > 0) {
                console.warn(`Skipped ${invalidTasks.length} invalid tasks:`, invalidTasks);
            }

            console.info(`✓ Loaded ${tasks.length} tasks successfully`);
            return tasks;

        } catch (error) {
            console.error('Unexpected error loading tasks:', error);
            return [];
        }
    },

    /**
     * Safely saves tasks to localStorage with backup and validation
     * @param {Task[]} tasks - Array of Task instances to save
     * @returns {boolean} - True if save was successful
     */
    saveTasks(tasks) {
        try {
            // Validate input
            if (!Array.isArray(tasks)) {
                throw new TypeError('Tasks must be an array');
            }

            // Check localStorage availability
            if (!this.isAvailable()) {
                console.error('localStorage not available');
                return false;
            }

            // Validate and serialize each task
            const validatedTasks = tasks.map(task => {
                if (!(task instanceof Task)) {
                    throw new TypeError('All items must be Task instances');
                }
                return task.toJSON();
            });

            // Create backup before saving
            this.createBackup();

            // Convert to JSON string
            const jsonString = JSON.stringify(validatedTasks);

            // Check storage quota
            const sizeInBytes = new Blob([jsonString]).size;
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            
            if (sizeInBytes > 4.5 * 1024 * 1024) { // 4.5MB warning threshold
                console.warn(`Storage size: ${sizeInMB}MB (approaching 5MB limit)`);
            }

            // Attempt to save
            try {
                localStorage.setItem(STORAGE_KEY, jsonString);
                localStorage.setItem(`${STORAGE_KEY}_last_save`, new Date().toISOString());
            } catch (storageError) {
                // Handle quota exceeded error
                if (storageError.name === 'QuotaExceededError') {
                    console.error('localStorage quota exceeded');
                    this.handleQuotaExceeded(tasks);
                    return false;
                }
                throw storageError;
            }

            console.info(`✓ Saved ${tasks.length} tasks successfully (${sizeInMB}MB)`);
            return true;

        } catch (error) {
            console.error('Failed to save tasks:', error);
            
            // Attempt to restore from backup on failure
            this.restoreFromBackup();
            return false;
        }
    },

    /**
     * Creates backup of current data
     */
    createBackup() {
        try {
            const currentData = localStorage.getItem(STORAGE_KEY);
            if (currentData) {
                localStorage.setItem(`${STORAGE_KEY}_backup`, currentData);
                localStorage.setItem(`${STORAGE_KEY}_backup_time`, new Date().toISOString());
            }
        } catch (error) {
            console.warn('Failed to create backup:', error);
        }
    },

    /**
     * Restores data from backup
     * @returns {boolean} - Success status
     */
    restoreFromBackup() {
        try {
            const backup = localStorage.getItem(`${STORAGE_KEY}_backup`);
            if (backup) {
                localStorage.setItem(STORAGE_KEY, backup);
                console.info('✓ Restored from backup');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            return false;
        }
    },

    /**
     * Recovers from backup and validates it
     * @returns {boolean} - Recovery success
     */
    recoverFromBackup() {
        const backup = localStorage.getItem(`${STORAGE_KEY}_backup`);
        if (backup) {
            try {
                JSON.parse(backup); // Validate backup
                return this.restoreFromBackup();
            } catch (error) {
                console.error('Backup is also corrupted');
                return false;
            }
        }
        return false;
    },

    /**
     * Handles corrupted data by archiving and clearing
     * @param {string} corruptedData - Corrupted JSON string
     */
    clearCorruptedData(corruptedData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        try {
            // Archive corrupted data for debugging
            localStorage.setItem(`${STORAGE_KEY}_corrupted_${timestamp}`, corruptedData);
            console.info('Corrupted data archived for debugging');
        } catch (error) {
            console.warn('Could not archive corrupted data');
        }

        // Clear main storage
        localStorage.removeItem(STORAGE_KEY);
        console.warn('Corrupted data cleared from storage');
    },

    /**
     * Handles quota exceeded errors by cleaning up old data
     * @param {Task[]} tasks - Current task array
     */
    handleQuotaExceeded(tasks) {
        console.warn('Attempting to free up storage space...');
        
        try {
            // Remove backup/corrupted data entries
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith(`${STORAGE_KEY}_corrupted_`) || 
                           key.startsWith(`${STORAGE_KEY}_backup`))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.info('Removed old data:', key);
            });
            
            if (keysToRemove.length > 0) {
                console.info('Freed up space. Retrying save...');
                // Retry save after cleanup
                return this.saveTasks(tasks);
            } else {
                console.error('No old data to clean. Storage is genuinely full.');
            }
        } catch (error) {
            console.error('Failed to clean up storage:', error);
        }
        
        return false;
    },

    /**
     * Checks if localStorage is available and functional
     * @returns {boolean} - True if localStorage is available
     */
    isAvailable() {
        try {
            const testKey = '__zenith_storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Clears all task data from localStorage
     * @returns {boolean} - True if successful
     */
    clearAllTasks() {
        try {
            if (this.isAvailable()) {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(`${STORAGE_KEY}_last_save`);
                console.info('All tasks cleared from localStorage');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error clearing tasks:', error);
            return false;
        }
    },

    /**
     * Gets storage usage statistics
     * @returns {Object|null} - Storage statistics or null on error
     */
    getStorageStats() {
        try {
            const rawData = localStorage.getItem(STORAGE_KEY) || '';
            const sizeInBytes = new Blob([rawData]).size;
            const sizeInKB = (sizeInBytes / 1024).toFixed(2);
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            
            // Estimate remaining capacity (5MB typical limit)
            const limitInBytes = 5 * 1024 * 1024;
            const remainingInKB = ((limitInBytes - sizeInBytes) / 1024).toFixed(2);
            const percentUsed = ((sizeInBytes / limitInBytes) * 100).toFixed(1);
            
            const taskCount = rawData ? JSON.parse(rawData).length : 0;
            
            return {
                sizeInBytes,
                sizeInKB,
                sizeInMB,
                remainingInKB,
                percentUsed,
                itemCount: taskCount,
                lastSave: localStorage.getItem(`${STORAGE_KEY}_last_save`) || 'Never'
            };
        } catch (error) {
            console.error('Error calculating storage stats:', error);
            return null;
        }
    },

    /**
     * Exports tasks as a downloadable JSON file
     * @param {Task[]} tasks - Tasks to export
     */
    exportTasks(tasks) {
        try {
            const dataStr = JSON.stringify(tasks.map(t => t.toJSON()), null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `zenith-tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.info('Tasks exported successfully');
            return true;
        } catch (error) {
            console.error('Error exporting tasks:', error);
            return false;
        }
    },

    /**
     * Imports tasks from a JSON file
     * @param {File} file - File object from input
     * @returns {Promise<Task[]>} - Promise resolving to imported tasks
     */
    importTasks(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (!Array.isArray(data)) {
                        throw new Error('Invalid file format: expected array of tasks');
                    }
                    
                    const tasks = data.map(taskData => Task.fromJSON(taskData));
                    console.info(`Imported ${tasks.length} tasks successfully`);
                    resolve(tasks);
                } catch (error) {
                    console.error('Error parsing imported file:', error);
                    reject(error);
                }
            };
            
            reader.onerror = (error) => {
                console.error('Error reading file:', error);
                reject(error);
            };
            
            reader.readAsText(file);
        });
    },

    /**
     * Saves filter and sort preferences
     * @param {Object} preferences - Filter/sort preferences
     */
    savePreferences(preferences) {
        try {
            localStorage.setItem('zenith_preferences', JSON.stringify(preferences));
            return true;
        } catch (error) {
            console.error('Failed to save preferences:', error);
            return false;
        }
    },

    /**
     * Loads filter and sort preferences
     * @returns {Object|null} - Preferences object or null
     */
    loadPreferences() {
        try {
            const saved = localStorage.getItem('zenith_preferences');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Failed to load preferences:', error);
            return null;
        }
    },

    /**
     * Saves notification preferences
     * @param {Object} prefs - Notification preferences
     * @returns {boolean} - Success status
     */
    saveNotificationPrefs(prefs) {
        try {
            localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
            console.info('✓ Notification preferences saved');
            return true;
        } catch (error) {
            console.error('Failed to save notification preferences:', error);
            return false;
        }
    },

    /**
     * Loads notification preferences
     * @returns {Object} - Notification preferences with defaults
     */
    loadNotificationPrefs() {
        try {
            const prefs = localStorage.getItem(NOTIFICATION_PREFS_KEY);
            return prefs ? JSON.parse(prefs) : {
                enabled: true,
                oneDayBefore: true,
                oneHourBefore: true,
                overdue: true,
                permission: 'default'
            };
        } catch (error) {
            console.error('Failed to load notification preferences:', error);
            return {
                enabled: true,
                oneDayBefore: true,
                oneHourBefore: true,
                overdue: true,
                permission: 'default'
            };
        }
    },

    /**
     * Saves notification history (last notified timestamp for each task)
     * @param {string} taskId - Task ID
     * @param {string} timestamp - ISO timestamp
     */
    saveNotificationHistory(taskId, timestamp) {
        try {
            const history = this.loadNotificationHistory();
            history[taskId] = timestamp;
            localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));
            return true;
        } catch (error) {
            console.error('Failed to save notification history:', error);
            return false;
        }
    },

    /**
     * Loads notification history
     * @returns {Object} - Object mapping task IDs to last notification timestamps
     */
    loadNotificationHistory() {
        try {
            const history = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
            return history ? JSON.parse(history) : {};
        } catch (error) {
            console.error('Failed to load notification history:', error);
            return {};
        }
    },

    /**
     * Gets last notification time for a specific task
     * @param {string} taskId - Task ID
     * @returns {Date|null} - Last notification date or null
     */
    getLastNotificationTime(taskId) {
        try {
            const history = this.loadNotificationHistory();
            return history[taskId] ? new Date(history[taskId]) : null;
        } catch (error) {
            return null;
        }
    },

    /**
     * Clears notification history for completed or deleted tasks
     * @param {string[]} activeTaskIds - Array of current task IDs
     */
    cleanupNotificationHistory(activeTaskIds) {
        try {
            const history = this.loadNotificationHistory();
            const cleaned = {};
            
            activeTaskIds.forEach(id => {
                if (history[id]) {
                    cleaned[id] = history[id];
                }
            });
            
            localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(cleaned));
            console.info('Notification history cleaned');
            return true;
        } catch (error) {
            console.error('Failed to cleanup notification history:', error);
            return false;
        }
    }
};

// Auto-save mechanism
let autoSaveInterval = null;

/**
 * Starts automatic saving every 30 seconds
 */
function startAutoSave(taskList) {
    if (autoSaveInterval) {
        return; // Already running
    }
    
    autoSaveInterval = setInterval(() => {
        if (taskList && taskList.length > 0) {
            const saved = StorageManager.saveTasks(taskList);
            if (saved) {
                console.info('Auto-save completed');
            }
        }
    }, 30000); // 30 seconds

    console.info('Auto-save started (30s interval)');
}

/**
 * Stops automatic saving
 */
function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        console.info('Auto-save stopped');
    }
}

// Prevent data loss on page unload
window.addEventListener('beforeunload', (e) => {
    // Check if there are unsaved changes (if form is open with content)
    const modal = document.getElementById('taskModal');
    const isModalOpen = modal && modal.classList.contains('active');
    
    if (isModalOpen) {
        const titleInput = document.getElementById('taskTitle');
        const hasContent = titleInput && titleInput.value.trim().length > 0;
        
        if (hasContent) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    }
});

// Network status monitoring
window.addEventListener('online', () => {
    console.info('Application is online');
});

window.addEventListener('offline', () => {
    console.warn('Application is offline - changes will be saved locally');
});
