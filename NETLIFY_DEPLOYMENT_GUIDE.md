# 🚀 Netlify Deployment Guide for KairoDx

Complete step-by-step guide to deploy your KairoDx app to Netlify with a custom domain.

## 📋 Prerequisites

✅ Your code is committed and pushed to GitHub (KairoDx repository)
✅ You have a Netlify account (sign up at https://netlify.com)
✅ You have environment variables ready (Supabase + Stripe)

## 🔗 Step 1: Connect GitHub Repository to Netlify

1. **Login to Netlify**: Go to https://app.netlify.com
2. **Import from Git**:
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Authorize Netlify to access your GitHub account
   - Select your `KairoDx` repository

## ⚙️ Step 2: Configure Build Settings

Your `netlify.toml` is already configured, but verify these settings:

### Build Settings:
- **Base directory**: (leave empty)
- **Build command**: `npm run build`
- **Publish directory**: `out`
- **Functions directory**: `netlify/functions` (if using)

### Advanced Settings:
- **Node.js version**: 18.x (already set in netlify.toml)

## 🔐 Step 3: Configure Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

### Supabase Configuration:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://invadbpskztiooidhyui.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### Stripe Configuration:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Additional Environment Variables:
```bash
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret_here
NODE_ENV=production
```

> Tip: A production-ready example of these variables is provided in `.env.production.example` at the repo root — copy values from there when adding them to Netlify.

## 🏗️ Step 4: Deploy Your Site

1. **Initial Deployment**:
   - Click "Deploy site" 
   - Netlify will automatically build and deploy
   - You'll get a random subdomain like `https://magnificent-unicorn-123456.netlify.app`

2. **Monitor Build**:
   - Watch the build logs in real-time
   - Fix any build errors if they occur

## 🌐 Step 5: Set Up Custom Domain

### Option A: Use a Domain You Own

1. **Add Custom Domain**:
   - Go to Site Settings → Domain Management
   - Click "Add custom domain"
   - Enter your domain (e.g., `kairodx.com`)

2. **Configure DNS**:
   ```bash
   # Add these DNS records at your domain registrar:
   Type: CNAME
   Name: www
   Value: your-site-name.netlify.app

   Type: A
   Name: @
   Value: 75.2.60.5
   ```

3. **Enable HTTPS**:
   - Netlify will automatically provision SSL certificate
   - Force HTTPS redirect in Domain Settings

### Option B: Use Netlify Subdomain

1. **Customize Netlify Domain**:
   - Go to Site Settings → Domain Management
   - Click "Options" → "Edit site name"
   - Change to something like `kairodx.netlify.app`

## 🔧 Step 6: Configure Stripe Webhooks

Update your Stripe webhook endpoint:

1. **Stripe Dashboard** → Developers → Webhooks
2. **Update Endpoint URL**: `https://your-domain.com/api/stripe/webhook`
3. **Test Webhook**: Send a test event to verify

## 🧪 Step 7: Test Your Deployment

### Critical Tests:
- ✅ **Landing page loads**: `https://your-domain.com/kairodx.html`
- ✅ **App authentication**: Sign up/login functionality
- ✅ **Pricing page**: `https://your-domain.com/pricing`
- ✅ **Payment flow**: Test Stripe checkout
- ✅ **Dashboard access**: After authentication
- ✅ **API endpoints**: Test all functionality

## 🔄 Step 8: Set Up Auto-Deployment

Your site will automatically redeploy when you push to GitHub:

1. **Branch Deploy Settings**:
   - Production branch: `main`
   - Deploy previews: Enable for pull requests

2. **Build Hooks** (optional):
   - Create build hooks for manual triggers
   - Use for CMS or external integrations

## 📊 Step 9: Monitor and Optimize

### Analytics & Monitoring:
- Enable Netlify Analytics
- Set up error tracking (Sentry recommended)
- Monitor Core Web Vitals

### Performance Optimization:
- Your static export is already optimized
- Enable asset optimization in Netlify
- Monitor lighthouse scores

## 🛠️ Common Issues & Solutions

### Build Failures:
```bash
# Common fixes:
- Check Node.js version (should be 18.x)
- Verify all environment variables are set
- Check for TypeScript errors
- Ensure dependencies are installed
```

### API Route Issues:
```bash
# Static export limitations:
- API routes don't work with static export
- Use external API or Netlify Functions
- Consider switching to server-side rendering
```

### Environment Variable Issues:
```bash
# Debug steps:
- Verify all variables are set in Netlify
- Check variable names match exactly
- Restart deployment after adding variables
```

## 🎯 Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Stripe webhook endpoint updated
- [ ] Database migration applied in Supabase
- [ ] Custom domain configured with SSL
- [ ] Payment flow tested end-to-end
- [ ] Error tracking configured
- [ ] Analytics enabled
- [ ] Performance optimized

## 🔐 Security Considerations

- [ ] Force HTTPS redirect enabled
- [ ] Security headers configured (already in netlify.toml)
- [ ] Environment variables secured
- [ ] API rate limiting considered
- [ ] CORS properly configured

## 📱 PWA Configuration

Your app is PWA-ready with:
- ✅ Service Worker configured
- ✅ Web App Manifest
- ✅ Offline functionality
- ✅ Install prompts

## 🎉 You're Live!

Once deployed, your KairoDx app will be accessible at your custom domain with:

- 🏠 **Landing Page**: Beautiful marketing site
- 💳 **Pricing System**: 3-tier subscription with Stripe
- 🔐 **Authentication**: Secure user management
- 📊 **Dashboard**: Full client management system
- 💼 **Admin Panel**: User administration
- 📱 **PWA Features**: Mobile app experience

## 🚀 Next Steps

1. **Marketing**: Share your live URL
2. **Analytics**: Monitor user behavior
3. **Feedback**: Collect user feedback
4. **Iterate**: Continuous improvements
5. **Scale**: Monitor performance and optimize

Your KairoDx app is now live and ready for users! 🎊
