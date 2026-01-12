import React, { useState, useEffect } from 'react';
import { Table, message, Select, Checkbox, Button, DatePicker, Tag, Tooltip, Drawer, Statistic, Row, Col, Space, Modal, Descriptions, Avatar, Progress, Card, Divider, Empty, Spin, Popconfirm } from 'antd';
import { PlayCircle, Calculator, FileText, AlertCircle, IndianRupee, Calendar, Eye, CheckCircle, Download, FileJson, AlertTriangle, Zap } from 'lucide-react';
import api from '../../../utils/api';
import dayjs from 'dayjs';

const { Option } = Select;

const ProcessPayroll = () => {
    const [month, setMonth] = useState(dayjs());
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [calculating, setCalculating] = useState(false);
    const [previews, setPreviews] = useState({}); // { empId: { gross, net, error } }
    const [detailDrawer, setDetailDrawer] = useState({ visible: false, empId: null });
    const [detailData, setDetailData] = useState(null);
    const [payrollRunning, setPayrollRunning] = useState(false);
    const [payrollResult, setPayrollResult] = useState(null);
    const [showPayslipsModal, setShowPayslipsModal] = useState(false);
    const [allPreviews, setAllPreviews] = useState([]);

    // Fetch Templates on Mount
    useEffect(() => {
        api.get('/payroll/salary-templates')
            .then(res => setTemplates(res.data?.data || []))
            .catch(err => console.error("Failed templates", err));
    }, []);

    // Fetch Employees when month changes
    useEffect(() => {
        if (!month) return;
        fetchEmployees();
        setPreviews({});
        setSelectedRowKeys([]);
    }, [month]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const mStr = month.format('YYYY-MM');
            const res = await api.get(`/payroll/process/employees?month=${mStr}`);
            setEmployees(res.data.data.map(e => ({
                ...e,
                key: e._id,
                // Default to assigned template, or none
                selectedTemplateId: e.salaryTemplateId
            })));
        } catch (err) {
            message.error(err.response?.data?.message || "Failed to fetch employees");
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateChange = (empId, val) => {
        setEmployees(prev => prev.map(e => e._id === empId ? { ...e, selectedTemplateId: val } : e));
        // Trigger preview recalculation for this employee? 
        // We can do it in bulk or single. Let's do single immediately or user clicks "Preview"
        // Let's clear preview for this employee to indicate stale data
        setPreviews(prev => {
            const next = { ...prev };
            delete next[empId];
            return next;
        });
    };

    const calculatePreview = async () => {
        const itemsToPreview = employees
            .filter(e => selectedRowKeys.includes(e._id))
            .filter(e => e.selectedTemplateId) // Only those with templates
            .map(e => ({ employeeId: e._id, salaryTemplateId: e.selectedTemplateId }));

        if (itemsToPreview.length === 0) {
            message.warning("Select employees with templates assigned to preview");
            return;
        }

        setCalculating(true);
        try {
            const res = await api.post('/payroll/process/preview', {
                month: month.format('YYYY-MM'),
                items: itemsToPreview
            });

            console.log('Preview Response:', res.data.data);
            
            const newPreviews = {};
            res.data.data.forEach(p => {
                newPreviews[p.employeeId] = p;
            });
            setPreviews(newPreviews);
            message.success(`Calculated successfully for ${itemsToPreview.length} employee(s)`);
        } catch (err) {
            console.error('Calculation Error:', err);
            message.error(err.response?.data?.message || "Calculation failed");
        } finally {
            setCalculating(false);
        }
    const fetchPreviewForEmployee = async (emp) => {
        if (!emp.selectedTemplateId) {
            message.warning('Select a template for this employee first');
            return;
        }

        try {
            const res = await api.post('/payroll/process/preview', {
                month: month.format('YYYY-MM'),
                items: [{ employeeId: emp._id, salaryTemplateId: emp.selectedTemplateId }]
            });

            const p = res.data.data && res.data.data[0];
            setPreviews(prev => ({ ...prev, [emp._id]: p }));
            setDetailData(p);
            setDetailDrawer({ visible: true, empId: emp._id });
        } catch (err) {
            message.error('Failed to fetch preview');
        }
    };

    const runPayroll = async () => {
    const itemsToProcess = employees
        .filter(e => selectedRowKeys.includes(e._id))
        .filter(e => e.selectedTemplateId)
        .map(e => ({
            employeeId: e._id,
            salaryTemplateId: e.selectedTemplateId
        }));

    if (itemsToProcess.length === 0) {
        message.error("No valid employees selected");
        return;
    }

    if (!window.confirm(
        `Are you sure you want to process payroll for ${itemsToProcess.length} employees for ${month.format('MMMM YYYY')}?`
    )) return;

    setPayrollRunning(true);
    try {
        const response = await api.post('/payroll/process/run', {
            month: month.format('YYYY-MM'),
            items: itemsToProcess
        });

        const result = response.data.data;
        setPayrollResult(result);
        setSelectedRowKeys([]);
        setPreviews({});
        
        message.success(`Payroll processed successfully! ${result.processedEmployees} employees processed.`);
        
        // Refresh employee list
        await fetchEmployees();
    } catch (err) {
        message.error(err.response?.data?.message || "Payroll run failed");
        console.error("Payroll error:", err);
    } finally {
        setPayrollRunning(false);
    }
};

    const columns = [
        {
            title: 'Employee',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div className="flex items-center gap-3">
                    <Avatar size={36} style={{ backgroundColor: '#f0f2f5' }}>{(record.firstName || record.name || '').charAt(0)}</Avatar>
                    <div>
                        <div className="font-medium text-slate-800">{text}</div>
                        <div className="text-xs text-slate-500">{record.department} • {record.employeeId || ''}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Attendance',
            key: 'attendance',
            render: (_, record) => (
                <div className="text-xs">
                    <div>Present: <span className="font-bold text-green-600">{record.attendanceParams?.presentDays}</span> / {record.attendanceParams?.totalDays}</div>
                    {record.attendanceParams?.presentDays === 0 && <Tag color="red" className="mt-1">High Absenteeism</Tag>}
                </div>
            )
        },
        {
            title: 'Preview (Net Pay)',
            key: 'preview',
            width: 250,
            render: (_, record) => {
                const prev = previews[record._id];
                if (!prev) {
                    return (
                        <Tooltip title="Select this employee and click 'Calculate Preview' to see salary details">
                            <span className="text-slate-400 italic text-xs">--</span>
                        </Tooltip>
                    );
                }
                if (prev.error) return (
                    <Tooltip title={prev.error}>
                        <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-600">Error</span>
                        </div>
                    </Tooltip>
                );
                return (
                    <div className="space-y-1 bg-emerald-50 p-2 rounded">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-medium">Basic:</span>
                            <span className="font-mono font-semibold text-slate-800">₹{Math.round(prev.gross || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-medium">Net Pay:</span>
                            <span className="font-mono font-bold text-emerald-700">₹{Math.round(prev.net || 0).toLocaleString()}</span>
                        </div>
                        <Button 
                            size="small" 
                            type="text"
                            onClick={() => { 
                                setDetailData(prev); 
                                setDetailDrawer({ visible: true, empId: record._id }); 
                            }} 
                            icon={<Eye size={14} />}
                            className="mt-1 text-blue-600 hover:text-blue-700 h-6"
                        >
                            Details
                        </Button>
                    </div>
                );
            }
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => {
                if (!record.selectedTemplateId) return <Tag color="warning">Missing Template</Tag>;
                // Could add more status logic here
                return <Tag color="blue">Ready</Tag>;
            }
        }
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="w-6 h-6 text-blue-600" />
                        Process Payroll
                    </h1>
                    <p className="text-sm text-slate-500">Calculate and generate payslips for a specific month.</p>
                </div>
                <div className="flex items-center gap-4">
                    <DatePicker
                        picker="month"
                        value={month}
                        onChange={setMonth}
                        format="MMMM YYYY"
                        allowClear={false}
                        className="w-48"
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Employee List ({employees.length})</h3>
                    <div className="flex gap-4 items-center">
                        <Space>
                            <Button
                                icon={<IndianRupee size={16} />}
                                onClick={calculatePreview}
                                loading={calculating}
                                disabled={selectedRowKeys.length === 0}
                            >
                                Calculate Preview
                            </Button>
                            <Button
                                type="primary"
                                icon={<PlayCircle size={16} />}
                                onClick={runPayroll}
                                loading={payrollRunning}
                                disabled={selectedRowKeys.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                Run Payroll
                            </Button>
                        </Space>
                        <div className="ml-4 flex items-center gap-3">
                            <Tag color="blue">Selected: {selectedRowKeys.length}</Tag>
                            <Tag color="green">Previews: {Object.keys(previews).length}</Tag>
                        </div>
                    </div>
                </div>

                <Table
                    rowSelection={rowSelection}
                    columns={columns}
                    dataSource={employees}
                    loading={loading}
                    pagination={{ pageSize: 50 }}
                    size="middle"
                />
            </div>

            {/* Payroll Result Modal */}
            <Modal
                title={`Payroll Run Results — ${month.format('MMMM YYYY')}`}
                open={!!payrollResult}
                onCancel={() => setPayrollResult(null)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setPayrollResult(null)}>
                        Close
                    </Button>
                ]}
                width={800}
            >
                {payrollResult && (
                    <div className="space-y-6">
                        <Row gutter={24}>
                            <Col span={8}>
                                <Card className="text-center">
                                    <Statistic
                                        title="Total Employees"
                                        value={payrollResult.totalEmployees || 0}
                                        prefix={<Calculator size={16} />}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card className="text-center">
                                    <Statistic
                                        title="Processed"
                                        value={payrollResult.processedEmployees || 0}
                                        suffix={<CheckCircle size={16} className="text-green-600" />}
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card className="text-center">
                                    <Statistic
                                        title="Failed"
                                        value={payrollResult.failedEmployees || 0}
                                        suffix={payrollResult.failedEmployees > 0 ? <AlertTriangle size={16} className="text-red-600" /> : ''}
                                        valueStyle={{ color: payrollResult.failedEmployees > 0 ? '#ff4d4f' : '#1890ff' }}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        <Divider />

                        <Row gutter={24}>
                            <Col span={12}>
                                <Card>
                                    <Statistic
                                        title="Total Gross Earnings"
                                        value={Math.round(payrollResult.totalGross || 0)}
                                        prefix="₹"
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card>
                                    <Statistic
                                        title="Total Net Payable"
                                        value={Math.round(payrollResult.totalNetPay || 0)}
                                        prefix="₹"
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        {payrollResult.errors && payrollResult.errors.length > 0 && (
                            <>
                                <Divider />
                                <Card className="bg-red-50 border-red-300">
                                    <h4 className="font-semibold text-red-800 mb-3">Processing Errors</h4>
                                    <div className="space-y-2">
                                        {payrollResult.errors.map((err, idx) => (
                                            <div key={idx} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                                                <strong>Employee:</strong> {err.employeeId} — {err.message}
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </>
                        )}
                    </div>
                )}
            </Modal>

            {/* Payslip Preview Drawer */}
            <Drawer
                width={720}
                title={detailData ? `Payslip Preview — ${detailData.employeeInfo?.employeeId || ''}` : 'Payslip Preview'}
                placement="right"
                onClose={() => { setDetailDrawer({ visible: false, empId: null }); setDetailData(null); }}
                open={detailDrawer.visible}
            >
                {detailData ? (
                    <Spin spinning={false} className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-lg mb-3">Employee Details</h4>
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Employee ID">{detailData.employeeInfo?.employeeId || '--'}</Descriptions.Item>
                                <Descriptions.Item label="Name">{detailData.employeeInfo?.name || '--'}</Descriptions.Item>
                                <Descriptions.Item label="Department">{detailData.employeeInfo?.department || '--'}</Descriptions.Item>
                                <Descriptions.Item label="Designation">{detailData.employeeInfo?.designation || '--'}</Descriptions.Item>
                            </Descriptions>
                        </div>

                        <Divider />

                        <Row gutter={16}>
                            <Col span={12}>
                                <Card className="text-center">
                                    <Statistic 
                                        title="Gross Earnings" 
                                        value={Math.round(detailData.grossEarnings || 0)} 
                                        prefix="₹" 
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card className="text-center">
                                    <Statistic 
                                        title="Net Pay" 
                                        value={Math.round(detailData.netPay || 0)} 
                                        prefix="₹" 
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        <div>
                            <h4 className="font-semibold mb-3">Attendance Summary</h4>
                            <Descriptions bordered column={2} size="small">
                                <Descriptions.Item label="Total Days">{detailData.attendanceSummary?.totalDays || '--'}</Descriptions.Item>
                                <Descriptions.Item label="Present Days">{detailData.attendanceSummary?.presentDays || '--'}</Descriptions.Item>
                                <Descriptions.Item label="Leave Days">{detailData.attendanceSummary?.leaveDays || '--'}</Descriptions.Item>
                                <Descriptions.Item label="LOP Days">{detailData.attendanceSummary?.lopDays || '--'}</Descriptions.Item>
                            </Descriptions>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-3">Earnings</h4>
                            {detailData.earningsSnapshot && detailData.earningsSnapshot.length > 0 ? (
                                <Table
                                    size="small"
                                    dataSource={detailData.earningsSnapshot}
                                    pagination={false}
                                    rowKey={(r, i) => `${r.name}-${i}`}
                                    columns={[
                                        { title: 'Component', dataIndex: 'name', width: '60%' },
                                        { title: 'Amount', dataIndex: 'amount', render: a => `₹${(a || 0).toLocaleString()}`, align: 'right' }
                                    ]}
                                />
                            ) : (
                                <Empty description="No earnings data" />
                            )}
                        </div>

                        <div>
                            <h4 className="font-semibold mb-3">Pre-Tax Deductions</h4>
                            {detailData.preTaxDeductionsSnapshot && detailData.preTaxDeductionsSnapshot.length > 0 ? (
                                <Table
                                    size="small"
                                    dataSource={detailData.preTaxDeductionsSnapshot}
                                    pagination={false}
                                    rowKey={(r, i) => `pre-${r.name || i}`}
                                    columns={[
                                        { title: 'Name', dataIndex: 'name', width: '60%' },
                                        { title: 'Amount', dataIndex: 'amount', render: a => `₹${(a || 0).toLocaleString()}`, align: 'right' }
                                    ]}
                                />
                            ) : (
                                <Empty description="No pre-tax deductions" />
                            )}
                        </div>

                        <div>
                            <h4 className="font-semibold mb-3">Taxable Income & Tax</h4>
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Taxable Income">₹{(detailData.taxableIncome || 0).toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Income Tax (TDS)">₹{(detailData.incomeTax || 0).toLocaleString()}</Descriptions.Item>
                                {detailData.tdsSnapshot && (
                                    <>
                                        <Descriptions.Item label="Annual Taxable Income">₹{(detailData.tdsSnapshot.annualTaxable || 0).toLocaleString()}</Descriptions.Item>
                                        <Descriptions.Item label="Annual Tax">₹{(detailData.tdsSnapshot.annualTax || 0).toLocaleString()}</Descriptions.Item>
                                    </>
                                )}
                            </Descriptions>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-3">Post-Tax Deductions</h4>
                            {detailData.postTaxDeductionsSnapshot && detailData.postTaxDeductionsSnapshot.length > 0 ? (
                                <Table
                                    size="small"
                                    dataSource={detailData.postTaxDeductionsSnapshot}
                                    pagination={false}
                                    rowKey={(r, i) => `post-${r.name || i}`}
                                    columns={[
                                        { title: 'Name', dataIndex: 'name', width: '60%' },
                                        { title: 'Amount', dataIndex: 'amount', render: a => `₹${(a || 0).toLocaleString()}`, align: 'right' }
                                    ]}
                                />
                            ) : (
                                <Empty description="No post-tax deductions" />
                            )}
                        </div>

                        {detailData.employerContributionsSnapshot && detailData.employerContributionsSnapshot.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-3">Employer Contributions</h4>
                                <Table
                                    size="small"
                                    dataSource={detailData.employerContributionsSnapshot}
                                    pagination={false}
                                    rowKey={(r, i) => `employer-${r.name || i}`}
                                    columns={[
                                        { title: 'Name', dataIndex: 'name', width: '60%' },
                                        { title: 'Amount', dataIndex: 'amount', render: a => `₹${(a || 0).toLocaleString()}`, align: 'right' }
                                    ]}
                                />
                            </div>
                        )}
                    </Spin>
                ) : (
                    <Empty description="No preview available" />
                )}
            </Drawer>
        </div>
    );
};
}

export default ProcessPayroll;
