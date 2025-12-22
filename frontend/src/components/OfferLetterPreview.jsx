import React from 'react';

export default function OfferLetterPreview({ applicant, offerData, companyInfo }) {
    const today = new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto shadow-2xl rounded-lg border-2 border-slate-200">
            {/* Header with Logo */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-blue-600">
                <div>
                    <h1 className="text-3xl font-bold text-blue-600 mb-1">
                        {companyInfo?.name || 'Company Name'}
                    </h1>
                    <p className="text-sm text-slate-600">{companyInfo?.tagline || 'Technologies'}</p>
                </div>
                {companyInfo?.logo && (
                    <img src={companyInfo.logo} alt="Company Logo" className="h-16 w-auto" />
                )}
            </div>

            {/* Reference Number */}
            <div className="text-right mb-6">
                <p className="text-xs text-slate-500">
                    Ref: {companyInfo?.refPrefix || 'OFFER'}/{new Date().getFullYear()}/{Math.floor(Math.random() * 10000)}
                </p>
            </div>

            {/* Recipient Address */}
            <div className="mb-6">
                <p className="font-semibold text-slate-800">Ms./Mr. {applicant?.name}</p>
                <p className="text-sm text-slate-600">{applicant?.address || applicant?.currentAddress}</p>
                <p className="text-sm text-slate-600">{applicant?.city}, {applicant?.state}</p>
                <p className="text-sm text-slate-600">Pin: {applicant?.pincode}</p>
            </div>

            {/* Subject */}
            <div className="mb-6">
                <p className="font-bold text-slate-800 underline">
                    Offer to Join {companyInfo?.name || 'Our Company'}
                </p>
            </div>

            {/* Salutation */}
            <div className="mb-4">
                <p className="text-slate-700">Dear Ms./Mr. {applicant?.name?.split(' ')[0]},</p>
            </div>

            {/* Main Content */}
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed mb-6">
                <p>
                    Congratulations! Further to your application for employment with us, and the subsequent selection process, we
                    are pleased to <span className="font-semibold">offer you the position of {applicant?.requirementId?.jobTitle || offerData?.position}</span> at
                    our <span className="font-semibold">{offerData?.location || 'Ahmedabad'}</span> office on the following terms and conditions:
                </p>

                <ol className="list-decimal list-inside space-y-3 ml-4">
                    <li>
                        <span className="font-semibold">Appointment:</span> You will be appointed as <span className="font-semibold">{applicant?.requirementId?.jobTitle || offerData?.position}</span>,
                        with your registered address as the location. The employment is headquartered (HQ) is located
                        at <span className="font-semibold">{companyInfo?.address || 'Company Address'}</span>. You may be required to work at any of our offices.
                    </li>

                    <li>
                        <span className="font-semibold">Date of Joining:</span> You are requested to join on or before{' '}
                        <span className="font-semibold">{offerData?.joiningDate ? new Date(offerData.joiningDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '___________'}</span>.
                    </li>

                    <li>
                        <span className="font-semibold">Compensation:</span> Upon your joining company will have a detailed Appointment letter outlining all terms and conditions
                        of your employment and a detailed compensation structure along with our Space Manual.
                    </li>

                    <li>
                        <span className="font-semibold">Probation Period:</span> You will be on probation for a period of{' '}
                        <span className="font-semibold">{offerData?.probationPeriod || '3 months'}</span> from the date of joining.
                    </li>

                    <li>
                        <span className="font-semibold">Terms & Conditions:</span> Your appointment and continued employment with the company is subject to you providing:
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                            <li>All original educational certificates along with one set of photocopies of the same.</li>
                            <li>Experience & Relieving letters from previous employers (if applicable).</li>
                            <li>Residence Proof / Aadhaar Card / Telephone Bill / Ration Card.</li>
                            <li>Passport size photographs.</li>
                            <li>PAN Card copy.</li>
                        </ul>
                    </li>

                    <li>
                        <span className="font-semibold">Background Verification:</span> Your employment is subject to satisfactory verification of your past
                        employment, education credentials and character references. All information provided by you during the selection process will be verified.
                    </li>
                </ol>

                <p className="mt-4">
                    <span className="font-semibold">Note:</span> Please sign the copy of this letter as token of your acceptance and send the signed copy to
                    us along with the above-mentioned documents. In case you fail to do so, this offer letter shall not be allowed to join the organization.
                </p>

                <p className="mt-4">
                    We are sure that you will enjoy working with us and we look forward to a long & mutually beneficial association.
                    We wish you all the very best in your new assignment and sincerely hope that you will contribute significantly to the
                    continued success of our organization.
                </p>

                <p className="mt-4">
                    As a new entrant, we would like to advise – <span className="italic">fearlessly internalize and uphold the spirit of Gitakshmi</span>.
                </p>

                <p className="mt-4">
                    <span className="font-semibold">Stability, Integrity and Growth.</span>
                </p>
            </div>

            {/* Signature Section */}
            <div className="mt-12 mb-8">
                <p className="text-sm text-slate-700 mb-1">Yours Truly,</p>
                <p className="text-sm font-semibold text-slate-800 mb-8">
                    For {companyInfo?.name || 'Company Name'}
                </p>

                {companyInfo?.signature && (
                    <img src={companyInfo.signature} alt="Signature" className="h-12 mb-2" />
                )}

                <div className="border-t border-slate-300 pt-2 inline-block">
                    <p className="text-sm font-semibold text-slate-800">Authorized Signatory</p>
                    <p className="text-xs text-slate-600">{companyInfo?.signatoryName || 'HR Manager'}</p>
                </div>
            </div>

            {/* Acceptance Section */}
            <div className="mt-12 pt-6 border-t-2 border-slate-300">
                <p className="text-sm font-semibold text-slate-800 mb-4">Acceptance of Offer:</p>
                <p className="text-sm text-slate-700 mb-6">
                    I have read and understood all the terms and conditions as set forth in this offer letter and the annexure to
                    the same.
                </p>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-xs text-slate-500 mb-8">Your name in capital letters</p>
                        <div className="border-b border-slate-400 pb-1">
                            <p className="text-sm font-semibold text-slate-800">{applicant?.name?.toUpperCase()}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-slate-500 mb-8">Your Signature</p>
                        <div className="border-b border-slate-400 h-12"></div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-500">{companyInfo?.address || 'Company Address'}</p>
                <p className="text-xs text-slate-500">
                    {companyInfo?.phone && `Phone: ${companyInfo.phone} | `}
                    {companyInfo?.email && `Email: ${companyInfo.email} | `}
                    {companyInfo?.website && `Website: ${companyInfo.website}`}
                </p>
                <p className="text-xs text-slate-400 mt-2">Page 1 of 1</p>
            </div>
        </div>
    );
}
