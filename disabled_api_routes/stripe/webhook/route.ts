import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
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
  
  const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

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
  
  const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

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
