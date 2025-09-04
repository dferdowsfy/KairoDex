# Stripe Integration Setup Guide

This guide will help you set up Stripe payments for your KairoDex subscription system.

## 🏗️ Database Setup

1. **Run the database migration** in Supabase Dashboard:
   - Go to: https://supabase.com/dashboard/project/invadbpskztiooidhyui/sql
   - Copy and paste the SQL from `database_migrations/20250903_add_subscription_tiers.sql`
   - This adds subscription columns to your `AgentHub_DB` table

## 🔑 Stripe Account Setup

1. **Create a Stripe account** at https://stripe.com
2. **Get your API keys**:
   - Go to Stripe Dashboard → Developers → API keys
   - Copy your Publishable key (starts with `pk_`)
   - Copy your Secret key (starts with `sk_`)

3. **Create Products and Prices**:
   ```bash
   # Professional Plan - $100/month
   stripe products create --name="Professional Plan" --description="Everything an agent needs, no limits"
   stripe prices create --unit-amount=10000 --currency=usd --recurring=month --product=prod_xxx
   ```

4. **Set up Webhook Endpoint**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events:
     - `customer.subscription.created`
     - `customer.subscription.updated` 
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the webhook signing secret (starts with `whsec_`)

## 🔧 Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 🏷️ Update Price IDs

In `app/pricing/checkout/page.tsx`, update the `priceId` with your actual Stripe price ID:

```typescript
const planDetails = {
  professional: {
    priceId: 'price_1234567890abcdef', // Replace with your actual price ID
    amount: 100,
  },
};
```

## 🧪 Testing

1. **Use Stripe Test Cards**:
   - Success: `4242 4242 4242 4242`
   - Declined: `4000 0000 0000 0002`
   - See more: https://stripe.com/docs/testing

2. **Test the Flow**:
   - Visit `/pricing`
   - Click "Start Professional Plan"
   - Complete checkout with test card
   - Verify webhook receives events
   - Check database updates

## 📊 Subscription Plans

The system supports these plans:

### Free Plan
- **Price**: $0/forever
- **Features**: Up to 10 clients, basic features
- **Payment**: None required
- **Action**: Direct signup

### Professional Plan
- **Price**: $100/month
- **Features**: Unlimited everything
- **Payment**: Stripe subscription required
- **Action**: Redirect to checkout

### Enterprise Plan
- **Price**: Custom pricing
- **Features**: Everything + enterprise features
- **Payment**: Contact sales
- **Action**: Redirect to contact form

## 🔄 Subscription Management

The system automatically:

1. **Creates subscriptions** when users pay
2. **Updates subscription status** via webhooks
3. **Handles failed payments** by marking status as pending
4. **Processes cancellations** by downgrading to free tier
5. **Tracks billing dates** for renewal notifications

## 🚀 Going Live

1. **Switch to Live Keys**:
   - Replace test keys with live keys in environment variables
   - Update webhook endpoint to production URL

2. **Update Price IDs**:
   - Create live products and prices in Stripe
   - Update `priceId` values in checkout component

3. **Test in Production**:
   - Use real payment methods
   - Verify webhook delivery
   - Check database updates

## 📝 Database Schema

The subscription data is stored in `AgentHub_DB` with these columns:

- `subscription_tier`: 'free', 'professional', 'enterprise'
- `subscription_status`: 'active', 'cancelled', 'expired', 'trial', 'pending'
- `subscription_start_date`: When subscription started
- `subscription_end_date`: When subscription expires
- `stripe_customer_id`: Stripe customer ID
- `stripe_subscription_id`: Stripe subscription ID
- `stripe_price_id`: Stripe price ID
- `billing_cycle`: 'monthly' or 'yearly'
- `payment_method_id`: Stripe payment method ID
- `last_payment_date`: Last successful payment
- `next_billing_date`: Next billing date

## 🛠️ Features Implemented

✅ **3-Tier Pricing System**: Free, Professional, Enterprise
✅ **Stripe Integration**: Full payment processing
✅ **Subscription Management**: Create, update, cancel
✅ **Webhook Handling**: Automatic status updates
✅ **Database Integration**: All data stored in AgentHub_DB
✅ **Responsive UI**: Mobile-friendly pricing pages
✅ **Error Handling**: Comprehensive error management
✅ **Security**: Webhook signature verification

## 🎯 Next Steps

1. Run the database migration
2. Set up your Stripe account and products
3. Add environment variables
4. Update price IDs in the code
5. Test the complete flow
6. Deploy and go live!

Your subscription system is now ready to handle payments and manage user tiers! 🚀
