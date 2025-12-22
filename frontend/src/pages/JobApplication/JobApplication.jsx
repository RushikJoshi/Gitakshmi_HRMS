import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import axios from 'axios';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + "/api"
  : "http://localhost:5000/api";

export default function JobApplication() {
  const [searchParams] = useSearchParams();
  const { requirementId: paramReqId } = useParams();

  // Support both /apply-job/:id and /apply?requirementId=...
  const requirementId = paramReqId || searchParams.get('requirementId');
  const tenantId = searchParams.get('tenantId');

  const [formData, setFormData] = useState({
    // Personal
    name: '',
    email: '',
    mobile: '',
    emergencyContact: '',
    dob: '',
    workLocation: '',

    // Professional
    intro: '',
    experience: '',
    relevantExperience: '',
    currentCompany: '',
    currentDesignation: '',
    currentlyWorking: false,
    noticePeriod: false,
    currentCTC: '',
    takeHome: '',
    expectedCTC: '',
    isFlexible: false,
    hasOtherOffer: false,
    relocate: false,
    reasonForChange: '',
    linkedin: '',

    // File
    resume: null,

    // Consent
    consent: false
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!requirementId || !tenantId) {
      setError('Invalid application link. Missing requirement or tenant information.');
    }
  }, [requirementId, tenantId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF document only.');
        return;
      }
      // Validate file size (4MB)
      if (file.size > 4 * 1024 * 1024) {
        setError('File size must be less than 4MB.');
        return;
      }
      setFormData(prev => ({
        ...prev,
        resume: file
      }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consent) {
      setError('You must consent to background verification.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      submitData.append('requirementId', requirementId);

      // Append all fields
      Object.keys(formData).forEach(key => {
        if (key === 'resume') {
          if (formData.resume) submitData.append('resume', formData.resume);
        } else {
          submitData.append(key, formData[key]);
        }
      });

      await axios.post(`${API_BASE}/public/apply-job`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Tenant-ID': tenantId
        }
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Application submission error:', err);
      setError(err.response?.data?.error || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Application Submitted!</h2>
              <p className="mt-2 text-sm text-gray-600">
                Thank you for your application. We will review your submission and get back to you soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Job Application</h2>
          <p className="mt-2 text-sm text-gray-600">Please fill out the form below to apply</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg overflow-hidden">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="p-6 space-y-8">
            {/* Personal Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Number (+91) *</label>
                  <input type="tel" name="mobile" required value={formData.mobile} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Emergency Contact (+91) *</label>
                  <input type="tel" name="emergencyContact" required value={formData.emergencyContact} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <DatePicker
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm h-[38px] border"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    value={formData.dob ? dayjs(formData.dob) : null}
                    onChange={(date) => setFormData(prev => ({ ...prev, dob: date ? date.format('YYYY-MM-DD') : '' }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Work Location</label>
                  <input type="text" name="workLocation" value={formData.workLocation} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                </div>
              </div>
            </div>

            {/* Professional Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Professional Details</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Short Introduction</label>
                  <textarea name="intro" rows={3} value={formData.intro} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Experience (Years) *</label>
                    <input type="text" name="experience" required value={formData.experience} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Relevant Experience (Years) *</label>
                    <input type="text" name="relevantExperience" required value={formData.relevantExperience} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current / Last Company</label>
                    <input type="text" name="currentCompany" value={formData.currentCompany} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Designation</label>
                    <input type="text" name="currentDesignation" value={formData.currentDesignation} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current CTC</label>
                    <input type="text" name="currentCTC" value={formData.currentCTC} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expected CTC</label>
                    <input type="text" name="expectedCTC" value={formData.expectedCTC} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Take Home</label>
                    <input type="text" name="takeHome" value={formData.takeHome} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">LinkedIn Profile URL</label>
                    <input type="url" name="linkedin" value={formData.linkedin} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input type="checkbox" name="currentlyWorking" checked={formData.currentlyWorking} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <label className="ml-2 block text-sm text-gray-900">Currently Working?</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="noticePeriod" checked={formData.noticePeriod} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <label className="ml-2 block text-sm text-gray-900">Serving Notice Period?</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="isFlexible" checked={formData.isFlexible} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <label className="ml-2 block text-sm text-gray-900">Is expected salary flexible?</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="hasOtherOffer" checked={formData.hasOtherOffer} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <label className="ml-2 block text-sm text-gray-900">Holding other Offer?</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="relocate" checked={formData.relocate} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <label className="ml-2 block text-sm text-gray-900">Ready to Relocate?</label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for Change</label>
                  <textarea name="reasonForChange" rows={2} value={formData.reasonForChange} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" />
                </div>
              </div>
            </div>

            {/* Resume */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Resume</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Upload Resume (PDF only, max 4MB) *</label>
                <input type="file" accept=".pdf" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
            </div>

            {/* Consent */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input id="consent" name="consent" type="checkbox" required checked={formData.consent} onChange={handleInputChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded" />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="consent" className="font-medium text-gray-700">I acknowledge and consent to background verification</label>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading || !requirementId || !tenantId} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                {loading ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}