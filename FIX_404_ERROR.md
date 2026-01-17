# 🔧 FIX FOR 404 ERROR - COMPANY ID CONFIG

## ❌ **PROBLEM**

Frontend getting 404 error when calling `/api/company-id-config`

## ✅ **SOLUTION**

### **STEP 1: Create Simple Working Route**

**File:** `backend/routes/companyIdConfig.routes.js`

```javascript
const express = require('express');
const router = express.Router();

// Simple GET route - returns empty array for now
router.get('/', (req, res) => {
  console.log('✅ GET /api/company-id-config called');
  res.json({
    success: true,
    data: []
  });
});

module.exports = router;
```

### **STEP 2: Register Route in app.js**

**File:** `backend/app.js`

Find the section with route registrations and add:

```javascript
// Company ID Configuration
const companyIdConfigRoutes = require('./routes/companyIdConfig.routes');

// Register BEFORE tenant middleware
app.use('/api/company-id-config', companyIdConfigRoutes);
```

**EXACT LOCATION:** Add after line 104 (after uploads route):

```javascript
app.use('/api/uploads', uploadRoutes);
app.use('/api/company-id-config', companyIdConfigRoutes);  // ← ADD THIS
```

### **STEP 3: Restart Backend Server**

**IMPORTANT:** Nodemon might not be detecting changes. Manually restart:

1. Stop backend: Press `Ctrl+C` in backend terminal
2. Start again: `npm run dev`

OR kill the process:

```powershell
# Kill process on port 5000
npx kill-port 5000

# Then start
cd backend
npm run dev
```

### **STEP 4: Test the API**

Open browser and go to:
```
http://localhost:5000/api/company-id-config
```

**Expected Response:**
```json
{
  "success": true,
  "data": []
}
```

### **STEP 5: Verify Frontend**

**File:** `frontend/src/pages/settings/CompanySettings.jsx`

The axios call should be:
```javascript
const res = await api.get('/company-id-config');
```

This will call: `http://localhost:5000/api/company-id-config`

---

## 🎯 **QUICK FIX COMMANDS**

```powershell
# 1. Kill backend
npx kill-port 5000

# 2. Restart backend
cd backend
npm run dev

# 3. Test in browser
start http://localhost:5000/api/company-id-config
```

---

## ✅ **VERIFICATION CHECKLIST**

- [ ] Route file exists: `backend/routes/companyIdConfig.routes.js`
- [ ] Route registered in `app.js` line ~105
- [ ] Backend server restarted successfully
- [ ] Browser test shows JSON response
- [ ] Frontend loads without 404 error

---

## 🚨 **IF STILL NOT WORKING**

The backend server might not be restarting. Check:

1. **Check backend console for errors**
2. **Manually restart backend** (Ctrl+C then npm run dev)
3. **Check if port 5000 is in use** (npx kill-port 5000)
4. **Verify route file has no syntax errors**

---

**NEXT:** After this works, we can add authentication and full functionality.
