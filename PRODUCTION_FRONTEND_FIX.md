# ✅ Production Frontend API URL Fix

## 🎯 Problem Identified
When accessing HawkEye dashboard on the production server (even via localhost), the frontend was making API calls to `http://localhost:3000/api` instead of the configured production URL `http://142.93.220.233:3000/api`.

**Network Tab Evidence:**
- Request URL: `http://localhost:3000/api/auth/login` ❌ (Wrong)
- CORS Header: `access-control-allow-origin: http://142.93.220.233:3000` ✅ (Correct)

## 🔧 Root Cause
The frontend was using `window.location.origin + '/api'` which dynamically detects the current URL. When accessing via localhost, this becomes `http://localhost:3000/api` regardless of the server's BASE_URL configuration.

## 💡 Solution Implemented
**Server-Side Template Injection**: Modified `src/server.js` to dynamically inject the correct API base URL from the environment variable into the HTML files before serving them.

### Changes Made:

1. **Added fs import**:
```javascript
const fs = require('fs');
```

2. **Created helper function**:
```javascript
const injectApiBase = (filePath) => {
  let html = fs.readFileSync(filePath, 'utf8');
  const apiBase = `'${process.env.BASE_URL || 'http://localhost:3000'}/api'`;
  html = html.replace('window.location.origin + \'/api\'', apiBase);
  return html;
};
```

3. **Updated route handlers**:
```javascript
// Dashboard routes
app.get('/', (req, res) => {
  const html = injectApiBase(path.join(__dirname, 'public', 'index.html'));
  res.send(html);
});

app.get('/dashboard', (req, res) => {
  const html = injectApiBase(path.join(__dirname, 'public', 'index.html'));
  res.send(html);
});

app.get('/register', (req, res) => {
  const html = injectApiBase(path.join(__dirname, 'public', 'register.html'));
  res.send(html);
});
```

## 🎯 How It Works

1. **Development Environment** (`BASE_URL=http://localhost:3000`):
   - Frontend receives: `const API_BASE = 'http://localhost:3000/api';`

2. **Production Environment** (`BASE_URL=http://142.93.220.233:3000`):
   - Frontend receives: `const API_BASE = 'http://142.93.220.233:3000/api';`

3. **Access Method Independent**: 
   - Works whether accessing via `localhost:3000` or `142.93.220.233:3000`
   - Always uses the configured BASE_URL from environment

## 🚀 Deployment Steps

1. **Restart the server** to load the updated code:
```bash
# On production server
pm2 restart hawkeye
# OR
npm start
```

2. **Verify the fix**:
   - Access dashboard via any URL (localhost or production IP)
   - Check browser network tab - API calls should now go to production URL
   - CORS errors should be resolved

## ✅ Expected Result

**Before Fix:**
- Request URL: `http://localhost:3000/api/auth/login`
- Status: 401 Unauthorized (CORS error)

**After Fix:**
- Request URL: `http://142.93.220.233:3000/api/auth/login`
- Status: 200 OK or proper authentication response

## 🔄 Environment Management

The fix automatically adapts to environment changes:

```bash
# Switch to development
npm run config  # Select option 1
# Frontend will use: http://localhost:3000/api

# Switch to production  
npm run config  # Select option 2
# Frontend will use: http://142.93.220.233:3000/api
```

**No frontend code changes needed when switching environments!** 