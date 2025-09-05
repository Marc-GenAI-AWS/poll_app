class AdminDashboard {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.charts = {};
        this.init();
    }

    init() {
        if (this.token) {
            this.showDashboard();
            this.loadDashboardData();
        } else {
            this.showLogin();
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Create event button
        document.getElementById('create-event-btn').addEventListener('click', () => {
            this.showCreateEventModal();
        });

        // Create event form
        document.getElementById('create-event-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createEvent();
        });

        // Cancel event creation
        document.getElementById('cancel-event').addEventListener('click', () => {
            this.hideCreateEventModal();
        });

        // Close models modal
        document.getElementById('close-models-modal').addEventListener('click', () => {
            this.hideManageModelsModal();
        });

        // Add model form
        document.getElementById('add-model-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addModel();
        });

        // Auto-refresh dashboard every 30 seconds
        setInterval(() => {
            if (this.token && !document.getElementById('dashboard-section').classList.contains('hidden')) {
                this.loadDashboardData();
            }
        }, 30000);
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();
            
            if (response.ok) {
                this.token = result.token;
                localStorage.setItem('adminToken', this.token);
                this.showDashboard();
                this.loadDashboardData();
                this.hideLoginError();
            } else {
                this.showLoginError(result.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Network error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('adminToken');
        this.showLogin();
        
        // Clear form
        document.getElementById('login-form').reset();
    }

    showLogin() {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('dashboard-section').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideLoginError() {
        document.getElementById('login-error').classList.add('hidden');
    }

    async loadDashboardData() {
        if (!this.token) return;

        this.showLoading(true);
        
        try {
            const response = await fetch('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                this.logout();
                return;
            }

            const stats = await response.json();
            this.updateStatistics(stats);
            this.updateCharts(stats);
            this.updateTables(stats);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    updateStatistics(stats) {
        // Total votes
        const totalVotes = stats.totalVotes[0]?.count || 0;
        document.getElementById('total-votes').textContent = totalVotes;

        // Unique participants
        const uniqueParticipants = new Set();
        stats.recentVotes.forEach(vote => uniqueParticipants.add(vote.participant_name));
        document.getElementById('total-participants').textContent = uniqueParticipants.size;

        // Active events
        document.getElementById('active-events').textContent = stats.votesByEvent.length;

        // Leading model
        const leadingModel = stats.votesByModel[0]?.selected_model || '-';
        document.getElementById('leading-model').textContent = leadingModel;
    }

    updateCharts(stats) {
        this.updateModelChart(stats.votesByModel);
        this.updateQuestionChart(stats.votesByQuestion);
        this.updateQuestionsWonChart(stats.modelWinCounts);
        this.updatePerformanceTable(stats.votesByModel, stats.modelWinCounts);
    }

    updateModelChart(votesByModel) {
        const ctx = document.getElementById('modelChart').getContext('2d');
        
        if (this.charts.modelChart) {
            this.charts.modelChart.destroy();
        }

        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        
        this.charts.modelChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: votesByModel.map(item => item.selected_model),
                datasets: [{
                    data: votesByModel.map(item => item.votes),
                    backgroundColor: colors.slice(0, votesByModel.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateQuestionChart(votesByQuestion) {
        const ctx = document.getElementById('questionChart').getContext('2d');
        
        if (this.charts.questionChart) {
            this.charts.questionChart.destroy();
        }

        // Ensure all questions 1-5 are represented
        const questionData = [];
        for (let i = 1; i <= 5; i++) {
            const questionVotes = votesByQuestion.find(q => q.question_number === i);
            questionData.push({
                question_number: i,
                votes: questionVotes ? questionVotes.votes : 0
            });
        }

        this.charts.questionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: questionData.map(item => `Question ${item.question_number}`),
                datasets: [{
                    label: 'Votes',
                    data: questionData.map(item => item.votes),
                    backgroundColor: '#3B82F6',
                    borderColor: '#1E40AF',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    updateQuestionsWonChart(modelWinCounts) {
        const ctx = document.getElementById('questionsWonChart').getContext('2d');
        
        if (this.charts.questionsWonChart) {
            this.charts.questionsWonChart.destroy();
        }

        const colors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
        
        this.charts.questionsWonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: modelWinCounts.map(item => item.selected_model),
                datasets: [{
                    label: 'Questions Won',
                    data: modelWinCounts.map(item => item.questions_won),
                    backgroundColor: colors.slice(0, modelWinCounts.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    updatePerformanceTable(votesByModel, modelWinCounts) {
        const tbody = document.getElementById('performance-table');
        tbody.innerHTML = '';

        // Create a map of model names to questions won
        const winCountsMap = {};
        modelWinCounts.forEach(item => {
            winCountsMap[item.selected_model] = item.questions_won;
        });

        votesByModel.forEach(model => {
            const questionsWon = winCountsMap[model.selected_model] || 0;
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td class="px-4 py-2 text-sm font-medium text-gray-900">${model.selected_model}</td>
                <td class="px-4 py-2 text-sm text-gray-500">${model.votes}</td>
                <td class="px-4 py-2 text-sm text-gray-500">${questionsWon}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async updateTables(stats) {
        // Update events table
        await this.updateEventsTable();
        
        // Update recent votes table
        this.updateRecentVotesTable(stats.recentVotes);
    }

    async updateEventsTable() {
        try {
            const response = await fetch('/api/admin/events', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const events = await response.json();
            const tbody = document.getElementById('events-table');
            tbody.innerHTML = '';

            events.forEach(event => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${event.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${event.date}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            event.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }">
                            ${event.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" id="event-models-${event.id}">Loading...</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" id="event-votes-${event.id}">Loading...</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="adminDashboard.showManageModelsModal(${event.id}, '${event.name}')" 
                                class="text-blue-600 hover:text-blue-900 mr-3">
                            <i class="fas fa-cogs"></i> Manage Models
                        </button>
                    </td>
                `;
                tbody.appendChild(row);

                // Load model count and vote count for this event
                this.loadEventModelCount(event.id);
                this.loadEventVoteCount(event.id);
            });
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    async loadEventVoteCount(eventId) {
        // This would require a new API endpoint to get votes by event
        // For now, we'll show a placeholder
        const cell = document.getElementById(`event-votes-${eventId}`);
        if (cell) {
            cell.textContent = '-';
        }
    }

    async loadEventModelCount(eventId) {
        try {
            const response = await fetch(`/api/models/${eventId}`);
            const models = await response.json();
            const cell = document.getElementById(`event-models-${eventId}`);
            if (cell) {
                cell.textContent = models.length;
            }
        } catch (error) {
            console.error('Error loading model count:', error);
            const cell = document.getElementById(`event-models-${eventId}`);
            if (cell) {
                cell.textContent = '0';
            }
        }
    }

    showManageModelsModal(eventId, eventName) {
        this.currentEventId = eventId;
        document.getElementById('modal-event-name').textContent = eventName;
        document.getElementById('manage-models-modal').classList.remove('hidden');
        this.loadEventModels(eventId);
    }

    hideManageModelsModal() {
        document.getElementById('manage-models-modal').classList.add('hidden');
        document.getElementById('add-model-form').reset();
        this.currentEventId = null;
    }

    async loadEventModels(eventId) {
        try {
            const response = await fetch(`/api/models/${eventId}`);
            const models = await response.json();
            const tbody = document.getElementById('models-table');
            tbody.innerHTML = '';

            models.forEach(model => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${model.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${model.description || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="w-6 h-6 rounded-full" style="background-color: ${model.color}"></div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="adminDashboard.deleteModel(${model.id})" 
                                class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading models:', error);
        }
    }

    async addModel() {
        const name = document.getElementById('model-name').value;
        const description = document.getElementById('model-description').value;
        const color = document.getElementById('model-color').value;

        if (!name || !this.currentEventId) {
            alert('Model name is required');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`/api/admin/events/${this.currentEventId}/models`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ name, description, color })
            });

            const result = await response.json();

            if (response.ok) {
                document.getElementById('add-model-form').reset();
                this.loadEventModels(this.currentEventId);
                this.updateEventsTable(); // Refresh model counts
            } else {
                alert(result.error || 'Failed to add model');
            }
        } catch (error) {
            console.error('Error adding model:', error);
            alert('Network error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteModel(modelId) {
        if (!confirm('Are you sure you want to delete this model?')) {
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`/api/admin/events/${this.currentEventId}/models/${modelId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.loadEventModels(this.currentEventId);
                this.updateEventsTable(); // Refresh model counts
            } else {
                alert(result.error || 'Failed to delete model');
            }
        } catch (error) {
            console.error('Error deleting model:', error);
            alert('Network error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    updateRecentVotesTable(recentVotes) {
        const tbody = document.getElementById('recent-votes-table');
        tbody.innerHTML = '';

        recentVotes.slice(0, 20).forEach(vote => {
            const row = document.createElement('tr');
            const timestamp = new Date(vote.timestamp).toLocaleString();
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${vote.participant_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${vote.event_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Question ${vote.question_number}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${vote.selected_model}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${timestamp}</td>
            `;
            tbody.appendChild(row);
        });
    }

    showCreateEventModal() {
        document.getElementById('create-event-modal').classList.remove('hidden');
        // Set default date to today
        document.getElementById('event-date').value = new Date().toISOString().split('T')[0];
    }

    hideCreateEventModal() {
        document.getElementById('create-event-modal').classList.add('hidden');
        document.getElementById('create-event-form').reset();
    }

    async createEvent() {
        const eventName = document.getElementById('event-name').value;
        const eventDate = document.getElementById('event-date').value;

        if (!eventName || !eventDate) {
            alert('Please fill in all fields');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/admin/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    name: eventName,
                    date: eventDate
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.hideCreateEventModal();
                this.loadDashboardData(); // Refresh the dashboard
                alert('Event created successfully!');
            } else {
                alert(result.error || 'Failed to create event');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Network error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

// Initialize the admin dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});
