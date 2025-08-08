import React, { useState } from 'react';
import DocuSignConsent from './DocuSignConsent';

const DocuSignIntegration = ({ 
  amendedContract, 
  onClose, 
  customColors, 
  token 
}) => {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [docuSignUrl, setDocuSignUrl] = useState('');
  const [showDocuSignFrame, setShowDocuSignFrame] = useState(false);
  const [processingDocuSign, setProcessingDocuSign] = useState(false);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [envelopeId, setEnvelopeId] = useState('');

  const handleCreateDocuSignEnvelope = async () => {
    if (!amendedContract || !clientName || !clientEmail) {
      alert('Please provide client name and email');
      return;
    }

    setProcessingDocuSign(true);

    try {
      const response = await fetch('http://localhost:3001/api/docusign/create-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contractContent: amendedContract,
          clientName,
          clientEmail,
          subject: `Contract for Signature - ${clientName}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('DocuSign envelope created (sender view):', result);
        
        setDocuSignUrl(result.data.senderViewUrl);
        setEnvelopeId(result.data.envelopeId);
        setShowDocuSignFrame(true);
        
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('DocuSign error response:', errorData);
        
        if (errorData.error === 'consent_required') {
          // Show consent form
          console.log('Setting showConsentForm to true');
          setShowConsentForm(true);
        } else {
          console.error('Failed to create DocuSign envelope', response.status, errorData);
          alert(`Failed to create DocuSign envelope: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error creating DocuSign envelope:', error);
      alert('Error creating DocuSign envelope. Please try again.');
    } finally {
      setProcessingDocuSign(false);
    }
  };

  const handleCloseDocuSignFrame = () => {
    setShowDocuSignFrame(false);
    setDocuSignUrl('');
    setEnvelopeId('');
    setClientName('');
    setClientEmail('');
    onClose();
  };

  const handleConsentGranted = () => {
    setShowConsentForm(false);
    // Retry creating the envelope
    handleCreateDocuSignEnvelope();
  };

  // Show consent form if needed - CHECK THIS FIRST
  console.log('Current showConsentForm state:', showConsentForm);
  if (showConsentForm) {
    console.log('Rendering consent form');
    return (
      <div className="mt-8">
        <DocuSignConsent onConsentGranted={handleConsentGranted} />
      </div>
    );
  }

  if (showDocuSignFrame && docuSignUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                📝 Electronic Signature - DocuSign
              </h3>
              <p className="text-sm text-gray-600">
                Envelope ID: {envelopeId}
              </p>
            </div>
            <button
              onClick={handleCloseDocuSignFrame}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* iFrame Container */}
          <div className="flex-1 p-4">
            <iframe 
              src={docuSignUrl} 
              width="100%" 
              height="100%" 
              frameBorder="0"
              title="DocuSign Electronic Signature"
              className="rounded-lg border"
            />
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Client: {clientName} ({clientEmail})
              </p>
              <button
                onClick={handleCloseDocuSignFrame}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg border-2 liquid-glass-hover"
         style={{ 
           borderColor: customColors.cardBorder,
           backgroundColor: 'rgba(59, 130, 246, 0.1)'
         }}>
      <h5 className="text-lg font-bold mb-4" style={{ color: customColors.textPrimary }}>
        📝 Prepare and Send for Signature
      </h5>
      <p className="text-sm mb-4" style={{ color: customColors.textSecondary }}>
        Enter your client's information. You'll be taken to DocuSign to place signature fields, then send.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary }}>
            Client Name *
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Enter client's full name"
            className="w-full p-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent liquid-glass-hover"
            style={{ 
              borderColor: customColors.cardBorder,
              backgroundColor: customColors.cardBackground,
              color: customColors.textPrimary
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary }}>
            Client Email *
          </label>
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="Enter client's email address"
            className="w-full p-3 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent liquid-glass-hover"
            style={{ 
              borderColor: customColors.cardBorder,
              backgroundColor: customColors.cardBackground,
              color: customColors.textPrimary
            }}
          />
        </div>
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={handleCreateDocuSignEnvelope}
          disabled={!clientName || !clientEmail || processingDocuSign}
          className="px-6 py-3 rounded-lg font-bold flex items-center space-x-2 disabled:opacity-50 btn-animate liquid-glass-hover"
          style={{ 
            backgroundColor: customColors.secondaryButton,
            color: 'white'
          }}
        >
          {processingDocuSign ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Opening DocuSign...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Open DocuSign</span>
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-lg font-bold flex items-center space-x-2 btn-animate liquid-glass-hover"
          style={{ 
            backgroundColor: '#6B7280',
            color: 'white'
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
};

export default DocuSignIntegration; 