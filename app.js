/**
 * Zenith Task Management Application
 * Main application logic and event handlers with Advanced Features
 */

// Global state
let taskList = [];
let isFormSubmitting = false;
let draggedTask = null;
let draggedElement = null;
let sourceColumn = null;
let notificationIntervalId = null;
let currentSubtasks = []; // Temporary sub-tasks storage during form editing

// Performance targets
const PERFORMANCE_TARGET_MS = 500;
let performanceMonitoring = true;

// Filter and sort state
let currentFilter = {
    status: 'all',
    priority: 'all',
    tag: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
};

// ================================
// APPLICATION INITIALIZATION
// ================================

/**
 * Initializes the application when DOM is ready
 */
async function initializeApp() {
    console.log('%c🎯 Zenith - Task Management Application', 'color: #4A90E2; font-size: 18px; font-weight: bold');
    console.log('Initializing application...');

    // Load tasks from localStorage
    taskList = StorageManager.loadTasks();
    console.info(`Loaded ${taskList.length} tasks`);

    // Load saved preferences
    loadSavedPreferences();

    // Initialize event handlers
    initializeEventHandlers();

    // Initialize notification event handlers
    initializeNotificationHandlers();

    // Initialize reports and export handlers
    initializeReportsHandlers();
    initializeExportHandlers();

    // Initialize tag and subtask handlers
    initializeTagHandlers();
    initializeSubtaskHandlers();

    // Initialize drag and drop
    initializeDragAndDrop();

    // Populate tag filter dropdown
    populateTagFilter();

    // Render tasks
    renderTasks(taskList);

    // Start auto-save
    startAutoSave(taskList);

    // Initialize notification system
    notificationIntervalId = await NotificationManager.initialize(taskList);

    // Handle empty states
    handleEmptyState();

    console.log('✓ Application initialized successfully');
}

/**
 * Loads saved filter and sort preferences
 */
function loadSavedPreferences() {
    const preferences = StorageManager.loadPreferences();
    if (preferences) {
        currentFilter = { ...currentFilter, ...preferences };
        
        // Apply to UI controls
        const statusFilter = document.getElementById('filterStatus');
        if (statusFilter) statusFilter.value = currentFilter.status;
        
        const priorityFilter = document.getElementById('filterPriority');
        if (priorityFilter) priorityFilter.value = currentFilter.priority;
        
        const tagFilter = document.getElementById('filterTag');
        if (tagFilter) tagFilter.value = currentFilter.tag || 'all';
        
        const sortBy = document.getElementById('sortBy');
        if (sortBy) sortBy.value = currentFilter.sortBy;
        
        console.info('Loaded saved preferences:', currentFilter);
    }
}

/**
 * Initializes all event handlers
 */
function initializeEventHandlers() {
    // Modal controls
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', openAddTaskModal);
    }

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskFormSubmit);
    }

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Modal overlay click
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const taskModal = document.getElementById('taskModal');
            const notificationModal = document.getElementById('notificationModal');
            const reportsModal = document.getElementById('reportsModal');
            const exportModal = document.getElementById('exportModal');
            
            if (taskModal && taskModal.classList.contains('active')) {
                closeModal();
            }
            if (notificationModal && notificationModal.classList.contains('active')) {
                closeNotificationModal();
            }
            if (reportsModal && reportsModal.classList.contains('active')) {
                closeReportsModal();
            }
            if (exportModal && exportModal.classList.contains('active')) {
                closeExportModal();
            }
        }
    });

    // Filter controls
    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter) {
        statusFilter.addEventListener('change', handleStatusFilterChange);
    }

    const priorityFilter = document.getElementById('filterPriority');
    if (priorityFilter) {
        priorityFilter.addEventListener('change', handlePriorityFilterChange);
    }

    const tagFilter = document.getElementById('filterTag');
    if (tagFilter) {
        tagFilter.addEventListener('change', handleTagFilterChange);
    }

    // Sort controls
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', handleSortChange);
    }

    const sortOrderToggle = document.getElementById('sortOrderToggle');
    if (sortOrderToggle) {
        sortOrderToggle.addEventListener('click', toggleSortOrder);
    }

    // Reset filters button
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }

    // Character counter for description
    const descriptionInput = document.getElementById('taskDescription');
    if (descriptionInput) {
        descriptionInput.addEventListener('input', () => {
            updateCharacterCount('taskDescription', 'descriptionCount');
        });
    }

    console.info('Event handlers initialized');
}

/**
 * Initializes notification-related event handlers
 */
function initializeNotificationHandlers() {
    // Notification settings button
    const notificationSettingsBtn = document.getElementById('notificationSettingsBtn');
    if (notificationSettingsBtn) {
        notificationSettingsBtn.addEventListener('click', openNotificationModal);
    }

    // Close notification modal
    const closeNotificationBtn = document.querySelector('.close-notification-modal');
    if (closeNotificationBtn) {
        closeNotificationBtn.addEventListener('click', closeNotificationModal);
    }

    // Notification modal overlay click
    const notificationModal = document.getElementById('notificationModal');
    if (notificationModal) {
        notificationModal.addEventListener('click', (e) => {
            if (e.target === notificationModal) {
                closeNotificationModal();
            }
        });
    }

    // Save notification settings
    const saveNotificationSettings = document.getElementById('saveNotificationSettings');
    if (saveNotificationSettings) {
        saveNotificationSettings.addEventListener('click', handleSaveNotificationSettings);
    }

    // Test notification button
    const testNotificationBtn = document.getElementById('testNotification');
    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', handleTestNotification);
    }

    // Enable notifications checkbox
    const enableNotifications = document.getElementById('enableNotifications');
    if (enableNotifications) {
        enableNotifications.addEventListener('change', handleEnableNotificationsChange);
    }

    console.info('Notification handlers initialized');
}

/**
 * Initializes reports-related event handlers
 */
