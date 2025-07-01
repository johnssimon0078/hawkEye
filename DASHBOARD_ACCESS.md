# 🦅 HawkEye Brand Protection Dashboard

## How to Access the Web Dashboard

### 1. **Start the Server**
```bash
npm run dev
```

### 2. **Access the Dashboard**
Open your web browser and navigate to:
- **Main Dashboard**: http://localhost:3000
- **Registration Page**: http://localhost:3000/register

### 3. **Create an Account**
1. Go to http://localhost:3000/register
2. Fill in your details:
   - First Name
   - Last Name
   - Email
   - Company
   - Password (minimum 6 characters)
3. Click "Create Account"
4. You'll be redirected to the login page

### 4. **Login to Dashboard**
1. Go to http://localhost:3000
2. Enter your email and password
3. Click "Login"

### 5. **Dashboard Features**

#### **Statistics Overview**
- Monitored Domains count
- Total Alerts
- Critical Alerts
- Unread Alerts

#### **Monitored Domains**
- View all domains you're monitoring
- Domain status and details

#### **Recent Alerts**
- Latest security alerts
- Color-coded by severity (Low, Medium, High, Critical)
- Alert details and timestamps

### 6. **API Endpoints**
The dashboard connects to these API endpoints:
- **Login**: `POST /api/auth/login`
- **Register**: `POST /api/auth/register`
- **Domains**: `GET /api/domains`
- **Alerts**: `GET /api/alerts`
- **Alert Stats**: `GET /api/alerts/stats`

### 7. **Test Credentials**
If you want to test with the existing account:
- **Email**: test@example.com
- **Password**: password123

### 8. **Add Your Domain**
After logging in, you can add your domain for monitoring:
```bash
curl -X POST http://localhost:3000/api/domains \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"domain":"yourdomain.com","notes":"My domain for monitoring"}'
```

### 9. **Features Available**
- ✅ User Authentication
- ✅ Domain Management
- ✅ Real-time Alert Monitoring
- ✅ Dark Web Scanning
- ✅ Social Media Monitoring
- ✅ Pastebin Monitoring
- ✅ Password Store Monitoring
- ✅ VirusTotal Integration
- ✅ Modern, Responsive UI

### 10. **Troubleshooting**
- If the dashboard doesn't load, check that the server is running on port 3000
- If you get CORS errors, make sure the server is running with the correct configuration
- Check the browser console for any JavaScript errors

---

**Note**: This is a development version. For production use, ensure proper security measures are in place. 