import React, { useState, useEffect, useRef } from 'react';
import DocuSignIntegration from './DocuSignIntegration';
import { generateJurisdictions } from '../statesData';

const AnimatedContractFlow = ({ 
  onClose, 
  customColors, 
  token 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('');
  const [contractDocument, setContractDocument] = useState('');
  const [amendmentInstruction, setAmendmentInstruction] = useState('');
  const [amendedContract, setAmendedContract] = useState(null);
  const [processingAmendment, setProcessingAmendment] = useState(false);
  const [showDocuSignForm, setShowDocuSignForm] = useState(false);
  
  // Animation states
  const [step1Visible, setStep1Visible] = useState(true);
  const [step2Visible, setStep2Visible] = useState(false);
  const [step3Visible, setStep3Visible] = useState(false);
  const [step4Visible, setStep4Visible] = useState(false);
  const [step5Visible, setStep5Visible] = useState(false);
  
  // Refs for scrolling
  const step1Ref = useRef(null);
  const step2Ref = useRef(null);
  const step3Ref = useRef(null);
  const step4Ref = useRef(null);
  const step5Ref = useRef(null);

  const jurisdictions = generateJurisdictions() || [];
  const selectedJurisdictionObj =
    (Array.isArray(jurisdictions) && jurisdictions.find((j) => j.id === selectedJurisdiction)) ||
    { name: '', documents: [] };
  const [remoteDocs, setRemoteDocs] = useState(null);
  
  useEffect(() => {
    async function fetchTemplates() {
      try {
        if (!selectedJurisdiction) return;
        const token = localStorage.getItem('token');
        const stateName = jurisdictions.find(j => j.id === selectedJurisdiction)?.name;
        if (!stateName) return;
        const res = await fetch(`http://localhost:3001/api/contracts/templates?state=${encodeURIComponent(stateName)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
            setRemoteDocs(data.data);
          } else {
            setRemoteDocs(null);
          }
        }
      } catch (e) {
        setRemoteDocs(null);
      }
    }
    fetchTemplates();
  }, [selectedJurisdiction]);

  const handleGenerateModifiedContract = async () => {
    if (!amendmentInstruction.trim()) return;
    
    setProcessingAmendment(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/contract-amendment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contractContent: contractDocument,
          amendmentInstruction: amendmentInstruction,
          clientId: 'client1' // Default client ID
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAmendedContract(result.amendedContract);
        
        // Animate to step 4
        await animateToStep(4);
      } else {
        const errorData = await response.json();
        alert(`Failed to generate contract: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      alert('Error generating contract. Please try again.');
    } finally {
      setProcessingAmendment(false);
    }
  };

  const handleContinueToSignature = async () => {
    // Animate to step 5
    await animateToStep(5);
  };

  const animateToStep = async (step) => {
    const delay = 300; // 300ms delay between collapse and reveal
    
    if (step === 2) {
      // Collapse step 1
      setStep1Visible(false);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Reveal step 2
      setStep2Visible(true);
      setCurrentStep(2);
      
      // Scroll to step 2
      setTimeout(() => {
        step2Ref.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    } else if (step === 3) {
      // Collapse step 2
      setStep2Visible(false);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Reveal step 3
      setStep3Visible(true);
      setCurrentStep(3);
      
      // Scroll to step 3
      setTimeout(() => {
        step3Ref.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    } else if (step === 4) {
      // Collapse step 3
      setStep3Visible(false);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Reveal step 4
      setStep4Visible(true);
      setCurrentStep(4);
      
      // Scroll to step 4
      setTimeout(() => {
        step4Ref.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    } else if (step === 5) {
      // Collapse step 4
      setStep4Visible(false);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Reveal step 5
      setStep5Visible(true);
      setCurrentStep(5);
      setShowDocuSignForm(true);
      
      // Scroll to step 5
      setTimeout(() => {
        step5Ref.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  };

  const handleBackToStep1 = () => {
    setStep2Visible(false);
    setStep3Visible(false);
    setStep4Visible(false);
    setStep5Visible(false);
    setShowDocuSignForm(false);
    setStep1Visible(true);
    setCurrentStep(1);
    setAmendedContract(null);
    setAmendmentInstruction('');
    setSelectedJurisdiction('');
    setContractDocument('');
    
    setTimeout(() => {
      step1Ref.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  };

  const handleBackToStep2 = () => {
    setStep3Visible(false);
    setStep4Visible(false);
    setStep5Visible(false);
    setShowDocuSignForm(false);
    setStep2Visible(true);
    setCurrentStep(2);
    
    setTimeout(() => {
      step2Ref.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  };

  const handleBackToStep3 = () => {
    setStep4Visible(false);
    setStep5Visible(false);
    setShowDocuSignForm(false);
    setStep3Visible(true);
    setCurrentStep(3);
    
    setTimeout(() => {
      step3Ref.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  };

  const handleBackToStep4 = () => {
    setStep5Visible(false);
    setShowDocuSignForm(false);
    setStep4Visible(true);
    setCurrentStep(4);
    
    setTimeout(() => {
      step4Ref.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
            {/* Progress Bar */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-blue-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              currentStep >= 1 ? 'bg-blue-500 text-white shadow-lg progress-step-active' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <span className="text-sm font-semibold transition-colors duration-300">Jurisdiction</span>
          </div>
          <div className={`w-6 h-0.5 transition-all duration-300 ${
            currentStep >= 2 ? 'bg-blue-500' : 'bg-gray-300'
          }`}></div>
          <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-blue-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              currentStep >= 2 ? 'bg-blue-500 text-white shadow-lg progress-step-active' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <span className="text-sm font-semibold transition-colors duration-300">Document</span>
          </div>
          <div className={`w-6 h-0.5 transition-all duration-300 ${
            currentStep >= 3 ? 'bg-blue-500' : 'bg-gray-300'
          }`}></div>
          <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-blue-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              currentStep >= 3 ? 'bg-blue-500 text-white shadow-lg progress-step-active' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
            <span className="text-sm font-semibold transition-colors duration-300">Modify</span>
          </div>
          <div className={`w-6 h-0.5 transition-all duration-300 ${
            currentStep >= 4 ? 'bg-blue-500' : 'bg-gray-300'
          }`}></div>
          <div className={`flex items-center space-x-2 ${currentStep >= 4 ? 'text-blue-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              currentStep >= 4 ? 'bg-blue-500 text-white shadow-lg progress-step-active' : 'bg-gray-300 text-gray-600'
            }`}>
              4
            </div>
            <span className="text-sm font-semibold transition-colors duration-300">Review</span>
          </div>
          <div className={`w-6 h-0.5 transition-all duration-300 ${
            currentStep >= 5 ? 'bg-blue-500' : 'bg-gray-300'
          }`}></div>
          <div className={`flex items-center space-x-2 ${currentStep >= 5 ? 'text-blue-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              currentStep >= 5 ? 'bg-blue-500 text-white shadow-lg progress-step-active' : 'bg-gray-300 text-gray-600'
            }`}>
              5
            </div>
            <span className="text-sm font-semibold transition-colors duration-300">Sign</span>
          </div>
        </div>
      </div>

      {/* Step 1: Jurisdiction Selection */}
      <div 
        ref={step1Ref}
        id="step-1"
        className={`transition-all duration-500 ease-in-out ${
          step1Visible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform -translate-y-8 pointer-events-none'
        }`}
        style={{
          height: step1Visible ? 'auto' : '0px',
          overflow: step1Visible ? 'visible' : 'hidden'
        }}
      >
        <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8 liquid-glass-hover"
             style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg liquid-glass-hover">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
              Select Jurisdiction
            </h3>
            <p className="text-lg" style={{ color: customColors.textSecondary }}>
              Choose the state or jurisdiction for your contract
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(jurisdictions) && jurisdictions.length > 0 && jurisdictions.map((jurisdiction) => (
              <button
                key={jurisdiction.id}
                onClick={() => {
                  setSelectedJurisdiction(jurisdiction.id);
                  animateToStep(2);
                }}
                className="p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg text-left liquid-glass-hover"
                style={{ 
                  borderColor: customColors.cardBorder,
                  backgroundColor: customColors.cardBackground
                }}
              >
                <h5 className="text-lg font-bold mb-2" style={{ color: customColors.textPrimary }}>
                  {jurisdiction.name}
                </h5>
                <p className="text-sm" style={{ color: customColors.textSecondary }}>
                  {jurisdiction.documents.length} document types available
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

            {/* Step 2: Document Selection */}
      <div 
        ref={step2Ref}
        id="step-2"
        className={`transition-all duration-500 ease-in-out ${
          step2Visible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-8 pointer-events-none'
        }`}
        style={{
          height: step2Visible ? 'auto' : '0px',
          overflow: step2Visible ? 'visible' : 'hidden'
        }}
      >
        <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8 liquid-glass-hover"
             style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}>
          
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg liquid-glass-hover">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
                Select Document Type
              </h3>
              <p className="text-lg" style={{ color: customColors.textSecondary }}>
                Choose the contract document you want to modify
              </p>
            </div>
            <button
              onClick={handleBackToStep1}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg btn-animate hover:bg-white hover:bg-opacity-10"
              style={{ color: customColors.textSecondary }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm mb-4" style={{ color: customColors.textSecondary }}>
              Selected: <span className="font-semibold" style={{ color: customColors.textPrimary }}>
                {selectedJurisdictionObj.name}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Array.isArray(remoteDocs)
              ? remoteDocs
              : Array.isArray(selectedJurisdictionObj.documents)
                ? selectedJurisdictionObj.documents
                : []
              ).map((document, index) => (
              <button
                key={index}
                onClick={() => {
                  setContractDocument(document.content);
                  animateToStep(3);
                }}
                className="p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg text-left liquid-glass-hover"
                style={{ 
                  borderColor: customColors.cardBorder,
                  backgroundColor: customColors.cardBackground
                }}
              >
                <h5 className="text-lg font-bold mb-2" style={{ color: customColors.textPrimary }}>
                  {document.name}
                </h5>
                <p className="text-sm" style={{ color: customColors.textSecondary }}>
                  {Array.isArray(remoteDocs) ? 'Loaded from database' : `Standard form for ${selectedJurisdictionObj.name}`}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 3: Contract Modification */}
      <div 
        ref={step3Ref}
        id="step-3"
        className={`transition-all duration-500 ease-in-out ${
          step3Visible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-8 pointer-events-none'
        }`}
        style={{
          height: step3Visible ? 'auto' : '0px',
          overflow: step3Visible ? 'visible' : 'hidden'
        }}
      >
        <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8 liquid-glass-hover"
             style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}>
          
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg liquid-glass-hover">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
                Modify Your Contract
              </h3>
              <p className="text-lg" style={{ color: customColors.textSecondary }}>
                Describe your modifications in natural language
              </p>
            </div>
            <button
              onClick={handleBackToStep2}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg btn-animate hover:bg-white hover:bg-opacity-10"
              style={{ color: customColors.textSecondary }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          <div className="mb-6 p-4 rounded-lg border-2"
               style={{ 
                 borderColor: customColors.cardBorder,
                 backgroundColor: 'rgba(59, 130, 246, 0.1)'
               }}>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <p className="text-sm" style={{ color: customColors.textSecondary }}>
                  <span className="font-semibold">Jurisdiction:</span> 
                  <span className="ml-2" style={{ color: customColors.textPrimary }}>
                    {jurisdictions.find(j => j.id === selectedJurisdiction)?.name}
                  </span>
                </p>
                <p className="text-sm mt-1" style={{ color: customColors.textSecondary }}>
                  <span className="font-semibold">Document:</span> 
                  <span className="ml-2" style={{ color: customColors.textPrimary }}>
                    {jurisdictions.find(j => j.id === selectedJurisdiction)?.documents?.find?.(d => d?.content === contractDocument)?.name || 'Selected Document'}
                  </span>
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary }}>
                Describe your modifications:
              </label>
              <textarea
                value={amendmentInstruction}
                onChange={(e) => setAmendmentInstruction(e.target.value)}
                placeholder="e.g., Add a 30-day inspection period, change the closing date to March 15th, include a home warranty..."
                className="w-full p-4 rounded-lg border-2 resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent liquid-glass-hover"
                rows={4}
                style={{ 
                  borderColor: customColors.cardBorder,
                  backgroundColor: customColors.cardBackground,
                  color: customColors.textPrimary
                }}
              />
            </div>

            {/* Live preview of the document being edited */}
            {contractDocument && (
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary }}>
                  Current document preview:
                </label>
                <div className="p-4 rounded-lg border-2 max-h-72 overflow-y-auto"
                     style={{ 
                       borderColor: customColors.cardBorder,
                       backgroundColor: 'rgba(255, 255, 255, 0.05)'
                     }}>
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: customColors.textPrimary }}>
                    {contractDocument}
                  </pre>
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={handleGenerateModifiedContract}
                disabled={!amendmentInstruction.trim() || processingAmendment}
                className="px-8 py-4 rounded-lg font-bold flex items-center space-x-3 mx-auto disabled:opacity-50 btn-animate liquid-glass-hover"
                style={{ 
                  backgroundColor: customColors.primaryButton,
                  color: 'white'
                }}
              >
                {processingAmendment ? (
                  <>
                    <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Generate Modified Contract</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: Modified Contract Review */}
      <div 
        ref={step4Ref}
        id="step-4"
        className={`transition-all duration-500 ease-in-out ${
          step4Visible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-8 pointer-events-none'
        }`}
        style={{
          height: step4Visible ? 'auto' : '0px',
          overflow: step4Visible ? 'visible' : 'hidden'
        }}
      >
        <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8 liquid-glass-hover"
             style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}>
          
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg liquid-glass-hover">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
                Review Modified Contract
              </h3>
              <p className="text-lg" style={{ color: customColors.textSecondary }}>
                Review your contract before sending for signature
              </p>
            </div>
            <button
              onClick={handleBackToStep3}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg btn-animate hover:bg-white hover:bg-opacity-10"
              style={{ color: customColors.textSecondary }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          {amendedContract && (
            <div className="space-y-6">
              <div>
                <h5 className="text-lg font-bold mb-4" style={{ color: customColors.textPrimary }}>
                  Modified Contract:
                </h5>
                <div className="p-6 rounded-lg border-2 max-h-96 overflow-y-auto backdrop-blur-sm"
                     style={{ 
                       borderColor: customColors.cardBorder,
                       backgroundColor: 'rgba(255, 255, 255, 0.05)'
                     }}>
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: customColors.textPrimary }}>
                    {amendedContract}
                  </pre>
                </div>
              </div>
              
              <div className="text-center">
                <button
                  onClick={handleContinueToSignature}
                  className="px-8 py-4 rounded-lg font-bold flex items-center space-x-3 mx-auto btn-animate liquid-glass-hover"
                  style={{ 
                    backgroundColor: customColors.secondaryButton,
                    color: 'white'
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Continue to Signature</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 5: DocuSign Integration */}
      <div 
        ref={step5Ref}
        id="step-5"
        className={`transition-all duration-500 ease-in-out ${
          step5Visible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-8 pointer-events-none'
        }`}
        style={{
          height: step5Visible ? 'auto' : '0px',
          overflow: step5Visible ? 'visible' : 'hidden'
        }}
      >
        <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8 liquid-glass-hover"
             style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}>
          
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg liquid-glass-hover">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
                Electronic Signature
              </h3>
              <p className="text-lg" style={{ color: customColors.textSecondary }}>
                Open DocuSign to place fields, then send for signature
              </p>
            </div>
            <button
              onClick={handleBackToStep4}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg btn-animate hover:bg-white hover:bg-opacity-10"
              style={{ color: customColors.textSecondary }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          {showDocuSignForm && amendedContract && (
            <DocuSignIntegration
              amendedContract={amendedContract}
              onClose={onClose}
              customColors={customColors}
              token={token}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimatedContractFlow; 