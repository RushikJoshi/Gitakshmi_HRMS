import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, CheckCircle } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

export default function AttendanceClock({
    isCheckedIn,
    isCheckedOut,
    checkInTime,
    onAction,
    isLoading,
    location = "Remote",
    settings = {}
}) {
    const [elapsed, setElapsed] = useState("00:00:00");
    const [currentTime, setCurrentTime] = useState(new Date());

    // Live Clock Update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Duration Timer Logic
    useEffect(() => {
        let interval;
        if (isCheckedIn && !isCheckedOut && checkInTime) {
            interval = setInterval(() => {
                const now = new Date();
                const start = new Date(checkInTime);
                const diff = Math.max(0, now - start);

                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);

                setElapsed(
                    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                );
            }, 1000);
        } else if (!isCheckedIn) {
            setElapsed("00:00:00");
        }
        return () => clearInterval(interval);
    }, [isCheckedIn, isCheckedOut, checkInTime]);

    // UI Configuration based on Policy
    const isMultipleMode = settings?.punchMode === 'multiple';
    const showShiftCompleted = !isMultipleMode && isCheckedOut;

    let statusText = "Not Punched In";
    let statusColor = "text-slate-400";
    let ringColor = "border-slate-100";

    if (isCheckedIn && !isCheckedOut) {
        statusText = "You are Punched In";
        statusColor = "text-green-600";
        ringColor = "border-green-500 animate-pulse";
    } else if (isCheckedOut) {
        statusText = isMultipleMode ? "Currently Out" : "Shift Completed";
        statusColor = isMultipleMode ? "text-amber-600" : "text-blue-600";
        ringColor = isMultipleMode ? "border-amber-400" : "border-blue-500";
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl flex flex-col items-center justify-center min-h-[460px] transition-all relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-20"></div>

            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-8 flex items-center gap-3 uppercase tracking-[0.2em]">
                <Clock size={16} className="text-blue-500" />
                Live Attendance Console
            </h3>

            {/* Circular Clock UI */}
            <div className="relative mb-10 group">
                <div className={`w-64 h-64 rounded-full border-[10px] shadow-inner ${ringColor} flex items-center justify-center relative transition-all duration-700 bg-slate-50 dark:bg-slate-900/50`}>
                    <div className="text-center">
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Session Duration</div>
                        <div className="text-5xl font-mono font-black text-slate-800 dark:text-white tracking-widest drop-shadow-sm">
                            {elapsed}
                        </div>
                        <div className={`text-[10px] font-black mt-4 uppercase tracking-widest px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 ${statusColor}`}>
                            {statusText}
                        </div>
                    </div>
                </div>

                {isCheckedIn && !isCheckedOut && (
                    <div className="absolute top-6 right-6 w-4 h-4 bg-green-500 rounded-full animate-ping z-10 shadow-lg shadow-green-500/50"></div>
                )}
            </div>

            {/* Current Time Small Display */}
            <div className="mb-8 text-center bg-slate-50 dark:bg-slate-900/50 px-8 py-4 rounded-[2rem] border border-slate-100 dark:border-slate-800/50">
                <div className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mt-1 space-x-2">
                    <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="opacity-20">|</span>
                    <span>{formatDateDDMMYYYY(currentTime)}</span>
                </div>
            </div>

            {/* Action Button */}
            <div className="w-full max-w-[300px]">
                {showShiftCompleted ? (
                    <div className="w-full py-5 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest text-center border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1 shadow-inner">
                        <CheckCircle size={16} className="opacity-50" />
                        Shift Completed
                    </div>
                ) : (
                    <button
                        onClick={onAction}
                        disabled={isLoading}
                        className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale ${isCheckedIn && !isCheckedOut
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
            </div>

            <p className="mt-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Location: {location}
            </p>
        </div>
    );
}
