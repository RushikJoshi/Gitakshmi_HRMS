import React from 'react';
import { useNavigate } from 'react-router-dom';
import RequirementForm from '../../components/RequirementForm';

export default function CreateRequirement() {
    const navigate = useNavigate();

    const handleSuccess = () => {
        navigate('/hr/requirements');
    };

    const handleClose = () => {
        navigate('/hr/requirements');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Create New Requirement</h1>
            <RequirementForm
                isModal={false}
                onSuccess={handleSuccess}
                onClose={handleClose}
            />
        </div>
    );
}
