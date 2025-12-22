import React, { useState, useEffect } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';
import {
  CheckCircle, XCircle, Search, Filter,
  Calendar, User, Clock, AlertCircle, FileText
} from '../../components/Icons';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All, Pending, Approved, Rejected
  const [searchTerm, setSearchTerm] = useState('');

  // Action Modal
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState(null); // 'Approved' | 'Rejected'
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hr/leaves');
      setLeaves(res.data);
    } catch (err) {
      console.error("Failed to fetch leaves", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedLeave || !actionType) return;

    try {
      setProcessing(true);
      const payload = { status: actionType };
      if (actionType === 'Rejected') {
        payload.rejectionReason = rejectionReason;
      }

      await api.post(`/hr/leaves/${selectedLeave._id}/action`, payload);

      // Refresh list
      await fetchLeaves();

      // Close modal
      setSelectedLeave(null);
      setActionType(null);
      setRejectionReason('');
    } catch (err) {
      alert("Failed to update status");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (leave, type) => {
    setSelectedLeave(leave);
    setActionType(type);
    setRejectionReason('');
  };

  // Filter logic
  const filteredLeaves = leaves.filter(l => {
    const matchesFilter = filter === 'All' || l.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      l.employee?.firstName?.toLowerCase().includes(searchLower) ||
      l.employee?.lastName?.toLowerCase().includes(searchLower) ||
      l.employee?.employeeId?.toLowerCase().includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage employee leave requests</p>
        </div>
        <div className="flex gap-3">
          {/* Stats cards could go here */}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filter === s
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading requests...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p>No leave requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium uppercas text-xs">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeaves.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((leave) => {
                  const start = formatDateDDMMYYYY(leave.startDate);
                  const end = formatDateDDMMYYYY(leave.endDate);
                  const showActions = leave.status === 'Pending';

                  return (
                    <tr key={leave._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {leave.employee?.firstName?.[0] || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {leave.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {leave.employee?.employeeId || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200">
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs">
                          <span className="font-medium text-gray-700">{start}</span>
                          <span className="text-gray-400">to</span>
                          <span className="font-medium text-gray-700">{end}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600 truncate max-w-[200px]" title={leave.reason}>
                          {leave.reason || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {showActions && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openActionModal(leave, 'Approved')}
                              className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openActionModal(leave, 'Rejected')}
                              className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        {!showActions && leave.status === 'Rejected' && leave.rejectionReason && (
                          <span className="text-xs text-red-500 italic" title={leave.rejectionReason}>
                            Reason: {leave.rejectionReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filteredLeaves.length > pageSize && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={filteredLeaves.length}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {actionType === 'Approved' ? 'Approve Request' : 'Reject Request'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to {actionType?.toLowerCase()} the leave request for
                <span className="font-medium text-gray-700 ml-1">
                  {selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}
                </span>?
              </p>

              {actionType === 'Rejected' && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Rejection</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    rows="3"
                    placeholder="Briefly explain why..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedLeave(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={processing}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all
                    ${actionType === 'Approved'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                    }
                    ${processing ? 'opacity-70 cursor-not-allowed' : ''}
                  `}
                >
                  {processing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
