const fs = require('fs');
const path = require('path');

// DocuSign Configuration
const DOCUSIGN_CONFIG = {
  // JWT Authentication credentials
  user_id: process.env.DOCUSIGN_USER_ID || '8a69cf44-9064-4362-b1b4-693271545239',
  account_id: process.env.DOCUSIGN_ACCOUNT_ID || 'feda12e6-d12e-4dc9-b4d1-d2794cbe1ad6',
  // Note: DocuSign REST base path must include '/restapi'
  base_uri: process.env.DOCUSIGN_BASE_URI || 'https://demo.docusign.net/restapi',
  integration_key: process.env.DOCUSIGN_INTEGRATION_KEY || '0a222076-b83d-4395-9447-99e2b315cd5a',
  
  // RSA Private Key (stored securely)
  rsa_private_key: `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAm3VtJbrDkWalj9KJPlsT5YsjFsB7K9/J17THBmyPTX7PUyxF
Ra4swRg+02QlAyKIaOhkFPnGBPvhJPPWN7kTmxHGLhBkaj3Hx/VkYx3ALFkJHosh
TwAdPXHK7evSsPOfa9gjtDkh3Ev/zb6ZKaHhc5APbTDmmVeASZlACZLwFVn0giAa
az0LlovwuvXdVF1GNTuj4xcyg6KE9K2PB877fvbKQYm5+Z3uLc4fWbejBcoFRYTt
KV5U7NNqR12yfzhNNij/rdtr/AJJd1NVjPVab3AP9PCEKjw4hkzjy6t8zA6LHS8t
ENfiRprd1gxAT1CfTm9zRpM6RZtU+Wo7wjE+HwIDAQABAoIBAAzJ/sY1VKRwFNu9
nsPN+1eNeEAFaryjxvejbCInqSxfa8/0WuiOGSlzhKugV/knjKBQyfb9y2Aalp2T
H8Lqy2Wc8zhT6ebhmT9mfTE4P9iGJJ1qJb3ZjQ5Cf8bN+UHMcQeOuvU3JAV7DRrQ
fMozgpgeuF4rwTTJQYkMffurpmujH2T2wap+L6OeCGUM1rJ6piH2BWLwZB4Qu94W
fp9IWBgcdXPGG0BRa8oFsXoKUjGbpinPqQi81xK8kRWWQ33OO9L//9uQW3wNSFfr
3wh6wZ/A1SaP44jOEmwCs/Aw/IfI2nEdsRRlvNNr6x4lG7lyvmBvijfmWz2qtK1q
jIdeEwECgYEA22XJducvLfKXfmr827C+GDuWon6qRv+rS/VGXAMFQ2jMuZbuITka
QTwO/PcHszoh5vNdyD2bBvdvgf+7EOgISqVn6wZLeF6tKulSzUZ/x/XNZVo7SM52
G16jFbYrirad8gVRa+/Wck59pnOi/KvlHyrEcOYQK+nnIgyRJlrZAR8CgYEAtWTi
TSJLoj/m3baL+cQJIXVaHA4vSRTFA3I+yDHHZffkVaWekClMnWucQjwkL4UbD1GF
MKFRHnLzPZ8m774u9ZFnUotlKvuqtf1ELDz5C5oFMkog/O8bHrG2M0YBofHbhF5l
BZH5bRCywm7RKU6MDtCN8WGZuN2R8q0RlwivIwECgYEAiB36hD6iUstzmgceod5h
0f8GUgJr+midCh8+a8+j8FKQ0YQGca5Pz7FHS0KoEFY8umC7CoTOLeBN2kWi9bY/
jrBYbMQXBrMWlMz1hk368UBbEkqNBXqyZACvBcVj9keebo1GGsVOMtTnt+F+eWzc
Vh3einzyA4y2zbUmSLmMcNkCgYEAiN5ISv83poMlBeH5mEoswYw0o7qoPzJmvYT0
jkXROMVlCqLfE9O1tYo+61NJ0nlSw6o1H055UMpXcwWlcXxFHpHKLmRzv40JcCxb
xi1zlSdwCFQas/8OrYhV/DY0gSdnBWfcPem5FGxnFYJcXBiiYYNHtvx36x90QnII
NbgdvgECgYEAj3gdvane2uEDeRQVJbfD/9b6hgwcKy/hJCm7GmcJ2EFBdoi0NnkS
Pr32c4u91RlgfW1duNFNwfW9xX/DsRlsr4S5XrqZ5LFLtDALMH6RKxvQT4Vu0cTA
zZyxdmrLtMncZTagReE6nM3NJPeKeyYgdYr8WADI1xD3U1RddAxdFFw=
-----END RSA PRIVATE KEY-----`,
  
  // OAuth scopes for JWT
  scopes: ['signature', 'impersonation'],
  
  // JWT token expiration (1 hour)
  jwt_expiration: 3600
};

