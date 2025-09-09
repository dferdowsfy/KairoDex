# KairoDex Production Environment Variables (sanitized)

> WARNING: This file previously contained live API keys and private credentials. All secret values
> have been redacted. Do NOT commit secrets. Instead set them directly in the Netlify dashboard
> (Site Settings > Environment > Environment variables) or store them in a secure secret manager.

## Instructions:
1. Log into your Netlify dashboard
2. Go to your site settings
3. Navigate to "Environment Variables" section
4. Use the "Import from a .env file" option if helpful, but DO NOT store live secrets in the repo
5. Copy the variable names below and paste their values into Netlify (or use your secret manager)

## Environment Variables (values redacted)

NEXT_PUBLIC_SITE_URL=https://kairodx.com
SUPABASE_URL=https://invadbpskztiooidhyui.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<REDACTED - set in Netlify UI>
SUPABASE_CLIENTS_TABLE=AgentHub_DB
SUPABASE_ANON_KEY=<REDACTED - set in Netlify UI>
OPENAI_API_KEY=<REDACTED - rotate and set in Netlify UI>
OPENAI_TEXT_MODEL=gpt-4o-mini-search-preview
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
OPENAI_PROMPT_ID=<REDACTED - set in Netlify UI>
OPENROUTER_API_KEY=<REDACTED - set in Netlify UI>
MARKET_OPENROUTER_MODEL=openai/gpt-4o-mini-search-preview
AI_MODEL=openai/gpt-4o-mini-search-preview
GEMINI_API_KEY=<REDACTED - set in Netlify UI>
GEMINI_TEXT_MODEL=gemini-1.5-flash
GOOGLE_CLIENT_EMAIL=agenthub-googlesheet@agenthub-467814.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=<REDACTED - private key omitted; set via Netlify or secret manager>
DOCUSIGN_ENV=demo
DOCUSIGN_CLIENT_ID=<REDACTED - set in Netlify UI>
DOCUSIGN_USER_ID=<REDACTED - set in Netlify UI>
DOCUSIGN_ACCOUNT_ID=<REDACTED - set in Netlify UI>
DOCUSIGN_PRIVATE_KEY_BASE64=<REDACTED - private key omitted>
DOCUSIGN_REDIRECT_URI=https://kairodx.com/api/docusign/callback

## Notes:
1. All AI components are standardized to use gpt-4o-mini-search-preview
2. Site URL is set to production domain: https://kairodx.com
3. DO NOT commit production keys. If secrets were committed previously you'll need to rotate them.
4. To fully remove secrets from git history use git filter-repo or contact your security team.
