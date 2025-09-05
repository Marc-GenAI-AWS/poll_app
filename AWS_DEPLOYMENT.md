# AWS Deployment Guide for AI League Game Show

This guide provides step-by-step instructions for deploying your AI League Game Show web app to AWS.

## Deployment Options

### Option 1: AWS EC2 (Recommended for beginners)

#### Step 1: Launch EC2 Instance
1. Log into AWS Console and navigate to EC2
2. Click "Launch Instance"
3. Choose Amazon Linux 2 AMI
4. Select t2.micro (free tier eligible)
5. Configure security group:
   - SSH (port 22) - Your IP only
   - HTTP (port 80) - Anywhere
   - HTTPS (port 443) - Anywhere
   - Custom TCP (port 3000) - Anywhere (for testing)

#### Step 2: Connect and Setup
```bash
# Connect to your instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Update system
sudo yum update -y

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install PM2 for process management
npm install -g pm2

# Install Git
sudo yum install git -y
```

#### Step 3: Deploy Application
```bash
# Clone your repository or upload files
# If uploading manually:
scp -i your-key.pem -r ./poll_app ec2-user@your-instance-ip:~/

# Navigate to app directory
cd poll_app

# Install dependencies
npm install

# Create production environment file
nano .env
```

Production `.env` file:
```
PORT=3000
NODE_ENV=production
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_long_random_jwt_secret
DB_PATH=/home/ec2-user/poll_app/database.sqlite
SESSION_SECRET=your_session_secret
```

#### Step 4: Start Application
```bash
# Start with PM2
pm2 start server.js --name "ai-league-gameshow"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

#### Step 5: Setup Nginx (Optional but recommended)
```bash
# Install Nginx
sudo yum install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/conf.d/gameshow.conf
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Option 2: AWS Elastic Beanstalk

#### Step 1: Prepare Application
1. Create a `.ebextensions` directory in your project root
2. Create configuration file `.ebextensions/nodecommand.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
```

#### Step 2: Deploy
1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init`
3. Create environment: `eb create production`
4. Deploy: `eb deploy`

### Option 3: AWS Lambda + API Gateway (Serverless)

#### Step 1: Install Serverless Framework
```bash
npm install -g serverless
npm install serverless-http
```

#### Step 2: Create serverless.yml
```yaml
service: ai-league-gameshow

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1

functions:
  app:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
      - http:
          path: /
          method: ANY

plugins:
  - serverless-offline
```

#### Step 3: Create Lambda Handler
Create `lambda.js`:
```javascript
const serverless = require('serverless-http');
const app = require('./server');

module.exports.handler = serverless(app);
```

#### Step 4: Deploy
```bash
serverless deploy
```

## Database Considerations

### For Production
Consider using AWS RDS instead of SQLite:

1. Create RDS MySQL/PostgreSQL instance
2. Update your application to use the RDS connection
3. Install appropriate database driver (`mysql2` or `pg`)

Example connection for MySQL:
```javascript
const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
```

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files to version control
- Use AWS Systems Manager Parameter Store or AWS Secrets Manager
- Set strong passwords and JWT secrets

### 2. SSL/TLS Certificate
```bash
# Install Certbot for Let's Encrypt
sudo yum install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Security Groups
- Restrict SSH access to your IP only
- Use HTTPS (port 443) instead of HTTP (port 80) in production
- Consider using AWS WAF for additional protection

## Monitoring and Logging

### CloudWatch Setup
1. Install CloudWatch agent on EC2
2. Configure log groups for application logs
3. Set up alarms for high CPU, memory usage

### Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart ai-league-gameshow
```

## Backup Strategy

### Database Backup
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /home/ec2-user/poll_app/database.sqlite /home/ec2-user/backups/database_$DATE.sqlite

# Upload to S3
aws s3 cp /home/ec2-user/backups/database_$DATE.sqlite s3://your-backup-bucket/
```

### Automated Backups
```bash
# Add to crontab
crontab -e
# Add: 0 2 * * * /home/ec2-user/backup.sh
```

## Domain and DNS

### Route 53 Setup
1. Register domain in Route 53 or transfer existing domain
2. Create hosted zone
3. Create A record pointing to your EC2 instance IP
4. Update nameservers if domain is external

## Cost Optimization

### Free Tier Resources
- t2.micro EC2 instance (750 hours/month)
- 5GB S3 storage
- Route 53 hosted zone (first 25 queries free)

### Estimated Monthly Costs (after free tier)
- t2.micro EC2: ~$8.50/month
- EBS storage (8GB): ~$0.80/month
- Data transfer: ~$0.09/GB
- Route 53: ~$0.50/month

## Troubleshooting

### Common Issues
1. **Port 3000 not accessible**: Check security groups
2. **Application won't start**: Check logs with `pm2 logs`
3. **Database permission errors**: Check file permissions
4. **SSL certificate issues**: Verify domain DNS settings

### Useful Commands
```bash
# Check application status
pm2 status

# View real-time logs
pm2 logs --lines 100

# Restart application
pm2 restart ai-league-gameshow

# Check system resources
htop
df -h

# Check network connectivity
netstat -tlnp | grep 3000
```

## Scaling Considerations

### Horizontal Scaling
- Use Application Load Balancer
- Deploy multiple EC2 instances
- Implement session management with Redis

### Database Scaling
- Move to RDS with read replicas
- Implement connection pooling
- Consider DynamoDB for high-scale scenarios

This deployment guide should help you successfully deploy your AI League Game Show to AWS. Choose the deployment method that best fits your technical expertise and requirements.