// Helper function to get RSA private key
function getRsaPrivateKey() {
  return DOCUSIGN_CONFIG.rsa_private_key;
}

// Helper function to create JWT assertion
function createJwtAssertion() {
  const jwt = require('jsonwebtoken');
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: DOCUSIGN_CONFIG.integration_key,
    sub: DOCUSIGN_CONFIG.user_id,
    aud: 'account-d.docusign.com',
    iat: now,
    exp: now + DOCUSIGN_CONFIG.jwt_expiration,
    scope: DOCUSIGN_CONFIG.scopes.join(' ')
  };
  
  return jwt.sign(payload, getRsaPrivateKey(), { algorithm: 'RS256' });
}

// Helper function to get access token
async function getAccessToken() {
  const axios = require('axios');
  
  try {
    console.log('🔑 Creating JWT assertion...');
    const jwt = createJwtAssertion();
    console.log('✅ JWT assertion created successfully');
    
    // For demo environment, use the correct OAuth endpoint
    const oauthUrl = 'https://account-d.docusign.com/oauth/token';
    console.log('🌐 Requesting access token from:', oauthUrl);
    
    const response = await axios.post(oauthUrl, 
      `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('✅ Access token received successfully');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Error getting DocuSign access token:');
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    console.error('Error message:', error.message);
    
    // Check if consent is required
    if (error.response?.data?.error === 'consent_required') {
      console.log('🔐 Consent required - user needs to authorize the application');
      throw new Error('consent_required');
    }
    
    // Check for other common errors
    if (error.response?.data?.error === 'invalid_grant') {
      console.error('🔑 Invalid grant - check your integration key and user ID');
      throw new Error('Invalid grant - check your DocuSign configuration');
    }
    
    if (error.response?.data?.error === 'invalid_client') {
      console.error('🔑 Invalid client - check your integration key');
      throw new Error('Invalid client - check your DocuSign integration key');
    }
    
    throw new Error(`Failed to authenticate with DocuSign: ${error.response?.data?.error || error.message}`);
  }
}

// Helper function to generate consent URL
function generateConsentUrl() {
  const scopes = DOCUSIGN_CONFIG.scopes.join(' ');
  const redirectUri = 'http://localhost:3001/api/docusign/consent-callback';
  
  return `https://account-d.docusign.com/oauth/auth?response_type=code&scope=${encodeURIComponent(scopes)}&client_id=${DOCUSIGN_CONFIG.integration_key}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

// Helper function to create DocuSign API client
async function createDocuSignClient() {
  const { ApiClient } = require('docusign-esign');
  const accessToken = await getAccessToken();

  const apiClient = new ApiClient();

  // Ensure we always have the REST API path
  const basePath = DOCUSIGN_CONFIG.base_uri.endsWith('/restapi')
    ? DOCUSIGN_CONFIG.base_uri
    : `${DOCUSIGN_CONFIG.base_uri.replace(/\/$/, '')}/restapi`;

  apiClient.setBasePath(basePath);
  apiClient.setOAuthBasePath('account-d.docusign.com');

  // Use standard Authorization header
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

  // Helpful warning if account_id looks like a GUID instead of numeric account ID
  try {
    if (/^[0-9a-fA-F\-]{10,}$/.test(DOCUSIGN_CONFIG.account_id) && /-/.test(DOCUSIGN_CONFIG.account_id)) {
      console.warn('DocuSign notice: DOCUSIGN_ACCOUNT_ID appears to be a GUID. DocuSign accountId is typically a numeric ID.');
    }
  } catch (_) {}

  return apiClient;
}

module.exports = {
  DOCUSIGN_CONFIG,
  getRsaPrivateKey,
  createJwtAssertion,
  getAccessToken,
  generateConsentUrl,
  createDocuSignClient
}; 