class VotingApp {
    constructor() {
        this.currentQuestion = 1;
        this.totalQuestions = 5;
        this.votes = {};
        this.models = [];
        this.participantName = '';
        this.selectedEventId = null;
        
        this.init();
    }

    async init() {
        await this.loadModels();
        await this.loadEvents();
        this.setupEventListeners();
    }

    async loadModels() {
        // Models will be loaded when an event is selected
        this.models = [];
    }

    async loadModelsForEvent(eventId) {
        try {
            const response = await fetch(`/api/models/${eventId}`);
            this.models = await response.json();
            
            if (this.models.length === 0) {
                this.showError('No models found for this event. Please contact the administrator.');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error loading models:', error);
            this.showError('Failed to load AI models for this event');
            return false;
        }
    }

    async loadEvents() {
        try {
            const response = await fetch('/api/events');
            const events = await response.json();
            const eventSelect = document.getElementById('event-select');
            
            eventSelect.innerHTML = '<option value="">Select an event...</option>';
            events.forEach(event => {
                const option = document.createElement('option');
                option.value = event.id;
                option.textContent = `${event.name} (${event.date})`;
                eventSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading events:', error);
            this.showError('Failed to load events');
        }
    }

    setupEventListeners() {
        // Start voting button
        document.getElementById('start-voting').addEventListener('click', () => {
            this.startVoting();
        });

        // Navigation buttons
        document.getElementById('prev-question').addEventListener('click', () => {
            this.previousQuestion();
        });

        document.getElementById('next-question').addEventListener('click', () => {
            this.nextQuestion();
        });

        // Vote again button
        document.getElementById('vote-again').addEventListener('click', () => {
            this.resetVoting();
        });

        // Enable/disable start button based on input
        const nameInput = document.getElementById('participant-name');
        const eventSelect = document.getElementById('event-select');
        const startButton = document.getElementById('start-voting');

        const checkInputs = () => {
            const hasName = nameInput.value.trim().length > 0;
            const hasEvent = eventSelect.value !== '';
            startButton.disabled = !(hasName && hasEvent);
        };

        nameInput.addEventListener('input', checkInputs);
        eventSelect.addEventListener('change', checkInputs);
        
        // Initial check
        checkInputs();
    }

    async startVoting() {
        const nameInput = document.getElementById('participant-name');
        const eventSelect = document.getElementById('event-select');
        
        this.participantName = nameInput.value.trim();
        this.selectedEventId = parseInt(eventSelect.value);
        
        if (!this.participantName || !this.selectedEventId) {
            this.showError('Please enter your name and select an event');
            return;
        }

        // Load models for the selected event
        const modelsLoaded = await this.loadModelsForEvent(this.selectedEventId);
        if (!modelsLoaded) {
            return;
        }

        // Hide welcome section and show voting section
        document.getElementById('welcome-section').classList.add('hidden');
        document.getElementById('voting-section').classList.remove('hidden');
        
        this.renderQuestion();
    }

    renderQuestion() {
        // Update progress
        const progressPercent = (this.currentQuestion / this.totalQuestions) * 100;
        document.getElementById('progress-bar').style.width = `${progressPercent}%`;
        document.getElementById('progress-text').textContent = `Question ${this.currentQuestion} of ${this.totalQuestions}`;
        
        // Update question title
        document.getElementById('question-title').textContent = 
            `Question ${this.currentQuestion}: Which AI model performed best?`;
        
        // Render models grid
        this.renderModelsGrid();
        
        // Update navigation buttons
        document.getElementById('prev-question').disabled = this.currentQuestion === 1;
        document.getElementById('next-question').disabled = !this.votes[this.currentQuestion];
        
        // Update selected model display
        const selectedModel = this.votes[this.currentQuestion] || 'None';
        document.getElementById('selected-model').textContent = selectedModel;
    }

    renderModelsGrid() {
        const grid = document.getElementById('models-grid');
        grid.innerHTML = '';
        
        this.models.forEach(model => {
            const modelCard = document.createElement('div');
            modelCard.className = `model-card bg-white border-2 rounded-lg p-6 text-center ${
                this.votes[this.currentQuestion] === model.name ? 'border-blue-500 selected' : 'border-gray-200'
            }`;
            
            modelCard.innerHTML = `
                <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-white text-2xl font-bold" 
                     style="background-color: ${model.color}">
                    ${model.name.charAt(0)}
                </div>
                <h3 class="text-lg font-semibold text-gray-800 mb-2">${model.name}</h3>
                <p class="text-sm text-gray-600">${model.description}</p>
                ${this.votes[this.currentQuestion] === model.name ? 
                    '<div class="mt-4"><i class="fas fa-check-circle text-green-500 text-xl"></i></div>' : ''}
            `;
            
            modelCard.addEventListener('click', () => {
                this.selectModel(model.name);
            });
            
            grid.appendChild(modelCard);
        });
    }

    selectModel(modelName) {
        this.votes[this.currentQuestion] = modelName;
        this.renderQuestion();
    }

    previousQuestion() {
        if (this.currentQuestion > 1) {
            this.currentQuestion--;
            this.renderQuestion();
        }
    }

    async nextQuestion() {
        if (!this.votes[this.currentQuestion]) {
            this.showError('Please select an AI model before proceeding');
            return;
        }

        // Submit current vote
        await this.submitVote(this.currentQuestion, this.votes[this.currentQuestion]);

        if (this.currentQuestion < this.totalQuestions) {
            this.currentQuestion++;
            this.renderQuestion();
        } else {
            this.completeVoting();
        }
    }

    async submitVote(questionNumber, selectedModel) {
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventId: this.selectedEventId,
                    participantName: this.participantName,
                    questionNumber: questionNumber,
                    selectedModel: selectedModel
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit vote');
            }
            
        } catch (error) {
            console.error('Error submitting vote:', error);
            this.showError(`Failed to submit vote: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    completeVoting() {
        document.getElementById('voting-section').classList.add('hidden');
        document.getElementById('completion-section').classList.remove('hidden');
    }

    resetVoting() {
        this.currentQuestion = 1;
        this.votes = {};
        this.participantName = '';
        this.selectedEventId = null;
        
        // Reset form
        document.getElementById('participant-name').value = '';
        document.getElementById('event-select').value = '';
        
        // Show welcome section
        document.getElementById('completion-section').classList.add('hidden');
        document.getElementById('welcome-section').classList.remove('hidden');
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    showError(message) {
        alert(message); // Simple error display - could be enhanced with a modal
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VotingApp();
});