function initializeReportsHandlers() {
    const reportsBtn = document.getElementById('reportsBtn');
    if (reportsBtn) {
        reportsBtn.addEventListener('click', openReportsModal);
    }

    const closeReportsBtn = document.querySelector('.close-reports-modal');
    if (closeReportsBtn) {
        closeReportsBtn.addEventListener('click', closeReportsModal);
    }

    const reportsModal = document.getElementById('reportsModal');
    if (reportsModal) {
        reportsModal.addEventListener('click', (e) => {
            if (e.target === reportsModal) {
                closeReportsModal();
            }
        });
    }

    console.info('Reports handlers initialized');
}

/**
 * Initializes export-related event handlers
 */
function initializeExportHandlers() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', openExportModal);
    }

    const closeExportBtn = document.querySelector('.close-export-modal');
    if (closeExportBtn) {
        closeExportBtn.addEventListener('click', closeExportModal);
    }

    const exportModal = document.getElementById('exportModal');
    if (exportModal) {
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                closeExportModal();
            }
        });
    }

    const exportCSVBtn = document.getElementById('exportCSVBtn');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', handleExportCSV);
    }

    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', handleExportPDF);
    }

    const exportJSONBtn = document.getElementById('exportJSONBtn');
    if (exportJSONBtn) {
        exportJSONBtn.addEventListener('click', handleExportJSON);
    }

    console.info('Export handlers initialized');
}

/**
 * Initializes tag-related event handlers
 */
function initializeTagHandlers() {
    const tagInput = document.getElementById('taskTags');
    if (tagInput) {
        tagInput.addEventListener('input', handleTagInput);
        tagInput.addEventListener('keydown', handleTagKeydown);
    }

    console.info('Tag handlers initialized');
}

/**
 * Initializes subtask-related event handlers
 */
function initializeSubtaskHandlers() {
    const subtaskInput = document.getElementById('subtaskInput');
    const addSubtaskBtn = document.getElementById('addSubtaskBtn');

    if (subtaskInput) {
        subtaskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSubtask();
            }
        });
    }

    if (addSubtaskBtn) {
        addSubtaskBtn.addEventListener('click', handleAddSubtask);
    }

    console.info('Subtask handlers initialized');
}

// ================================
// TAG FUNCTIONS
// ================================

/**
 * Handles tag input and creates tag preview
 */
function handleTagInput(e) {
    const input = e.target;
    const value = input.value;
    
    // Update preview on comma or when clearing
    if (value.endsWith(',') || value === '') {
        updateTagPreview(value);
    }
}

/**
 * Handles tag input keydown events
 */
function handleTagKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        updateTagPreview(e.target.value);
    }
}

/**
 * Updates tag preview display
 */
function updateTagPreview(value) {
    const preview = document.getElementById('tagPreview');
    if (!preview) return;

    const tags = value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

    preview.innerHTML = '';

    tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag-item';
        tagElement.innerHTML = `
            ${escapeHtml(tag)}
            <button type="button" class="tag-item-remove" data-tag="${escapeHtml(tag)}" aria-label="Remove tag">×</button>
        `;

        const removeBtn = tagElement.querySelector('.tag-item-remove');
        removeBtn.addEventListener('click', () => {
            removeTagFromInput(tag);
        });

        preview.appendChild(tagElement);
    });
}

/**
 * Removes a tag from the input
 */
function removeTagFromInput(tagToRemove) {
    const input = document.getElementById('taskTags');
    if (!input) return;

    const tags = input.value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && tag !== tagToRemove);

    input.value = tags.join(', ');
    updateTagPreview(input.value);
}

/**
 * Populates the tag filter dropdown with all available tags
 */
function populateTagFilter() {
    const tagFilter = document.getElementById('filterTag');
    if (!tagFilter) return;

    // Get all unique tags
    const allTags = new Set();
    taskList.forEach(task => {
        if (task.tags && task.tags.length > 0) {
            task.tags.forEach(tag => allTags.add(tag));
        }
    });

    // Clear existing options except "All Tags"
    tagFilter.innerHTML = '<option value="all">All Tags</option>';

    // Add tag options
    Array.from(allTags).sort().forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });

    // Restore current filter
    if (currentFilter.tag) {
        tagFilter.value = currentFilter.tag;
    }
}

/**
 * Handles tag filter change
 */
function handleTagFilterChange(e) {
    currentFilter.tag = e.target.value;
    applyFilters();
    savePreferences();
}

// ================================
// SUBTASK FUNCTIONS
// ================================

/**
 * Handles adding a subtask
 */
function handleAddSubtask() {
    const input = document.getElementById('subtaskInput');
    if (!input) return;

    const title = input.value.trim();
    
    if (title.length === 0) {
        return;
    }

    if (title.length > 100) {
        showErrorNotification('Sub-task title cannot exceed 100 characters');
        return;
    }

    if (currentSubtasks.length >= 20) {
        showErrorNotification('Cannot add more than 20 sub-tasks');
        return;
    }

    const subtask = {
        id: generateTempId(),
        title: title,
        completed: false
    };

    currentSubtasks.push(subtask);
    input.value = '';
    
    renderSubtaskList();
}

/**
 * Renders the subtask list in the form
 */
function renderSubtaskList() {
    const list = document.getElementById('subtaskList');
    if (!list) return;

    list.innerHTML = '';

    currentSubtasks.forEach(subtask => {
        const item = document.createElement('div');
        item.className = 'subtask-item' + (subtask.completed ? ' completed' : '');
        item.innerHTML = `
            <input type="checkbox" 
                   class="subtask-checkbox" 
                   ${subtask.completed ? 'checked' : ''}
                   data-subtask-id="${subtask.id}">
            <span class="subtask-text">${escapeHtml(subtask.title)}</span>
            <button type="button" class="subtask-remove" data-subtask-id="${subtask.id}" aria-label="Remove sub-task">×</button>
        `;

        const checkbox = item.querySelector('.subtask-checkbox');
        checkbox.addEventListener('change', (e) => {
            toggleSubtaskInForm(subtask.id);
        });

        const removeBtn = item.querySelector('.subtask-remove');
        removeBtn.addEventListener('click', () => {
            removeSubtaskFromForm(subtask.id);
        });

        list.appendChild(item);
    });
}

