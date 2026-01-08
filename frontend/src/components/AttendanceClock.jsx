import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, CheckCircle, AlertOctagon } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

export default function AttendanceClock({
    isCheckedIn,
    isCheckedOut,
    checkInTime,
    onAction,
    isLoading,
    location = "Remote",
    settings = {},
    error = null
}) {
    const [elapsed, setElapsed] = useState("00:00:00");
    const [currentTime, setCurrentTime] = useState(new Date());
    const [progress, setProgress] = useState(0);

    // Live Clock Update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Duration Timer & Progress Logic
    useEffect(() => {
        let interval;
        if (isCheckedIn && !isCheckedOut && checkInTime) {

            // Initial calculation to avoid 1s delay
            const calculateTime = () => {
                const now = new Date();
                const start = new Date(checkInTime);
                const diff = Math.max(0, now - start);

                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);

                setElapsed(
                    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                );

                // Calculate Progress
                const totalSeconds = diff / 1000;
                const targetHours = settings?.fullDayThresholdHours || 9;
                const targetSeconds = targetHours * 3600;
                const pct = Math.min((totalSeconds / targetSeconds) * 100, 100);
                setProgress(pct);
            };

            calculateTime(); // Run immediately
            interval = setInterval(calculateTime, 1000);
        } else if (!isCheckedIn) {
            setElapsed("00:00:00");
            setProgress(0);
        } else if (isCheckedOut) {
            // If checked out, we might want to show the final progress if we had the checkout time, 
            // but for now we stop the timer. The User didn't explicitly ask for historical progress here.
            // We'll leave progress as is or reset if we want. 
            // Often purely visual "Shift Completed" state is better.
        }
        return () => clearInterval(interval);
    }, [isCheckedIn, isCheckedOut, checkInTime, settings]);

    // UI Configuration based on Policy
    const isMultipleMode = settings?.punchMode === 'multiple';
    const showShiftCompleted = !isMultipleMode && isCheckedOut;

    let statusText = "Not Punched In";
    let statusColor = "text-slate-400";
    // let ringColor = "border-slate-100"; // No longer used for border color directly

    // Colors for SVG Stroke
    let strokeColorClass = "text-slate-200 dark:text-slate-700";

    if (isCheckedIn && !isCheckedOut) {
        statusText = "You are Punched In";
        statusColor = "text-emerald-500";
        strokeColorClass = "text-emerald-500";
    } else if (isCheckedOut) {
        statusText = isMultipleMode ? "Currently Out" : "Shift Completed";
        statusColor = isMultipleMode ? "text-amber-500" : "text-blue-500";
        strokeColorClass = isMultipleMode ? "text-amber-500" : "text-blue-500";
        // If shift completed, maybe show full ring?
        if (!isMultipleMode) strokeColorClass = "text-blue-500";
    }

    // Circular Progress Constants
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center min-h-[480px] transition-all relative overflow-hidden group hover:shadow-2xl duration-500">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-20"></div>

            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-8 flex items-center gap-2 uppercase tracking-[0.2em]">
                <Clock size={14} className="text-blue-500" />
                Live Attendance Console
            </h3>

            {/* Circular Progress Clock UI */}
            <div className="relative mb-10 w-64 h-64 flex items-center justify-center">

                {/* SVG Progress Ring */}
                <div className="absolute inset-0 transform -rotate-90 drop-shadow-2xl">
                    <svg className="w-full h-full" viewBox="0 0 256 256">
                        {/* Track */}
                        <circle
                            cx="128"
                            cy="128"
                            r={radius}
                            fill="none"
                            className="stroke-slate-100 dark:stroke-slate-900"
                            strokeWidth="12"
                        />
                        {/* Progress */}
                        <circle
                            cx="128"
                            cy="128"
                            r={radius}
                            fill="none"
                            className={`transition-all duration-1000 ease-out ${strokeColorClass}`}
                            strokeWidth="12"
                            strokeDasharray={circumference}
                            strokeDashoffset={isCheckedIn && !isCheckedOut ? strokeDashoffset : (isCheckedOut && !isMultipleMode ? 0 : circumference)}
                            strokeLinecap="round"
                        />
                    </svg>
                </div>

                {/* Inner Content */}
                <div className="relative z-10 text-center flex flex-col items-center justify-center w-48 h-48 bg-white dark:bg-slate-800 rounded-full shadow-inner border border-slate-50 dark:border-slate-700/50">
                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Session Duration</div>
                    <div className="text-4xl font-mono font-black text-slate-800 dark:text-white tracking-widest drop-shadow-sm tabular-nums">
                        {elapsed}
                    </div>
                    <div className={`mt-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isCheckedIn && !isCheckedOut
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 animate-pulse'
                        : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-700'
                        }`}>
                        {isCheckedIn && !isCheckedOut ? 'Active' : 'Idle'}
                    </div>
                </div>

                {/* Pulsing Dot indicator */}
                {isCheckedIn && !isCheckedOut && (
                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 w-full h-full animate-spin-slow pointer-events-none">
                        {/* This makes a dot orbit if we wanted, but for now let's just keep the static ripple if preferred. 
                             Actually, let's just place a badge.
                         */}
                    </div>
                )}
            </div>

            {/* Current Time Small Display */}
            <div className="mb-8 text-center bg-slate-50 dark:bg-slate-900/50 px-8 py-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 w-full max-w-[280px]">
                <div className="text-xl font-black text-slate-800 dark:text-white tracking-tight tabular-nums">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </div>
                <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mt-1 flex items-center justify-center gap-2">
                    <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    <span>{formatDateDDMMYYYY(currentTime)}</span>
                </div>
            </div>

            {/* Action Button */}
            <div className="w-full max-w-[280px] z-20 relative">
                {showShiftCompleted ? (
                    <div className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest text-center shadow-lg shadow-emerald-500/20 flex flex-col items-center gap-1">
                        <CheckCircle size={20} className="mb-1" />
                        Shift Completed
                    </div>
                ) : (
                    <button
                        onClick={onAction}
                        disabled={isLoading}
                        className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale cursor-pointer hover:shadow-xl ${isCheckedIn && !isCheckedOut
                            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                            }`}
                    >
                        {isLoading ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (isCheckedIn && !isCheckedOut) ? (
                            <>
                                <LogOut size={16} />
                                Punch Out
                            </>
                        ) : (
                            <>
                                <LogIn size={16} />
                                {isMultipleMode && isCheckedIn ? 'Resume Shift' : 'Punch In'}
                            </>
                        )}
                    </button>
                )}

                {/* Error Message Display */}
                {error && (
                    <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                        <AlertOctagon size={14} className="text-rose-500 mt-0.5 shrink-0" />
                        <p className="text-[10px] font-bold text-rose-600 dark:text-rose-300 leading-tight text-left">
                            {error}
                        </p>
                    </div>
                )}
            </div>

            <p className="mt-6 text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-help" title="Location detected by browser">
                Location: {location}
            </p>
        </div>
    );
}
