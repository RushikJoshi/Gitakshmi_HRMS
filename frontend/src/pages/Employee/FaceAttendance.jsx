import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, CheckCircle, XCircle, User, UserPlus, Clock, AlertCircle, Loader2, Navigation } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const FaceAttendance = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState('attendance'); // 'attendance' or 'register'
  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [employeeData, setEmployeeData] = useState(null);
  const [registrationName, setRegistrationName] = useState('');
  const [registrationId, setRegistrationId] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCheckIn = async () => {
    const tenantId = user?.tenantId || localStorage.getItem('tenantId');
    console.log(tenantId);
    const data = {
      tenantId,
      isFaceVerified: true,
      location: {
        lat: 23.03025,
        lng: 72.51805,
        accuracy: 8
      }
    };
    try {
      const res = await api.post('/attendance/validateAttendance', data);
      console.log(res);
      setStatus('success');
      setMessage('Attendance marked successfully!');
    } catch (err) {
      console.error('Error in check-in:', err);
      setStatus('error');
      setMessage(err.response?.data?.message || 'Check-in failed');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setStatus(null);
        setMessage('');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Camera access denied. Please enable camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setLocation(loc);
          resolve(loc);
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.95);
    }
    return null;
  };

  const handleAttendance = async () => {
    setCapturing(true);
    setStatus(null);
    setMessage('Processing attendance...');

    try {
      const loc = await getLocation();
      const imageData = captureImage();

      if (!imageData) {
        throw new Error('Failed to capture image');
      }

      // Simulate API call to backend
      await simulateAttendanceAPI(imageData, loc);

    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Attendance marking failed');
      setCapturing(false);
    }
  };

  const handleRegistration = async () => {
    if (!registrationName.trim() || !registrationId.trim()) {
      setStatus('error');
      setMessage('Please enter both name and employee ID');
      return;
    }

    setCapturing(true);
    setStatus(null);
    setMessage('Registering face...');

    try {
      const imageData = captureImage();

      if (!imageData) {
        throw new Error('Failed to capture image');
      }

      // Simulate API call to backend
      await simulateRegistrationAPI(imageData, registrationName, registrationId);

    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Face registration failed');
      setCapturing(false);
    }
  };

  // Simulated API calls (replace with actual backend endpoints)
  const simulateAttendanceAPI = async (imageData, location) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful response
        const mockEmployee = {
          name: 'John Doe',
          id: 'EMP-12345',
          department: 'Engineering',
          time: new Date().toLocaleTimeString(),
          locationValid: true
        };

        setEmployeeData(mockEmployee);
        setStatus('success');
        setMessage('Attendance marked successfully!');
        setCapturing(false);

        setTimeout(() => {
          stopCamera();
        }, 3000);

        resolve();
      }, 2000);
    });
  };

  const simulateRegistrationAPI = async (imageData, name, empId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setStatus('success');
        setMessage(`Face registered successfully for ${name}!`);
        setCapturing(false);
        setRegistrationName('');
        setRegistrationId('');

        setTimeout(() => {
          stopCamera();
        }, 3000);

        resolve();
      }, 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4 shadow-2xl">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">
            HRM Attendance System
          </h1>
          <p className="text-blue-200 text-lg">Secure face recognition with location validation</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1.5 shadow-xl border border-slate-700/50">
            <button
              onClick={() => { setMode('attendance'); setStatus(null); setMessage(''); }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${mode === 'attendance'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                : 'text-slate-300 hover:text-white'
                }`}
            >
              <CheckCircle className="w-5 h-5" />
              Mark Attendance
            </button>
            <button
              onClick={() => { setMode('register'); setStatus(null); setMessage(''); }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${mode === 'register'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                : 'text-slate-300 hover:text-white'
                }`}
            >
              <UserPlus className="w-5 h-5" />
              Register Face
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Camera Section */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-700/50">
            <div className="aspect-video bg-slate-900/50 rounded-2xl overflow-hidden relative mb-6 border-2 border-slate-700/50">
              {!cameraActive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4 border-4 border-slate-700">
                    <Camera className="w-12 h-12 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-lg font-medium">Camera is off</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {capturing && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <Loader2 className="w-16 h-16 text-white animate-spin" />
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="space-y-3">
              {!cameraActive ? (
                <><button
                  onClick={startCamera}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Camera className="w-5 h-5" />
                  Start Camera
                </button><div className="space-y-20">

                    <button
                      onClick={handleCheckIn}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      Chek IN Using Location (Testing)
                    </button>
                  </div></>
              ) : (
                <>
                  <button
                    onClick={mode === 'attendance' ? handleAttendance : handleRegistration}
                    disabled={capturing}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    {capturing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {mode === 'attendance' ? <CheckCircle className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                        {mode === 'attendance' ? 'Capture & Mark Attendance' : 'Capture & Register'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={stopCamera}
                    disabled={capturing}
                    className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
                  >
                    Stop Camera
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="space-y-6">
            {/* Registration Form (only in register mode) */}
            {mode === 'register' && (
              <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-700/50">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-400" />
                  Employee Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Employee Name
                    </label>
                    <input
                      type="text"
                      value={registrationName}
                      onChange={(e) => setRegistrationName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={registrationId}
                      onChange={(e) => setRegistrationId(e.target.value)}
                      placeholder="Enter employee ID"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {status && (
              <div className={`bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border-2 ${status === 'success' ? 'border-emerald-500/50' : 'border-red-500/50'
                }`}>
                <div className="flex items-start gap-4">
                  {status === 'success' ? (
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-7 h-7 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-7 h-7 text-red-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className={`text-xl font-bold mb-1 ${status === 'success' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                      {status === 'success' ? 'Success!' : 'Error'}
                    </h3>
                    <p className="text-slate-300">{message}</p>

                    {status === 'success' && employeeData && mode === 'attendance' && (
                      <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Employee:</span>
                          <span className="text-white font-semibold">{employeeData.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">ID:</span>
                          <span className="text-white font-semibold">{employeeData.id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Department:</span>
                          <span className="text-white font-semibold">{employeeData.department}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Time:</span>
                          <span className="text-white font-semibold">{employeeData.time}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Location Info */}
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-700/50">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Navigation className="w-6 h-6 text-blue-400" />
                Location Status
              </h3>
              {location ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <MapPin className="w-5 h-5" />
                    <span className="font-semibold">Location Acquired</span>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Latitude:</span>
                      <span className="text-white font-mono">{location.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Longitude:</span>
                      <span className="text-white font-mono">{location.longitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Accuracy:</span>
                      <span className="text-white font-mono">{Math.round(location.accuracy)}m</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-slate-400">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    Location will be captured automatically when marking attendance
                  </p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-blue-500/20">
              <h3 className="text-xl font-bold text-white mb-3">Instructions</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Position your face clearly within the camera frame</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Ensure good lighting for accurate face detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Allow location access for attendance validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>For registration, enter employee details before capturing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
export default FaceAttendance;