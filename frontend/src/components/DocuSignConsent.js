import React, { useState, useEffect } from 'react';

const DocuSignConsent = ({ onConsentGranted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [popupWindow, setPopupWindow] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // Listen for messages from the popup window
  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept messages from our own domain
      if (event.origin !== 'http://localhost:3000' && event.origin !== 'http://localhost:3001') {
        return;
      }

      if (event.data.type === 'DOCUSIGN_CONSENT_SUCCESS') {
        console.log('DocuSign consent successful, closing popup');
        if (popupWindow && !popupWindow.closed) {
          popupWindow.close();
        }
        setPopupWindow(null);
        setIsCheckingAuth(false);
        
        // Call the callback to continue with the original flow
        if (onConsentGranted) {
          onConsentGranted();
        }
      } else if (event.data.type === 'DOCUSIGN_CONSENT_ERROR') {
        console.log('DocuSign consent failed:', event.data.error);
        if (popupWindow && !popupWindow.closed) {
          popupWindow.close();
        }
        setPopupWindow(null);
        setIsCheckingAuth(false);
        setError('Authorization failed. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [popupWindow, onConsentGranted]);

  // Check if popup is closed
  useEffect(() => {
    if (popupWindow) {
      const checkClosed = setInterval(() => {
        if (popupWindow.closed) {
          setPopupWindow(null);
          setIsCheckingAuth(false);
          clearInterval(checkClosed);
        }
      }, 1000);

      return () => clearInterval(checkClosed);
    }
  }, [popupWindow]);

  const handleGetConsentUrl = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/docusign/consent', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        // Open DocuSign consent URL in a popup window
        const popup = window.open(
          result.data.consentUrl, 
          'docusign_consent', 
          'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
        );
        
        if (popup) {
          setPopupWindow(popup);
          setIsCheckingAuth(true);
        } else {
          setError('Popup blocked! Please allow popups for this site and try again.');
        }
      } else {
        setError(result.error || 'Failed to get consent URL');
      }
    } catch (error) {
      console.error('Error getting consent URL:', error);
      setError('Failed to get consent URL. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsentComplete = () => {
    // This will be called when user returns from DocuSign consent
    if (onConsentGranted) {
      onConsentGranted();
    }
  };

  return (
    <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8 liquid-glass-hover max-w-md mx-auto"
         style={{ 
           backgroundColor: 'rgba(255, 255, 255, 0.1)',
           borderColor: 'rgba(255, 255, 255, 0.2)'
         }}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-3" style={{ color: '#F8EEDB' }}>
          DocuSign Authorization Required
        </h3>
        <p className="text-lg" style={{ color: '#9CA3AF' }}>
          To use DocuSign electronic signatures, you need to authorize this application with your DocuSign account.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border-2"
             style={{ 
               backgroundColor: 'rgba(239, 68, 68, 0.1)',
               borderColor: 'rgba(239, 68, 68, 0.3)',
               color: '#FCA5A5'
             }}>
          {error}
        </div>
      )}

      {isCheckingAuth && (
        <div className="mb-4 p-3 rounded-lg border-2"
             style={{ 
               backgroundColor: 'rgba(59, 130, 246, 0.1)',
               borderColor: 'rgba(59, 130, 246, 0.3)',
               color: '#93C5FD'
             }}>
          <div className="flex items-center space-x-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Authorization in progress... Please complete the process in the popup window.</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleGetConsentUrl}
          disabled={isLoading || isCheckingAuth}
          className="w-full px-6 py-3 rounded-lg font-bold flex items-center justify-center space-x-2 disabled:opacity-50 btn-animate liquid-glass-hover"
          style={{ 
            backgroundColor: isLoading || isCheckingAuth ? '#6B7280' : '#1E85F2',
            color: 'white'
          }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Getting Authorization URL...</span>
            </>
          ) : isCheckingAuth ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Authorization in Progress...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Authorize DocuSign</span>
            </>
          )}
        </button>

        {!isCheckingAuth && (
          <button
            onClick={handleConsentComplete}
            className="w-full px-6 py-3 rounded-lg font-bold flex items-center justify-center space-x-2 btn-animate liquid-glass-hover"
            style={{ 
              backgroundColor: '#10B981',
              color: 'white'
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>I've Completed Authorization</span>
          </button>
        )}
      </div>

      <div className="mt-4 p-4 rounded-lg border-2"
           style={{ 
             backgroundColor: 'rgba(255, 255, 255, 0.05)',
             borderColor: 'rgba(255, 255, 255, 0.1)'
           }}>
        <p className="mb-2 font-bold" style={{ color: '#F8EEDB' }}>Instructions:</p>
        <ol className="list-decimal list-inside space-y-1 text-sm" style={{ color: '#9CA3AF' }}>
          <li>Click "Authorize DocuSign" to open the authorization popup</li>
          <li>Sign in to your DocuSign account if prompted</li>
          <li>Review and accept the permissions requested</li>
          <li>The popup will automatically close when authorization is complete</li>
          <li>You'll be returned to continue your original task</li>
        </ol>
      </div>
    </div>
  );
};

export default DocuSignConsent; 