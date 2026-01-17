# Face Recognition Attendance System - Complete Guide

## Overview
This is a complete face recognition and biometric attendance system with location verification (geofencing). Employees can register their face once and then use it daily to mark attendance with GPS location validation.

---

## Architecture

### Backend Components

#### 1. **FaceData Model** (`backend/models/FaceData.js`)
Stores face registration and biometric data for each employee.

**Key Fields:**
- `faceImageData` - Base64 encoded face image
- `faceEmbedding` - ML model face embedding vector (optional)
- `faceDescriptor` - Face encoding/features
- `quality` - Brightness, sharpness, contrast, confidence scores
- `status` - active, inactive, rejected, pending_review
- `isVerified` - Whether HR has verified the registration
- `usageCount` - Track how many times face was used
- `lastUsedAt` - Last attendance marked timestamp

#### 2. **API Endpoints** (`backend/routes/attendance.routes.js`)

```javascript
// Register face
POST /attendance/face/register
Body: {
  faceImageData: "data:image/jpeg;base64,...",
  registrationNotes: "string (optional)"
}

// Verify face and mark attendance
POST /attendance/face/verify
Body: {
  faceImageData: "data:image/jpeg;base64,...",
  location: {
    lat: number,
    lng: number,
    accuracy: number (meters)
  }
}

// Get registration status
GET /attendance/face/status

// Delete/deactivate face
DELETE /attendance/face/delete
```

#### 3. **Controller Methods** (`backend/controllers/attendance.controller.js`)

**`registerFace()`**
- Registers employee's face image
- Validates if face already exists
- Stores biometric data
- Sets verification status
- Returns face data ID

**`verifyFaceAttendance()`**
- Accepts face image and location data
- Verifies employee has registered face
- Validates location accuracy
- Checks geofence boundary
- Creates attendance record
- Updates face usage statistics

**`getFaceStatus()`**
- Returns registration status
- Shows verification state
- Returns quality metrics
- Shows usage history

**`deleteFace()`**
- Deactivates face registration
- Sets status to inactive

---

## Frontend Component

### FaceAttendance Component (`frontend/src/pages/Employee/FaceAttendance.jsx`)

#### Features:
1. **Automatic Status Check** - On component mount, checks if face is registered
2. **Camera Access** - Request browser camera permissions
3. **Registration Mode** - First-time face registration
4. **Attendance Mode** - Daily check-in with face

#### Key States:
```javascript
- cameraActive: boolean
- capturing: boolean
- faceRegistered: boolean
- location: { lat, lng, accuracy }
- status: 'success' | 'error' | null
- message: string
- mode: 'attendance' | 'register'
```

#### Key Functions:

**`checkFaceStatus()`**
- Calls GET /attendance/face/status
- Sets faceRegistered flag
- Auto-switches to register mode if not registered

**`startCamera()`**
- Requests getUserMedia permission
- Opens camera stream
- Displays video feed

**`stopCamera()`**
- Closes all media tracks
- Cleans up stream

**`getLocation()`**
- Uses Geolocation API
- Gets latitude, longitude, accuracy
- Returns promise

**`captureImage()`**
- Draws video frame to canvas
- Returns base64 JPEG data

**`handleAttendance()`**
- Checks if face is registered
- Gets current location
- Captures image
- Calls /attendance/face/verify API
- Shows success/error message

**`handleRegistration()`**
- Validates employee name and ID
- Captures image
- Calls /attendance/face/register API
- Auto-switches to attendance mode on success

---

## Workflow

### Registration Flow (First Time)
1. Employee visits FaceAttendance page
2. Component checks face status → Not registered
3. Auto-switches to "Register Face" mode
4. Employee enters name and ID
5. Clicks "Start Camera"
6. Positions face in camera
7. Clicks "Capture & Register"
8. Image sent to backend
9. FaceData record created
10. Success message shown
11. Auto-switches to attendance mode

### Daily Attendance Flow
1. Employee opens FaceAttendance page
2. Component detects face is registered
3. Shows "Mark Attendance" mode (default)
4. Clicks "Start Camera"
5. Positions face in camera
6. Clicks "Capture & Mark Attendance"
7. System gets GPS location
8. Validates location accuracy (< 20m)
9. Checks geofence boundary
10. Image sent to backend with location
11. Backend verifies face and creates attendance
12. Success message with check-in time
13. Camera automatically stops

---

## Location Verification (Geofencing)

### How It Works:
1. **Accuracy Check** - GPS accuracy must be < 20 meters (default)
2. **Geofence Check** - Employee must be within office boundary polygon
3. **Point-in-Polygon** - Uses ray casting algorithm to verify location inside fence

### Demo Geofence:
```javascript
[
  { lat: 23.03010, lng: 72.51790 },
  { lat: 23.03010, lng: 72.51830 },
  { lat: 23.03040, lng: 72.51830 },
  { lat: 23.03040, lng: 72.51790 }
]
```