/**
 * Toggles subtask completion in form
 */
function toggleSubtaskInForm(subtaskId) {
    const subtask = currentSubtasks.find(st => st.id === subtaskId);
    if (subtask) {
        subtask.completed = !subtask.completed;
        renderSubtaskList();
    }
}

/**
 * Removes subtask from form
 */
function removeSubtaskFromForm(subtaskId) {
    const index = currentSubtasks.findIndex(st => st.id === subtaskId);
    if (index > -1) {
        currentSubtasks.splice(index, 1);
        renderSubtaskList();
    }
}

/**
 * Generates temporary ID for subtasks
 */
function generateTempId() {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ================================
// REPORTS FUNCTIONS
// ================================

/**
 * Opens the reports modal
 */
function openReportsModal() {
    const modal = document.getElementById('reportsModal');
    if (!modal) return;

    const dashboard = document.getElementById('reportsDashboard');
    if (dashboard) {
        // Generate and display report
        const reportHTML = ReportsManager.generateHTMLReport(taskList);
        dashboard.innerHTML = reportHTML;
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

/**
 * Closes the reports modal
 */
function closeReportsModal() {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        modal.classList.add('closing');
        
        setTimeout(() => {
            modal.classList.remove('active', 'closing');
            modal.setAttribute('aria-hidden', 'true');
        }, 150);
    }
}

// ================================
// EXPORT FUNCTIONS
// ================================

/**
 * Opens the export modal
 */
function openExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
}

/**
 * Closes the export modal
 */
function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.classList.add('closing');
        
        setTimeout(() => {
            modal.classList.remove('active', 'closing');
            modal.setAttribute('aria-hidden', 'true');
        }, 150);
    }
}

/**
 * Handles CSV export
 */
function handleExportCSV() {
    const onlyVisible = document.getElementById('exportOnlyVisible')?.checked || false;
    const tasksToExport = onlyVisible ? getVisibleTasks() : taskList;
    
    const filename = `zenith-tasks-${new Date().toISOString().split('T')[0]}.csv`;
    const success = ReportsManager.exportToCSV(tasksToExport, filename);
    
    if (success) {
        showSuccessNotification(`Exported ${tasksToExport.length} tasks to CSV`);
        closeExportModal();
    } else {
        showErrorNotification('Failed to export to CSV');
    }
}

/**
 * Handles PDF export
 */
function handleExportPDF() {
    const onlyVisible = document.getElementById('exportOnlyVisible')?.checked || false;
    const tasksToExport = onlyVisible ? getVisibleTasks() : taskList;
    
    const filename = `zenith-report-${new Date().toISOString().split('T')[0]}.pdf`;
    const success = ReportsManager.exportToPDF(tasksToExport, filename);
    
    if (success) {
        showSuccessNotification('PDF report generated successfully');
        closeExportModal();
    } else {
        showErrorNotification('Failed to export to PDF');
    }
}

/**
 * Handles JSON export (backup)
 */
function handleExportJSON() {
    const onlyVisible = document.getElementById('exportOnlyVisible')?.checked || false;
    const tasksToExport = onlyVisible ? getVisibleTasks() : taskList;
    
    const success = StorageManager.exportTasks(tasksToExport);
    
    if (success) {
        showSuccessNotification(`Backed up ${tasksToExport.length} tasks to JSON`);
        closeExportModal();
    } else {
        showErrorNotification('Failed to export to JSON');
    }
}

/**
 * Gets currently visible tasks based on filters
 */
function getVisibleTasks() {
    return taskList.filter(task => {
        // Status filter
        if (currentFilter.status !== 'all' && task.status !== currentFilter.status) {
            return false;
        }
        
        // Priority filter
        if (currentFilter.priority !== 'all' && task.priority !== currentFilter.priority) {
            return false;
        }
        
        // Tag filter
        if (currentFilter.tag !== 'all' && !task.hasTag(currentFilter.tag)) {
            return false;
        }
        
        return true;
    });
}

// Continue with Part 2...


// ================================
// NOTIFICATION MODAL FUNCTIONS
// ================================

/**
 * Opens the notification settings modal
 */
function openNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (!modal) return;

    // Load current preferences
    const prefs = StorageManager.loadNotificationPrefs();

    // Update checkboxes
    const enabledCheckbox = document.getElementById('enableNotifications');
    const oneDayCheckbox = document.getElementById('notifyOneDayBefore');
    const oneHourCheckbox = document.getElementById('notifyOneHourBefore');
    const overdueCheckbox = document.getElementById('notifyOverdue');

    if (enabledCheckbox) enabledCheckbox.checked = prefs.enabled;
    if (oneDayCheckbox) oneDayCheckbox.checked = prefs.oneDayBefore;
    if (oneHourCheckbox) oneHourCheckbox.checked = prefs.oneHourBefore;
    if (overdueCheckbox) overdueCheckbox.checked = prefs.overdue;

    // Update status display
    NotificationManager.updateStatusDisplay();

    // Open modal
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

/**
 * Closes the notification settings modal
 */
function closeNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.classList.add('closing');
        
        setTimeout(() => {
            modal.classList.remove('active', 'closing');
            modal.setAttribute('aria-hidden', 'true');
        }, 150);
    }
}

/**
 * Handles saving notification settings
 */
