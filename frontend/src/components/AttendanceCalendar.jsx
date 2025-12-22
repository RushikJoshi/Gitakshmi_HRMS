import React, { useMemo } from 'react';
import { Info, AlertCircle, CheckCircle, Clock, Calendar as CalendarIcon, Coffee, Briefcase, Lock } from 'lucide-react';

const STATUS_CONFIG = {
    present: { label: 'Present', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
    absent: { label: 'Absent', color: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: AlertCircle },
    leave: { label: 'Leave', color: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: Info },
    holiday: { label: 'Holiday', color: 'bg-blue-600', text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Coffee },
    weekly_off: { label: 'Weekly Off', color: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: CalendarIcon },
    half_day: { label: 'Half Day', color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
    official_duty: { label: 'Official Duty', color: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: Briefcase },
    missed_punch: { label: 'Missed', color: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: AlertCircle },
    not_marked: { label: 'Not Marked', color: 'bg-slate-100', text: 'text-slate-300', bg: 'bg-white', border: 'border-slate-50', icon: Info },
    disabled: { label: 'Disabled', color: 'bg-slate-200', text: 'text-slate-400', bg: 'bg-slate-200/50', border: 'border-slate-200', icon: Lock }
};

export default function AttendanceCalendar({
    data = [],
    holidays = [],
    settings = {},
    currentMonth,
    currentYear,
    onDateClick,
    selectedDate,
    selectionMode = false,
    disabledDates = {} // { "YYYY-MM-DD": "Reason" }
}) {

    const weeklyOffDays = settings.weeklyOffDays || [0];

    const formatDateStr = (year, month, day) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const today = new Date();
    const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    const calendarArray = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

        const arr = [];
        for (let i = 0; i < firstDay; i++) arr.push({ type: 'empty' });

        for (let d = 1; d <= lastDate; d++) {
            const date = new Date(currentYear, currentMonth, d);
            const dateStr = formatDateStr(currentYear, currentMonth, d);
            const isWeeklyOff = weeklyOffDays.includes(date.getDay());
            const isSunday = date.getDay() === 0;

            arr.push({
                type: 'date',
                dateStr,
                dayNum: d,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                isWeeklyOff,
                isSunday,
                isToday: todayStr === dateStr,
                isFuture: dateStr > todayStr
            });
        }
        return arr;
    }, [currentMonth, currentYear, weeklyOffDays, todayStr]);

    const attendanceMap = useMemo(() => {
        const map = {};
        data.forEach(item => {
            const dStr = item.date.split('T')[0];
            map[dStr] = item;
        });
        return map;
    }, [data]);

    const holidayMap = useMemo(() => {
        const map = {};
        holidays.forEach(h => {
            const dStr = h.date.split('T')[0];
            map[dStr] = h;
        });
        return map;
    }, [holidays]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="flex flex-wrap gap-x-6 gap-y-2 p-6 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    if (key === 'missed_punch') return null;
                    if (selectionMode && key === 'not_marked') return null;
                    return (
                        <div key={key} className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${config.color}`}></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{config.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 md:p-6">
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className={`text-center py-4 text-[10px] font-black uppercase tracking-widest ${day === 'Sun' ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                            {day}
                        </div>
                    ))}

                    {calendarArray.map((cell, i) => {
                        if (cell.type === 'empty') return <div key={`empty-${i}`} className="h-24 md:h-32 invisible"></div>;

                        const { dateStr, dayNum, isWeeklyOff, isSunday, isToday, isFuture } = cell;
                        const attendance = attendanceMap[dateStr];
                        const holiday = holidayMap[dateStr];
                        const disabledReason = disabledDates[dateStr];
                        const isSelected = selectedDate === dateStr;

                        let statusKey = 'not_marked';
                        if (holiday) {
                            statusKey = 'holiday';
                        } else if (isWeeklyOff) {
                            statusKey = 'weekly_off';
                        } else if (attendance) {
                            statusKey = attendance.status?.toLowerCase() || 'not_marked';
                            if (attendance.locked) statusKey = 'disabled';
                        }

                        const config = (disabledReason && selectionMode) ? STATUS_CONFIG.disabled : (STATUS_CONFIG[statusKey] || STATUS_CONFIG.not_marked);
                        const StatusIcon = config.icon;

                        return (
                            <div
                                key={dateStr}
                                onClick={() => !disabledReason && onDateClick?.(dateStr, attendance || { status: statusKey, isWeeklyOff, holiday })}
                                className={`group relative h-24 md:h-32 p-3 rounded-2xl border transition-all duration-300 overflow-visible flex flex-col justify-between
                                    ${disabledReason && selectionMode ? 'opacity-40 cursor-not-allowed bg-slate-100 grayscale' : 'cursor-pointer hover:scale-[1.1] hover:z-30 hover:shadow-2xl'}
                                    ${isSelected ? 'ring-4 ring-blue-500 shadow-blue-500/20 z-20 scale-[1.05] !opacity-100 active:scale-95' : ''}
                                    ${isToday && !isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 z-10' : ''}
                                    ${config.bg} ${config.border}
                                    ${(isWeeklyOff || holiday) && !attendance ? 'opacity-90' : ''}
                                `}
                                style={statusKey === 'leave' && attendance?.leaveColor ? {
                                    backgroundColor: isSelected ? undefined : `${attendance.leaveColor}15`,
                                    borderColor: isSelected ? undefined : `${attendance.leaveColor}40`
                                } : {}}
                            >
                                {disabledReason && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle size={12} className="text-rose-400" />
                                            <span className="font-bold">{disabledReason}</span>
                                        </div>
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                            <div className="w-2 h-2 bg-slate-900 rotate-45"></div>
                                        </div>
                                    </div>
                                )}

                                {holiday && !disabledReason && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-2">
                                            <Coffee size={12} className="text-blue-400" />
                                            <span className="font-black">{holiday.name}</span>
                                        </div>
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                            <div className="w-2 h-2 bg-slate-900 rotate-45"></div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-start relative z-10">
                                    <span className={`text-sm md:text-lg font-black h-8 w-8 rounded-lg flex items-center justify-center shadow-sm 
                                        ${isSunday ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 font-black' : 'text-slate-800 dark:text-white bg-white dark:bg-slate-800'}
                                        ${holiday ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                                        ${isSelected ? '!bg-blue-600 !text-white' : ''}
                                    `}>
                                        {dayNum}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {holiday && (
                                            <Coffee size={12} className="text-blue-600 dark:text-blue-400" />
                                        )}
                                        {StatusIcon && <StatusIcon size={14} className={isSelected ? 'text-white' : config.text} style={statusKey === 'leave' && attendance?.leaveColor && !isSelected ? { color: attendance.leaveColor } : {}} />}
                                    </div>
                                </div>

                                <div className="space-y-1 relative z-10">
                                    <div className={`text-[9px] font-black uppercase tracking-tighter truncate ${isSelected ? 'text-white' : config.text}`} style={statusKey === 'leave' && attendance?.leaveColor && !isSelected ? { color: attendance.leaveColor } : {}}>
                                        {holiday ? holiday.name : (attendance ? (attendance.leaveType || STATUS_CONFIG[attendance.status.toLowerCase()]?.label || attendance.status) : (isWeeklyOff ? 'Weekly Off' : '--'))}
                                    </div>

                                    {attendance?.checkIn && (
                                        <div className={`flex items-center gap-1 text-[8px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {new Date(attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {attendance.checkOut && ` - ${new Date(attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                        </div>
                                    )}

                                    {attendance?.workingHours > 0 && (
                                        <div className={`text-[8px] font-black uppercase transition-colors ${isSelected ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                            {attendance.workingHours} HRS
                                        </div>
                                    )}

                                    {attendance?.locked && (
                                        <div className="flex items-center gap-1 text-[7px] font-black text-rose-500 uppercase bg-white/80 px-1 rounded">
                                            <Lock size={8} /> Payroll Locked
                                        </div>
                                    )}
                                </div>

                                {!disabledReason && (
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none ${config.color} rounded-2xl`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
