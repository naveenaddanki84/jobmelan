'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { syncSubscriptionStatus, updateSubscriptionStatus } from '@/actions/subscription-actions';
import { checkProSubscription } from '@/lib/subscription';
import { useUser } from '@clerk/nextjs';
import { RefreshCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function SubscriptionAdminPage() {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await syncSubscriptionStatus();
      setStatus(result);
      const isPro = await checkProSubscription();
      setMessage(isPro ? '✅ Pro subscription active!' : '❌ No pro subscription');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualUpdate = async (isPro: boolean) => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await updateSubscriptionStatus(isPro);
      setMessage(`✅ Updated: isPro=${result.isPro}`);
      await loadStatus();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadStatus();
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Subscription Status</h1>
        
        {message && (
          <div className={`p-4 rounded-lg mb-4 ${
            message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'
          }`}>
            {message}
          </div>
        )}

        {status && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-stone-500">User ID</label>
                <p className="font-mono text-sm">{status.userId}</p>
              </div>
              <div>
                <label className="text-sm text-stone-500">Email</label>
                <p className="text-sm">{status.email}</p>
              </div>
              <div>
                <label className="text-sm text-stone-500">Is Pro</label>
                <p className="flex items-center gap-2">
                  {status.isPro ? (
                    <><CheckCircle className="w-5 h-5 text-green-500" /> Yes</>
                  ) : (
                    <><XCircle className="w-5 h-5 text-red-500" /> No</>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm text-stone-500">Plan ID</label>
                <p className="font-mono text-xs">{status.clerkPlanId || 'None'}</p>
              </div>
              <div>
                <label className="text-sm text-stone-500">Expected Plan ID</label>
                <p className="font-mono text-xs">{status.expectedPlanId}</p>
              </div>
              <div>
                <label className="text-sm text-stone-500">Plan Matches</label>
                <p className="flex items-center gap-2">
                  {status.matches ? (
                    <><CheckCircle className="w-5 h-5 text-green-500" /> Yes</>
                  ) : (
                    <><XCircle className="w-5 h-5 text-red-500" /> No</>
                  )}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200">
              <h3 className="font-bold mb-2">Quick Actions</h3>
              <div className="flex gap-2">
                <Button 
                  variant="primary" 
                  onClick={loadStatus}
                  disabled={loading}
                  icon={<RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                >
                  Refresh Status
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => handleManualUpdate(true)}
                  disabled={loading}
                >
                  Set Pro (Manual)
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleManualUpdate(false)}
                  disabled={loading}
                >
                  Remove Pro
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-bold mb-1">Troubleshooting:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Check Clerk Dashboard → Webhooks → Logs for subscription events</li>
                      <li>Verify webhook is subscribed to: subscription.created, subscription.updated, subscription.active</li>
                      <li>Ensure your plan ID matches: {status.expectedPlanId}</li>
                      <li>If webhook hasn't fired, use "Set Pro (Manual)" button above</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

