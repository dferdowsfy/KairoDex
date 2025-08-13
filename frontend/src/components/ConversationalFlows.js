import React, { useState, useEffect } from 'react';

const ConversationalFlows = ({ token }) => {
  const [activeFlow, setActiveFlow] = useState(null);
  const [flowState, setFlowState] = useState({});
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  // Flow 1: Contract Amendment
  const [contractStep, setContractStep] = useState(1);
  const [selectedContractType, setSelectedContractType] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [contractInstruction, setContractInstruction] = useState('');
  const [parsedChanges, setParsedChanges] = useState(null);

  // Flow 2: Follow-up Generation
  const [selectedClient, setSelectedClient] = useState(null);
  const [lastCorrespondence, setLastCorrespondence] = useState(null);
  const [suggestedMessage, setSuggestedMessage] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Flow 3: Showing Scheduling
  const [showingForm, setShowingForm] = useState({
    property_address: '',
    date: '',
    time_window: 'Afternoon'
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

  useEffect(() => {
    if (token) {
      fetchClients();
    }
  }, [token]);

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const insertSampleData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/setup/sample-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`Sample data inserted successfully!\n\n` +
              `• ${data.data.clients} clients\n` +
              `• ${data.data.properties} properties\n` +
              `• ${data.data.interactions} interactions\n` +
              `• ${data.data.showings} showing scheduled`);
        
        // Refresh clients list
        await fetchClients();
      } else {
        throw new Error(data.error || 'Failed to insert sample data');
      }
    } catch (error) {
      console.error('Error inserting sample data:', error);
      alert('Failed to insert sample data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const apiCall = async (endpoint, method = 'GET', body = null) => {
    setLoading(true);
    try {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // FLOW 1: CONTRACT AMENDMENT
  // =========================================

  const startContractFlow = () => {
    setActiveFlow('contract');
    setContractStep(1);
  };

  const selectContractType = async (type, state) => {
    setSelectedContractType(type);
    setSelectedState(state);
    
    try {
      const template = await apiCall('/api/flows/select_contract_type', 'POST', {
        state,
        contract_type: type
      });
      
      setFlowState({ template });
      setContractStep(2);
    } catch (error) {
      console.error('Error loading contract template:', error);
    }
  };

  const parseContractChanges = async () => {
    try {
      const result = await apiCall('/api/flows/parse_nl_changes', 'POST', {
        instruction: contractInstruction,
        current_data: flowState.template?.template_data || {}
      });
      
      setParsedChanges(result.changes);
      setContractStep(3);
    } catch (error) {
      console.error('Error parsing contract changes:', error);
    }
  };

  // =========================================
  // FLOW 2: FOLLOW-UP GENERATION
  // =========================================

  const startFollowUpFlow = () => {
    setActiveFlow('followup');
  };

  const loadLastCorrespondence = async (clientId) => {
    try {
      const data = await apiCall('/api/flows/load_last_correspondence', 'POST', {
        client_id: clientId
      });
      
      setSelectedClient(data.client);
      setLastCorrespondence(data.last_interaction);
      setSuggestedMessage(data.suggested_message);
    } catch (error) {
      console.error('Error loading correspondence:', error);
    }
  };

  const sendEmail = async () => {
    if (!selectedClient) return;
    
    try {
      await apiCall('/api/flows/send_email', 'POST', {
        client_id: selectedClient.id,
        to: selectedClient.email,
        subject: 'Follow-up',
        body_text: suggestedMessage,
        body_html: `<p>${suggestedMessage}</p>`
      });
      
      alert('Email sent successfully!');
      setActiveFlow(null);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
  };

  const sendSMS = async () => {
    if (!selectedClient) return;
    
    try {
      await apiCall('/api/flows/send_sms', 'POST', {
        client_id: selectedClient.id,
        body_text: suggestedMessage
      });
      
      alert('SMS sent successfully!');
      setActiveFlow(null);
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('Failed to send SMS');
    }
  };

  const scheduleMessage = async (delayDays = 3) => {
    if (!selectedClient) return;
    
    try {
      await apiCall('/api/flows/schedule_message', 'POST', {
        client_id: selectedClient.id,
        channel: 'email',
        subject: 'Follow-up',
        body_text: suggestedMessage,
        delay_days: delayDays
      });
      
      alert(`Message scheduled for ${delayDays} days from now!`);
      setActiveFlow(null);
    } catch (error) {
      console.error('Error scheduling message:', error);
      alert('Failed to schedule message');
    }
  };

  // =========================================
  // FLOW 3: SHOWING SCHEDULING
  // =========================================

  const startShowingFlow = () => {
    setActiveFlow('showing');
  };

  const suggestShowingSlots = async () => {
    if (!selectedClient || !showingForm.property_address || !showingForm.date) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      const data = await apiCall('/api/flows/suggest_showing_slots', 'POST', {
        client_id: selectedClient.id,
        property_address: showingForm.property_address,
        date: showingForm.date,
        time_window: showingForm.time_window
      });
      
      setAvailableSlots(data.available_slots);
    } catch (error) {
      console.error('Error suggesting slots:', error);
    }
  };

  const bookShowing = async (slot) => {
    try {
      await apiCall('/api/flows/book_showing', 'POST', {
        client_id: selectedClient.id,
        property_address: showingForm.property_address,
        slot: slot.time,
        notify_client: true,
        notify_listing_agent: true
      });
      
      alert('Showing booked successfully!');
      setActiveFlow(null);
      setAvailableSlots([]);
    } catch (error) {
      console.error('Error booking showing:', error);
      alert('Failed to book showing');
    }
  };

  // =========================================
  // RENDER METHODS
  // =========================================

  const renderFlowSelector = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Choose Your Action</h2>
      
      {/* Sample Data Setup */}
      {clients.length === 0 && (
        <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4 mb-6">
          <h3 className="text-yellow-100 font-semibold mb-2">🚀 First Time Setup</h3>
          <p className="text-yellow-200 text-sm mb-3">
            No clients found. Would you like to add some sample data to test the conversational flows?
          </p>
          <button
            onClick={insertSampleData}
            disabled={loading}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
          >
            {loading ? 'Setting up...' : 'Add Sample Data'}
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={startContractFlow}
          className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition-colors"
        >
          <h3 className="text-lg font-semibold mb-2">📄 Amend Contract</h3>
          <p className="text-sm opacity-90">Update contract terms with natural language</p>
        </button>
        
        <button
          onClick={startFollowUpFlow}
          className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg transition-colors"
          disabled={clients.length === 0}
        >
          <h3 className="text-lg font-semibold mb-2">💬 Generate Follow-Up</h3>
          <p className="text-sm opacity-90">Create personalized client messages</p>
          {clients.length === 0 && <p className="text-xs mt-1 opacity-70">(Add clients first)</p>}
        </button>
        
        <button
          onClick={startShowingFlow}
          className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg transition-colors"
          disabled={clients.length === 0}
        >
          <h3 className="text-lg font-semibold mb-2">🏠 Schedule Showing</h3>
          <p className="text-sm opacity-90">Book property viewings with clients</p>
          {clients.length === 0 && <p className="text-xs mt-1 opacity-70">(Add clients first)</p>}
        </button>
      </div>
    </div>
  );

  const renderContractFlow = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Contract Amendment</h2>
        <button
          onClick={() => setActiveFlow(null)}
          className="text-gray-400 hover:text-white"
        >
          ← Back
        </button>
      </div>

      {contractStep === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Select Contract Type & State</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-gray-700 text-white p-3 rounded border border-gray-600"
            >
              <option value="">Select State</option>
              <option value="CO">Colorado</option>
              <option value="CA">California</option>
              <option value="TX">Texas</option>
              <option value="FL">Florida</option>
            </select>
            
            <select
              value={selectedContractType}
              onChange={(e) => setSelectedContractType(e.target.value)}
              className="bg-gray-700 text-white p-3 rounded border border-gray-600"
            >
              <option value="">Select Contract Type</option>
              <option value="Purchase Offer">Purchase Offer</option>
              <option value="Addendum">Addendum</option>
              <option value="Lease">Lease Agreement</option>
              <option value="Listing Agreement">Listing Agreement</option>
            </select>
          </div>
          
          <button
            onClick={() => selectContractType(selectedContractType, selectedState)}
            disabled={!selectedContractType || !selectedState || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded transition-colors"
          >
            {loading ? 'Loading...' : 'Load Template'}
          </button>
        </div>
      )}

      {contractStep === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Describe Your Changes</h3>
          
          <textarea
            value={contractInstruction}
            onChange={(e) => setContractInstruction(e.target.value)}
            placeholder="E.g., 'Change the purchase price to $450,000 and set earnest money to $5,000'"
            className="w-full bg-gray-700 text-white p-4 rounded border border-gray-600 h-32"
          />
          
          <button
            onClick={parseContractChanges}
            disabled={!contractInstruction || loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded transition-colors"
          >
            {loading ? 'Processing...' : 'Parse Changes'}
          </button>
        </div>
      )}

      {contractStep === 3 && parsedChanges && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Parsed Changes</h3>
          
          <div className="bg-gray-700 p-4 rounded">
            <pre className="text-white text-sm">{JSON.stringify(parsedChanges, null, 2)}</pre>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => alert('Contract would be sent to DocuSign')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded transition-colors"
            >
              Send to DocuSign
            </button>
            <button
              onClick={() => setContractStep(2)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded transition-colors"
            >
              Edit Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderFollowUpFlow = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Generate Follow-Up</h2>
        <button
          onClick={() => setActiveFlow(null)}
          className="text-gray-400 hover:text-white"
        >
          ← Back
        </button>
      </div>

      {!selectedClient ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Select Client</h3>
          
          <div className="space-y-2">
            {clients.map(client => (
              <button
                key={client.id}
                onClick={() => loadLastCorrespondence(client.id)}
                className="w-full text-left bg-gray-700 hover:bg-gray-600 text-white p-4 rounded transition-colors"
                disabled={loading}
              >
                <div className="font-semibold">{client.full_name}</div>
                <div className="text-sm text-gray-300">{client.email}</div>
                {client.last_interaction_at && (
                  <div className="text-xs text-gray-400">
                    Last contact: {new Date(client.last_interaction_at).toLocaleDateString()}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="text-lg font-semibold text-white mb-2">Client: {selectedClient.full_name}</h3>
            {lastCorrespondence && (
              <div className="text-sm text-gray-300 mb-4">
                <strong>Last interaction:</strong> {new Date(lastCorrespondence.created_at).toLocaleDateString()}
                <br />
                <strong>Channel:</strong> {lastCorrespondence.channel}
                <br />
                <strong>Content:</strong> {lastCorrespondence.body_text}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Suggested Follow-Up</h3>
            
            {editMode ? (
              <textarea
                value={suggestedMessage}
                onChange={(e) => setSuggestedMessage(e.target.value)}
                className="w-full bg-gray-700 text-white p-4 rounded border border-gray-600 h-32"
              />
            ) : (
              <div className="bg-gray-700 p-4 rounded text-white">
                {suggestedMessage}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={sendEmail}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                Send Email
              </button>
              <button
                onClick={sendSMS}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
              >
                Send Text
              </button>
              <button
                onClick={() => setEditMode(!editMode)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded transition-colors"
              >
                {editMode ? 'Save' : 'Edit'}
              </button>
              <button
                onClick={() => scheduleMessage(3)}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
              >
                Schedule (3 days)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderShowingFlow = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Schedule Showing</h2>
        <button
          onClick={() => setActiveFlow(null)}
          className="text-gray-400 hover:text-white"
        >
          ← Back
        </button>
      </div>

      {!selectedClient ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Select Client</h3>
          
          <div className="space-y-2">
            {clients.map(client => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="w-full text-left bg-gray-700 hover:bg-gray-600 text-white p-4 rounded transition-colors"
              >
                <div className="font-semibold">{client.full_name}</div>
                <div className="text-sm text-gray-300">{client.email}</div>
              </button>
            ))}
          </div>
        </div>
      ) : !availableSlots.length ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Property & Time</h3>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Property Address"
              value={showingForm.property_address}
              onChange={(e) => setShowingForm({...showingForm, property_address: e.target.value})}
              className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600"
            />
            
            <input
              type="date"
              value={showingForm.date}
              onChange={(e) => setShowingForm({...showingForm, date: e.target.value})}
              className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600"
            />
            
            <select
              value={showingForm.time_window}
              onChange={(e) => setShowingForm({...showingForm, time_window: e.target.value})}
              className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600"
            >
              <option value="Morning">Morning (9 AM - 12 PM)</option>
              <option value="Afternoon">Afternoon (1 PM - 5 PM)</option>
              <option value="Evening">Evening (5 PM - 7 PM)</option>
            </select>
            
            <button
              onClick={suggestShowingSlots}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded transition-colors"
            >
              {loading ? 'Finding Slots...' : 'Find Available Times'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Available Times for {showingForm.property_address}</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {availableSlots.map((slot, index) => (
              <button
                key={index}
                onClick={() => bookShowing(slot)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white p-3 rounded transition-colors"
              >
                {slot.display}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setAvailableSlots([])}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
          >
            ← Back to Form
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 bg-gray-800 min-h-screen">
      {!activeFlow && renderFlowSelector()}
      {activeFlow === 'contract' && renderContractFlow()}
      {activeFlow === 'followup' && renderFollowUpFlow()}
      {activeFlow === 'showing' && renderShowingFlow()}
    </div>
  );
};

export default ConversationalFlows;
