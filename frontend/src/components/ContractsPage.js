import React, { useEffect, useRef, useState } from 'react';
import { generateJurisdictions } from '../statesData';

const ContractsPage = ({ customColors, token, onModifySelected, clientId }) => {
  const jurisdictions = generateJurisdictions();
  const [selectedState, setSelectedState] = useState('');
  const [documents, setDocuments] = useState([]);
  const [templatesMap, setTemplatesMap] = useState({}); // { docName: content }
  const [selectedDoc, setSelectedDoc] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showActionPopover, setShowActionPopover] = useState(false);
  const [hasShownActionPopover, setHasShownActionPopover] = useState(false);
  const [amendmentInstruction, setAmendmentInstruction] = useState('');
  const [processingAmendment, setProcessingAmendment] = useState(false);
  const [amendmentError, setAmendmentError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef(null);
  const [yearBuilt, setYearBuilt] = useState('');

  // Replace common state placeholders in template bodies
  const applyStateTokens = (text, state) => {
    if (typeof text !== 'string') return '';
    return text
      .replace(/\{\{?\s*STATE(?:_NAME)?\s*\}?\}/gi, state)
      .replace(/\[STATE(?: NAME)?\]/gi, state);
  };

  // Required document labels for generation output
  const getRequiredDocsForState = (state, includeLead) => {
    if (!state) return [];
    const base = [
      'Residential Purchase Agreement',
      'Seller Property Disclosure',
      'Agency Disclosure',
      'State-Required Addenda'
    ];
    if (includeLead === undefined || includeLead) base.splice(2, 0, 'Lead-Based Paint Disclosure');
    return base;
  };

  // Heuristic to detect if a required document is present among server-provided names
  const hasDocByHeuristic = (docNames, requiredLabel, state) => {
    const names = Array.from(docNames, (n) => (n || '').toLowerCase());
    const label = (requiredLabel || '').toLowerCase();
    const containsAll = (substrs) => substrs.every((s) => names.some((n) => n.includes(s)));

    // Arizona purchase contract
    if (state === 'Arizona' && label.includes('purchase')) {
      return names.some(
        (n) => n.includes('arizona') && (n.includes('residential') || n.includes('resale')) && (n.includes('purchase') || n.includes('contract'))
      );
    }

    if (label.includes('purchase') && label.includes('agreement')) {
      return containsAll(['purchase', 'agreement']) || containsAll(['residential', 'purchase']);
    }
    if (label.includes('seller') && label.includes('disclosure')) {
      return names.some((n) => n.includes('seller') && n.includes('disclosure')) || names.some((n) => n.includes('spds'));
    }
    if (label.includes('hoa') && label.includes('addendum')) {
      return names.some((n) => n.includes('hoa') && n.includes('addendum'));
    }
    if (label.includes('lead') && label.includes('paint')) {
      return names.some((n) => n.includes('lead') && n.includes('paint'));
    }
    if (label.includes('wire') && label.includes('fraud')) {
      return names.some((n) => n.includes('wire') && n.includes('fraud'));
    }
    return names.includes(label);
  };

  useEffect(() => {
    async function loadTemplates() {
      if (!selectedState) return;
      setLoading(true);
      try {
        // Ask backend to generate a complete set dynamically
        const params = new URLSearchParams({ state: selectedState });
        if (yearBuilt && /^\d{4}$/.test(yearBuilt)) {
          params.set('yearBuilt', yearBuilt);
        }
        const res = await fetch(`http://localhost:3001/api/contracts/generate?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const serverRows = Array.isArray(data?.data) ? data.data : [];
          const serverNames = serverRows.map((r) => r.name).filter(Boolean);
          const serverMap = Object.fromEntries(
            serverRows.map((r) => [r.name, applyStateTokens(r.content || '', selectedState)])
          );

          // Determine if lead disclosure is included by backend and build expected list accordingly
          const includeLead = serverNames.some((n) => /lead/i.test(n));
          const requiredList = getRequiredDocsForState(selectedState, includeLead);
          const docNameSet = new Set(serverNames);
          const finalMap = { ...serverMap };
          const finalList = [...serverNames];

          for (const requiredLabel of requiredList) {
            const present = hasDocByHeuristic(docNameSet, requiredLabel, selectedState);
            if (!present) {
              if (!docNameSet.has(requiredLabel)) {
                docNameSet.add(requiredLabel);
                finalList.push(requiredLabel);
              }
              finalMap[requiredLabel] = `Missing ${requiredLabel} for ${selectedState} – Please upload or update source files.`;
            }
          }

          setDocuments(finalList);
          setTemplatesMap(finalMap);
          const defaultDoc = finalList.find((n) => /purchase|resale|contract/i.test(n)) || finalList[0] || '';
          setSelectedDoc(defaultDoc);
          setContent(finalMap[defaultDoc] || '');
        } else {
          const requiredList = getRequiredDocsForState(selectedState, true);
          const placeholderMap = Object.fromEntries(
            requiredList.map((label) => [label, `Missing ${label} for ${selectedState} – Please upload or update source files.`])
          );
          setDocuments(requiredList);
          setTemplatesMap(placeholderMap);
          setSelectedDoc(requiredList[0] || '');
          setContent(placeholderMap[requiredList[0]] || '');
        }
      } catch (e) {
        // On network failure, show placeholders for required documents only
        const requiredList = getRequiredDocsForState(selectedState, true);
        const placeholderMap = Object.fromEntries(
          requiredList.map((label) => [label, `Missing ${label} for ${selectedState} – Please upload or update source files.`])
        );
        setDocuments(requiredList);
        setTemplatesMap(placeholderMap);
        setSelectedDoc(requiredList[0] || '');
        setContent(placeholderMap[requiredList[0]] || '');
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, [selectedState, token, yearBuilt]);

  // When document changes, update preview content from the available map
  useEffect(() => {
    if (!selectedDoc) return;
    // Prefer explicit uploaded or amended content if already present
    const next = templatesMap[selectedDoc];
    if (typeof next === 'string') {
      setContent(next);
    }
  }, [selectedDoc, templatesMap]);

  // Open subtle popover when a template is selected (only once per page view)
  useEffect(() => {
    if (selectedState && selectedDoc && !hasShownActionPopover) {
      setShowActionPopover(true);
      setHasShownActionPopover(true);
    }
  }, [selectedState, selectedDoc, hasShownActionPopover]);

  return (
    <div className="pt-24 pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: customColors.textPrimary }}>Contracts</h1>
        <p className="text-lg" style={{ color: customColors.textSecondary }}>Select a state and document to view and prepare contracts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border p-6" style={{ background: customColors.gradientCardBlue, borderColor: customColors.cardBorder }}>
          <h3 className="font-semibold mb-4" style={{ color: customColors.textPrimary }}>State</h3>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full p-3 rounded-lg border"
            style={{ backgroundColor: '#FFFFFF', borderColor: customColors.cardBorder, color: '#0F172A' }}
          >
            <option value="" style={{ color: '#6B7280' }}>Select state</option>
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.name} style={{ color: '#0F172A' }}>{j.name}</option>
            ))}
          </select>
          <div className="mt-4">
            <label className="block text-sm mb-2" style={{ color: customColors.textPrimary }} htmlFor="yearBuilt">Year Built (optional)</label>
            <input
              id="yearBuilt"
              type="number"
              inputMode="numeric"
              min="1800"
              max={new Date().getFullYear()}
              placeholder="e.g., 1975"
              value={yearBuilt}
              onChange={(e) => setYearBuilt(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              className="w-full p-3 rounded-lg border"
              style={{ backgroundColor: '#FFFFFF', borderColor: customColors.cardBorder, color: '#0F172A' }}
            />
            <p className="text-xs mt-1" style={{ color: customColors.textSecondary }}>Used to determine whether the Lead-Based Paint Disclosure is required (pre-1978).</p>
          </div>
        </div>

        <div className="rounded-xl border p-6" style={{ background: customColors.gradientCardGreen, borderColor: customColors.cardBorder }}>
          <h3 className="font-semibold mb-4" style={{ color: customColors.textPrimary }}>Document</h3>
          <select
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            className="w-full p-3 rounded-lg border"
            style={{ backgroundColor: '#FFFFFF', borderColor: customColors.cardBorder, color: '#0F172A' }}
            disabled={!selectedState || loading}
          >
            {documents.length === 0 && <option value="" style={{ color: '#6B7280' }}>{loading ? 'Loading…' : 'No templates found'}</option>}
            {documents.map((d) => (
              <option key={d} value={d} style={{ color: '#0F172A' }}>{d}</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border p-6" style={{ background: customColors.gradientCardPurple, borderColor: customColors.cardBorder }}>
          <h3 className="font-semibold mb-4" style={{ color: customColors.textPrimary }}>Actions</h3>
          <div className="space-x-3 relative inline-block">
            <button
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: customColors.primaryButton }}
              onClick={() => {
                if (!selectedState || !selectedDoc) return;
                setShowActionPopover(true);
              }}
            >
              Modify
            </button>
          </div>
        </div>
      </div>

      {/* Upload your own document */}
      <div className="mt-6 rounded-xl border p-6" style={{ background: customColors.gradientCardBlue, borderColor: customColors.cardBorder }}>
        <h3 className="font-semibold mb-4" style={{ color: customColors.textPrimary }}>Upload Your Own Document</h3>
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx"
            onChange={async (e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              try {
                setUploadError('');
                setUploading(true);
                const formData = new FormData();
                formData.append('file', file);
                formData.append('clientId', clientId || 'contract-page');
                const res = await fetch('http://localhost:3001/api/upload-client-notes', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  },
                  body: formData
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error(err.error || 'Failed to upload file');
                }
                const result = await res.json();
                const fileName = result.fileName || file.name;
                const fileContent = result.content || '';
                setUploadedFileName(fileName);
                // Merge uploaded file into templates map so preview effect does not wipe content
                setTemplatesMap((prev) => ({ ...prev, [fileName]: fileContent }));
                // Ensure the uploaded file appears as a selectable document (optional)
                setDocuments((prev) => (prev.includes(fileName) ? prev : [fileName, ...prev]));
                setSelectedDoc(fileName);
                setContent(fileContent);
                setShowActionPopover(true);
              } catch (err) {
                setUploadError(err.message || 'Upload failed');
              } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: customColors.primaryButton, opacity: uploading ? 0.7 : 1 }}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <div className="text-sm" style={{ color: customColors.textSecondary }}>
            {uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Supported: .txt, .pdf, .doc, .docx'}
          </div>
        </div>
        {uploadError && <div className="mt-2 text-sm text-red-500">{uploadError}</div>}
      </div>

      <div className="mt-6 rounded-xl border p-6" style={{ background: customColors.gradientCardGray, borderColor: customColors.cardBorder }}>
        <h3 className="font-semibold mb-4" style={{ color: customColors.textPrimary }}>Preview</h3>
        <div className="min-h-[300px] p-4 rounded border" style={{ backgroundColor: 'white', borderColor: customColors.cardBorder }}>
          <pre className="whitespace-pre-wrap text-sm" style={{ color: '#0F172A' }}>{content || 'Select a state and document to load a template, or upload your own document above.'}</pre>
        </div>
      </div>

      {/* Subtle action popover */}
      {showActionPopover && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setShowActionPopover(false)}
        />
      )}
      {showActionPopover && (
        <div
          className="fixed z-50 bottom-8 right-8 p-4 rounded-xl shadow-2xl border"
          style={{ background: '#111827', borderColor: '#374151' }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 font-semibold text-white">What would you like to do?</div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-white">Describe your modifications</label>
            <textarea
              value={amendmentInstruction}
              onChange={(e) => setAmendmentInstruction(e.target.value)}
              placeholder="e.g., Add a 30-day inspection period, change the closing date to March 15th..."
              className="w-80 md:w-96 p-3 rounded-lg border bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
            {amendmentError && (
              <div className="text-xs text-red-400">{amendmentError}</div>
            )}
            <div className="flex items-center justify-between">
              <button
                className="px-4 py-2 rounded-lg text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                disabled={!amendmentInstruction.trim() || processingAmendment}
                onClick={async () => {
                  if (!selectedState || !selectedDoc || !amendmentInstruction.trim()) return;
                  try {
                    setAmendmentError('');
                    setProcessingAmendment(true);
                    const res = await fetch('http://localhost:3001/api/contract-amendment', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        contractContent: content,
                        amendmentInstruction,
                        jurisdiction: selectedState,
                        clientId: clientId || 'contract-page'
                      })
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err.error || 'Failed to amend contract');
                    }
                    const result = await res.json();
                    // Reflect changes immediately in the preview window
                    const amended = result.amendedContract || result.data || '';
                    if (amended) setContent(amended);
                    setShowActionPopover(false);
                    onModifySelected && onModifySelected({
                      state: selectedState,
                      document: selectedDoc,
                      content: amended
                    });
                  } catch (e) {
                    setAmendmentError(e.message || 'Unable to modify contract');
                  } finally {
                    setProcessingAmendment(false);
                  }
                }}
              >
                {processingAmendment ? 'Modifying…' : 'Modify with AI'}
              </button>
              <button
                className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700"
                onClick={() => setShowActionPopover(false)}
              >
                Close
              </button>
            </div>
            <div className="text-xs text-gray-300">DocuSign opens after modification so you can place signature fields and send.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractsPage;


