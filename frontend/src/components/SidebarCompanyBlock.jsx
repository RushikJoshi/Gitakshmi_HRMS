import React, { useEffect, useState, useRef } from 'react';
import api from '../utils/api';

export default function SidebarCompanyBlock() {
  const [tenant, setTenant] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    api.get('/tenants/me').then(res => { if (mounted) setTenant(res.data); }).catch(() => { });
    return () => { mounted = false; };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const name = tenant?.name || 'Company';
  const code = tenant?.code || '';
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition select-none text-left"
        type="button"
      >
        <div className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-semibold text-xs md:text-sm shadow-sm border border-slate-200 dark:border-slate-600">
          {initials || 'HR'}
        </div>

        {/* Desktop View: Name & Code */}
        <div className="hidden md:block">
          <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 leading-tight max-w-[200px] truncate">
            {name}
          </div>
          {code && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {code}
            </div>
          )}
        </div>

        <svg
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform hidden md:block ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 md:right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 transform origin-top-right transition-all">
          {/* Mobile Info Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 md:hidden bg-slate-50 dark:bg-slate-900/50">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</p>
            {code && <p className="text-xs text-slate-500">{code}</p>}
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowProfile(true);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Company Profile
            </button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden transform animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Company Identity</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Tenant Information System</p>
                </div>
                <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="h-16 w-16 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-black text-xl shadow-inner border border-sky-200">
                    {initials}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Name</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company Code</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-indigo-400 font-mono tracking-wider">{code || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded uppercase tracking-widest border border-emerald-200">Active</span>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Admin Contact</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{tenant?.adminEmail || 'contact@company.com'}</p>
                </div>
              </div>

              <button
                onClick={() => setShowProfile(false)}
                className="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all active:scale-95"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
