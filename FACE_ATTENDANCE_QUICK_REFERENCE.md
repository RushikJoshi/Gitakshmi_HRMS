# Face Attendance - Quick Reference

## 🚀 Quick Start

### Test Registration
```javascript
// 1. Navigate to FaceAttendance page
// 2. Component auto-detects not registered
// 3. Enter name & ID, click "Start Camera"
// 4. Position face, click "Capture & Register"
// 5. Done! Face registered

// Expected Response:
{
  "success": true,
  "message": "Face registered successfully",
  "data": {
    "faceDataId": "507f1f77bcf86cd799439011"
  }
}
```

### Test Attendance
```javascript
// 1. On same page (or refresh)
// 2. Auto-switches to "Mark Attendance" mode
// 3. Click "Start Camera"
// 4. Position face, click "Capture & Mark Attendance"
// 5. Allow location access
// 6. Done! Attendance marked

// Expected Response:
{
  "success": true,
  "message": "Attendance marked successfully via face recognition",
  "data": {
    "attendanceId": "507f1f77bcf86cd799439012",
    "checkInTime": "2026-01-17T09:15:00Z"
  }
}
```

---

## 🔧 Core Functions Reference

### Frontend Utilities
```javascript
// Import from faceAttendanceUtils.js
import {
  getUserMediaStream,           // Start camera
  getCurrentLocation,            // Get GPS location
  isPointInPolygon,             // Check geofence
  isLocationAccurate,           // Validate accuracy
  validateAttendanceData,       // Validate before API call
  canvasToBase64               // Convert image to base64
} from '@/utils/faceAttendanceUtils';

// Usage Example
const stream = await getUserMediaStream();
const location = await getCurrentLocation();
const isInOffice = isPointInPolygon(location, geofencePolygon);
```

### Backend Controller Methods
```javascript
// In attendance.controller.js

// Register face
exports.registerFace = async (req, res) => {
  // Handles: face registration
  // Input: faceImageData (base64)
  // Output: faceDataId
}

// Verify face and mark attendance
exports.verifyFaceAttendance = async (req, res) => {
  // Handles: face verification + attendance
  // Input: faceImageData (base64), location
  // Validations: accuracy, geofence, duplicate
  // Output: attendance record
}

// Get registration status
exports.getFaceStatus = async (req, res) => {
  // Returns: isRegistered, stats
}

// Delete registration
exports.deleteFace = async (req, res) => {
  // Deactivates face registration
}
```

---

## 📋 API Quick Reference

### All Endpoints
```
POST   /attendance/face/register       Register face
POST   /attendance/face/verify         Mark attendance with face
GET    /attendance/face/status         Check registration
DELETE /attendance/face/delete         Delete registration
```

### Request/Response Templates

**Register Face**
```json
// REQUEST
{
  "faceImageData": "data:image/jpeg;base64,/9j/4AAQSkZ...",
  "registrationNotes": "optional notes"
}

// RESPONSE
{
  "success": true,
  "message": "Face registered successfully",
  "data": {
    "faceDataId": "507f1f77bcf86cd799439011",
    "employeeId": "507f1f77bcf86cd799439012",
    "registeredAt": "2026-01-17T10:30:00Z"
  }
}
```

**Verify Face**
```json
// REQUEST
{
  "faceImageData": "data:image/jpeg;base64,/9j/4AAQSkZ...",
  "location": {
    "lat": 23.03025,
    "lng": 72.51805,
    "accuracy": 15
  }
}

// RESPONSE
{
  "success": true,
  "message": "Attendance marked successfully via face recognition",
  "data": {
    "attendanceId": "507f1f77bcf86cd799439013",
    "checkInTime": "2026-01-17T09:15:00Z",
    "employee": {
      "id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "role": "Engineer"
    },
    "location": {
      "latitude": 23.03025,
      "longitude": 72.51805,
      "accuracy": 15
    }
  }
}
```

---

## 🎯 Common Tasks

### Check if Face is Registered
```javascript
const checkFaceStatus = async () => {
  try {
    const res = await api.get('/attendance/face/status');
    return res.data.isRegistered;
  } catch (err) {
    console.error('Error:', err);
    return false;
  }
};
```

### Capture and Register Face
```javascript
const handleRegistration = async () => {
  const imageData = captureImage();  // from canvas
  
  try {
    const res = await api.post('/attendance/face/register', {
      faceImageData: imageData,
      registrationNotes: 'Employee registration'
    });
    
    if (res.data.success) {
      console.log('Face registered:', res.data.data.faceDataId);
    }
  } catch (err) {
    console.error('Registration failed:', err.response?.data?.message);
  }
};
```

### Mark Attendance with Face
```javascript
const handleAttendance = async () => {
  const imageData = captureImage();        // from canvas
  const location = await getLocation();    // from geolocation API
  
  try {
    const res = await api.post('/attendance/face/verify', {
      faceImageData: imageData,
      location: location
    });
    
    if (res.data.success) {
      console.log('Attendance marked:', res.data.data.attendanceId);
      console.log('Check-in time:', res.data.data.checkInTime);
    }
  } catch (err) {
    console.error('Attendance failed:', err.response?.data?.message);
  }
};
```

### Delete Face Registration
```javascript
const handleDeleteFace = async () => {
  try {
    const res = await api.delete('/attendance/face/delete');
    if (res.data.success) {
      console.log('Face deleted');
    }
  } catch (err) {
    console.error('Delete failed:', err.response?.data?.message);
  }
};
```

---

## 🧪 Testing with cURL

