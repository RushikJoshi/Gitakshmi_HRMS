import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Plus, Edit2, Trash2, Copy, ArrowLeft, FileImage, FileText, X, File, Upload } from 'lucide-react';
import OfferLetterEditor from '../../components/editor/OfferLetterEditor';

export default function LetterTemplates() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [showTemplateTypeModal, setShowTemplateTypeModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [activeTab, setActiveTab] = useState('offer');
    const [selectedTemplateType, setSelectedTemplateType] = useState(null);

    // Editor State
    const [currentTemplate, setCurrentTemplate] = useState({
        name: '',
        type: 'offer',
        templateType: 'BLANK',
        bodyContent: '',
        headerContent: '',
        footerContent: '',
        headerHeight: 40,
        footerHeight: 30,
        hasHeader: true,
        hasFooter: true,
        contentJson: {},
        pageLayout: {
            orientation: 'portrait',
            margins: { top: 25, bottom: 25, left: 25, right: 25 }
        },
        isDefault: false,
        isActive: true
    });
    const [isEditing, setIsEditing] = useState(false);
    const [companyProfile, setCompanyProfile] = useState(null);
    const [hasLetterPad, setHasLetterPad] = useState(false);

    // Upload Modal State
    const [uploadForm, setUploadForm] = useState({
        name: '',
        version: 'v1.0',
        status: 'Active',
        file: null
    });

    async function fetchCompanyProfile() {
        try {
            const res = await api.get('/letters/company-profile');
            setCompanyProfile(res.data);
            const letterPadUrl = res.data?.branding?.letterheadBg || '';
            setHasLetterPad(!!letterPadUrl);
        } catch (error) {
            console.error('Failed to fetch company profile', error);
            setHasLetterPad(false);
        }
    }

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/letters/templates?type=${activeTab}`);
            setTemplates(res.data);
        } catch (error) {
            console.error('Failed to fetch templates', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchTemplates();
        fetchCompanyProfile();
    }, [activeTab, fetchTemplates]);

    const handleEdit = (tpl) => {
        if (tpl.templateType === 'WORD') {
            // For WORD templates, open upload modal to replace the template
            setUploadForm({
                name: tpl.name,
                version: tpl.version || 'v1.0',
                status: tpl.status || 'Active',
                file: null
            });
            setCurrentTemplate({ ...tpl }); // Store template ID for update
            setIsEditing(true); // Mark as editing mode
            setShowUploadModal(true);
            return;
        }
        setCurrentTemplate({
            ...tpl,
            templateType: tpl.templateType || 'BLANK',
            contentJson: tpl.contentJson || {},
            headerContent: tpl.headerContent || '',
            footerContent: tpl.footerContent || '',
            headerHeight: tpl.headerHeight || 40,
            footerHeight: tpl.footerHeight || 30,
            hasHeader: tpl.hasHeader !== false,
            hasFooter: tpl.hasFooter !== false,
            pageLayout: tpl.pageLayout || {
                orientation: 'portrait',
                margins: { top: 45, bottom: 40, left: 30, right: 25 }
            }
        });
        setIsEditing(true);
        setShowEditor(true);
    };

    const handleCreate = () => {
        setSelectedTemplateType(null);
        setShowTemplateTypeModal(true);
    };

    const handleTemplateTypeSelect = (type) => {
        console.log('Template type selected:', type);
        setSelectedTemplateType(type);
    };

    const handleContinueToEditor = () => {
        if (!selectedTemplateType) {
            alert('Please select a template type');
            return;
        }

        if (selectedTemplateType === 'WORD') {
            setShowTemplateTypeModal(false);
            setShowUploadModal(true);
            return;
        }

        if (activeTab !== 'offer') {
            alert('Editor templates are only available for Offer Letters.');
            return;
        }

        if (selectedTemplateType === 'LETTER_PAD' && !hasLetterPad) {
            const proceed = confirm(
                'No letter pad image found. The template will be created but will show a blank page until you upload a letter pad. Continue?'
            );
            if (!proceed) return;
        }

        setCurrentTemplate({
            name: '',
            type: activeTab,
            templateType: selectedTemplateType,
            bodyContent: '<p>Dear {{candidate_name}},</p><p>We are pleased to offer you the position of <strong>{{designation}}</strong>...</p>',
            headerContent: '',
            footerContent: '',
            headerHeight: 40,
            footerHeight: 30,
            hasHeader: true,
            hasFooter: true,
            contentJson: {},
            pageLayout: {
                orientation: 'portrait',
                margins: { top: 45, bottom: 40, left: 30, right: 25 }
            },
            isDefault: false,
            isActive: true
        });
        setIsEditing(false);
        setShowTemplateTypeModal(false);
        setShowEditor(true);
    };

    const handleUploadTemplate = async () => {
        if (!uploadForm.name || !uploadForm.file) {
            alert('Please fill all fields and select a file');
            return;
        }

        const formData = new FormData();
        formData.append('wordFile', uploadForm.file);
        formData.append('name', uploadForm.name);
        formData.append('version', uploadForm.version);
        formData.append('status', uploadForm.status);
        formData.append('type', activeTab); // Send the current tab type (offer or joining)
        formData.append('isDefault', currentTemplate?.isDefault ? 'true' : 'false');

        try {
            setLoading(true);
            
            if (isEditing && currentTemplate._id && currentTemplate.templateType === 'WORD') {
                // Delete old template and create new one (WORD templates are replaced, not updated)
                await api.delete(`/letters/templates/${currentTemplate._id}`);
            }
            
            await api.post('/letters/upload-word-template', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert(isEditing ? 'Word template updated successfully!' : 'Word template uploaded successfully!');
            setShowUploadModal(false);
            setUploadForm({ name: '', version: 'v1.0', status: 'Active', file: null });
            setIsEditing(false);
            setCurrentTemplate({
                name: '',
                type: 'offer',
                templateType: 'BLANK',
                bodyContent: '',
                headerContent: '',
                footerContent: '',
                headerHeight: 40,
                footerHeight: 30,
                hasHeader: true,
                hasFooter: true,
                contentJson: {},
                pageLayout: {
                    orientation: 'portrait',
                    margins: { top: 25, bottom: 25, left: 25, right: 25 }
                },
                isDefault: false,
                isActive: true
            });
            fetchTemplates();
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload template: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicate = async (template) => {
        if (template.templateType === 'WORD') {
            alert('Cannot duplicate Word templates. Please upload the file again.');
            return;
        }
        try {
            const duplicate = {
                ...template,
                name: `${template.name} (Copy)`,
                isDefault: false,
                _id: undefined
            };
            delete duplicate._id;
            delete duplicate.createdAt;
            delete duplicate.updatedAt;

            await api.post('/letters/templates', duplicate);
            fetchTemplates();
            alert('Template duplicated successfully');
        } catch (error) {
            console.error(error);
            alert('Failed to duplicate template');
        }
    };

    const handlePreviewPDF = async (template) => {
        // Navigate to the preview page
        navigate(`/hr/letter-templates/${template._id}/preview`);
    };

    const handleDownloadPDF = async (template) => {
        try {
            const response = await api.get(`/letters/templates/${template._id}/download-pdf`, {
                responseType: 'blob'
            });
            
            // Create download link
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${template.name}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download PDF error:', error);
            alert('Failed to download PDF: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDownloadWordTemplate = async (template) => {
        try {
            const response = await api.get(`/letters/templates/${template._id}/download-word`, {
                responseType: 'blob'
            });
            
            // Create download link
            const blob = new Blob([response.data], { 
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${template.name || 'template'}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download Word template error:', error);
            alert('Failed to download Word template: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDelete = async (template) => {
        if (!window.confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) return;

        try {
            await api.delete(`/letters/templates/${template._id}`);
            fetchTemplates();
            alert('Template deleted successfully');
        } catch (error) {
            console.error('Failed to delete template', error);
            alert('Failed to delete template: ' + (error.response?.data?.message || error.message));
        }
    };

    // --- RENDERERS ---

    if (showTemplateTypeModal) {
        return (
            <div 
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowTemplateTypeModal(false)}
            >
                <div 
                    className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Select Template Type</h2>
                        <button onClick={() => setShowTemplateTypeModal(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-sm text-slate-600 mb-6">
                        {activeTab === 'offer' ? 'Choose offer letter design or upload Word template.' : 'Upload Word template for joining letters.'}
                    </p>

                    <div className="space-y-3 mb-6">
                        {/* Letter Pad */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTemplateTypeSelect('LETTER_PAD');
                            }}
                            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${selectedTemplateType === 'LETTER_PAD' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                            disabled={activeTab === 'joining'}
                        >
                            <div className="flex items-start gap-3">
                                <FileImage size={24} className={selectedTemplateType === 'LETTER_PAD' ? 'text-blue-600' : 'text-slate-400'} />
                                <div>
                                    <h3 className="font-semibold text-slate-800">Use Letter Pad</h3>
                                    <p className="text-xs text-slate-500">Overlay content on your letterhead image.</p>
                                </div>
                            </div>
                        </button>

                        {/* Blank Page */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTemplateTypeSelect('BLANK');
                            }}
                            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${selectedTemplateType === 'BLANK' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                            disabled={activeTab === 'joining'}
                        >
                            <div className="flex items-start gap-3">
                                <FileText size={24} className={selectedTemplateType === 'BLANK' ? 'text-blue-600' : 'text-slate-400'} />
                                <div>
                                    <h3 className="font-semibold text-slate-800">Blank Page</h3>
                                    <p className="text-xs text-slate-500">Start with a plain white page.</p>
                                </div>
                            </div>
                        </button>

                        {/* Word Template */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTemplateTypeSelect('WORD');
                            }}
                            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${selectedTemplateType === 'WORD' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                        >
                            <div className="flex items-start gap-3">
                                <File size={24} className={selectedTemplateType === 'WORD' ? 'text-blue-600' : 'text-slate-400'} />
                                <div>
                                    <h3 className="font-semibold text-slate-800">Word Template (.docx)</h3>
                                    <p className="text-xs text-slate-500">Upload your own Word document template.</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setShowTemplateTypeModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                        <button onClick={handleContinueToEditor} disabled={!selectedTemplateType} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Continue</button>
                    </div>
                </div>
            </div>
        );
    }

    if (showUploadModal) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Update Word Template' : 'Upload Word Template'}</h2>
                        <button onClick={() => {
                            setShowUploadModal(false);
                            setIsEditing(false);
                            setCurrentTemplate({
                                name: '',
                                type: 'offer',
                                templateType: 'BLANK',
                                bodyContent: '',
                                headerContent: '',
                                footerContent: '',
                                headerHeight: 40,
                                footerHeight: 30,
                                hasHeader: true,
                                hasFooter: true,
                                contentJson: {},
                                pageLayout: {
                                    orientation: 'portrait',
                                    margins: { top: 25, bottom: 25, left: 25, right: 25 }
                                },
                                isDefault: false,
                                isActive: true
                            });
                        }} className="text-slate-500 hover:text-slate-700">✕</button>
                    </div>
                    {isEditing && (
                        <div className="mb-4 space-y-2">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                Upload a new Word file to replace the existing template. The old template will be deleted.
                            </div>
                            {currentTemplate?._id && (
                                <button
                                    onClick={() => handleDownloadWordTemplate(currentTemplate)}
                                    className="w-full px-4 py-2 text-sm border border-blue-300 text-blue-600 bg-white rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="7,10 12,15 17,10"/>
                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    Download Current Template (.docx) to Edit
                                </button>
                            )}
                        </div>
                    )}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input value={uploadForm.name} onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Template Name" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
                            <input type="file" accept=".docx" onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })} className="w-full px-3 py-2 border rounded-lg" />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
                                <input value={uploadForm.version} onChange={e => setUploadForm({ ...uploadForm, version: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                <select value={uploadForm.status} onChange={e => setUploadForm({ ...uploadForm, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowUploadModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                        <button onClick={handleUploadTemplate} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Upload</button>
                    </div>
                </div>
            </div>
        );
    }

    if (showEditor) {
        return (
            <div className="h-full flex flex-col bg-white">
                <div className="border-b px-6 py-4 flex justify-between items-center bg-white z-20 shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={() => setShowEditor(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Template' : 'New Template'}</h2>
                        </div>
                        <input
                            type="text"
                            value={currentTemplate.name}
                            onChange={e => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                            className="flex-1 max-w-md ml-4 p-2 bg-slate-50 border rounded"
                            placeholder="Template Name..."
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <input
                            type="checkbox"
                            checked={currentTemplate.isDefault}
                            onChange={e => setCurrentTemplate({ ...currentTemplate, isDefault: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        Set as Default
                    </label>
                </div>

                <div className="flex-1 flex overflow-hidden bg-slate-100/50">
                    <div className="flex-1 bg-slate-100 relative overflow-auto p-4 flex justify-center">
                        <OfferLetterEditor
                            initialContent={currentTemplate.bodyContent}
                            initialHeader={currentTemplate.headerContent}
                            initialFooter={currentTemplate.footerContent}
                            initialHeaderHeight={currentTemplate.headerHeight}
                            initialFooterHeight={currentTemplate.footerHeight}
                            initialHasHeader={currentTemplate.hasHeader}
                            initialHasFooter={currentTemplate.hasFooter}
                            templateType={currentTemplate.templateType}
                            backgroundUrl={companyProfile?.branding?.letterheadBg}
                            companyProfile={companyProfile}
                            onSave={(data) => {
                                const finalTemplate = {
                                    ...currentTemplate,
                                    bodyContent: data.body,
                                    headerContent: data.header,
                                    footerContent: data.footer,
                                    headerHeight: data.headerHeight,
                                    footerHeight: data.footerHeight,
                                    hasHeader: data.hasHeader,
                                    hasFooter: data.hasFooter
                                };

                                if (!finalTemplate.name) {
                                    alert("Please enter a template name.");
                                    return;
                                }

                                const promise = isEditing
                                    ? api.put(`/letters/templates/${currentTemplate._id}`, finalTemplate)
                                    : api.post('/letters/templates', finalTemplate);

                                promise.then(() => {
                                    alert('Template saved successfully');
                                    setShowEditor(false);
                                    fetchTemplates();
                                }).catch(err => {
                                    console.error(err);
                                    alert('Failed to save template');
                                });
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Letter Templates</h1>
                    <p className="text-slate-500">Manage your Offer and Joining letter templates.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-colors"
                >
                    {activeTab === 'joining' ? <Upload size={18} /> : <Plus size={18} />}
                    {activeTab === 'joining' ? 'Upload Word Template' : 'Create Template'}
                </button>
            </div>

            <div className="flex gap-1 border-b mb-6">
                {['offer', 'joining'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 font-medium capitalize border-b-2 transition-colors ${activeTab === tab
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab} Letter
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-500">Loading templates...</div>
            ) : templates.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed rounded-xl">
                    <p className="text-slate-500 mb-4">No templates found.</p>
                    <button onClick={handleCreate} className="text-blue-600 hover:underline">
                        {activeTab === 'joining' ? 'Upload a template' : 'Create a template'}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(tpl => (
                        <div key={tpl._id} className="bg-white p-5 rounded-xl shadow-sm border hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{tpl.name}</h3>
                                    <div className="flex gap-2 mt-1.5 flex-wrap">
                                        {tpl.isDefault && <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">Default</span>}
                                        {tpl.templateType === 'WORD' && <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold">Word Doc</span>}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {tpl.templateType === 'WORD' && (
                                        <>
                                            <button 
                                                onClick={() => handlePreviewPDF(tpl)} 
                                                className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg"
                                                title="Preview PDF"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                    <circle cx="12" cy="12" r="3"/>
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDownloadPDF(tpl)} 
                                                className="p-2 text-slate-400 hover:text-green-600 bg-slate-50 hover:bg-green-50 rounded-lg"
                                                title="Download PDF"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                    <polyline points="7,10 12,15 17,10"/>
                                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => handleEdit(tpl)} 
                                                className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg"
                                                title="Edit (Upload New Version)"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </>
                                    )}
                                    {tpl.templateType !== 'WORD' && (
                                        <button 
                                            onClick={() => handleEdit(tpl)} 
                                            className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => handleDuplicate(tpl)} className="p-2 text-slate-400 hover:text-green-600 bg-slate-50 hover:bg-green-50 rounded-lg" title="Duplicate">
                                        <Copy size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(tpl)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg h-32 flex items-center justify-center mb-4 border overflow-hidden">
                                {tpl.templateType === 'WORD' ? (
                                    <div className="text-center text-slate-400">
                                        <File size={32} className="mx-auto mb-2 text-blue-400" />
                                        <span className="text-xs">Word Template</span>
                                        {tpl.placeholders && tpl.placeholders.length > 0 && (
                                            <div className="text-[10px] mt-1 max-w-[150px] truncate">
                                                {tpl.placeholders.length} placeholders detected
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-full p-2 opacity-50 text-[6px] overflow-hidden pointer-events-none select-none bg-white">
                                        <div dangerouslySetInnerHTML={{ __html: tpl.bodyContent }} />
                                    </div>
                                )}
                            </div>

                            <div className="text-xs text-slate-400 border-t pt-3 flex justify-between">
                                <span>{new Date(tpl.createdAt).toLocaleDateString()}</span>
                                <span>{tpl.templateType === 'WORD' ? 'DOCX' : 'HTML'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