### Configuration:
```javascript
// In Employee model
employee.allowedAccuracy = 100; // meters
employee.geofance = [...polygon points];
```

---

## Error Handling

### Frontend Errors:
| Error | Cause | Solution |
|-------|-------|----------|
| Camera access denied | Browser permission denied | Enable camera in browser settings |
| Failed to capture image | Video stream not ready | Ensure camera is working |
| No registered face found | Face not registered | Register face first |
| Location accuracy too low | GPS not accurate | Move to open area, try again |
| Outside office location | Not within geofence | Move to office location |
| Attendance already marked | Already checked in today | Cannot mark twice daily |

### Backend Validations:
- Face image data required
- Location data required (lat, lng)
- Location accuracy validation
- Geofence boundary check
- Attendance duplicate check

---

## Security Features

1. **Face Verification** - Biometric authentication
2. **Location Validation** - GPS geofencing
3. **Authentication** - JWT token verification
4. **Tenant Isolation** - Each tenant's data separate
5. **Audit Trail** - IP address, device info, timestamp logged
6. **Status Tracking** - Active/inactive/rejected states
7. **Usage Monitoring** - Track face usage count

---

## Database Schema

### FaceData Collection
```javascript
{
  _id: ObjectId,
  tenant: ObjectId (ref: Tenant),
  employee: ObjectId (ref: Employee),
  faceImageData: String (base64),
  quality: {
    sharpness: Number (0-100),
    brightness: Number (0-100),
    contrast: Number (0-100),
    confidence: Number (0-100)
  },
  status: String (enum),
  isVerified: Boolean,
  verifiedAt: Date,
  registeredAt: Date,
  lastUsedAt: Date,
  usageCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Attendance Entry (with face registration)
```javascript
{
  _id: ObjectId,
  tenant: ObjectId,
  employee: ObjectId,
  date: Date,
  checkIn: Date,
  status: String ("present"),
  logs: [
    {
      time: Date,
      type: String ("IN" or "OUT"),
      location: String ("lat, lng"),
      device: String ("Face Recognition"),
      ip: String
    }
  ]
}
```

---

## API Response Examples

### Register Face - Success
```json
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

### Verify Face - Success
```json
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

### Error Response
```json
{
  "success": false,
  "message": "You are outside the office location"
}
```

---

## Integration with Existing Systems

### Attendance Records:
- Face registrations linked to existing Attendance collection
- Check-in logs stored in attendance.logs array
- Working hours calculated from multiple IN/OUT entries
- Attendance rate calculated from present/absent/leaves

### Employee Model:
- Geofence polygon stored in Employee document
- Allowed location accuracy field
- Face registration status tracked

### Audit Logging:
- All face registrations logged with device info
- Location, IP address, user agent stored
- Verification audit trail maintained

---

## Testing

### Test the Registration API:
```bash
curl -X POST http://localhost:3000/api/attendance/face/register \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "faceImageData": "data:image/jpeg;base64,...",
    "registrationNotes": "Initial registration"
  }'
```

### Test the Verification API:
```bash
curl -X POST http://localhost:3000/api/attendance/face/verify \
  -H "Authorization: Bearer TOKEN" \
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

### Test the Status API:
```bash
curl -X GET http://localhost:3000/api/attendance/face/status \
  -H "Authorization: Bearer TOKEN"
```

---

## Future Enhancements

1. **ML Face Recognition** - Integrate face-api.js or TensorFlow.js
2. **Multiple Face Storage** - Store backup face images
3. **Face Mask Detection** - Validate face visibility
4. **Real-time Verification** - Compare with stored embedding vector
5. **Quality Scoring** - Reject low-quality images automatically
6. **Email Notifications** - Alert on successful registration/check-in
7. **Mobile App** - Native camera integration
8. **Admin Dashboard** - View all face registrations
9. **Anomaly Detection** - Flag unusual check-in patterns
10. **Export Reports** - Generate attendance reports with face verification status

---

## Troubleshooting

### Camera Not Working
- Check browser permissions
- Try different browser (Chrome, Firefox, Edge)
- Ensure no other app using camera
- Check device camera functionality

### Location Not Detected
- Enable location services on device
- Check browser location permission
- Move to open area with clear sky
- Disable WiFi-only location mode

### Face Registration Failing
- Ensure good lighting
- Keep face centered in frame
- Avoid sunglasses/masks
- Use base64 image data

### Geofence Not Working
- Verify geofence polygon in Employee document
- Check latitude/longitude coordinates
- Ensure accuracy < 20 meters
- Test with known location inside fence

---

## Support & Maintenance

For issues or improvements:
1. Check error logs in browser console
2. Review backend controller error messages
3. Verify API endpoint connectivity
4. Check database records for stored data
5. Review audit logs for tracking

