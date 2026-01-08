import React, { useState, useContext } from 'react';
import HRSidebar from '../components/HRSidebar';
import SidebarCompanyBlock from '../components/SidebarCompanyBlock';
import NotificationDropdown from '../components/NotificationDropdown';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UIContext } from '../context/UIContext';

export default function HRLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const uiContext = useContext(UIContext);
  const { theme, toggleTheme } = uiContext || { theme: 'light', toggleTheme: () => { } };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed w-64 md:w-72 h-screen transform transition-transform duration-300 ease-in-out z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <HRSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full md:ml-72 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 md:p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition flex-shrink-0"
              title="Go Back"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 truncate">HRMS SaaS</div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
            <SidebarCompanyBlock />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden lg:block"></div>
            <NotificationDropdown />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden lg:block"></div>
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition flex-shrink-0"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="px-2 sm:px-3 py-1.5 sm:py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition text-xs sm:text-sm whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-3 md:p-6 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