async function handleSaveNotificationSettings() {
    const enabled = document.getElementById('enableNotifications')?.checked || false;
    const oneDayBefore = document.getElementById('notifyOneDayBefore')?.checked || false;
    const oneHourBefore = document.getElementById('notifyOneHourBefore')?.checked || false;
    const overdue = document.getElementById('notifyOverdue')?.checked || false;

    const prefs = {
        enabled,
        oneDayBefore,
        oneHourBefore,
        overdue,
        permission: NotificationManager.getPermissionStatus()
    };

    // If enabling notifications, request permission
    if (enabled && NotificationManager.getPermissionStatus() === 'default') {
        const granted = await NotificationManager.requestPermission();
        prefs.permission = granted ? 'granted' : 'denied';
        
        if (!granted) {
            showErrorNotification('Notification permission denied');
            closeNotificationModal();
            return;
        }
    }

    // Save preferences
    StorageManager.saveNotificationPrefs(prefs);

    // Restart notification monitoring
    if (notificationIntervalId) {
        NotificationManager.stopPeriodicCheck(notificationIntervalId);
    }

    if (enabled && prefs.permission === 'granted') {
        notificationIntervalId = NotificationManager.startPeriodicCheck(taskList, 60);
    }

    // Update status display
    NotificationManager.updateStatusDisplay();

    showSuccessNotification('Notification settings saved');
    closeNotificationModal();
}

/**
 * Handles test notification button
 */
async function handleTestNotification() {
    if (!NotificationManager.isSupported()) {
        showErrorNotification('Notifications not supported in this browser');
        return;
    }

    if (NotificationManager.getPermissionStatus() !== 'granted') {
        const granted = await NotificationManager.requestPermission();
        if (!granted) {
            showErrorNotification('Please allow notifications to test');
            return;
        }
    }

    const success = await NotificationManager.sendTestNotification();
    if (success) {
        showSuccessNotification('Test notification sent!');
    } else {
        showErrorNotification('Failed to send test notification');
    }
}

/**
 * Handles enable notifications checkbox change
 */
async function handleEnableNotificationsChange(e) {
    if (e.target.checked && NotificationManager.getPermissionStatus() === 'default') {
        const granted = await NotificationManager.requestPermission();
        if (!granted) {
            e.target.checked = false;
            showErrorNotification('Notification permission denied');
        }
        NotificationManager.updateStatusDisplay();
    }
}

// ================================
// MODAL FUNCTIONS
// ================================

/**
 * Opens modal for adding a new task
 */
function openAddTaskModal() {
    const form = document.getElementById('taskForm');
    if (form) {
        form.reset();
    }

    // Clear hidden ID field
    const taskIdField = document.getElementById('taskId');
    if (taskIdField) taskIdField.value = '';

    // Set defaults
    const priorityField = document.getElementById('taskPriority');
    if (priorityField) priorityField.value = 'medium';

    const statusField = document.getElementById('taskStatus');
    if (statusField) statusField.value = 'todo';

    // Hide status field for new tasks
    const statusGroup = document.getElementById('statusGroup');
    if (statusGroup) statusGroup.style.display = 'none';

    // Clear subtasks and tags
    currentSubtasks = [];
    renderSubtaskList();
    updateTagPreview('');

    // Update modal title and button
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Add New Task';

    const saveBtn = document.getElementById('saveTaskBtn');
    if (saveBtn) {
        const btnText = saveBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Save Task';
    }

    // Clear validation errors
    clearValidationErrors();

    // Open modal
    openModal();
}

/**
 * Opens the modal with animation
 */
function openModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.remove('closing');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

        // Focus first input
        setTimeout(() => {
            const firstInput = document.getElementById('taskTitle');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

/**
 * Closes the modal with animation
 */
function closeModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.add('closing');
        
        setTimeout(() => {
            modal.classList.remove('active', 'closing');
            modal.setAttribute('aria-hidden', 'true');
            
            // Clear temporary subtasks
            currentSubtasks = [];
        }, 150);
    }
}

/**
 * Opens modal for editing an existing task
 * @param {string} taskId - ID of task to edit
 */
function handleEditTask(taskId) {
    try {
        const task = taskList.find(t => t.id === taskId);
        
        if (!task) {
            console.error('Task not found:', taskId);
            showErrorNotification('Task not found');
            return;
        }

        // Pre-populate form
        const taskIdField = document.getElementById('taskId');
        if (taskIdField) taskIdField.value = task.id;

        const titleField = document.getElementById('taskTitle');
        if (titleField) titleField.value = task.title;

        const descriptionField = document.getElementById('taskDescription');
        if (descriptionField) {
            descriptionField.value = task.description || '';
            updateCharacterCount('taskDescription', 'descriptionCount');
        }

        const priorityField = document.getElementById('taskPriority');
        if (priorityField) priorityField.value = task.priority;

        const statusField = document.getElementById('taskStatus');
        if (statusField) statusField.value = task.status;

        const dueDateField = document.getElementById('taskDueDate');
        if (dueDateField) {
            dueDateField.value = task.dueDate ? formatDateForInput(task.dueDate) : '';
        }

        // Populate tags
        const tagField = document.getElementById('taskTags');
        if (tagField) {
            tagField.value = task.tags.join(', ');
            updateTagPreview(tagField.value);
        }

        // Populate subtasks
        currentSubtasks = task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : [];
        renderSubtaskList();

        // Show status field for editing
        const statusGroup = document.getElementById('statusGroup');
        if (statusGroup) statusGroup.style.display = 'block';

        // Update modal title and button
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Edit Task';

        const saveBtn = document.getElementById('saveTaskBtn');
        if (saveBtn) {
            const btnText = saveBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Update Task';
        }

        // Clear validation errors
        clearValidationErrors();

        // Open modal
        openModal();

        console.info('Edit modal opened for task:', taskId);

    } catch (error) {
        console.error('Error opening edit modal:', error);
        showErrorNotification('Failed to open task editor');
    }
}

// ================================
// FORM HANDLING
// ================================

/**
 * Handles task form submission
 * @param {Event} e - Form submit event
 */
