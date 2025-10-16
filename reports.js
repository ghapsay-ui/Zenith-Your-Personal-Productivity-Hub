/**
 * Zenith Reports & Export Module
 * Handles productivity analytics, data visualization, and export functionality
 */

const ReportsManager = {
    /**
     * Generates productivity statistics
     * @param {Task[]} tasks - Array of tasks
     * @returns {Object} - Statistics object
     */
    generateStatistics(tasks) {
        const stats = {
            total: tasks.length,
            byStatus: {
                todo: tasks.filter(t => t.status === Task.Status.TODO).length,
                inprogress: tasks.filter(t => t.status === Task.Status.IN_PROGRESS).length,
                completed: tasks.filter(t => t.status === Task.Status.COMPLETED).length
            },
            byPriority: {
                high: tasks.filter(t => t.priority === Task.Priority.HIGH).length,
                medium: tasks.filter(t => t.priority === Task.Priority.MEDIUM).length,
                low: tasks.filter(t => t.priority === Task.Priority.LOW).length
            },
            overdue: tasks.filter(t => t.isOverdue()).length,
            dueSoon: tasks.filter(t => {
                if (!t.dueDate || t.status === Task.Status.COMPLETED) return false;
                const now = new Date();
                const due = new Date(t.dueDate);
                const hoursUntilDue = (due - now) / (1000 * 60 * 60);
                return hoursUntilDue > 0 && hoursUntilDue <= 48;
            }).length,
            withTags: tasks.filter(t => t.tags && t.tags.length > 0).length,
            withSubtasks: tasks.filter(t => t.subtasks && t.subtasks.length > 0).length,
            completionRate: 0
        };

        stats.completionRate = tasks.length > 0 
            ? Math.round((stats.byStatus.completed / tasks.length) * 100) 
            : 0;

        return stats;
    },

    /**
     * Gets tasks completed per day for the last N days
     * @param {Task[]} tasks - Array of tasks
     * @param {number} days - Number of days to analyze
     * @returns {Object} - Date-based completion data
     */
    getCompletionTrend(tasks, days = 30) {
        const completedTasks = tasks.filter(t => t.status === Task.Status.COMPLETED);
        const trend = {};
        const now = new Date();

        // Initialize all dates with 0
        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            trend[dateKey] = 0;
        }

        // Count completed tasks per day
        completedTasks.forEach(task => {
            const completedDate = new Date(task.updatedAt);
            const dateKey = completedDate.toISOString().split('T')[0];
            
            if (trend.hasOwnProperty(dateKey)) {
                trend[dateKey]++;
            }
        });

        // Convert to array sorted by date
        return Object.entries(trend)
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .map(([date, count]) => ({ date, count }));
    },

    /**
     * Gets tasks created per week for the last N weeks
     * @param {Task[]} tasks - Array of tasks
     * @param {number} weeks - Number of weeks to analyze
     * @returns {Array} - Weekly creation data
     */
    getWeeklyCreationData(tasks, weeks = 8) {
        const weeklyData = [];
        const now = new Date();

        for (let i = 0; i < weeks; i++) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() - (i * 7));
            weekEnd.setHours(23, 59, 59, 999);

            const tasksInWeek = tasks.filter(task => {
                const created = new Date(task.createdAt);
                return created >= weekStart && created <= weekEnd;
            });

            const completed = tasksInWeek.filter(t => t.status === Task.Status.COMPLETED).length;

            weeklyData.unshift({
                week: `Week ${weeks - i}`,
                weekStart: weekStart.toISOString().split('T')[0],
                weekEnd: weekEnd.toISOString().split('T')[0],
                created: tasksInWeek.length,
                completed: completed
            });
        }

        return weeklyData;
    },

    /**
     * Gets all unique tags from tasks
     * @param {Task[]} tasks - Array of tasks
     * @returns {Object} - Tag usage statistics
     */
    getTagStatistics(tasks) {
        const tagCounts = {};

        tasks.forEach(task => {
            if (task.tags && task.tags.length > 0) {
                task.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        // Convert to array and sort by count
        return Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    },

    /**
     * Gets average completion time for tasks
     * @param {Task[]} tasks - Array of tasks
     * @returns {Object} - Completion time statistics
     */
    getCompletionTimeStats(tasks) {
        const completedTasks = tasks.filter(t => t.status === Task.Status.COMPLETED);
        
        if (completedTasks.length === 0) {
            return {
                averageDays: 0,
                medianDays: 0,
                fastest: null,
                slowest: null
            };
        }

        const completionTimes = completedTasks.map(task => {
            const created = new Date(task.createdAt);
            const completed = new Date(task.updatedAt);
            return (completed - created) / (1000 * 60 * 60 * 24); // Days
        }).sort((a, b) => a - b);

        const sum = completionTimes.reduce((acc, time) => acc + time, 0);
        const average = sum / completionTimes.length;
        const median = completionTimes[Math.floor(completionTimes.length / 2)];

        return {
            averageDays: Math.round(average * 10) / 10,
            medianDays: Math.round(median * 10) / 10,
            fastest: Math.round(completionTimes[0] * 10) / 10,
            slowest: Math.round(completionTimes[completionTimes.length - 1] * 10) / 10
        };
    },

    /**
     * Exports tasks to CSV format
     * @param {Task[]} tasks - Array of tasks to export
     * @param {string} filename - Filename for export
     */
    exportToCSV(tasks, filename = 'zenith-tasks-export.csv') {
        try {
            // CSV Headers
            const headers = [
                'ID',
                'Title',
                'Description',
                'Status',
                'Priority',
                'Due Date',
                'Tags',
                'Subtasks Total',
                'Subtasks Completed',
                'Progress %',
                'Created At',
                'Updated At',
                'Overdue'
            ];

            // Convert tasks to CSV rows
            const rows = tasks.map(task => {
                const subtaskProgress = task.getSubtaskProgress();
                
                return [
                    this.escapeCSV(task.id),
                    this.escapeCSV(task.title),
                    this.escapeCSV(task.description || ''),
                    this.escapeCSV(task.status),
                    this.escapeCSV(task.priority),
                    task.dueDate ? this.escapeCSV(task.dueDate.toISOString().split('T')[0]) : '',
                    this.escapeCSV(task.tags.join(', ')),
                    subtaskProgress.total,
                    subtaskProgress.completed,
                    subtaskProgress.percentage,
                    this.escapeCSV(new Date(task.createdAt).toLocaleString()),
                    this.escapeCSV(new Date(task.updatedAt).toLocaleString()),
                    task.isOverdue() ? 'Yes' : 'No'
                ].join(',');
            });

            // Combine headers and rows
            const csvContent = [headers.join(','), ...rows].join('\n');

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.info('✓ CSV export successful:', filename);
            return true;
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            return false;
        }
    },

    /**
     * Escapes CSV special characters
     * @param {string} value - Value to escape
     * @returns {string} - Escaped value
     */
    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        
        const stringValue = String(value);
        
        // If contains comma, quote, or newline, wrap in quotes and escape quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
    },

    /**
     * Exports tasks and statistics to PDF format
     * Note: This requires jsPDF library to be loaded
     * @param {Task[]} tasks - Array of tasks
     * @param {string} filename - Filename for export
     */
    exportToPDF(tasks, filename = 'zenith-tasks-report.pdf') {
        try {
            // Check if jsPDF is available
            if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
                console.error('jsPDF library not loaded');
                alert('PDF export requires jsPDF library. Please include it in your HTML:\n<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>');
                return false;
            }

            const { jsPDF } = window.jspdf || jspdf;
            const doc = new jsPDF();

            // Get statistics
            const stats = this.generateStatistics(tasks);
            const completionStats = this.getCompletionTimeStats(tasks);

            let yPosition = 20;

            // Title
            doc.setFontSize(20);
            doc.setFont(undefined, 'bold');
            doc.text('Zenith Task Management Report', 105, yPosition, { align: 'center' });
            
            yPosition += 10;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Generated: ${new Date().toLocaleString()}`, 105, yPosition, { align: 'center' });
            
            yPosition += 15;

            // Statistics Section
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Overview Statistics', 20, yPosition);
            yPosition += 8;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const statsLines = [
                `Total Tasks: ${stats.total}`,
                `Completed: ${stats.byStatus.completed} (${stats.completionRate}%)`,
                `In Progress: ${stats.byStatus.inprogress}`,
                `To Do: ${stats.byStatus.todo}`,
                `Overdue: ${stats.overdue}`,
                `Due Soon (48h): ${stats.dueSoon}`,
                ``,
                `Priority Breakdown:`,
                `  High: ${stats.byPriority.high}`,
                `  Medium: ${stats.byPriority.medium}`,
                `  Low: ${stats.byPriority.low}`,
                ``,
                `Average Completion Time: ${completionStats.averageDays} days`,
                `Median Completion Time: ${completionStats.medianDays} days`
            ];

            statsLines.forEach(line => {
                doc.text(line, 20, yPosition);
                yPosition += 5;
            });

            yPosition += 10;

            // Tasks Table
            if (tasks.length > 0 && yPosition < 250) {
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('Task List', 20, yPosition);
                yPosition += 8;

                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');

                // Table headers
                doc.setFont(undefined, 'bold');
                doc.text('Title', 20, yPosition);
                doc.text('Status', 90, yPosition);
                doc.text('Priority', 120, yPosition);
                doc.text('Due Date', 150, yPosition);
                yPosition += 5;
                doc.setFont(undefined, 'normal');

                // Draw line
                doc.line(20, yPosition, 190, yPosition);
                yPosition += 5;

                // Task rows (limit to fit page)
                const maxTasks = Math.min(tasks.length, 25);
                for (let i = 0; i < maxTasks; i++) {
                    const task = tasks[i];
                    
                    if (yPosition > 280) {
                        doc.addPage();
                        yPosition = 20;
                    }

                    const title = task.title.length > 30 ? task.title.substring(0, 27) + '...' : task.title;
                    doc.text(title, 20, yPosition);
                    doc.text(task.status, 90, yPosition);
                    doc.text(task.priority, 120, yPosition);
                    doc.text(task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A', 150, yPosition);
                    yPosition += 5;
                }

                if (tasks.length > maxTasks) {
                    yPosition += 3;
                    doc.setFont(undefined, 'italic');
                    doc.text(`... and ${tasks.length - maxTasks} more tasks`, 20, yPosition);
                }
            }

            // Save PDF
            doc.save(filename);

            console.info('✓ PDF export successful:', filename);
            return true;
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('Failed to export PDF. Please ensure jsPDF library is loaded.');
            return false;
        }
    },

    /**
     * Generates HTML report for display in dashboard
     * @param {Task[]} tasks - Array of tasks
     * @returns {string} - HTML string
     */
    generateHTMLReport(tasks) {
        const stats = this.generateStatistics(tasks);
        const completionStats = this.getCompletionTimeStats(tasks);
        const tagStats = this.getTagStatistics(tasks);
        const weeklyData = this.getWeeklyCreationData(tasks, 4);

        return `
            <div class="report-container">
                <div class="report-header">
                    <h2>📊 Productivity Dashboard</h2>
                    <p class="report-date">Generated: ${new Date().toLocaleString()}</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-card stat-total">
                        <div class="stat-icon">📝</div>
                        <div class="stat-content">
                            <h3>Total Tasks</h3>
                            <p class="stat-number">${stats.total}</p>
                        </div>
                    </div>

                    <div class="stat-card stat-completed">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <h3>Completed</h3>
                            <p class="stat-number">${stats.byStatus.completed}</p>
                            <p class="stat-detail">${stats.completionRate}% completion rate</p>
                        </div>
                    </div>

                    <div class="stat-card stat-progress">
                        <div class="stat-icon">⚙️</div>
                        <div class="stat-content">
                            <h3>In Progress</h3>
                            <p class="stat-number">${stats.byStatus.inprogress}</p>
                        </div>
                    </div>

                    <div class="stat-card stat-overdue">
                        <div class="stat-icon">⚠️</div>
                        <div class="stat-content">
                            <h3>Overdue</h3>
                            <p class="stat-number">${stats.overdue}</p>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <h3>⏱️ Completion Time Analysis</h3>
                    <div class="completion-stats">
                        <div class="completion-stat">
                            <span class="label">Average:</span>
                            <span class="value">${completionStats.averageDays} days</span>
                        </div>
                        <div class="completion-stat">
                            <span class="label">Median:</span>
                            <span class="value">${completionStats.medianDays} days</span>
                        </div>
                        <div class="completion-stat">
                            <span class="label">Fastest:</span>
                            <span class="value">${completionStats.fastest || 'N/A'} days</span>
                        </div>
                        <div class="completion-stat">
                            <span class="label">Slowest:</span>
                            <span class="value">${completionStats.slowest || 'N/A'} days</span>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <h3>🏷️ Popular Tags</h3>
                    <div class="tags-list">
                        ${tagStats.slice(0, 10).map(({ tag, count }) => `
                            <div class="tag-stat">
                                <span class="tag-name">${this.escapeHTML(tag)}</span>
                                <span class="tag-count">${count} task${count > 1 ? 's' : ''}</span>
                            </div>
                        `).join('') || '<p class="no-data">No tags found</p>'}
                    </div>
                </div>

                <div class="report-section">
                    <h3>📈 Weekly Activity (Last 4 Weeks)</h3>
                    <div class="weekly-chart">
                        ${weeklyData.map(week => `
                            <div class="week-bar">
                                <div class="week-label">${week.week}</div>
                                <div class="bar-container">
                                    <div class="bar bar-created" style="width: ${week.created * 10}px;" title="${week.created} created">
                                        ${week.created > 0 ? week.created : ''}
                                    </div>
                                    <div class="bar bar-completed" style="width: ${week.completed * 10}px;" title="${week.completed} completed">
                                        ${week.completed > 0 ? week.completed : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        <div class="chart-legend">
                            <span><span class="legend-color legend-created"></span> Created</span>
                            <span><span class="legend-color legend-completed"></span> Completed</span>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <h3>🎯 Priority Distribution</h3>
                    <div class="priority-chart">
                        <div class="priority-bar">
                            <span class="priority-label priority-high">High</span>
                            <div class="priority-progress">
                                <div class="priority-fill priority-high-fill" style="width: ${stats.total > 0 ? (stats.byPriority.high / stats.total * 100) : 0}%"></div>
                            </div>
                            <span class="priority-count">${stats.byPriority.high}</span>
                        </div>
                        <div class="priority-bar">
                            <span class="priority-label priority-medium">Medium</span>
                            <div class="priority-progress">
                                <div class="priority-fill priority-medium-fill" style="width: ${stats.total > 0 ? (stats.byPriority.medium / stats.total * 100) : 0}%"></div>
                            </div>
                            <span class="priority-count">${stats.byPriority.medium}</span>
                        </div>
                        <div class="priority-bar">
                            <span class="priority-label priority-low">Low</span>
                            <div class="priority-progress">
                                <div class="priority-fill priority-low-fill" style="width: ${stats.total > 0 ? (stats.byPriority.low / stats.total * 100) : 0}%"></div>
                            </div>
                            <span class="priority-count">${stats.byPriority.low}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Escapes HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsManager;
}
