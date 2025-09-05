const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for development
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Initialize SQLite database
const db = new sqlite3.Database(process.env.DB_PATH || './database.sqlite');

// Initialize database tables
db.serialize(() => {
  // Events table
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Votes table
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    participant_name TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    selected_model TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id)
  )`);

  // Event Models table - stores custom models for each event
  db.run(`CREATE TABLE IF NOT EXISTS event_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id),
    UNIQUE(event_id, name)
  )`);

  // Create a default event if none exists
  db.get("SELECT COUNT(*) as count FROM events", (err, row) => {
    if (row.count === 0) {
      db.run(`INSERT INTO events (name, date, status) VALUES (?, ?, ?)`,
        ['AI League Game Show - Event 1', new Date().toISOString().split('T')[0], 'active']);
    }
  });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// Serve main voting page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Get models for a specific event
app.get('/api/models/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  db.all("SELECT * FROM event_models WHERE event_id = ? ORDER BY name", [eventId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get active events
app.get('/api/events', (req, res) => {
  db.all("SELECT * FROM events WHERE status = 'active' ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Submit vote
app.post('/api/vote', (req, res) => {
  const { eventId, participantName, questionNumber, selectedModel } = req.body;

  if (!eventId || !participantName || !questionNumber || !selectedModel) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if participant already voted for this question in this event
  db.get(`SELECT id FROM votes WHERE event_id = ? AND participant_name = ? AND question_number = ?`,
    [eventId, participantName, questionNumber], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (row) {
        return res.status(400).json({ error: 'You have already voted for this question' });
      }

      // Insert the vote
      db.run(`INSERT INTO votes (event_id, participant_name, question_number, selected_model) VALUES (?, ?, ?, ?)`,
        [eventId, participantName, questionNumber, selectedModel], function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ success: true, voteId: this.lastID });
        });
    });
});

// Add model to event (admin only)
app.post('/api/admin/events/:eventId/models', authenticateToken, (req, res) => {
  const { eventId } = req.params;
  const { name, description, color } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Model name is required' });
  }

  db.run(`INSERT INTO event_models (event_id, name, description, color) VALUES (?, ?, ?, ?)`,
    [eventId, name, description || '', color || '#3B82F6'], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ error: 'Model name already exists for this event' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      res.json({ success: true, modelId: this.lastID });
    });
});

// Delete model from event (admin only)
app.delete('/api/admin/events/:eventId/models/:modelId', authenticateToken, (req, res) => {
  const { eventId, modelId } = req.params;
  
  db.run(`DELETE FROM event_models WHERE id = ? AND event_id = ?`, [modelId, eventId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === adminUsername && password === adminPassword) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Get voting statistics (admin only)
app.get('/api/admin/stats', authenticateToken, (req, res) => {
  const queries = {
    totalVotes: "SELECT COUNT(*) as count FROM votes",
    votesByModel: `SELECT selected_model, COUNT(*) as votes FROM votes GROUP BY selected_model ORDER BY votes DESC`,
    votesByEvent: `SELECT e.name, e.date, COUNT(v.id) as votes FROM events e LEFT JOIN votes v ON e.id = v.event_id GROUP BY e.id ORDER BY e.created_at DESC`,
    votesByQuestion: `SELECT question_number, COUNT(*) as votes FROM votes GROUP BY question_number ORDER BY question_number`,
    recentVotes: `SELECT v.*, e.name as event_name FROM votes v JOIN events e ON v.event_id = e.id ORDER BY v.timestamp DESC LIMIT 50`,
    questionWinners: `
      SELECT 
        selected_model,
        question_number,
        COUNT(*) as votes,
        ROW_NUMBER() OVER (PARTITION BY question_number ORDER BY COUNT(*) DESC) as rank
      FROM votes 
      GROUP BY selected_model, question_number
    `,
    modelWinCounts: `
      WITH question_winners AS (
        SELECT 
          selected_model,
          question_number,
          COUNT(*) as votes,
          ROW_NUMBER() OVER (PARTITION BY question_number ORDER BY COUNT(*) DESC) as rank
        FROM votes 
        GROUP BY selected_model, question_number
      )
      SELECT 
        selected_model,
        COUNT(*) as questions_won
      FROM question_winners 
      WHERE rank = 1
      GROUP BY selected_model
      ORDER BY questions_won DESC
    `
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.all(query, (err, rows) => {
      if (err) {
        console.error(`Error in ${key}:`, err);
        results[key] = [];
      } else {
        results[key] = rows;
      }
      
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

// Create new event (admin only)
app.post('/api/admin/events', authenticateToken, (req, res) => {
  const { name, date } = req.body;
  
  if (!name || !date) {
    return res.status(400).json({ error: 'Name and date are required' });
  }

  db.run(`INSERT INTO events (name, date, status) VALUES (?, ?, 'active')`,
    [name, date], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, eventId: this.lastID });
    });
});

// Get all events (admin only)
app.get('/api/admin/events', authenticateToken, (req, res) => {
  db.all("SELECT * FROM events ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`AI League Game Show server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} for the voting page`);
  console.log(`Visit http://localhost:${PORT}/admin for the admin dashboard`);
});

module.exports = app;
