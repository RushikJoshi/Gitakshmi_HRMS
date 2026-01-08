import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeft, Download, Eye } from 'lucide-react';

export default function TemplatePreview() {
    const { templateId } = useParams();
    const navigate = useNavigate();
    const [template, setTemplate] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (templateId) {
            loadTemplateAndGeneratePDF();
        }
    }, [templateId]);

    const loadTemplateAndGeneratePDF = async () => {
        try {
            setLoading(true);
            setError(null);

            // First get template details
            const templateResponse = await api.get(`/letters/templates/${templateId}`);
            const templateData = templateResponse.data;
            setTemplate(templateData);

            // Check template type - only WORD templates support PDF preview
            if (templateData.templateType === 'WORD') {
                // Check if file is available
                if (templateData.hasFile === false) {
                    const fileError = templateData.fileError || 'Template file not found';
                    setError(`Cannot preview: ${fileError}. Please re-upload the template.`);
                    setLoading(false);
                    return;
                }

                // Get the PDF preview for WORD templates
                try {
                    const pdfResponse = await api.get(`/letters/templates/${templateId}/preview-pdf`, {
                        responseType: 'blob',
                        timeout: 60000 // 60 second timeout for PDF conversion
                    });

                    // Verify response is actually a PDF
                    if (pdfResponse.data && pdfResponse.data.size > 0) {
                        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        setPdfUrl(url);
                    } else {
                        throw new Error('PDF preview is empty');
                    }
                } catch (pdfError) {
                    console.error('PDF preview error:', pdfError);
                    const errorMessage = pdfError.response?.data?.message || 
                                       pdfError.message || 
                                       'Failed to generate PDF preview. Please ensure LibreOffice is installed on the server.';
                    setError(errorMessage);
                }
            } else {
                // HTML templates (BLANK, LETTER_PAD) - show HTML preview instead
                setError('HTML templates cannot be previewed as PDF. Please use the template editor to view HTML templates.');
            }

        } catch (error) {
            console.error('Template load error:', error);
            const errorMessage = error.response?.data?.message || 
                               error.response?.data?.error ||
                               error.message || 
                               'Failed to load template. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        // Only allow download for WORD templates
        if (template?.templateType !== 'WORD') {
            alert('Download is only available for WORD templates.');
            return;
        }

        if (template?.hasFile === false) {
            alert('Template file is missing. Please re-upload the template.');
            return;
        }

        try {
            const response = await api.get(`/letters/templates/${templateId}/download-pdf`, {
                responseType: 'blob',
                timeout: 60000 // 60 second timeout for PDF conversion
            });

            // Create download link
            if (response.data && response.data.size > 0) {
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${template?.name || 'template'}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Clean up the blob URL
                window.URL.revokeObjectURL(url);
            } else {
                throw new Error('Downloaded file is empty');
            }
        } catch (error) {
            console.error('Download error:', error);
            const errorMessage = error.response?.data?.message || 
                               error.response?.data?.error ||
                               error.message || 
                               'Failed to download PDF';
            alert(`Failed to download PDF: ${errorMessage}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Converting template to PDF...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
                    <div className="text-red-500 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Preview Failed</h2>
                    <p className="text-slate-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/hr/letter-templates')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Back to Templates
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/hr/letter-templates')}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
                        >
                            <ArrowLeft size={20} />
                            Back to Templates
                        </button>
                        <div className="h-6 w-px bg-slate-300"></div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800">
                                {template?.name || 'Template Preview'}
                            </h1>
                            <p className="text-sm text-slate-500">
                                {template?.type} template • {template?.templateType}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {template?.templateType === 'WORD' && template?.hasFile !== false && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                <Download size={18} />
                                Download PDF
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 p-6">
                {pdfUrl ? (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <iframe
                            src={pdfUrl}
                            className="w-full h-[calc(100vh-200px)] border-0"
                            title="PDF Preview"
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-lg">
                        <div className="text-center text-slate-500">
                            <Eye size={48} className="mx-auto mb-4 opacity-50" />
                            <p>PDF preview not available</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}