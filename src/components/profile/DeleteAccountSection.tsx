'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { deleteAccount } from '@/actions/account-actions';
import { useRouter } from 'next/navigation';

export function DeleteAccountSection() {
    const router = useRouter();
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmText !== 'DELETE MY ACCOUNT') {
            alert('Please type the confirmation text exactly as shown');
            return;
        }

        setDeleting(true);
        try {
            await deleteAccount();
            // Redirect to home page
            window.location.href = '/';
        } catch (error) {
            console.error(error);
            alert('Failed to delete account. Please try again.');
            setDeleting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-red-200 p-6 mt-8">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-stone-900 mb-2">Danger Zone</h3>
                    <p className="text-sm text-stone-600 mb-4">
                        Once you delete your account, there is no going back. This will permanently delete:
                    </p>
                    <ul className="text-sm text-stone-600 mb-4 list-disc list-inside space-y-1">
                        <li>Your profile and all personal information</li>
                        <li>All saved resumes and cover letters</li>
                        <li>All job applications and tracking data</li>
                        <li>Your account credentials and access</li>
                    </ul>

                    {!showConfirm ? (
                        <button
                            onClick={() => setShowConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete My Account
                        </button>
                    ) : (
                        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                            <p className="text-sm font-bold text-red-900 mb-3">
                                Type <span className="font-mono bg-red-100 px-2 py-1 rounded">DELETE MY ACCOUNT</span> to confirm:
                            </p>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                className="w-full px-4 py-2 border border-red-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Type confirmation text"
                                disabled={deleting}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting || confirmText !== 'DELETE MY ACCOUNT'}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            Permanently Delete
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowConfirm(false);
                                        setConfirmText('');
                                    }}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-bold hover:bg-stone-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