function handleTaskFormSubmit(e) {
    e.preventDefault();

    // Prevent double submission
    if (isFormSubmitting) {
        console.warn('Form submission already in progress');
        return;
    }

    // Start performance measurement
    const startTime = performance.now();

    try {
        isFormSubmitting = true;

        // Disable submit button
        const saveBtn = document.getElementById('saveTaskBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('loading');
        }

        // Extract form data
        const formData = extractFormData();

        // Validate form
        const validation = validateTaskForm(formData);
        if (!validation.isValid) {
            console.warn('Form validation failed');
            return;
        }

        // Determine operation type
        const taskId = document.getElementById('taskId').value;
        const isUpdate = taskId && taskId.trim() !== '';

        if (isUpdate) {
            handleUpdateTask(taskId, formData);
        } else {
            handleCreateTask(formData);
        }

        // Close modal
        closeModal();

        // Refresh tag filter
        populateTagFilter();

        // Check notifications for newly created/updated tasks
        if (NotificationManager.getPermissionStatus() === 'granted') {
            NotificationManager.checkTaskReminders(taskList);
        }

        // Performance check
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (performanceMonitoring) {
            console.info(`Task ${isUpdate ? 'update' : 'create'} completed in ${duration.toFixed(2)}ms`);
            
            if (duration > PERFORMANCE_TARGET_MS) {
                console.warn(`⚠️ Performance target exceeded by ${(duration - PERFORMANCE_TARGET_MS).toFixed(2)}ms`);
            }
        }

    } catch (error) {
        console.error('Error submitting task form:', error);
        showErrorNotification('Failed to save task');
        
    } finally {
        isFormSubmitting = false;
        
        const saveBtn = document.getElementById('saveTaskBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
        }
    }
}

/**
 * Extracts form data
 * @returns {Object} - Form data object
 */
function extractFormData() {
    return {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim() || null,
        priority: document.getElementById('taskPriority').value,
        status: document.getElementById('taskStatus').value,
        dueDate: document.getElementById('taskDueDate').value || null,
        tags: document.getElementById('taskTags').value.trim(),
        subtasks: JSON.parse(JSON.stringify(currentSubtasks))
    };
}

/**
 * Validates task form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} - Validation result {isValid, errors}
 */
function validateTaskForm(formData) {
    const errors = {};
    let isValid = true;

    clearValidationErrors();

    // Title validation
    if (!formData.title || formData.title.length === 0) {
        errors.title = 'Title is required';
        showFieldError('taskTitle', errors.title);
        isValid = false;
    } else if (formData.title.length < 3) {
        errors.title = 'Title must be at least 3 characters';
        showFieldError('taskTitle', errors.title);
        isValid = false;
    } else if (formData.title.length > 100) {
        errors.title = 'Title cannot exceed 100 characters';
        showFieldError('taskTitle', errors.title);
        isValid = false;
    }

    // Description validation
    if (formData.description && formData.description.length > 500) {
        errors.description = 'Description cannot exceed 500 characters';
        showFieldError('taskDescription', errors.description);
        isValid = false;
    }

    // Due date validation
    if (formData.dueDate) {
        const dueDate = new Date(formData.dueDate);
        if (isNaN(dueDate.getTime())) {
            errors.dueDate = 'Invalid date format';
            showFieldError('taskDueDate', errors.dueDate);
            isValid = false;
        }
    }

    return { isValid, errors };
}

/**
 * Shows field validation error
 * @param {string} fieldId - Field ID
 * @param {string} message - Error message
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add('invalid');
    field.classList.remove('valid');

    const errorElement = field.parentElement.querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('active');
        errorElement.setAttribute('role', 'alert');
    }

    field.focus();
}

/**
 * Clears all validation errors
 */
function clearValidationErrors() {
    const fields = document.querySelectorAll('.invalid, .valid');
    fields.forEach(field => {
        field.classList.remove('invalid', 'valid');
    });

    const errorMessages = document.querySelectorAll('.error-message.active');
    errorMessages.forEach(error => {
        error.textContent = '';
        error.classList.remove('active');
    });
}

/**
 * Handles creating a new task
 * @param {Object} formData - Validated form data
 */
function handleCreateTask(formData) {
    try {
        const newTask = new Task({
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            status: formData.status || 'todo',
            dueDate: formData.dueDate,
            tags: formData.tags,
            subtasks: formData.subtasks
        });

        taskList.push(newTask);

        const saveSuccess = StorageManager.saveTasks(taskList);
        
        if (!saveSuccess) {
            taskList.pop();
            throw new Error('Failed to save task');
        }

        renderTasks(taskList);
        handleEmptyState();

        showSuccessNotification(`Task "${newTask.title}" created successfully`);

        console.info('Task created:', newTask.id);

    } catch (error) {
        console.error('Error creating task:', error);
        throw error;
    }
}

/**
 * Handles updating an existing task
 * @param {string} taskId - Task ID
 * @param {Object} formData - Validated form data
 */
function handleUpdateTask(taskId, formData) {
    try {
        const task = taskList.find(t => t.id === taskId);
        
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }

        const oldStatus = task.status;

        task.update({
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            status: formData.status,
            dueDate: formData.dueDate,
            tags: formData.tags,
            subtasks: formData.subtasks
        });

        const saveSuccess = StorageManager.saveTasks(taskList);
        
        if (!saveSuccess) {
            throw new Error('Failed to save updated task');
        }

        // Re-render if status changed, otherwise update single card
        if (oldStatus !== task.status) {
            renderTasks(taskList);
        } else {
            updateSingleTaskCard(task);
        }

        handleEmptyState();

        showSuccessNotification(`Task "${task.title}" updated successfully`);

        console.info('Task updated:', task.id);

    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
}

// ================================
// RENDER FUNCTIONS
// ================================

/**
 * Renders all tasks to the DOM
 * @param {Task[]} tasks - Array of tasks to render
 */
