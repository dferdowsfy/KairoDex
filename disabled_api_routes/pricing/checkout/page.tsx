'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CheckoutFormProps {
  plan: string;
  priceId: string;
  amount: number;
}

function CheckoutForm({ plan, priceId, amount }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login?redirect=/pricing/checkout?plan=' + plan);
        return;
      }
      setUser(user);
    });
  }, [plan, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setLoading(false);
      return;
    }

    try {
      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          email: user.email,
        },
      });

      if (pmError) {
        setError(pmError.message || 'Failed to create payment method');
        setLoading(false);
        return;
      }

      // Create subscription on your backend
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          priceId: priceId,
          userId: user.id,
          email: user.email,
          plan: plan,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Handle successful subscription
      if (result.status === 'succeeded' || result.status === 'active') {
        // Update user subscription in database
        await fetch('/api/subscription/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            subscriptionTier: plan,
            stripeCustomerId: result.customerId,
            stripeSubscriptionId: result.subscriptionId,
            stripePriceId: priceId,
          }),
        });

        // Redirect to success page
        router.push('/pricing/success?plan=' + plan);
      } else {
        setError('Payment failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }

    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to continue</h2>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Subscribe to {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </h1>
          <p className="text-3xl font-bold text-orange-500">${amount}/month</p>
          <p className="text-gray-600 mt-2">Cancel anytime</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Information
            </label>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!stripe || loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Processing...' : `Subscribe for $${amount}/month`}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure payment powered by Stripe. Your subscription will start immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const plan = searchParams?.get('plan') || 'professional';

  // Define plan details
  const planDetails = {
    professional: {
      priceId: 'price_professional_monthly', // Replace with actual Stripe price ID
      amount: 100,
    },
  };

  const currentPlan = planDetails[plan as keyof typeof planDetails];

  if (!currentPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invalid Plan</h2>
          <p className="text-gray-600">The selected plan is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        plan={plan}
        priceId={currentPlan.priceId}
        amount={currentPlan.amount}
      />
    </Elements>
  );
}
