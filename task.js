/**
 * Task Class for Zenith Application
 * Represents a single task with validation and automatic timestamp management
 * Includes support for tags and sub-tasks
 */
class Task {
    // Static Enum Definitions
    static Status = Object.freeze({
        TODO: 'todo',
        IN_PROGRESS: 'inprogress',
        COMPLETED: 'completed'
    });

    static Priority = Object.freeze({
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    });

    // Valid enum values for validation
    static #VALID_STATUSES = Object.values(Task.Status);
    static #VALID_PRIORITIES = Object.values(Task.Priority);

    /**
     * Creates a new Task instance
     * @param {Object} taskData - Task configuration object
     * @param {string} [taskData.id] - Unique identifier (auto-generated if not provided)
     * @param {string} taskData.title - Task title (required)
     * @param {string} [taskData.description] - Task description (optional)
     * @param {string} [taskData.status] - Task status (default: 'todo')
     * @param {string} [taskData.priority] - Task priority (default: 'medium')
     * @param {string|Date} [taskData.dueDate] - Task due date (optional)
     * @param {string[]|string} [taskData.tags] - Task tags (optional)
     * @param {Array} [taskData.subtasks] - Sub-tasks array (optional)
     * @param {string|Date} [taskData.createdAt] - Creation timestamp (auto-generated)
     * @param {string|Date} [taskData.updatedAt] - Last update timestamp (auto-generated)
     */
    constructor(taskData = {}) {
        // Validate required fields
        if (!taskData.title || typeof taskData.title !== 'string') {
            throw new Error('Task title is required and must be a string');
        }

        // Generate unique ID if not provided
        this.id = taskData.id || this.#generateUUID();

        // Required field: title
        this.title = this.#validateTitle(taskData.title);

        // Optional field: description
        this.description = this.#validateDescription(taskData.description);

        // Enum field with default: status
        this.status = this.#validateStatus(taskData.status);

        // Enum field with default: priority
        this.priority = this.#validatePriority(taskData.priority);

        // Optional field: dueDate
        this.dueDate = this.#validateDueDate(taskData.dueDate);

        // NEW: Tags array
        this.tags = this.#validateTags(taskData.tags);

        // NEW: Sub-tasks array
        this.subtasks = this.#validateSubtasks(taskData.subtasks);

        // Auto-generated timestamps
        this.createdAt = taskData.createdAt 
            ? new Date(taskData.createdAt) 
            : new Date();
        
        this.updatedAt = taskData.updatedAt 
            ? new Date(taskData.updatedAt) 
            : new Date();
    }

    /**
     * Generates a UUID v4 using crypto API or fallback method
     * @private
     * @returns {string} - UUID string
     */
    #generateUUID() {
        // Use native crypto.randomUUID() if available (modern browsers & Node.js)
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        
        // Fallback UUID v4 generation for older environments
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Validates and sanitizes the task title
     * @private
     * @param {string} title - Task title
     * @returns {string} - Validated title
     */
    #validateTitle(title) {
        if (!title || typeof title !== 'string') {
            throw new Error('Task title is required and must be a string');
        }

        const trimmedTitle = title.trim();

        if (trimmedTitle.length === 0) {
            throw new Error('Task title cannot be empty');
        }

        if (trimmedTitle.length > 100) {
            throw new Error('Task title cannot exceed 100 characters');
        }

