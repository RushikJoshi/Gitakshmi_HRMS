import React, { useState, useEffect, useContext } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import EmployeeSidebar from '../components/EmployeeSidebar';
import NotificationDropdown from '../components/NotificationDropdown';
import SidebarCompanyBlock from '../components/SidebarCompanyBlock';
import { useAuth } from '../context/AuthContext';
import { UIContext } from '../context/UIContext';
import { Sun, Moon, LogOut, Menu, ArrowLeft } from 'lucide-react';

export default function EssLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);

  const uiContext = useContext(UIContext);
  const { theme, toggleTheme } = uiContext || { theme: 'light', toggleTheme: () => { } };

  useEffect(() => {
    if (user) {
      api.get('/employee/profile').then(res => setProfile(res.data)).catch(() => { });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : user?.name || 'Employee';

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed on desktop */}
      <div className={`fixed w-64 h-screen transform transition-transform duration-300 ease-in-out z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <EmployeeSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (window.location.pathname !== '/employee') navigate('/employee');
          }}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col w-full md:ml-64 min-h-screen overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center p-3 md:p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300"
              title="Go Back"
            >
              <ArrowLeft size={24} />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white hidden md:block">
              Portal
            </h2>
          </div>

          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center gap-4 ml-auto">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                title="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-600" />
                )}
              </button>

              {/* Notification Center */}
              <div className="flex items-center gap-2">
                <NotificationDropdown />
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
              </div>

              {/* Profile & Logout Group */}
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-none capitalize">{fullName}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{user?.role}</p>
                  </div>

                  {/* Avatar / Profile Img */}
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white dark:border-slate-700 shadow-md flex items-center justify-center text-white font-black text-sm overflow-hidden ring-2 ring-slate-100 dark:ring-slate-800">
                    {profile?.profilePic ? (
                      <img src={profile.profilePic} alt="profile" className="w-full h-full object-cover" />
                    ) : (
                      <span>{fullName?.[0]?.toUpperCase() || 'E'}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="ml-2 p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 group"
                  title="Logout"
                >
                  <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-3 md:p-4">
          <Outlet context={{ activeTab, setActiveTab }} />
        </main>
      </div>
    </div>
  );
}