### Register Face
```bash
curl -X POST http://localhost:3000/api/attendance/face/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "faceImageData": "data:image/jpeg;base64,...",
    "registrationNotes": "Test registration"
  }'
```

### Mark Attendance
```bash
curl -X POST http://localhost:3000/api/attendance/face/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "faceImageData": "data:image/jpeg;base64,...",
    "location": {
      "lat": 23.03025,
      "lng": 72.51805,
      "accuracy": 15
    }
  }'
```

### Check Status
```bash
curl -X GET http://localhost:3000/api/attendance/face/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Delete Face
```bash
curl -X DELETE http://localhost:3000/api/attendance/face/delete \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ❌ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Camera access denied" | Browser permission | Enable camera in settings |
| "Location permission denied" | Browser permission | Enable location in settings |
| "Failed to capture image" | Video stream not ready | Wait for video to load |
| "No registered face found" | Face not registered | Call register endpoint first |
| "Location accuracy too low" | GPS signal weak | Move to open area |
| "Outside office location" | Not in geofence | Move closer to office |
| "Attendance already marked" | Already checked in | Can only mark once per day |
| "Invalid face image data" | Bad base64 encoding | Check captureImage() output |

---

## 📊 Database Queries

### Find Employee's Face Registration
```javascript
db.facedata.findOne({
  employee: ObjectId("507f1f77bcf86cd799439012"),
  tenant: ObjectId("..."),
  status: "active"
})
```

### Get Face Usage Stats
```javascript
db.facedata.aggregate([
  { $match: { tenant: ObjectId("..."), status: "active" } },
  { $group: {
      _id: "$employee",
      usageCount: { $sum: "$usageCount" },
      lastUsed: { $max: "$lastUsedAt" }
    }
  }
])
```

### Find Unverified Faces
```javascript
db.facedata.find({
  tenant: ObjectId("..."),
  isVerified: false
})
```

### Get Today's Face Attendance
```javascript
const today = new Date();
today.setHours(0,0,0,0);

db.attendance.find({
  date: { $gte: today },
  tenant: ObjectId("..."),
  "logs.type": "IN",
  "logs.device": "Face Recognition"
})
```

---

## 🔐 Security Checklist

- [ ] JWT token validated on all endpoints
- [ ] TenantId checked for isolation
- [ ] Face verification required before attendance
- [ ] Location accuracy validated
- [ ] Geofence boundary checked
- [ ] Duplicate attendance prevented
- [ ] IP address logged
- [ ] Timestamp verified
- [ ] User agent captured
- [ ] Status field prevents inactive use

---

## 📈 Performance Tips

1. **Cache face status** in component to avoid repeated API calls
2. **Compress images** before sending (canvas JPEG quality: 0.9)
3. **Use indexes** on (tenant, employee) for fast lookups
4. **Limit geofence** polygon points (8-12 optimal)
5. **Timeout location** request after 10 seconds
6. **Lazy load** camera only when needed

---

## 🚨 Debugging Tips

1. **Check Browser Console**
   ```javascript
   // Enable debug logs
   localStorage.setItem('debug', 'true');
   ```

2. **Monitor API Calls**
   - Open DevTools → Network tab
   - Check request/response headers
   - Verify status codes

3. **Test Location**
   ```javascript
   navigator.geolocation.getCurrentPosition(
     pos => console.log('Location:', pos),
     err => console.log('Error:', err)
   );
   ```

4. **Test Camera**
   ```javascript
   navigator.mediaDevices.getUserMedia({ video: true })
     .then(stream => console.log('Camera OK'))
     .catch(err => console.log('Camera Error:', err));
   ```

5. **Check Database**
   ```javascript
   // In MongoDB console
   db.facedata.findOne({}, { faceImageData: 0 });  // Don't show image
   ```

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `backend/models/FaceData.js` | Face data schema |
| `backend/controllers/attendance.controller.js` | API handlers |
| `backend/routes/attendance.routes.js` | Route definitions |
| `frontend/src/pages/Employee/FaceAttendance.jsx` | UI component |
| `frontend/src/utils/faceAttendanceUtils.js` | Helper functions |
| `FACE_ATTENDANCE_GUIDE.md` | Full documentation |
| `FACE_ATTENDANCE_IMPLEMENTATION.md` | Implementation summary |

---

## 🎓 Learning Resources

1. **WebRTC**: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
2. **Geolocation**: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation
3. **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
4. **Geofencing**: https://en.wikipedia.org/wiki/Geofencing
5. **Point-in-Polygon**: https://en.wikipedia.org/wiki/Point_in_polygon

---

## 💡 Tips & Tricks

1. **Test Geofence Offline**
   ```javascript
   const testPoint = { lat: 23.03025, lng: 72.51805 };
   const result = isPointInPolygon(testPoint, geofencePolygon);
   ```

2. **Calculate Distance**
   ```javascript
   const distance = calculateDistance(point1, point2);
   console.log(`Distance: ${distance}m`);
   ```

3. **Retry Failed API Calls**
   ```javascript
   await retryWithBackoff(() => api.post('/attendance/face/verify', data), 3);
   ```

4. **Validate Before Sending**
   ```javascript
   const { valid, errors } = validateAttendanceData(data);
   if (!valid) console.error(errors);
   ```

5. **Check Browser Compatibility**
   ```javascript
   const compat = checkBrowserCompatibility();
   if (!compat.supported) alert('Browser not supported');
   ```

---

**Last Updated**: January 17, 2026  
**Status**: ✅ Ready for Use  
**Version**: 1.0
