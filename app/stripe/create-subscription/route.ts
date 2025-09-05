import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Lazy initializer helpers — this prevents Next's build/data collection step from
// trying to construct these SDK clients when sensitive env vars are not present.
function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY env var');
  return new Stripe(key, { apiVersion: '2025-08-27.basil' });
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const { paymentMethodId, priceId, userId, email, plan } = await request.json();

    if (!paymentMethodId || !priceId || !userId || !email || !plan) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Initialize SDKs lazily at request time
    const stripe = getStripeClient();
    const supabaseAdmin = getSupabaseAdmin();

    // Check if customer already exists
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId,
        },
      });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId,
        plan: plan,
      },
    });

  // Update user subscription in database
  const { error: dbError } = await supabaseAdmin
      .from('AgentHub_DB')
      .update({
        subscription_tier: plan,
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        billing_cycle: 'monthly',
        last_payment_date: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      })
      .eq('agent_owner_user_id', userId);

    if (dbError) {
      console.error('Database update error:', dbError);
      // Don't fail the subscription creation, but log the error
    }

    // Get client secret from payment intent if available
    let clientSecret = null;
    if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
      const invoice = subscription.latest_invoice as any;
      if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
        clientSecret = invoice.payment_intent.client_secret;
      }
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      customerId: customer.id,
      status: subscription.status,
      clientSecret,
    });

  } catch (error) {
    console.error('Stripe subscription creation error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to create subscription' 
      },
      { status: 500 }
    );
  }
}
