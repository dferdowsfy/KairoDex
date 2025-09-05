import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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

function getWebhookSecret() {
  const s = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s) throw new Error('Missing STRIPE_WEBHOOK_SECRET env var');
  return s;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });

    const stripe = getStripeClient();
    const webhookSecret = getWebhookSecret();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  const plan = subscription.metadata.plan;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('AgentHub_DB')
    .update({
      subscription_tier: plan || 'professional',
      subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
      subscription_start_date: new Date((subscription as any).current_period_start * 1000).toISOString(),
      subscription_end_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
      stripe_subscription_id: subscription.id,
      next_billing_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
    })
    .eq('agent_owner_user_id', userId);

  if (error) {
    console.error('Failed to update subscription in database:', error);
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('AgentHub_DB')
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      subscription_end_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
    })
    .eq('agent_owner_user_id', userId);

  if (error) {
    console.error('Failed to update cancelled subscription in database:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!(invoice as any).subscription) return;
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('AgentHub_DB')
    .update({
      last_payment_date: new Date().toISOString(),
      subscription_status: 'active',
    })
    .eq('agent_owner_user_id', userId);

  if (error) {
    console.error('Failed to update payment success in database:', error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!(invoice as any).subscription) return;
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('AgentHub_DB')
    .update({
      subscription_status: 'pending',
    })
    .eq('agent_owner_user_id', userId);

  if (error) {
    console.error('Failed to update payment failure in database:', error);
  }
}
