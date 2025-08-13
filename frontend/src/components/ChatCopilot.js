import { useState, useEffect, useRef } from 'react';
import { fetchClientSnapshot } from '../services/snapshot.js';
import ClientSnapshotCard from './ClientSnapshotCard.js';

// Optional configurable backend base URL (e.g. REACT_APP_API_BASE=http://localhost:3001)
const API_BASE = process.env.REACT_APP_API_BASE || '';

export default function ChatCopilot({ token, user, clients, clientId, customColors, copilotOpen, setCopilotOpen, selectedMainClient, onClientSelect }) {
  const [mode, setMode] = useState('GUIDED');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(selectedMainClient || null);
  const [clientDetails, setClientDetails] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  // Track the last generated / refined follow-up email body for refinement chaining
  const [lastFollowUpBody, setLastFollowUpBody] = useState(null);
  // Collapse top section (client selector + follow-up button) after first message
  const [topCollapsed, setTopCollapsed] = useState(false);

  // Helper: attempt fetch with fallback to explicit backend port if relative path 404s (dev proxy issues)
  const fetchWithFallback = async (path, options) => {
    const bases = [];
    // If explicit API_BASE provided, use first
    if (API_BASE) bases.push(API_BASE.replace(/\/$/, ''));
    // Relative (proxy) attempt
    bases.push('');
    // Explicit localhost:3001 (backend default)
    if (!bases.includes('http://localhost:3001')) bases.push('http://localhost:3001');
    let lastErr;
    for (const base of bases) {
      const url = base ? `${base}${path}` : path;
      try {
        const res = await fetch(url, options);
        if (res.status === 404 && base !== 'http://localhost:3001') {
          // try next base
          lastErr = new Error(`404 at ${url}`);
          continue;
        }
        return res;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Request failed');
  };

  // Auto-collapse after first message appears
  useEffect(() => {
    if (!topCollapsed && messages.length === 1) {
      setTopCollapsed(true);
    }
  }, [messages, topCollapsed]);
  const scrollerRef = useRef(null);

  useEffect(() => { 
    if (copilotOpen) {
      if (selectedClient) fetchHistory();
    }
  }, [copilotOpen, selectedClient]);

  // Sync with main client selection
  useEffect(() => {
    if (selectedMainClient && selectedMainClient !== selectedClient?.id) {
      const client = clients.find(c => c.id === selectedMainClient);
      if (client) {
        setSelectedClient(client);
        fetchClientDetails(client);
      }
    }
  }, [selectedMainClient, clients]);
  
  // Set initial client if none selected
  useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      const initialClient = clients.find(c => c.id === selectedMainClient) || clients[0];
      setSelectedClient(initialClient);
      fetchClientDetails(initialClient);
      onClientSelect && onClientSelect(initialClient.id);
    }
  }, [clients, selectedClient, selectedMainClient]);
  
  useEffect(() => { 
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  // Enhanced scroll to bottom function
  const scrollToBottom = () => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check auth status on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.isAuthenticated) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        setIsAuthenticated(false);
        console.error("Auth check failed:", e);
      } finally {
        setAuthChecked(true);
      }
    };
    if (token && copilotOpen) {
      checkAuth();
    } else {
      setAuthChecked(true); // No token, so we're done checking
    }
  }, [token, copilotOpen]);

  const fetchClientDetails = async (client) => {
    try {
      // Use dynamic client details from the client object or fetch from backend
      const dynamicClientDetails = {
        name: client.name,
        email: client.email,
        budget: client.budget || client.budgetRange || 'Not specified',
        timeline: client.timeline || client.timeframe || 'Not specified', 
        preferences: client.preferences || client.notes || 'Not specified',
        status: client.status || client.stage || 'Not specified'
      };
      
      setClientDetails(dynamicClientDetails);
      setSelectedClient(client);
    } catch (e) {
      console.error('fetchClientDetails error', e);
      // Fallback client details
      setClientDetails({
        name: client.name,
        email: client.email,
        budget: client.budget || 'Not specified',
        timeline: client.timeline || 'Not specified',
        preferences: client.preferences || 'Not specified',
        status: client.status || client.stage || 'Not specified'
      });
      setSelectedClient(client);
    }
  };

  const parseClientData = (data) => {
    const parsed = { ...data };
    
    // Parse JSON fields to natural language
    if (data.preferences && typeof data.preferences === 'object') {
      parsed.preferences = Object.entries(data.preferences)
        .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
        .join(', ');
    }
    
    if (data.budget && typeof data.budget === 'object') {
      parsed.budget = `$${data.budget.min?.toLocaleString()} - $${data.budget.max?.toLocaleString()}`;
    }
    
    return parsed;
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setMessages([]); // Clear messages when switching clients
    fetchClientDetails(client);
    onClientSelect && onClientSelect(client.id); // Pass client ID to sync with main nav
  };

  const fetchHistory = async () => {
    if (!selectedClient) return;
    try {
      const res = await fetch(`/api/chat/history?clientId=${selectedClient.id}&limit=50`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const json = await res.json();
      if (json.success) setMessages(json.data.messages.map(m => ({ role: m.role, content: m.content })));
    } catch (e) { console.error('fetchHistory error', e); }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userContent = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userContent }]);
    setInput('');
    setLoading(true);

    // Intercept natural language follow-up requests
    if (/^(latest\s+)?follow\s*-?\s*up( email)?$/i.test(userContent) || /generate (a )?follow\s*-?\s*up/i.test(userContent)) {
      if (!selectedClient) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Select a client first to generate a follow-up.' }]);
        setLoading(false);
        return;
      }
      await generateFollowUp();
      return;
    }

    // Detect refinement instructions (e.g., "make it more professional", "refine this", "shorter", etc.)
    const refineRegex = /^(refine|improve|edit|make it|can you make it|adjust|tweak)(.*)$/i;
    const toneRegex = /(more\s+professional|friendlier|more\s+friendly|warmer|shorter|more\s+concise|longer|more\s+detailed|clearer|simpler|less formal|more formal)/i;
    const isRefine = refineRegex.test(userContent) || toneRegex.test(userContent);
    if (isRefine) {
      if (!lastFollowUpBody) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No follow-up email to refine yet. Generate one first.' }]);
        setLoading(false);
        return;
      }
      try {
        const instruction = userContent.replace(/^refine:?/i, '').trim() || userContent;
        const res = await fetch(`${API_BASE}/api/followup/refine`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ currentBody: lastFollowUpBody, instruction })
        });
        const raw = await res.text();
        let json;
        try { json = raw ? JSON.parse(raw) : {}; } catch { json = {}; }
        if (json.success && json.refinedBody) {
          setLastFollowUpBody(json.refinedBody);
          setMessages(prev => [...prev, { role: 'assistant', content: json.refinedBody }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Refinement failed or no revised body returned.' }]);
        }
      } catch (e) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error refining follow-up: ${e.message}` }]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // General AI chat mode if no client selected
    if (!selectedClient) {
      try {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: messages.concat({ role: 'user', content: userContent }).map(m => ({ role: m.role, content: m.content })) })
        });
        const json = await res.json();
        if (json.success) {
          setMessages(prev => [...prev, { role: 'assistant', content: json.reply }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: json.error || 'Error processing message.' }]);
        }
      } catch (e) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Network error: ${e.message}` }]);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Check if we're waiting for contract changes
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
    if (lastAssistantMessage?.awaitingChanges) {
      // Handle contract changes parsing
      try {
        const { contract_type, client_id, state } = lastAssistantMessage.awaitingChanges;
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `⏳ Analyzing your requested changes...`
        }]);
        
        // Call backend to parse changes
        const res = await fetch('/api/contract/parse-changes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'parse_nl_changes',
            params: {
              client_id,
              contract_type,
              state,
              changes_text: userContent
            }
          })
        });
        
        const json = await res.json();
        
        if (json.success) {
          const { structured_changes, affected_clauses } = json.data;
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `✅ I've parsed your changes:\n\n**Structured Changes:**\n${JSON.stringify(structured_changes, null, 2)}\n\n**Affected Clauses:** ${affected_clauses.join(', ')}\n\nHere is your modified contract. Changes are highlighted.`,
            chips: [
              { id: "send_for_signature", label: "Send via DocuSign", action: "send_docusign", params: { docusign_draft_id: 'draft_123', contract_type }},
              { id: "download", label: "Download Copy", action: "download_contract", params: { contract_type }},
              { id: "edit_changes", label: "Edit Changes", action: "return_to_changes", params: { contract_type }},
              { id: "email_pdf", label: "Email PDF", action: "email_contract_pdf", params: { contract_type }}
            ]
          }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `❌ Sorry, I couldn't parse those changes. Please try rephrasing them or be more specific.`
          }]);
        }
      } catch (e) {
        console.error('Error parsing contract changes:', e);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `❌ Error processing your changes. Please try again.`
        }]);
      }
      setLoading(false);
      return;
    }
    
    // Default chat behavior with client context (retain previous endpoint for richer actions)
    try {
      // Intent classification: decide whether to use strict QA or directly go to richer client chat
      const lower = userContent.toLowerCase();
      const generativeKeywords = /(draft|write|craft|compose|offer|email|follow up|follow-up|checklist|plan|strategy|steps|refine|improve|make it|professional|detailed|summary|analyze|analysis)/i;
      const factualKeywords = /^(what|when|where|who|which|does|do|is|are|has|have)\b|\b(budget|timeline|city|status|email|phone)\b/i;
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
      const repetitiveQA = lastAssistant && lastAssistant.qa && lastAssistant.content === lastAssistant.content && /next step/i.test(lastAssistant.content) && !generativeKeywords.test(userContent);
      const useQA = !generativeKeywords.test(userContent) && (factualKeywords.test(userContent) || !repetitiveQA);

      if (useQA) {
        try {
          const qaRes = await fetchWithFallback('/api/client/qa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ clientName: selectedClient.name, question: userContent, history: messages.slice(-6) })
          });
          if (qaRes.ok) {
            const qaJson = await qaRes.json();
            if (qaJson.success && qaJson.reply) {
              // If the answer is overly terse and user asked for more (e.g., 'can you draft'), fall through to richer chat
              if (generativeKeywords.test(userContent) || qaJson.reply.split(/\s+/).length < 8) {
                // continue to chat
              } else {
                setMessages(prev => [...prev, { role: 'assistant', content: qaJson.reply, qa: true }]);
                // Ensure loading spinner clears on early QA return
                setLoading(false);
                return;
              }
            }
          }
        } catch (e) {
          // QA failure silently falls through to client chat
        }
      }
      // Second attempt: hybrid client chat (broader responses, still client grounded)
  const clientChatRes = await fetchWithFallback('/api/client/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clientName: selectedClient.name, question: userContent, history: messages.slice(-6) })
      });
      if (clientChatRes.ok) {
        const chatJson = await clientChatRes.json();
        if (chatJson.success && chatJson.reply) {
          setMessages(prev => [...prev, { role: 'assistant', content: chatJson.reply, qa: chatJson.usedContext }]);
          return;
        }
      }
      // Final fallback to legacy plan endpoint (only if previous failed)
  const alt = await fetchWithFallback('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: messages.concat({ role: 'user', content: userContent }).map(m => ({ role: m.role, content: m.content })) })
      }).then(r => r.json());
      const sanitized = (alt.reply || 'No response').replace(/Let me know what you would like to do next\.?/gi,'').trim();
      setMessages(prev => [...prev, { role: 'assistant', content: sanitized }]);
    } catch (e) {
  const hint = e.message.includes('404') ? 'Endpoint not found. Ensure backend restarted (npm run dev in backend) and ports: frontend 3000, backend 3001.' : '';
  setMessages(prev => [...prev, { role: 'assistant', content: `Network error: ${e.message}. ${hint}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Safety: clear stuck loading state after 45s (e.g., network hang) and notify user
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setLoading(false);
      setMessages(prev => {
        // Avoid duplicating warning
        const alreadyWarned = prev.some(m => /timeout|took too long/i.test(m.content));
        return alreadyWarned ? prev : prev.concat({ role: 'assistant', content: '⚠️ Response is taking unusually long. You can retry your question or check backend connectivity.' });
      });
    }, 45000);
    return () => clearTimeout(t);
  }, [loading]);

  const executeChip = async (chip) => {
    if (!selectedClient) return;
  // Follow-up workflow chips removed per requirement.
    
    // Handle contract modification workflow
    if (chip.action === 'contract_amend') {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "What type of contract would you like to amend?",
        chips: [
          { id: "ct_offer", label: "Purchase Offer", action: "select_contract_type", params: { contract_type: "Purchase Offer" }},
          { id: "ct_counter", label: "Counteroffer", action: "select_contract_type", params: { contract_type: "Counteroffer" }},
          { id: "ct_addendum", label: "Addendum", action: "select_contract_type", params: { contract_type: "Addendum" }},
          { id: "ct_lease", label: "Lease", action: "select_contract_type", params: { contract_type: "Lease" }}
        ]
      }]);
      return;
    }
    
    // Handle DocuSign sending
    if (chip.action === 'send_docusign') {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⏳ Sending contract via DocuSign...`
      }]);
      
      // Simulate DocuSign sending
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ Sent for signature via DocuSign! I've also logged this event for compliance.\n\n📧 **Email sent to:** ${selectedClient.first_name}@example.com\n📝 **Contract:** ${chip.params.contract_type}\n🔗 **Envelope ID:** ENV_${Date.now()}`,
          chips: [
            { id: "view_envelope", label: "View Envelope", action: "open_docusign_envelope" },
            { id: "log_event", label: "View Ledger", action: "open_ledger" },
            { id: "send_follow_up", label: "Send Follow-Up", action: "generate_follow_up_from_contract" }
          ]
        }]);
      }, 2000);
      return;
    }
    
    // Handle other DocuSign actions
    if (chip.action === 'download_contract') {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `📄 **Contract Download Ready**\n\n✅ Your ${chip.params.contract_type} has been prepared.\n\n🔗 [Download PDF](#download)\n📧 Would you like me to email this to someone?`
      }]);
      return;
    }
    
    if (chip.action === 'return_to_changes') {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `What would you like to change about the ${chip.params.contract_type}?\n\nPlease describe the new changes you'd like to make.`,
        awaitingChanges: {
          contract_type: chip.params.contract_type,
          client_id: selectedClient.id,
          state: selectedClient.state || 'VA'
        }
      }]);
      return;
    }
    
    if (chip.action === 'email_contract_pdf') {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `📧 **Email Contract PDF**\n\n✅ PDF emailed to ${selectedClient.first_name}@example.com\n📄 Subject: "Updated ${chip.params.contract_type} - Please Review"\n\n📝 The contract has been sent with all your requested modifications.`
      }]);
      return;
    }

    // Handle contract type selection
    if (chip.action === 'select_contract_type') {
      setMessages(prev => [...prev, { 
        role: 'user', 
        content: chip.label
      }]);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Great! I'll help you amend the ${chip.params.contract_type}. What would you like to change?\n\nPlease describe the changes you'd like to make (e.g., "Move closing to Aug 15, add $5,000 seller credit, change escrow to $10,000 due in 3 days").`,
        showInput: true,
        awaitingChanges: {
          contract_type: chip.params.contract_type,
          client_id: selectedClient.id,
          state: selectedClient.state || 'VA'
        }
      }]);
      return;
    }
    
    // Handle client snapshot request
    if (chip.action_type === 'CLIENT_SNAPSHOT') {
      setMessages(prev => [...prev, { 
        role: 'user', 
        content: chip.label 
      }]);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⏳ Fetching client snapshot...' 
      }]);
      
      try {
        // Get agent ID from user state or token - for now use a default
        const agentId = user?.id || 'agent1'; // You'll need to pass user prop or get from token
        
        // Debug: Log what we're sending to the webhook
        console.log('🔍 Sending to Make.com webhook:', {
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          clientData: selectedClient,
          agentId: agentId,
          searchFields: {
            first_name: (selectedClient.name || '').split(' ')[0],
            last_name: (selectedClient.name || '').split(' ').slice(1).join(' ')
          }
        });
        console.log('📋 Expected Google Sheets search:');
        console.log(`  - Column D (first_name): "${(selectedClient.name || '').split(' ')[0]}"`);
        console.log(`  - Column E (last_name): "${(selectedClient.name || '').split(' ').slice(1).join(' ')}"`);
        console.log(`  - Email: "${selectedClient.email || 'N/A'}"`);
        
        const snapshotResult = await fetchClientSnapshot({
          clientId: selectedClient.id,
          clientData: selectedClient, // Pass the complete client object
          agentId: agentId,
          question: 'client snapshot'
        });
        
        // Debug: Log the response
        console.log('📊 Snapshot result:', snapshotResult);
        
        if (snapshotResult.status === 'ok') {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '',
            snapshotCard: {
              client: snapshotResult.client,
              answer: snapshotResult.answer
            }
          }]);
        } else if (snapshotResult.status === 'multiple') {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: 'Multiple clients found. Please select one:',
            chips: snapshotResult.options.map(option => ({
              label: option.name,
              action_type: 'CLIENT_SNAPSHOT_SELECT',
              parameters: { client_id: option.client_id, client_name: option.name }
            }))
          }]);
        } else if (snapshotResult.status === 'not_found') {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `❌ ${snapshotResult.message}` 
          }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `❌ Error: ${snapshotResult.message}` 
          }]);
        }
      } catch (error) {
        console.error('Snapshot error:', error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `❌ Failed to fetch client snapshot: ${error.message}` 
        }]);
      }
      return;
    }
    
    // Handle client snapshot selection (for multiple matches)
    if (chip.action_type === 'CLIENT_SNAPSHOT_SELECT') {
      setMessages(prev => [...prev, { 
        role: 'user', 
        content: chip.label 
      }]);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⏳ Fetching snapshot for ${chip.parameters.client_name}...` 
      }]);
      
      try {
        const agentId = user?.id || 'agent1';
        
        const snapshotResult = await fetchClientSnapshot({
          clientId: chip.parameters.client_id,
          clientData: selectedClient, // Pass the complete client object
          agentId: agentId,
          question: 'client snapshot'
        });
        
        if (snapshotResult.status === 'ok') {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '',
            snapshotCard: {
              client: snapshotResult.client,
              answer: snapshotResult.answer
            }
          }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `❌ Error: ${snapshotResult.message}` 
          }]);
        }
      } catch (error) {
        console.error('Snapshot selection error:', error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `❌ Failed to fetch client snapshot: ${error.message}` 
        }]);
      }
      return;
    }
    
    // Handle other existing workflows with original logic
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `⏳ Processing: ${chip.label}...` 
    }]);
    
    try {
      const authed = Boolean(token && isAuthenticated);
      const endpoint = authed ? '/api/chat/action/execute' : '/api/chat/action/execute/test';
      const url = `${API_BASE}${endpoint}`;
      const payload = {
        action_type: chip.action_type,
        parameters: chip.parameters,
        clientId: selectedClient.id
      };
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (authed) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });

      // Read raw text to handle non-JSON (e.g. proxy HTML / server error page)
      const raw = await res.text();
      let json;
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch (parseErr) {
        throw new Error(`Unexpected response (${res.status} ${res.statusText}). Body starts with: ${raw.slice(0,100)}`);
      }

      if (!res.ok || !json.success) {
        const errMsg = json?.error || json?.details || `HTTP ${res.status}`;
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Failed: ${chip.label} – ${errMsg}` }]);
        return;
      }

      const message = json.data?.message || json.data?.result?.detail || 'Action completed successfully';
      setMessages(prev => [...prev, { role: 'assistant', content: message }]);
    } catch (e) {
      console.error('Action execution error:', e);
      const hint = e.message.includes('Failed to fetch') ? ' Backend may be down (check server on :3001).' : '';
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error running ${chip.label}: ${e.message}${hint}` }]);
    }
  };

  const panelStyles = {
    background: customColors?.cardBackground || 'rgba(15, 23, 42, 0.95)', // Much less transparent
    border: `1px solid ${customColors?.cardBorder || 'rgba(255,255,255,0.2)'}`,
    color: customColors?.textPrimary || '#fff',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)'
  };

  // Removed quick action chips per request.

  const generateFollowUp = async () => {
    if (!selectedClient) return;
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: 'Generate latest follow-up email' }]);
    try {
      const name = selectedClient.name || selectedClient.full_name || selectedClient.first_name || 'Client';
  const res = await fetch(`${API_BASE}/api/followup/from-sheet?clientName=${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' }
      });

      const raw = await res.text();
      let json;
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch (parseErr) {
        // Show first part of body for diagnostics
        const snippet = raw.slice(0,120);
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Follow-up generation returned non-JSON (status ${res.status}). ${snippet}` }]);
        return;
      }

      if (json.success) {
        if (json.body) {
          setLastFollowUpBody(json.body);
          setMessages(prev => [...prev, { role: 'assistant', content: json.body }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'No follow-up body returned (Column Y may be empty for this client).' }]);
        }
      } else {
        const err = json.error || `HTTP ${res.status}`;
        // Help user diagnose sheet config
        const hint = /proxy/i.test(err) || /html/i.test(err) ? ' Check backend & Google Sheets credentials (Sheet ID, service account / API key) and ensure Column Y has notes.' : '';
        setMessages(prev => [...prev, { role: 'assistant', content: `Failed to generate follow-up: ${err}.${hint}` }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error generating follow-up: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Enhanced Copilot Button with Gradient */}
      <button
        onClick={() => setCopilotOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-300 group"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
        }}
      >
        <div className="relative">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <svg 
              className="w-4 h-4 text-white transition-transform duration-300 group-hover:rotate-12" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.54 0 3-.35 4.31-.99l7.87 2.63c.48.16.99-.08 1.15-.56.16-.48-.08-.99-.56-1.15l-2.63-7.87C21.65 15 22 13.54 22 12c0-5.52-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          {!open && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          )}
        </div>
      </button>

      {/* Sliding / Full Screen Panel */}
      {copilotOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setCopilotOpen(false)}
          />
          
          {/* Side Panel */}
          <div 
            className={`fixed top-0 ${fullScreen ? 'left-0 w-full' : 'right-0 w-96'} h-full z-50 transform transition-all duration-300 ease-out flex flex-col ${copilotOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={panelStyles}
          >
            {/* Panel Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b" style={{ borderColor: customColors?.cardBorder }}>
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-lg">AgentHub Copilot</h2>
                  <div className="flex items-center">
                    <button
                      onClick={() => setFullScreen(f => !f)}
                      className="ml-2 px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-sm font-medium shadow-sm transition-colors"
                    >
                      {fullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setCopilotOpen(false)} 
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Collapsible Top Section (Client Selector + Follow-up button) */}
            <div className="flex-shrink-0 relative">
              {/* Toggle Bar */}
              {topCollapsed && (
                <div className="px-4 py-2 border-b flex items-center justify-between cursor-pointer group" style={{ borderColor: customColors?.cardBorder }} onClick={() => setTopCollapsed(false)}>
                  <div className="text-sm text-slate-300 truncate" style={{ fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' }}>
                    {selectedClient ? `Client: ${selectedClient.name}` : 'No client selected'}
                  </div>
                  <button className="text-xs px-2 py-1 rounded bg-slate-600/60 hover:bg-slate-500 transition-colors">Expand ▾</button>
                </div>
              )}
              <div className={`transition-all duration-500 ease-in-out overflow-hidden border-b ${topCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[600px] opacity-100'} bg-transparent`} style={{ borderColor: customColors?.cardBorder }}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <label className="block font-medium" style={{ fontSize: '20px', fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' }}>Selected Client</label>
                    {!topCollapsed && (
                      <button onClick={() => setTopCollapsed(true)} className="text-xs px-2 py-1 rounded bg-slate-600/60 hover:bg-slate-500 transition-colors">Collapse ▴</button>
                    )}
                  </div>
                  <select
                    value={selectedClient?.id || ''}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === e.target.value);
                      if (client) handleClientSelect(client);
                    }}
                    className="w-full p-2 rounded-lg bg-slate-700/90 border"
                    style={{ borderColor: customColors?.cardBorder, fontSize: '20px', fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' }}
                  >
                    <option value="">Select a client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  {selectedClient && clientDetails && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-700/80 space-y-1" style={{ fontSize: '20px', lineHeight: '1.3', fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' }}>
                      <div><strong>Budget:</strong> {clientDetails.budget}</div>
                      <div><strong>Timeline:</strong> {clientDetails.timeline}</div>
                      <div><strong>Status:</strong> {clientDetails.status}</div>
                    </div>
                  )}
                  {selectedClient && (
                    <div className="mt-4">
                      <button
                        onClick={generateFollowUp}
                        disabled={loading}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg disabled:opacity-50"
                      >
                        📧 Generate Follow-up Email
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Messages Container - Scrollable */}
              <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-base scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {!selectedClient ? (
                  <div className="text-center py-8 opacity-70">
                    <div className="text-2xl mb-2">👋</div>
                    <div className="text-lg">Select a client to start chatting</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 opacity-70">
                    <div className="text-2xl mb-2">💬</div>
                    <div className="text-lg">Ask me anything about {selectedClient.name}</div>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                      <div className={`inline-block px-4 py-3 rounded-lg max-w-[85%] ${
                        m.role === 'user' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                          : 'bg-slate-700/90 backdrop-blur text-white'
                      } whitespace-pre-wrap shadow-lg`}
                        style={{
                          border: m.role === 'assistant' ? `1px solid ${customColors?.cardBorder}` : undefined,
                          fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif',
                          fontSize: '20px',
                          lineHeight: '1.5'
                        }}>
                        {m.content}
                      </div>
                      {m.qa && (
                        <div className="mt-1 text-xs text-slate-400 italic max-w-[85%]">Answer based on client sheet data</div>
                      )}
                      
                      {/* Render snapshot card if present */}
                      {m.snapshotCard && (
                        <div className="mt-3 max-w-[85%]">
                          <ClientSnapshotCard
                            client={m.snapshotCard.client}
                            answer={m.snapshotCard.answer}
                            customColors={customColors}
                            onSendFollowUp={(text) => {
                              setInput(text);
                              // Focus on input for user to edit/send
                              setTimeout(() => {
                                const inputElement = document.querySelector('input[placeholder*="Ask"]');
                                if (inputElement) inputElement.focus();
                              }, 100);
                            }}
                            onOpenInCRM={(clientId) => {
                              // Navigate to clients tab or CRM view
                              window.location.href = `/clients/${clientId}`;
                            }}
                          />
                        </div>
                      )}
                      
                      {m.chips && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.chips.map((c, idx) => (
                            <button
                              key={idx}
                              onClick={() => executeChip(c)}
                              className="px-3 py-2 rounded-full text-sm font-medium border hover:opacity-80 transition-all hover:scale-105"
                              style={{ 
                                background: customColors?.gradientCardGray || '#1e293b', 
                                borderColor: customColors?.cardBorder 
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {loading && (
                  <div className="text-sm opacity-70 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Thinking...</span>
                  </div>
                )}
                {/* Spacer to ensure last message isn't hidden behind input */}
                <div className="h-4"></div>
              </div>

              {/* Chat Input - Fixed at bottom */}
              <div className="flex-shrink-0 p-4 border-t bg-slate-800/95 backdrop-blur-sm sticky bottom-0" style={{ borderColor: customColors?.cardBorder }}>
                <div className="flex items-center space-x-3">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={`Ask a question${selectedClient ? ` about ${selectedClient.name}` : ''}...`}
                    className="flex-1 bg-slate-700/90 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-600/50 placeholder-slate-400 resize-none"
                    style={{ minHeight: '48px', fontFamily: '-apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"SF Pro Display\",\"Helvetica Neue\",Arial,sans-serif', fontSize: '20px', lineHeight: '1.5' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg text-base font-semibold text-white transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700 min-w-[80px] shadow-lg hover:shadow-xl"
                    style={{ 
                      background: customColors?.secondaryButton || '#059669',
                      opacity: loading ? 0.5 : 1 
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
