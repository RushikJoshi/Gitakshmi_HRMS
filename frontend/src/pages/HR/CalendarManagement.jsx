import React, { useState, useEffect } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';
import { Calendar, Plus, Edit2, Trash2, Coffee, X, Save, AlertCircle, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

export default function CalendarManagement() {
    const [view, setView] = useState('calendar'); // 'calendar' or 'list'
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [holidayForm, setHolidayForm] = useState({ name: '', date: '', type: 'Public', description: '' });
    const [settings, setSettings] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [calendarData, setCalendarData] = useState(null);

    // Bulk Upload State
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [uploadErrors, setUploadErrors] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadSummary, setUploadSummary] = useState(null);

    useEffect(() => {
        fetchData();
    }, [currentYear, currentMonth]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [holidaysRes, settingsRes, calendarRes] = await Promise.all([
                api.get(`/holidays?year=${currentYear}`),
                api.get('/attendance/settings'),
                api.get(`/attendance/calendar?year=${currentYear}&month=${currentMonth + 1}`)
            ]);
            setHolidays(holidaysRes.data || []);
            setSettings(settingsRes.data || {});
            setCalendarData(calendarRes.data);
        } catch (err) {
            console.error('Failed to fetch calendar data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddHoliday = () => {
        setEditingHoliday(null);
        setHolidayForm({ name: '', date: '', type: 'Public', description: '' });
        setShowHolidayModal(true);
    };

    const handleEditHoliday = (holiday) => {
        setEditingHoliday(holiday);
        const dateStr = new Date(holiday.date).toISOString().split('T')[0];
        setHolidayForm({
            name: holiday.name,
            date: dateStr,
            type: holiday.type || 'Public',
            description: holiday.description || ''
        });
        setShowHolidayModal(true);
    };

    const handleSaveHoliday = async () => {
        try {
            if (!holidayForm.name || !holidayForm.date) {
                alert('Please fill in holiday name and date');
                return;
            }

            if (editingHoliday) {
                await api.put(`/holidays/${editingHoliday._id}`, holidayForm);
            } else {
                await api.post('/holidays', holidayForm);
            }

            setShowHolidayModal(false);
            fetchData();
        } catch (err) {
            console.error('Failed to save holiday:', err);
            alert(err.response?.data?.error || 'Failed to save holiday');
        }
    };

    const handleDeleteHoliday = async (id) => {
        if (!confirm('Are you sure you want to delete this holiday? This action cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/holidays/${id}`);
            fetchData();
        } catch (err) {
            console.error('Failed to delete holiday:', err);
            alert(err.response?.data?.error || 'Failed to delete holiday');
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadFile(file);
            setUploadPreview(null);
            setUploadSummary(null);
        }
    };

    const handlePreviewUpload = async () => {
        if (!uploadFile) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', uploadFile);

            const res = await api.post('/holidays/bulk/preview', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setUploadPreview(res.data.preview);
            setUploadErrors(res.data.errors || []);
            setUploadSummary(res.data.summary);
        } catch (err) {
            console.error('Failed to preview upload:', err);
            alert(err.response?.data?.error || 'Failed to process file');
            setUploadFile(null);
        } finally {
            setUploading(false);
        }
    };

    const handleConfirmUpload = async () => {
        if (!uploadPreview || uploadSummary?.new === 0) return;

        try {
            setUploading(true);
            const res = await api.post('/holidays/bulk/confirm', {
                holidays: uploadPreview,
                skipDuplicates: true
            });

            alert(`Successfully uploaded ${res.data.summary.saved} holidays!`);
            setShowBulkUploadModal(false);
            setUploadFile(null);
            setUploadPreview(null);
            setUploadErrors([]);
            setUploadSummary(null);
            fetchData(); // Refresh the holiday list
        } catch (err) {
            console.error('Failed to confirm upload:', err);
            alert(err.response?.data?.error || 'Failed to save holidays');
        } finally {
            setUploading(false);
        }
    };

    const navigateMonth = (direction) => {
        if (direction === 'prev') {
            if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
            } else {
                setCurrentMonth(currentMonth - 1);
            }
        } else {
            if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
            } else {
                setCurrentMonth(currentMonth + 1);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400 font-bold uppercase tracking-widest">Loading Calendar...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 md:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">
                        Attendance Calendar Management
                    </h1>
                    <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">
                        HR-Controlled Working Calendar & Holiday Master
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {view === 'list' && (
                        <select
                            value={currentYear}
                            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                            className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition outline-none"
                        >
                            {Array.from({ length: 5 }, (_, i) => {
                                const year = new Date().getFullYear() - 1 + i;
                                return (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                );
                            })}
                        </select>
                    )}
                    <button
                        onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}
                        className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        {view === 'calendar' ? 'List View' : 'Calendar View'}
                    </button>
                    <button
                        onClick={() => setShowBulkUploadModal(true)}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition flex items-center gap-2"
                    >
                        <Upload size={16} />
                        Bulk Upload
                    </button>
                    <button
                        onClick={handleAddHoliday}
                        className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Holiday
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={20} />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                    <div className="font-black uppercase tracking-wider mb-1">HR-Only Access</div>
                    <div className="font-bold">Only HR/Company Admin can modify the calendar. Employees can only view the calendar.</div>
                </div>
            </div>

            {view === 'calendar' ? (
                <div className="space-y-6">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <button
                            onClick={() => navigateMonth('prev')}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                        >
                            <ChevronLeft size={24} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <div className="text-xl font-black uppercase tracking-widest text-slate-800 dark:text-white min-w-[200px] text-center">
                            {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                        <button
                            onClick={() => navigateMonth('next')}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                        >
                            <ChevronRight size={24} className="text-slate-600 dark:text-slate-300" />
                        </button>
                    </div>

                    {/* Calendar Display */}
                    {calendarData && (
                        <AttendanceCalendar
                            data={[]}
                            holidays={calendarData.holidays || []}
                            settings={calendarData.settings || {}}
                            currentMonth={currentMonth}
                            currentYear={currentYear}
                        />
                    )}

                    {/* Calendar Legend */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-4">Priority Rules</div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                                <span>1. Holiday (HR-defined)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-slate-300 rounded"></div>
                                <span>2. Weekly Off</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                                <span>3. Attendance Status</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-slate-100 rounded border"></div>
                                <span>4. Not Marked</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                            All Holidays ({currentYear})
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Holiday Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {holidays.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold">
                                            No holidays defined for {currentYear}
                                        </td>
                                    </tr>
                                ) : (
                                    holidays.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((holiday) => {
                                        const holidayDate = new Date(holiday.date);
                                        const holidayYear = holidayDate.getFullYear();
                                        return (
                                            <tr key={holiday._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-sm font-black text-slate-800 dark:text-white">
                                                            {formatDateDDMMYYYY(holiday.date)}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                                        </div>
                                                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                                            {holidayYear}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Coffee size={16} className="text-amber-500" />
                                                        <span className="text-sm font-black text-slate-800 dark:text-white">{holiday.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black uppercase">
                                                        {holiday.type || 'Public'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                                        {holiday.description || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => handleEditHoliday(holiday)}
                                                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded-xl transition"
                                                            title="Edit Holiday"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteHoliday(holiday._id)}
                                                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 rounded-xl transition"
                                                            title="Delete Holiday"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {holidays.length > pageSize && (
                        <div className="px-8 py-5 border-t border-slate-50 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-950/50">
                            <Pagination
                                current={currentPage}
                                pageSize={pageSize}
                                total={holidays.length}
                                onChange={(page) => setCurrentPage(page)}
                                showSizeChanger={false}
                                hideOnSinglePage
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Holiday Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHolidayModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
                            </h3>
                            <button
                                onClick={() => setShowHolidayModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Holiday Name *
                                </label>
                                <input
                                    type="text"
                                    value={holidayForm.name}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                                    placeholder="e.g., Diwali, Christmas"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Date *
                                </label>
                                <DatePicker
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition h-[46px]"
                                    format="DD-MM-YYYY"
                                    placeholder="DD-MM-YYYY"
                                    value={holidayForm.date ? dayjs(holidayForm.date) : null}
                                    onChange={(date) => setHolidayForm({ ...holidayForm, date: date ? date.format('YYYY-MM-DD') : '' })}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Type
                                </label>
                                <select
                                    value={holidayForm.type}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                                >
                                    <option value="Public">Public Holiday</option>
                                    <option value="Optional">Optional Holiday</option>
                                    <option value="Company">Company Holiday</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={holidayForm.description}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition resize-none"
                                    rows="3"
                                    placeholder="Optional description"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowHolidayModal(false)}
                                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveHoliday}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition flex items-center justify-center gap-2"
                            >
                                <Save size={16} />
                                {editingHoliday ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => {
                        setShowBulkUploadModal(false);
                        setUploadFile(null);
                        setUploadPreview(null);
                        setUploadErrors([]);
                        setUploadSummary(null);
                    }}></div>
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                    <FileSpreadsheet className="text-emerald-500" size={24} />
                                    Bulk Holiday Upload
                                </h3>
                                <p className="text-xs font-bold text-slate-400 mt-2">
                                    Upload Excel file (.xlsx, .xls) with columns: Name, Date, Type (optional), Description (optional)
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowBulkUploadModal(false);
                                    setUploadFile(null);
                                    setUploadPreview(null);
                                    setUploadErrors([]);
                                    setUploadSummary(null);
                                }}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {!uploadPreview ? (
                            <div className="space-y-6">
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center hover:border-emerald-500 transition-colors">
                                    <input
                                        type="file"
                                        id="bulk-upload-file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <label htmlFor="bulk-upload-file" className="cursor-pointer">
                                        <Upload size={48} className="mx-auto text-slate-400 mb-4" />
                                        <div className="text-lg font-black text-slate-600 dark:text-slate-300 mb-2">
                                            Click to upload or drag and drop
                                        </div>
                                        <div className="text-sm font-bold text-slate-400">
                                            Excel files (.xlsx, .xls) up to 5MB
                                        </div>
                                        {uploadFile && (
                                            <div className="mt-4 text-sm font-bold text-emerald-600">
                                                Selected: {uploadFile.name}
                                            </div>
                                        )}
                                    </label>
                                </div>

                                {uploadFile && (
                                    <button
                                        onClick={handlePreviewUpload}
                                        disabled={uploading}
                                        className="w-full px-6 py-4 bg-emerald-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <FileSpreadsheet size={20} />
                                                Preview Upload
                                            </>
                                        )}
                                    </button>
                                )}

                                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl p-4">
                                    <div className="text-sm font-black text-blue-800 dark:text-blue-200 mb-2">File Format:</div>
                                    <div className="text-xs font-bold text-blue-700 dark:text-blue-300 space-y-1">
                                        <div>Row 1: Header (will be skipped)</div>
                                        <div>Columns: Name | Date | Type (optional) | Description (optional)</div>
                                        <div>Example: "Diwali" | "01-11-2024" | "Festival" | "Hindu festival"</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Summary */}
                                {uploadSummary && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4">
                                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">New</div>
                                            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{uploadSummary.new}</div>
                                        </div>
                                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
                                            <div className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Duplicates</div>
                                            <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{uploadSummary.duplicates}</div>
                                        </div>
                                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl p-4">
                                            <div className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Errors</div>
                                            <div className="text-2xl font-black text-rose-700 dark:text-rose-300">{uploadSummary.errors}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Preview Table */}
                                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                    <div className="overflow-x-auto max-h-96">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                {uploadPreview.map((holiday, idx) => (
                                                    <tr key={idx} className={`${holiday.isDuplicate ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            {holiday.isDuplicate ? (
                                                                <div className="flex items-center gap-2 text-amber-600">
                                                                    <AlertTriangle size={14} />
                                                                    <span className="text-[10px] font-black">Duplicate</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-emerald-600">
                                                                    <CheckCircle size={14} />
                                                                    <span className="text-[10px] font-black">New</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white">{holiday.name}</td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                            {new Date(holiday.date).toLocaleDateString('en-US', {
                                                                year: 'numeric', month: 'short', day: 'numeric'
                                                            })}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded text-xs font-black uppercase">
                                                                {holiday.type || 'Public'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                            {holiday.description || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Errors */}
                                {uploadErrors && uploadErrors.length > 0 && (
                                    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-2xl p-4">
                                        <div className="text-sm font-black text-rose-800 dark:text-rose-200 mb-2">Errors:</div>
                                        <div className="space-y-1">
                                            {uploadErrors.map((err, idx) => (
                                                <div key={idx} className="text-xs font-bold text-rose-700 dark:text-rose-300">
                                                    Row {err.row}: {err.error}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setUploadPreview(null);
                                            setUploadFile(null);
                                            setUploadSummary(null);
                                        }}
                                        className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmUpload}
                                        disabled={uploading || !uploadPreview || uploadSummary?.new === 0}
                                        className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                Confirm & Save ({uploadSummary?.new || 0} holidays)
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

