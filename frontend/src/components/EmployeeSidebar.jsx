import React, { useState } from 'react';
import { LayoutDashboard, Calendar, FileText, User, RefreshCw, ChevronDown, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ICONS = {
    dashboard: <LayoutDashboard size={20} />,
    leaves: <Calendar size={20} />,
    regularization: <RefreshCw size={20} />,
    payslips: <FileText size={20} />,
    profile: <User size={20} />,
    team: <Users size={20} />,
    chevronDown: <ChevronDown size={16} />
};

export default function EmployeeSidebar({ activeTab, setActiveTab, onClose }) {
    const { user } = useAuth();
    const isManager = user?.role === 'manager';

    const [expandedGroups, setExpandedGroups] = useState({
        Overview: true,
        Leave: true,
        Payroll: true,
        Team: true,
        Settings: true
    });

    const NAV_GROUPS = [
        {
            title: 'Overview',
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard }
            ]
        },
        {
            title: 'Attendance',
            items: [
                { id: 'attendance', label: 'My Attendance', icon: ICONS.dashboard },
                { id: 'regularization', label: 'Regularization', icon: ICONS.regularization }
            ]
        },
        {
            title: 'Leave',
            items: [
                { id: 'leaves', label: 'My Leaves', icon: ICONS.leaves }
            ]
        },
        ...(isManager ? [{
            title: 'Team Management',
            id: 'Team',
            items: [
                { id: 'team-attendance', label: 'Team Attendance', icon: ICONS.dashboard },
                { id: 'team-leaves', label: 'Team Leaves', icon: ICONS.team },
                { id: 'team-regularization', label: 'Team Approval', icon: ICONS.regularization }
            ]
        }] : []),
        {
            title: 'Payroll',
            items: [
                { id: 'payslips', label: 'My Payslips', icon: ICONS.payslips }
            ]
        },
        {
            title: 'Settings',
            items: [
                { id: 'profile', label: 'My Profile', icon: ICONS.profile }
            ]
        }
    ];

    const toggleGroup = (title) => {
        setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const handleTabClick = (id) => {
        setActiveTab(id);
        if (onClose) onClose();
    };

    return (
        <aside className="w-full h-full bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shadow-xl overflow-hidden">

            {/* Header / Brand */}
            <div className="p-5 border-b border-slate-800 flex-shrink-0">
                <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    {isManager ? 'Manager Portal' : 'Employee Portal'}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1 font-semibold">
                    {isManager ? 'Team & Self Service' : 'Self-Service'}
                </p>
            </div>

            {/* Navigation Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
                {NAV_GROUPS.map((group) => {
                    const groupTitle = group.title;
                    const groupKey = group.id || group.title;
                    const isExpanded = expandedGroups[groupKey];

                    return (
                        <div key={groupKey}>
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(groupKey)}
                                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-3 hover:text-slate-300 transition-colors"
                            >
                                <span>{groupTitle}</span>
                                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={14} />
                                </span>
                            </button>

                            {/* Group Items */}
                            <div className={`space-y-1 transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                {group.items.map((item) => {
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleTabClick(item.id)}
                                            className={`relative w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-all duration-200 group overflow-hidden
                            ${isActive
                                                    ? 'bg-slate-800 text-white shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                                }`}
                                        >
                                            {/* Active Border Indicator */}
                                            {isActive && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-md" />
                                            )}

                                            <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                                {item.icon}
                                            </div>
                                            <span className={`font-medium ${isActive ? 'translate-x-1' : ''} transition-transform`}>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Info */}
            <div className="p-4 border-t border-slate-800 text-xs text-slate-600 flex-shrink-0">
                <div className="flex items-center justify-center">
                    <span>&copy; {new Date().getFullYear()} Enterprise HRMS</span>
                </div>
            </div>
        </aside>
    );
}

