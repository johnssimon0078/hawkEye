# 🦅 HawkEye Domain Monitoring Guide

## How to Add and Monitor Domains

### **1. Access the Dashboard**
- Open your browser and go to: **http://localhost:3000**
- Login with your credentials or create a new account

### **2. Add a New Domain**
1. **Click "Add New Domain"** button in the Monitored Domains section
2. **Enter Domain Name**: Type the domain you want to monitor (e.g., `netobjex.com`)
3. **Add Notes** (optional): Add any description or notes about the domain
4. **Click "Add Domain"** to save

### **3. Domain Management Features**

#### **View Domains**
- All your monitored domains are displayed in the "Monitored Domains" section
- Each domain shows:
  - Domain name
  - Status (Active/Inactive)
  - Date added
  - Notes (if provided)

#### **Scan Domains**
- **"Scan Now"** button: Manually trigger a comprehensive domain scan
- Scans include:
  - WHOIS data analysis
  - DNS record checking
  - VirusTotal threat detection (with your API key)
  - SSL certificate validation
  - Content analysis
  - Threat intelligence

#### **Delete Domains**
- **"Delete"** button: Remove a domain from monitoring
- Confirmation dialog prevents accidental deletion

### **4. What Gets Monitored**

#### **Domain Monitoring** (Every 6 hours automatically)
- **WHOIS Information**: Registrar, registration dates, name servers
- **DNS Records**: A, MX, TXT, CNAME records
- **Threat Intelligence**: 
  - VirusTotal malware detection
  - Suspicious domain patterns
  - Typosquatting detection
- **SSL Certificate**: Validity and security
- **Content Analysis**: Website content and brand mentions

#### **Dark Web Monitoring** (Every 2 hours)
- Tor search engines
- Dark web marketplaces
- Underground forums
- Stolen data listings

#### **Social Media Monitoring** (Every hour)
- Brand mentions
- Impersonation accounts
- Suspicious activities

#### **Pastebin Monitoring** (Every 30 minutes)
- Code snippets
- Data dumps
- Credential leaks

#### **Password Store Monitoring** (Every 30 minutes)
- Breached password databases
- Credential dumps
- Compromised accounts

### **5. Alert System**
- **Real-time Alerts**: Get notified immediately of threats
- **Email Notifications**: Alerts sent to your registered email
- **Dashboard Alerts**: View all alerts in the "Recent Alerts" section
- **Severity Levels**: Low, Medium, High, Critical

### **6. API Integration**
Your VirusTotal API key is configured for enhanced threat detection:
- **API Key**: `67364f6e317cce2f6a448e0b66a21b47cc13185433e6ccaa89d6abc616ff8aae`
- **Features**: Malware detection, suspicious URL analysis, threat intelligence

### **7. Manual Scanning**
You can manually trigger scans for any domain:
- **Domain Scan**: Comprehensive domain analysis
- **Dark Web Scan**: Search dark web for mentions
- **Social Media Scan**: Check social platforms
- **Pastebin Scan**: Search pastebin for data leaks
- **Password Store Scan**: Check breached databases

### **8. Example Usage**

#### **Add Your Domain**
1. Login to dashboard
2. Click "Add New Domain"
3. Enter: `netobjex.com`
4. Add notes: "Main company domain"
5. Click "Add Domain"

#### **Run Manual Scan**
1. Find your domain in the list
2. Click "Scan Now"
3. Wait for scan completion
4. Check alerts for results

#### **Monitor Results**
- Check the "Recent Alerts" section for findings
- Review domain status and details
- Set up email notifications for critical alerts

### **9. Best Practices**
- **Regular Monitoring**: Check dashboard daily for new alerts
- **Multiple Domains**: Monitor all your company domains
- **Variations**: Include common typos and variations
- **Subdomains**: Monitor important subdomains
- **Quick Response**: Act on critical alerts immediately

### **10. Troubleshooting**
- **Domain Not Found**: Ensure domain is correctly entered
- **Scan Failed**: Check internet connection and API keys
- **No Alerts**: Domain may be clean, or check alert settings
- **Login Issues**: Clear browser cache or reset password

---

**Note**: The system automatically runs scheduled scans. Manual scans are for immediate analysis or testing. 