        return trimmedTitle;
    }

    /**
     * Validates and sanitizes the task description
     * @private
     * @param {string} [description] - Task description
     * @returns {string|null} - Validated description or null
     */
    #validateDescription(description) {
        if (description === undefined || description === null || description === '') {
            return null;
        }

        if (typeof description !== 'string') {
            throw new Error('Task description must be a string');
        }

        const trimmedDescription = description.trim();

        if (trimmedDescription.length === 0) {
            return null;
        }

        if (trimmedDescription.length > 500) {
            throw new Error('Task description cannot exceed 500 characters');
        }

        return trimmedDescription;
    }

    /**
     * Validates the task status
     * @private
     * @param {string} [status] - Task status
     * @returns {string} - Validated status or default
     */
    #validateStatus(status) {
        // Default to 'todo' if not provided
        if (status === undefined || status === null || status === '') {
            return Task.Status.TODO;
        }

        // Normalize to lowercase
        const normalizedStatus = typeof status === 'string' 
            ? status.toLowerCase().trim() 
            : '';

        if (!Task.#VALID_STATUSES.includes(normalizedStatus)) {
            throw new Error(
                `Invalid status: "${status}". Must be one of: ${Task.#VALID_STATUSES.join(', ')}`
            );
        }

        return normalizedStatus;
    }

    /**
     * Validates the task priority
     * @private
     * @param {string} [priority] - Task priority
     * @returns {string} - Validated priority or default
     */
    #validatePriority(priority) {
        // Default to 'medium' if not provided
        if (priority === undefined || priority === null || priority === '') {
            return Task.Priority.MEDIUM;
        }

        // Normalize to lowercase
        const normalizedPriority = typeof priority === 'string' 
            ? priority.toLowerCase().trim() 
            : '';

        if (!Task.#VALID_PRIORITIES.includes(normalizedPriority)) {
            throw new Error(
                `Invalid priority: "${priority}". Must be one of: ${Task.#VALID_PRIORITIES.join(', ')}`
            );
        }

        return normalizedPriority;
    }

    /**
     * Validates the task due date
     * @private
     * @param {string|Date} [dueDate] - Task due date
     * @returns {Date|null} - Validated date or null
     */
    #validateDueDate(dueDate) {
        if (dueDate === undefined || dueDate === null || dueDate === '') {
            return null;
        }

        let date;

        if (dueDate instanceof Date) {
            date = dueDate;
        } else if (typeof dueDate === 'string') {
            date = new Date(dueDate);
        } else {
            throw new Error('Due date must be a Date object or valid date string');
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
            throw new Error('Invalid due date provided');
        }

        return date;
    }

    /**
     * Validates tags array
     * @private
     * @param {string[]|string} [tags] - Tags array or comma-separated string
     * @returns {string[]} - Validated tags array
     */
    #validateTags(tags) {
        if (!tags || tags.length === 0) {
            return [];
        }

        let tagsArray = [];

        // Handle string input (comma-separated)
        if (typeof tags === 'string') {
            tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        } else if (Array.isArray(tags)) {
            tagsArray = tags.map(tag => {
                if (typeof tag !== 'string') {
                    return String(tag).trim();
                }
                return tag.trim();
            }).filter(tag => tag.length > 0);
        } else {
            throw new Error('Tags must be an array or comma-separated string');
        }

        // Remove duplicates
        tagsArray = [...new Set(tagsArray)];

        // Validate each tag
        tagsArray.forEach(tag => {
            if (tag.length > 20) {
                throw new Error('Each tag cannot exceed 20 characters');
            }
        });

        // Limit to 10 tags
        if (tagsArray.length > 10) {
            throw new Error('Cannot have more than 10 tags per task');
        }

        return tagsArray;
    }

    /**
     * Validates sub-tasks array
     * @private
     * @param {Array} [subtasks] - Sub-tasks array
     * @returns {Array} - Validated sub-tasks array
     */
    #validateSubtasks(subtasks) {
        if (!subtasks || !Array.isArray(subtasks)) {
            return [];
        }

        const validatedSubtasks = subtasks.map((subtask, index) => {
            if (typeof subtask === 'string') {
                // Convert string to subtask object
                return {
                    id: this.#generateUUID(),
                    title: subtask.trim(),
                    completed: false
                };
            }

            if (typeof subtask === 'object' && subtask !== null) {
                // Validate subtask object
                if (!subtask.title || typeof subtask.title !== 'string') {
                    throw new Error(`Sub-task ${index + 1} must have a title`);
                }

                if (subtask.title.trim().length === 0) {
                    throw new Error(`Sub-task ${index + 1} title cannot be empty`);
                }

                if (subtask.title.length > 100) {
                    throw new Error(`Sub-task ${index + 1} title cannot exceed 100 characters`);
                }

                return {
                    id: subtask.id || this.#generateUUID(),
                    title: subtask.title.trim(),
                    completed: Boolean(subtask.completed)
                };
            }

            throw new Error(`Sub-task ${index + 1} has invalid format`);
        });

        // Limit to 20 sub-tasks
        if (validatedSubtasks.length > 20) {
            throw new Error('Cannot have more than 20 sub-tasks per task');
        }

        return validatedSubtasks;
    }

    /**
     * Updates task properties and automatically sets updatedAt timestamp
     * @param {Object} updates - Object containing properties to update
     * @returns {Task} - Returns this for method chaining
     */
    update(updates = {}) {
        if (updates.title !== undefined) {
            this.title = this.#validateTitle(updates.title);
        }

        if (updates.description !== undefined) {
            this.description = this.#validateDescription(updates.description);
        }

        if (updates.status !== undefined) {
            this.status = this.#validateStatus(updates.status);
        }

        if (updates.priority !== undefined) {
            this.priority = this.#validatePriority(updates.priority);
        }

        if (updates.dueDate !== undefined) {
            this.dueDate = this.#validateDueDate(updates.dueDate);
        }

        if (updates.tags !== undefined) {
            this.tags = this.#validateTags(updates.tags);
        }

        if (updates.subtasks !== undefined) {
            this.subtasks = this.#validateSubtasks(updates.subtasks);
        }

        // Automatically update the timestamp
        this.updatedAt = new Date();

        return this;
    }

    /**
     * Adds a tag to the task
     * @param {string} tag - Tag to add
     * @returns {Task} - Returns this for method chaining
     */
    addTag(tag) {
        if (!tag || typeof tag !== 'string') {
            throw new Error('Tag must be a non-empty string');
        }

        const trimmedTag = tag.trim();
        
        if (trimmedTag.length === 0) {
            throw new Error('Tag cannot be empty');
        }

        if (trimmedTag.length > 20) {
            throw new Error('Tag cannot exceed 20 characters');
        }

        if (this.tags.includes(trimmedTag)) {
            console.warn('Tag already exists');
            return this;
        }

        if (this.tags.length >= 10) {
            throw new Error('Cannot add more than 10 tags');
        }

        this.tags.push(trimmedTag);
        this.updatedAt = new Date();
        
        return this;
    }

    /**
     * Removes a tag from the task
     * @param {string} tag - Tag to remove
     * @returns {Task} - Returns this for method chaining
     */
    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        
        if (index > -1) {
            this.tags.splice(index, 1);
            this.updatedAt = new Date();
        }
        
        return this;
    }

    /**
     * Adds a sub-task
     * @param {string} title - Sub-task title
     * @returns {Task} - Returns this for method chaining
     */
    addSubtask(title) {
        if (!title || typeof title !== 'string') {
            throw new Error('Sub-task title is required');
        }

        const trimmedTitle = title.trim();
        
        if (trimmedTitle.length === 0) {
            throw new Error('Sub-task title cannot be empty');
        }

        if (trimmedTitle.length > 100) {
            throw new Error('Sub-task title cannot exceed 100 characters');
        }

        if (this.subtasks.length >= 20) {
            throw new Error('Cannot add more than 20 sub-tasks');
        }

        this.subtasks.push({
            id: this.#generateUUID(),
            title: trimmedTitle,
            completed: false
        });

        this.updatedAt = new Date();
        
        return this;
    }

    /**
     * Removes a sub-task
     * @param {string} subtaskId - Sub-task ID to remove
     * @returns {Task} - Returns this for method chaining
     */
    removeSubtask(subtaskId) {
        const index = this.subtasks.findIndex(st => st.id === subtaskId);
        
        if (index > -1) {
            this.subtasks.splice(index, 1);
            this.updatedAt = new Date();
        }
        
        return this;
    }

    /**
     * Toggles sub-task completion status
     * @param {string} subtaskId - Sub-task ID
     * @returns {Task} - Returns this for method chaining
     */
    toggleSubtask(subtaskId) {
        const subtask = this.subtasks.find(st => st.id === subtaskId);
        
        if (subtask) {
            subtask.completed = !subtask.completed;
            this.updatedAt = new Date();
        }
        
        return this;
    }

    /**
     * Gets sub-task completion progress
     * @returns {Object} - {completed: number, total: number, percentage: number}
     */
    getSubtaskProgress() {
        const total = this.subtasks.length;
        const completed = this.subtasks.filter(st => st.completed).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { completed, total, percentage };
    }

    /**
     * Checks if the task is overdue
     * @returns {boolean} - True if task is overdue
     */
    isOverdue() {
        if (!this.dueDate) {
            return false;
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0); // Compare dates only, not times

        const due = new Date(this.dueDate);
        due.setHours(0, 0, 0, 0);

        return this.status !== Task.Status.COMPLETED && due < now;
    }

    /**
     * Checks if the task is completed
     * @returns {boolean} - True if task is completed
     */
    isCompleted() {
        return this.status === Task.Status.COMPLETED;
    }

    /**
     * Checks if task has a specific tag
     * @param {string} tag - Tag to check
     * @returns {boolean} - True if task has the tag
     */
    hasTag(tag) {
        return this.tags.includes(tag);
    }

    /**
     * Converts task to plain JSON object for storage/serialization
     * @returns {Object} - Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            status: this.status,
            priority: this.priority,
            dueDate: this.dueDate ? this.dueDate.toISOString() : null,
            tags: this.tags,
            subtasks: this.subtasks,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    /**
     * Creates a Task instance from a plain JSON object
     * @static
     * @param {Object} json - Plain object with task data
     * @returns {Task} - New Task instance
     */
    static fromJSON(json) {
        return new Task(json);
    }

    /**
     * Creates a deep copy of the task
     * @returns {Task} - Cloned task instance
     */
    clone() {
        return new Task(this.toJSON());
    }

    /**
     * Returns a string representation of the task
     * @returns {string} - String representation
     */
    toString() {
        return `Task[${this.id}]: ${this.title} (${this.status}, ${this.priority})`;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Task;
}
