import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Edit2, Trash2, Plus } from 'lucide-react';

export default function OfferTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        header: '',
        body: '',
        footer: '',
        logoUrl: '',
        isActive: true
    });
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const PLACEHOLDERS = [
        '{{candidate_name}}', '{{candidate_email}}', '{{job_title}}',
        '{{department}}', '{{joining_date}}', '{{date_of_birth}}',
        '{{work_location}}', '{{company_name}}', '{{current_date}}'
    ];

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await api.get('/hr/offer-templates');
            setTemplates(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const openModal = (template = null) => {
        if (template) {
            setFormData({
                name: template.name,
                header: template.header,
                body: template.body,
                footer: template.footer,
                isActive: template.isActive
            });
            setIsEditing(true);
            setCurrentId(template._id);
        } else {
            setFormData({
                name: '',
                header: '',
                body: '',
                footer: '',
                isActive: true
            });
            setIsEditing(false);
            setCurrentId(null);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/hr/offer-templates/${currentId}`, formData);
            } else {
                await api.post('/hr/offer-templates', formData);
            }
            setShowModal(false);
            fetchTemplates();
        } catch (error) {
            console.error(error);
            alert('Failed to save template');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this template?")) return;
        try {
            await api.delete(`/hr/offer-templates/${id}`);
            fetchTemplates();
        } catch (error) {
            console.error(error);
            alert('Failed to delete template');
        }
    };

    const insertPlaceholder = (ph) => {
        setFormData(prev => ({ ...prev, body: prev.body + ph }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Offer Letter Templates</h1>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                    <Plus /> Create Template
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : templates.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-lg shadow-sm text-gray-500 border border-gray-200">
                    No offer letter templates found. Create one to get started.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(tpl => (
                        <div key={tpl._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-gray-900 line-clamp-1" title={tpl.name}>{tpl.name}</h3>
                                <div className={`w-3 h-3 rounded-full ${tpl.isActive ? 'bg-green-500' : 'bg-gray-300'}`} title={tpl.isActive ? 'Active' : 'Inactive'}></div>
                            </div>
                            <div className="text-sm text-gray-500 mb-6">
                                <p className="line-clamp-3">{tpl.body}</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button onClick={() => openModal(tpl)} className="text-blue-600 hover:text-blue-800 p-1">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(tpl._id)} className="text-red-600 hover:text-red-800 p-1">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="flex justify-between items-center border-b pb-4">
                                <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Template' : 'New Template'}</h2>
                                <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                                    <span className="text-2xl">&times;</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Template Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Header Content</label>
                                        <textarea
                                            name="header"
                                            rows={2}
                                            value={formData.header}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Company Name, Address, CIN..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Company Logo URL</label>
                                        <input
                                            type="url"
                                            name="logoUrl"
                                            value={formData.logoUrl}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="https://example.com/logo.png"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Enter the URL of your company logo (right side of header)</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Footer Content</label>
                                        <textarea
                                            name="footer"
                                            rows={2}
                                            value={formData.footer}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Signature, Contact Info..."
                                        />
                                    </div>
                                    <div className="flex items-center pt-2">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-900">Active</label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-sm font-medium text-gray-700">Body Content</label>
                                        <span className="text-xs text-gray-500">Supports placeholders below</span>
                                    </div>
                                    <textarea
                                        name="body"
                                        required
                                        rows={12}
                                        value={formData.body}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                        placeholder="Dear {{candidate_name}}, ..."
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {PLACEHOLDERS.map(ph => (
                                            <button
                                                key={ph}
                                                type="button"
                                                onClick={() => insertPlaceholder(ph)}
                                                className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                            >
                                                {ph}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    Save Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