function renderTasks(tasks) {
    try {
        // Validate input
        if (!Array.isArray(tasks)) {
            console.error('renderTasks: Expected array');
            return;
        }

        // Get task list containers
        const todoList = document.getElementById('todoList');
        const inProgressList = document.getElementById('inProgressList');
        const completedList = document.getElementById('completedList');

        if (!todoList || !inProgressList || !completedList) {
            console.error('Task containers not found');
            return;
        }

        // Clear existing content
        todoList.innerHTML = '';
        inProgressList.innerHTML = '';
        completedList.innerHTML = '';

        // Group tasks by status
        const tasksByStatus = {
            todo: [],
            inprogress: [],
            completed: []
        };

        tasks.forEach(task => {
            if (task.status in tasksByStatus) {
                tasksByStatus[task.status].push(task);
            }
        });

        // Apply current filter and sort
        Object.keys(tasksByStatus).forEach(status => {
            tasksByStatus[status] = filterAndSortTasks(tasksByStatus[status]);
        });

        // Create document fragments for batch rendering
        const todoFragment = document.createDocumentFragment();
        const inProgressFragment = document.createDocumentFragment();
        const completedFragment = document.createDocumentFragment();

        // Render tasks
        tasksByStatus.todo.forEach(task => {
            todoFragment.appendChild(createTaskCard(task));
        });

        tasksByStatus.inprogress.forEach(task => {
            inProgressFragment.appendChild(createTaskCard(task));
        });

        tasksByStatus.completed.forEach(task => {
            completedFragment.appendChild(createTaskCard(task));
        });

        // Append to DOM
        todoList.appendChild(todoFragment);
        inProgressList.appendChild(inProgressFragment);
        completedList.appendChild(completedFragment);

        // Update counts
        updateTaskCounts(tasksByStatus);

        console.info(`Rendered ${tasks.length} tasks`);

    } catch (error) {
        console.error('Error rendering tasks:', error);
    }
}

/**
 * Creates a task card DOM element
 * @param {Task} task - Task instance
 * @returns {HTMLElement} - Task card element
 */
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-task-id', task.id);
    card.setAttribute('id', task.id);
    card.setAttribute('draggable', 'true');
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `Task: ${task.title}`);
    card.setAttribute('tabindex', '0');

    // Header
    const header = document.createElement('div');
    header.className = 'task-card-header';

    const title = document.createElement('h3');
    title.className = 'task-title';
    title.textContent = escapeHtml(task.title);
    title.setAttribute('title', escapeHtml(task.title));

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `priority-badge priority-${task.priority}`;
    priorityBadge.textContent = task.priority.toUpperCase();

    header.appendChild(title);
    header.appendChild(priorityBadge);
    card.appendChild(header);

    // Description
    if (task.description) {
        const description = document.createElement('p');
        description.className = 'task-description';
        description.textContent = escapeHtml(task.description);
        card.appendChild(description);
    }

    // Tags (NEW)
    if (task.tags && task.tags.length > 0) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'task-tags';
        
        task.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'task-tag';
            tagElement.textContent = escapeHtml(tag);
            tagsContainer.appendChild(tagElement);
        });
        
        card.appendChild(tagsContainer);
    }

    // Sub-task Progress (NEW)
    if (task.subtasks && task.subtasks.length > 0) {
        const progress = task.getSubtaskProgress();
        const progressContainer = document.createElement('div');
        progressContainer.className = 'subtask-progress';
        
        progressContainer.innerHTML = `
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${progress.percentage}%"></div>
            </div>
            <div class="progress-text">
                <span>✓ ${progress.completed}/${progress.total} sub-tasks</span>
                <span>${progress.percentage}%</span>
            </div>
        `;
        
        card.appendChild(progressContainer);
    }

    // Footer
    const footer = document.createElement('div');
    footer.className = 'task-card-footer';

    const dueDateContainer = document.createElement('div');
    dueDateContainer.className = 'task-due-date';

    if (task.dueDate) {
        const formattedDate = formatDate(task.dueDate);
        dueDateContainer.textContent = formattedDate;
        dueDateContainer.setAttribute('datetime', task.dueDate.toISOString());
        
        if (task.isOverdue()) {
            dueDateContainer.classList.add('overdue');
        }
    } else {
        dueDateContainer.textContent = 'No due date';
        dueDateContainer.style.opacity = '0.5';
    }

    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'task-actions';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete';
    deleteButton.textContent = '🗑️ Delete';
    deleteButton.setAttribute('aria-label', `Delete task: ${task.title}`);
    deleteButton.setAttribute('data-task-id', task.id);

    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteTask(task.id);
    });

    actionsContainer.appendChild(deleteButton);
    footer.appendChild(dueDateContainer);
    footer.appendChild(actionsContainer);
    card.appendChild(footer);

    // Card click to edit
    card.addEventListener('click', () => {
        handleEditTask(task.id);
    });

    // Keyboard accessibility
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleEditTask(task.id);
        }
    });

    // Drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    return card;
}

/**
 * Updates a single task card in the DOM
 * @param {Task} task - Updated task
 */
function updateSingleTaskCard(task) {
    const existingCard = document.querySelector(`[data-task-id="${task.id}"]`);
    
    if (existingCard) {
        const newCard = createTaskCard(task);
        existingCard.replaceWith(newCard);
    } else {
        renderTasks(taskList);
    }
}

/**
 * Updates task count badges
 * @param {Object} tasksByStatus - Tasks grouped by status
 */
function updateTaskCounts(tasksByStatus) {
    const todoCount = document.getElementById('todoCount');
    const inProgressCount = document.getElementById('inProgressCount');
    const completedCount = document.getElementById('completedCount');

    if (todoCount) todoCount.textContent = tasksByStatus.todo.length;
    if (inProgressCount) inProgressCount.textContent = tasksByStatus.inprogress.length;
    if (completedCount) completedCount.textContent = tasksByStatus.completed.length;
}

// ================================
// DELETE FUNCTIONS
// ================================

/**
 * Handles task deletion with confirmation
 * @param {string} taskId - ID of task to delete
 */
