# AI League Game Show Web App

A comprehensive web application for conducting AI model voting competitions with real-time analytics and admin dashboard.

## Features

### User Voting Interface
- Clean, modern UI for participants to vote on AI model performances
- 5 questions per voting session
- Support for 5 AI models (GPT-4, Claude, Gemini, LLaMA, PaLM)
- Participant name tracking for identification
- Progress tracking through voting process
- Responsive design for mobile and desktop

### Admin Dashboard
- Secure authentication system
- Real-time voting statistics and analytics
- Interactive charts showing votes by model and question
- Event management (create and track up to 20 events)
- Recent votes monitoring
- Participant tracking

### Backend Features
- RESTful API with Express.js
- SQLite database for data persistence
- JWT-based authentication
- Rate limiting for security
- CORS support for cross-origin requests
- Comprehensive error handling

## Quick Start

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. Clone or download the project files
2. Navigate to the project directory:
   ```bash
   cd poll_app
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create environment configuration:
   ```bash
   copy .env.example .env
   ```

5. Edit the `.env` file with your settings:
   ```
   PORT=3000
   NODE_ENV=development
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_secure_password_here
   JWT_SECRET=your_jwt_secret_key_here
   DB_PATH=./database.sqlite
   SESSION_SECRET=your_session_secret_here
   ```

6. Start the application:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

### Access the Application

- **Voting Page**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin

### Default Admin Credentials
- Username: `admin`
- Password: Use the password you set in the `.env` file

## Project Structure

```
poll_app/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── .env                  # Your environment variables (create this)
├── database.sqlite       # SQLite database (auto-created)
├── public/               # Static files
│   ├── index.html        # User voting page
│   ├── admin.html        # Admin dashboard
│   ├── voting.js         # Voting page JavaScript
│   └── admin.js          # Admin dashboard JavaScript
└── README.md             # This file
```

## API Endpoints

### Public Endpoints
- `GET /` - Voting page
- `GET /admin` - Admin dashboard
- `GET /api/models` - Get AI models list
- `GET /api/events` - Get active events
- `POST /api/vote` - Submit a vote

### Admin Endpoints (require authentication)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/stats` - Get voting statistics
- `GET /api/admin/events` - Get all events
- `POST /api/admin/events` - Create new event

## Database Schema

### Events Table
- `id` - Primary key
- `name` - Event name
- `date` - Event date
- `status` - Event status (active/inactive)
- `created_at` - Creation timestamp

### Votes Table
- `id` - Primary key
- `event_id` - Foreign key to events
- `participant_name` - Voter's name
- `question_number` - Question number (1-5)
- `selected_model` - Chosen AI model
- `timestamp` - Vote timestamp

### AI Models Table
- `id` - Primary key
- `name` - Model name
- `description` - Model description
- `color` - Display color

## AWS Deployment

### Preparation for AWS
1. Ensure all environment variables are properly configured
2. Update database path for production environment
3. Configure proper security settings
4. Set up SSL certificates for HTTPS

### Deployment Options
- **AWS EC2**: Deploy on virtual server
- **AWS Elastic Beanstalk**: Managed application deployment
- **AWS Lambda + API Gateway**: Serverless deployment
- **AWS ECS**: Container-based deployment

### Environment Variables for Production
```
NODE_ENV=production
PORT=80
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=strong_password_here
JWT_SECRET=long_random_string_here
DB_PATH=/var/app/database.sqlite
SESSION_SECRET=another_random_string
```

## Security Features

- JWT-based authentication
- Password-based admin access
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet.js security headers
- Input validation and sanitization
- SQL injection prevention with parameterized queries

## Customization

### Adding New AI Models
Edit the models array in `server.js`:
```javascript
const models = [
    { name: 'Your Model', description: 'Description', color: '#HEX_COLOR' }
];
```

### Changing Question Count
Update `totalQuestions` in `voting.js` and adjust the progress calculation accordingly.

### Styling
The application uses Tailwind CSS. Modify the HTML files to change the appearance, or add custom CSS.

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the PORT in `.env` file
2. **Database errors**: Ensure write permissions in the project directory
3. **Admin login fails**: Check ADMIN_USERNAME and ADMIN_PASSWORD in `.env`
4. **Charts not loading**: Ensure internet connection for CDN resources

### Logs
Check the console output for detailed error messages and debugging information.

## Support

For issues or questions about this application, please check:
1. Console logs for error messages
2. Network tab in browser developer tools
3. Server logs in the terminal

## License

This project is licensed under the ISC License.
