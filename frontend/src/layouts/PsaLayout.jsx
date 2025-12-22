import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { useAuth } from "../context/AuthContext";
import logoSrc from "../assets/logonew.png";

export default function PsaLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // 🔐 PROTECT PSA ROUTE
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  // 🔴 LOGOUT
  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* SIDEBAR - desktop (dark theme) */}
      <aside className={`hidden sm:flex w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex-col flex-shrink-0 transition-all`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <img src={logoSrc} alt="logo" className="w-36" />
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLink to="/psa" end className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition ${isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            <i className="fa-solid fa-chart-line w-5 text-center opacity-90"></i>
            <span className="truncate">Dashboard</span>
          </NavLink>
          <NavLink to="/psa/companies" className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition ${isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            <i className="fa-solid fa-building w-5 text-center opacity-90"></i>
            <span className="truncate">Companies</span>
          </NavLink>
          <NavLink to="/psa/activities" className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition ${isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            <i className="fa-regular fa-clock w-5 text-center opacity-90"></i>
            <span className="truncate">Recent Activity</span>
          </NavLink>
          <NavLink to="/psa/modules" className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition ${isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
            <i className="fa-solid fa-sliders w-5 text-center opacity-90"></i>
            <span className="truncate">Module Configuration</span>
          </NavLink>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">SA</div>
            <div>
              <div className="text-sm font-bold text-white">Super Admin</div>
              <div className="text-xs text-slate-400">System Owner</div>
            </div>
          </div>
        </div>
      </aside>

      {/* SIDEBAR - mobile overlay (dark) */}
      <div className={`sm:hidden fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div className={`fixed inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)}></div>
        <aside className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-800 transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center px-6 border-b border-slate-800">
            <img src={logoSrc} alt="logo" className="w-36" />
          </div>
          <nav className="p-4 space-y-2">
            <NavLink to="/psa" end onClick={() => setOpen(false)} className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition ${isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
              <i className="fa-solid fa-chart-line w-5 text-center opacity-90"></i>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/psa/companies" onClick={() => setOpen(false)} className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition ${isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
              <i className="fa-solid fa-building w-5 text-center opacity-90"></i>
              <span>Companies</span>
            </NavLink>
            <NavLink to="/psa/activities" onClick={() => setOpen(false)} className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition ${isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
              <i className="fa-regular fa-clock w-5 text-center opacity-90"></i>
              <span>Recent Activity</span>
            </NavLink>
            <NavLink to="/psa/modules" onClick={() => setOpen(false)} className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition ${isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
              <i className="fa-solid fa-sliders w-5 text-center opacity-90"></i>
              <span>Module Configuration</span>
            </NavLink>
          </nav>
        </aside>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="p-2 rounded-md text-slate-600 hover:bg-slate-100 transition"
              title="Back to Login"
            >
              <i className="fa-solid fa-arrow-left text-lg"></i>
            </button>
            <button className="sm:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100" onClick={() => setOpen(true)} aria-label="Open menu">
              <i className="fa-solid fa-bars text-lg"></i>
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-800">Product Super Admin</h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="px-3 py-1 bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100">Logout</button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <Outlet />
        </div>

      </main>
    </div>
  );
}