function handleDeleteTask(taskId) {
    try {
        const task = taskList.find(t => t.id === taskId);
        
        if (!task) {
            console.error('Task not found:', taskId);
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete "${task.title}"?\n\nThis action cannot be undone.`);
        
        if (!confirmed) {
            return;
        }

        const taskIndex = taskList.findIndex(t => t.id === taskId);
        taskList.splice(taskIndex, 1);

        const saveSuccess = StorageManager.saveTasks(taskList);
        
        if (!saveSuccess) {
            taskList.splice(taskIndex, 0, task);
            showErrorNotification('Failed to delete task');
            return;
        }

        renderTasks(taskList);
        handleEmptyState();
        populateTagFilter();

        showSuccessNotification(`Task "${task.title}" deleted`);

        console.info('Task deleted:', taskId);

    } catch (error) {
        console.error('Error deleting task:', error);
        showErrorNotification('Failed to delete task');
    }
}

// ================================
// DRAG AND DROP
// ================================

/**
 * Initializes drag and drop functionality
 */
function initializeDragAndDrop() {
    const dropZones = document.querySelectorAll('.task-list');
    
    dropZones.forEach(dropZone => {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragenter', handleDragEnter);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
    });

    console.info('Drag and drop initialized');
}

/**
 * Handles drag start event
 * @param {DragEvent} e - Drag event
 */
function handleDragStart(e) {
    draggedElement = e.currentTarget;
    const taskId = draggedElement.getAttribute('data-task-id');
    
    draggedTask = taskList.find(t => t.id === taskId);
    sourceColumn = draggedElement.closest('.task-list');

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);

    draggedElement.classList.add('dragging');
}

/**
 * Handles drag over event
 * @param {DragEvent} e - Drag event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

/**
 * Handles drag enter event
 * @param {DragEvent} e - Drag event
 */
function handleDragEnter(e) {
    e.preventDefault();
    
    const dropZone = e.currentTarget;
    if (dropZone && dropZone.classList.contains('task-list')) {
        dropZone.classList.add('drag-over');
        
        const column = dropZone.closest('.task-column');
        if (column) {
            column.classList.add('drop-target-active');
        }
    }
}

/**
 * Handles drag leave event
 * @param {DragEvent} e - Drag event
 */
function handleDragLeave(e) {
    const dropZone = e.currentTarget;
    const relatedTarget = e.relatedTarget;
    
    if (dropZone && !dropZone.contains(relatedTarget)) {
        dropZone.classList.remove('drag-over');
        
        const column = dropZone.closest('.task-column');
        if (column) {
            column.classList.remove('drop-target-active');
        }
    }
}

/**
 * Handles drop event
 * @param {DragEvent} e - Drop event
 */
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const dropZone = e.currentTarget;
    
    dropZone.classList.remove('drag-over');
    const column = dropZone.closest('.task-column');
    if (column) {
        column.classList.remove('drop-target-active');
    }

    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = dropZone.getAttribute('data-status');
    
    if (!taskId || !newStatus) return;

    const task = taskList.find(t => t.id === taskId);
    
    if (!task) return;

    const oldStatus = task.status;

    if (oldStatus === newStatus) return;

    task.update({ status: newStatus });

    const saveSuccess = StorageManager.saveTasks(taskList);
    
    if (!saveSuccess) {
        task.update({ status: oldStatus });
        if (sourceColumn && draggedElement) {
            sourceColumn.appendChild(draggedElement);
        }
        showErrorNotification('Failed to move task');
        return;
    }

    renderTasks(taskList);
    handleEmptyState();

    showSuccessNotification(`Task moved to ${getStatusDisplayName(newStatus)}`);

    console.info('Task moved:', taskId, 'from', oldStatus, 'to', newStatus);
}

/**
 * Handles drag end event
 * @param {DragEvent} e - Drag event
 */
function handleDragEnd(e) {
    const draggedCard = e.currentTarget;
    if (draggedCard) {
        draggedCard.classList.remove('dragging');
    }

    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });

    document.querySelectorAll('.drop-target-active').forEach(el => {
        el.classList.remove('drop-target-active');
    });

    draggedTask = null;
    draggedElement = null;
    sourceColumn = null;
}

// ================================
// FILTER AND SORT
// ================================

/**
 * Handles status filter change
 * @param {Event} e - Change event
 */
function handleStatusFilterChange(e) {
    currentFilter.status = e.target.value;
    applyFilters();
    savePreferences();
}

/**
 * Handles priority filter change
 * @param {Event} e - Change event
 */
function handlePriorityFilterChange(e) {
    currentFilter.priority = e.target.value;
    applyFilters();
    savePreferences();
}

/**
 * Handles sort change
 * @param {Event} e - Change event
 */
function handleSortChange(e) {
    currentFilter.sortBy = e.target.value;
    renderTasks(taskList);
    savePreferences();
}

/**
 * Toggles sort order
 */
function toggleSortOrder() {
    currentFilter.sortOrder = currentFilter.sortOrder === 'asc' ? 'desc' : 'asc';
    
    const toggleBtn = document.getElementById('sortOrderToggle');
    if (toggleBtn) {
        toggleBtn.textContent = currentFilter.sortOrder === 'asc' ? '↑' : '↓';
    }
    
    renderTasks(taskList);
    savePreferences();
}

/**
 * Applies all active filters
 */
function applyFilters() {
    // Show/hide columns based on status filter
    const columns = {
        todo: document.getElementById('todoColumn'),
        inprogress: document.getElementById('inProgressColumn'),
        completed: document.getElementById('completedColumn')
    };

    if (currentFilter.status === 'all') {
        Object.values(columns).forEach(column => {
            if (column) {
                column.style.display = '';
                column.setAttribute('aria-hidden', 'false');
            }
        });
    } else {
        Object.entries(columns).forEach(([key, column]) => {
            if (column) {
                if (key === currentFilter.status) {
                    column.style.display = '';
                    column.setAttribute('aria-hidden', 'false');
                } else {
                    column.style.display = 'none';
                    column.setAttribute('aria-hidden', 'true');
                }
            }
        });
    }

    renderTasks(taskList);
}

/**
 * Filters and sorts tasks
 * @param {Task[]} tasks - Tasks to filter and sort
 * @returns {Task[]} - Filtered and sorted tasks
 */
function filterAndSortTasks(tasks) {
    let filtered = [...tasks];

    // Apply priority filter
    if (currentFilter.priority !== 'all') {
        filtered = filtered.filter(t => t.priority === currentFilter.priority);
    }

    // Apply tag filter (NEW)
    if (currentFilter.tag !== 'all') {
        filtered = filtered.filter(t => t.hasTag(currentFilter.tag));
    }

    // Apply sorting
    filtered = sortTasks(filtered, currentFilter.sortBy, currentFilter.sortOrder);

    return filtered;
}

/**
 * Sorts tasks by criteria
 * @param {Task[]} tasks - Tasks to sort
 * @param {string} sortBy - Sort criterion
 * @param {string} order - Sort order
 * @returns {Task[]} - Sorted tasks
 */
function sortTasks(tasks, sortBy, order = 'desc') {
    const sorted = [...tasks];
    const multiplier = order === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
        if (sortBy === 'priority') {
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            return (priorityOrder[a.priority] - priorityOrder[b.priority]) * multiplier;
        }

        if (sortBy === 'dueDate') {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return (new Date(a.dueDate) - new Date(b.dueDate)) * multiplier;
        }

        // Default: createdAt
        return (new Date(b.createdAt) - new Date(a.createdAt)) * multiplier;
    });

    return sorted;
}

/**
 * Resets all filters
 */
function resetFilters() {
    currentFilter = {
        status: 'all',
        priority: 'all',
        tag: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    };

    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter) statusFilter.value = 'all';

    const priorityFilter = document.getElementById('filterPriority');
    if (priorityFilter) priorityFilter.value = 'all';

    const tagFilter = document.getElementById('filterTag');
    if (tagFilter) tagFilter.value = 'all';

    const sortBy = document.getElementById('sortBy');
    if (sortBy) sortBy.value = 'createdAt';

    applyFilters();
    savePreferences();

    showSuccessNotification('Filters reset');
}

/**
 * Saves current preferences
 */
function savePreferences() {
    StorageManager.savePreferences(currentFilter);
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Escapes HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formats date for display
 * @param {Date} date - Date object
 * @returns {string} - Formatted date
 */
function formatDate(date) {
    if (!date || !(date instanceof Date)) return '';
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Formats date for input field
 * @param {Date} date - Date object
 * @returns {string} - YYYY-MM-DD format
 */
function formatDateForInput(date) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) return '';

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Gets display name for status
 * @param {string} status - Status code
 * @returns {string} - Display name
 */
function getStatusDisplayName(status) {
    const names = {
        todo: 'To Do',
        inprogress: 'In Progress',
        completed: 'Completed'
    };
    return names[status] || status;
}

/**
 * Updates character count display
 * @param {string} fieldId - Field ID
 * @param {string} countId - Counter element ID
 */
function updateCharacterCount(fieldId, countId) {
    const field = document.getElementById(fieldId);
    const counter = document.getElementById(countId);
    
    if (field && counter) {
        const current = field.value.length;
        const max = field.getAttribute('maxlength') || 500;
        counter.textContent = `${current} / ${max}`;
    }
}

/**
 * Handles empty states
 */
function handleEmptyState() {
    const taskLists = document.querySelectorAll('.task-list');
    
    taskLists.forEach(list => {
        const cards = list.querySelectorAll('.task-card');
        
        if (cards.length === 0) {
            const status = list.getAttribute('data-status');
            const messages = {
                todo: { icon: '📝', title: 'No tasks to do', desc: 'Create a new task to get started!' },
                inprogress: { icon: '⚙️', title: 'No tasks in progress', desc: 'Drag tasks here when you start working' },
                completed: { icon: '✅', title: 'No completed tasks', desc: 'Completed tasks will appear here' }
            };

            const message = messages[status] || messages.todo;
            
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-icon">${message.icon}</div>
                <h3 class="empty-title">${message.title}</h3>
                <p class="empty-description">${message.desc}</p>
            `;
            
            list.appendChild(emptyState);
        } else {
            const emptyState = list.querySelector('.empty-state');
            if (emptyState) {
                emptyState.remove();
            }
        }
    });

    // Global empty state
    if (taskList.length === 0) {
        showGlobalEmptyState();
    } else {
        hideGlobalEmptyState();
    }
}

