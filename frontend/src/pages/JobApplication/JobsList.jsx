import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useParams } from 'react-router-dom';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL + "/api"
    : "http://localhost:5000/api";

export default function JobsList() {
    const [searchParams] = useSearchParams();
    const { companyCode } = useParams();
    const tenantIdQuery = searchParams.get('tenantId');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!tenantIdQuery && !companyCode) {
            setError('Missing Company Information. Please use the link provided by the HR.');
            return;
        }

        async function fetchJobs() {
            setLoading(true);
            try {
                let res;
                if (companyCode) {
                    res = await axios.get(`${API_BASE}/public/jobs/${companyCode}`);
                } else {
                    res = await axios.get(`${API_BASE}/public/jobs?tenantId=${tenantIdQuery}`);
                }
                setJobs(res.data || []);
            } catch (err) {
                console.error(err);
                if (err.response && err.response.status === 404) {
                    setError('Company not found.');
                } else {
                    setError('Failed to load jobs.');
                }
            } finally {
                setLoading(false);
            }
        }

        fetchJobs();
    }, [tenantIdQuery, companyCode]);

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Open Positions
                    </h1>
                    <p className="mt-4 text-lg text-gray-600">
                        Join our team and help us build the future.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-500">Loading jobs...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <p className="text-gray-500 text-lg">No open positions at the moment.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {jobs.map(job => (
                            <div key={job._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-6 border border-gray-100">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                    <div className="mb-4 md:mb-0">
                                        <h2 className="text-xl font-bold text-gray-900">{job.jobTitle}</h2>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                {job.department}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {formatDateDDMMYYYY(job.createdAt)}
                                            </span>
                                            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                                {job.vacancy} Openings
                                            </span>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/apply-job/${job._id}?tenantId=${job.tenant || tenantIdQuery}`}
                                        className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                                    >
                                        Apply Now
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
