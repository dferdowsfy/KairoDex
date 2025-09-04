'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const plan = searchParams?.get('plan') || 'professional';

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to {plan.charAt(0).toUpperCase() + plan.slice(1)}!
          </h1>
          <p className="text-gray-600">
            Your subscription has been activated successfully.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">What&apos;s next?</h3>
          <ul className="text-left text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              Access your dashboard to start managing clients
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              Set up automated follow-ups and campaigns
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              Upload client data and documents
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              Explore AI-powered features
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
          
          <button
            onClick={() => router.push('/help/getting-started')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Getting Started Guide
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@kairodex.com" className="text-orange-500 hover:text-orange-600">
              support@kairodex.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