/**
 * Shows global empty state
 */
function showGlobalEmptyState() {
    let overlay = document.getElementById('globalEmptyState');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'globalEmptyState';
        overlay.className = 'global-empty-state';
        overlay.innerHTML = `
            <div class="empty-content">
                <div class="empty-illustration">🎯</div>
                <h2>Welcome to Zenith!</h2>
                <p>Your personal productivity hub is ready.</p>
                <p class="empty-hint">Click the "+ Add Task" button above to create your first task</p>
            </div>
        `;
        
        const taskBoard = document.querySelector('.task-board');
        if (taskBoard) {
            taskBoard.appendChild(overlay);
        }
    }
    
    overlay.style.display = 'flex';
}

/**
 * Hides global empty state
 */
function hideGlobalEmptyState() {
    const overlay = document.getElementById('globalEmptyState');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ================================
// NOTIFICATIONS
// ================================

/**
 * Shows success notification
 * @param {string} message - Success message
 */
function showSuccessNotification(message) {
    createToastNotification(message, 'success');
}

/**
 * Shows error notification
 * @param {string} message - Error message
 */
function showErrorNotification(message) {
    createToastNotification(message, 'error');
}

/**
 * Creates toast notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
function createToastNotification(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================================
// INITIALIZE ON DOM READY
// ================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
