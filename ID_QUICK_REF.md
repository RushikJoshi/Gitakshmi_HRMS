# 🎯 ID VISIBILITY - QUICK REFERENCE

## 📋 **WHO SEES WHAT**

| ID Type | Candidate | HR | Documents |
|---------|-----------|----|-----------| 
| Job ID | ❌ | ✅ Small | ❌ |
| Application ID | ❌ | 🟡 Tooltip | ❌ |
| Interview ID | ❌ | ❌ | ❌ |
| Offer ID | ✅ Letter | ✅ | ✅ |
| Employee ID | ✅ Profile | ✅ | ✅ |
| MongoDB _id | ❌ | ❌ | ❌ |

---

## 🚀 **QUICK SETUP**

### **1. Add to Routes**
```javascript
const { responseShaper } = require('../middleware/responseShaper');
const { validateIds } = require('../middleware/idValidation');

router.get('/applications', responseShaper('list'), controller.get);
router.get('/applications/:id', validateIds(), responseShaper('detail'), controller.getDetail);
router.patch('/applications/:id', validateIds({ preventModification: true }), controller.update);
```

### **2. Use in Frontend**
```javascript
<IDDisplay id={app.applicationId} type="application" showFor={['hr']} tooltip />
```

---

## ✅ **RESPONSE EXAMPLES**

### **Candidate (NO IDs)**
```json
{
  "jobTitle": "Developer",
  "status": "SHORTLISTED",
  "statusMessage": "Congratulations! You have been shortlisted"
}
```

### **HR (With IDs)**
```json
{
  "applicationId": "APP-2026-0001",
  "jobOpeningId": "JOB-2026-0001",
  "candidateInfo": { "name": "John" },
  "status": "SHORTLISTED"
}
```

---

## 🔐 **SECURITY RULES**

✅ **ALWAYS:**
- Use `responseShaper` middleware
- Validate IDs with `validateIds`
- Show messages to candidates
- Hide MongoDB `_id`

❌ **NEVER:**
- Expose `_id` in responses
- Show Interview IDs
- Make IDs prominent
- Trust frontend for security

---

**Print and keep handy! 📌**
