import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const ICONS = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
    </svg>
  ),
  employees: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 11a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  departments: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21V7a2 2 0 012-2h14a2 2 0 012 2v14M16 3v4M8 3v4" />
    </svg>
  ),
  org: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h6M3 12h6M3 17h6M11 7h10M11 12h10M11 17h10" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  leaveRequests: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  leavePolicies: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  requirements: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  applicants: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
    </svg>
  ),
  templates: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
  ),
  access: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  )
};

const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      { to: '/hr', label: 'Dashboard', icon: ICONS.dashboard, end: true }
    ]
  },
  {
    title: 'People',
    items: [
      { to: '/hr/employees', label: 'Employees', icon: ICONS.employees },
      { to: '/hr/departments', label: 'Departments', icon: ICONS.departments },
      { to: '/hr/org', label: 'Org Structure', icon: ICONS.org },
      { to: '/hr/users', label: 'User Management', icon: ICONS.users }
    ]
  },
  {
    title: 'Attendance',
    items: [
      { to: '/hr/attendance', label: 'Attendance Dashboard', icon: ICONS.dashboard },
      { to: '/hr/attendance-calendar', label: 'Calendar Management', icon: ICONS.calendar },
      { to: '/hr/attendance/correction', label: 'Attendance Correction', icon: ICONS.access }
    ]
  },
  {
    title: 'Leave',
    items: [
      { to: '/hr/leave-approvals', label: 'Leave Requests', icon: ICONS.leaveRequests },
      { to: '/hr/leave-approvals/regularization', label: 'Leave Correction', icon: ICONS.access },
      { to: '/hr/leave-policies', label: 'Leave Policies', icon: ICONS.leavePolicies }
    ]
  },
  {
    title: 'Hiring',
    items: [
      { to: '/hr/requirements', label: 'Requirements', icon: ICONS.requirements },
      { to: '/hr/applicants', label: 'Applicants', icon: ICONS.applicants }
    ]
  },
  {
    title: 'Configuration',
    items: [
      {
        label: 'Templates',
        icon: ICONS.templates,
        children: [
          { to: '/hr/offer-templates', label: 'Offer Letter' },
          { to: '/hr/joining-templates', label: 'Joining Letter' }
        ]
      },
      { to: '/hr/access', label: 'Access Control', icon: ICONS.access }
    ]
  }
];

export default function HRSidebar() {
  const [expandedGroups, setExpandedGroups] = useState({
    Overview: true,
    People: true,
    Attendance: true,
    Leave: true,
    Hiring: true,
    Configuration: true
  });

  const toggleGroup = (title) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="w-full h-full bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shadow-xl overflow-hidden">

      {/* Header / Brand */}
      <div className="p-5 border-b border-slate-800 flex-shrink-0">
        <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Company Admin
        </div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1 font-semibold">Human Resources</p>
      </div>

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.title)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-3 hover:text-slate-300 transition-colors"
            >
              <span>{group.title}</span>
              <span className={`transform transition-transform duration-200 ${expandedGroups[group.title] ? 'rotate-180' : ''}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            {/* Group Items */}
            <div className={`space-y-1 transition-all duration-300 ease-in-out overflow-hidden ${expandedGroups[group.title] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              {group.items.map((item) => (
                <SidebarItem key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info (Optional) */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-600 flex-shrink-0">
        &copy; {new Date().getFullYear()} Enterprise HRMS
      </div>
    </aside>
  );
}

function SidebarItem({ item }) {
  const location = useLocation();

  // Check if any child is active to auto-expand
  const isChildActive = item.children
    ? item.children.some(child => location.pathname === child.to)
    : false;

  const [isOpen, setIsOpen] = useState(isChildActive);

  // If a child becomes active later, ensure we visually reflect it (though we set state above on mount/update)
  // Re-syncing state with prop changes in React is usually an effect, but derived state is cleaner if sufficient.
  // Actually, standard pattern:
  // if (isChildActive && !isOpen) setIsOpen(true); -> causes loop without effect.
  // Given Sidebar is usually persistent, standard useState init is mostly effectively only on mount.
  // BUT: if I navigate away and back, 'isChildActive' changes.
  // Let's rely on isChildActive for highlighting, and isOpen for collapsing.
  // I will leave it as initialized.

  if (item.children) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between py-2 px-3 rounded-md text-sm transition-all duration-200 group
            ${isChildActive || isOpen ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`${isChildActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
              {item.icon}
            </div>
            <span className="font-medium">{item.label}</span>
          </div>
          <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            {ICONS.chevronDown}
          </div>
        </button>

        {/* Child Items */}
        {isOpen && (
          <div className="pl-10 space-y-1">
            {item.children.map(child => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  `block py-1.5 px-2 text-xs rounded transition-colors ${isActive
                    ? 'text-blue-400 font-medium'
                    : 'text-slate-500 hover:text-slate-300'
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Regular Link
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `relative w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-all duration-200 group overflow-hidden
        ${isActive
          ? 'bg-slate-800 text-white shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active Border Indicator */}
          {isActive && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-md" />
          )}

          <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
            {item.icon}
          </div>
          <span className={`font-medium ${isActive ? 'translate-x-1' : ''} transition-transform`}>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
