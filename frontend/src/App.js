import { useState, useEffect, useRef } from 'react';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [clientNotes, setClientNotes] = useState([]);
  const [agentMessages, setAgentMessages] = useState([]);
  const [generatedMessages, setGeneratedMessages] = useState([]);
  const [agentId, setAgentId] = useState('agent1');
  const [clientId, setClientId] = useState('client1');
  
  // New state for upload forms
  const [newClientNote, setNewClientNote] = useState('');
  const [newAgentMessage, setNewAgentMessage] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);
  
  // File upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Copy function states
  const [copied, setCopied] = useState(false);

  // Sample clients for dropdown
  const clients = [
    { id: 'client1', name: 'Sarah Johnson' },
    { id: 'client2', name: 'Mike Chen' },
    { id: 'client3', name: 'Emily Rodriguez' },
    { id: 'client4', name: 'David Thompson' },
    { id: 'client5', name: 'Lisa Wang' }
  ];

  useEffect(() => {
    fetchData();
  }, [agentId, clientId]);

  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/data?agentId=${agentId}&clientId=${clientId}`);
      const data = await response.json();
      
      if (data.success) {
        setClientNotes(data.data.clientNotes);
        setAgentMessages(data.data.agentMessages);
        setGeneratedMessages(data.data.generatedMessages);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/generate-followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId,
          agentId: agentId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(data.data.message);
        fetchData();
      } else {
        alert('Error generating message: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error generating message');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!message) return;
    
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddClientNote = async (e) => {
    e.preventDefault();
    if (!newClientNote.trim()) return;

    try {
      const response = await fetch('http://localhost:3001/api/client-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentId,
          clientId: clientId,
          note: newClientNote
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewClientNote('');
        setShowClientForm(false);
        fetchData();
      } else {
        alert('Error adding client note: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error adding client note');
    }
  };

  const handleAddAgentMessage = async (e) => {
    e.preventDefault();
    if (!newAgentMessage.trim()) return;

    try {
      const response = await fetch('http://localhost:3001/api/agent-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentId,
          message: newAgentMessage
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewAgentMessage('');
        setShowAgentForm(false);
        fetchData();
      } else {
        alert('Error adding agent message: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error adding agent message');
    }
  };

  // File upload handlers
  const handleFileUpload = async (file) => {
    if (!file) return;

    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only .txt, .pdf, .doc, .docx, .csv files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size too large. Maximum size is 10MB.');
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', agentId);
    formData.append('clientId', clientId);

    try {
      const response = await fetch('http://localhost:3001/api/upload-client-note', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`File "${file.name}" uploaded successfully!`);
        fetchData();
      } else {
        alert('Error uploading file: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error uploading file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Helper function to truncate text to first paragraph
  const truncateToFirstParagraph = (text) => {
    if (!text) return '';
    const firstParagraph = text.split('\n\n')[0] || text.split('\n')[0] || text;
    return firstParagraph.length > 200 ? firstParagraph.substring(0, 200) + '...' : firstParagraph;
  };

  return (
    <div className="min-h-screen" style={{ backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-xl z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-4">
                {/* Logo */}
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-black text-xl">A</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-700 bg-clip-text text-transparent">
                      AgentHub
                    </h1>
                    <p className="text-sm font-semibold text-gray-600 -mt-1">Real Estate Follow-Up Automation</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Agent ID</label>
                  <input
                    type="text"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="border-2 border-gray-300 bg-white/80 backdrop-blur-sm text-gray-900 rounded-lg px-4 py-2 text-base font-semibold focus:border-blue-500 focus:outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Client</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="border-2 border-gray-300 bg-white/80 backdrop-blur-sm text-gray-900 rounded-lg px-4 py-2 text-base font-semibold focus:border-blue-500 focus:outline-none min-w-[200px] shadow-sm"
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white px-8 py-3 rounded-xl transition-all duration-300 font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 border-2 border-white/20 backdrop-blur-sm"
              >
                {loading ? 'Generating...' : 'Generate Follow-Up'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          {/* Generated Message Display */}
          {message && (
            <div className="mb-8 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-xl text-gray-900">Latest Generated Message:</h4>
                <button
                  onClick={handleCopyMessage}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    copied 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white shadow-lg hover:shadow-blue-500/25'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Message</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-lg font-semibold text-gray-800 leading-relaxed whitespace-pre-wrap">{message}</p>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Client Notes Section */}
            <div className="rounded-2xl shadow-2xl p-6 border-2 border-white/20 backdrop-blur-md" style={{ backgroundImage: 'radial-gradient( circle 349px at 0.3% 48.6%, rgba(0,0,0,1) 0%, rgba(87,124,253,0.89) 100.7% )' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white flex items-center">
                  <span className="w-4 h-4 bg-blue-300 rounded-full mr-4 shadow-lg"></span>
                  Client Notes
                </h2>
                <button
                  onClick={() => setShowClientForm(!showClientForm)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl text-base transition-all duration-200 font-black shadow-lg hover:shadow-blue-500/25 border-2 border-white/20"
                >
                  {showClientForm ? 'Cancel' : '+ Add Note'}
                </button>
              </div>
              
              {showClientForm && (
                <div className="mb-6 bg-black/30 rounded-xl p-6 border-2 border-white/20 backdrop-blur-sm">
                  {/* Text Input */}
                  <form onSubmit={handleAddClientNote} className="mb-4">
                    <textarea
                      value={newClientNote}
                      onChange={(e) => setNewClientNote(e.target.value)}
                      placeholder="Enter client note..."
                      className="w-full p-4 border-2 border-blue-400/50 bg-black/50 text-white rounded-xl resize-none placeholder-blue-300 focus:border-blue-300 focus:outline-none backdrop-blur-sm text-base font-semibold"
                      rows="4"
                    />
                    <div className="flex justify-end mt-4">
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl transition-all duration-200 font-black shadow-lg hover:shadow-blue-500/25 border-2 border-white/20 text-base"
                      >
                        Save Note
                      </button>
                    </div>
                  </form>

                  {/* File Upload */}
                  <div className="border-t-2 border-blue-400/30 pt-6">
                    <h4 className="text-base font-black text-blue-200 mb-4">Or Upload a File</h4>
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                        dragActive ? 'border-blue-300 bg-blue-600/20' : 'border-blue-400/50 bg-black/30'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileInput}
                        accept=".txt,.pdf,.doc,.docx,.csv"
                        className="hidden"
                      />
                      <div className="space-y-3">
                        <p className="text-base font-semibold text-blue-200">
                          Drag and drop a file here, or{' '}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-blue-300 hover:text-blue-100 underline font-black"
                          >
                            click to browse
                          </button>
                        </p>
                        <p className="text-sm font-semibold text-blue-300">
                          Supported: .txt, .pdf, .doc, .docx, .csv (max 10MB)
                        </p>
                        {uploadingFile && (
                          <p className="text-base font-semibold text-blue-200">Uploading...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {clientNotes.length > 0 ? (
                  clientNotes.map((note) => (
                    <div key={note.id} className="bg-black/40 p-5 rounded-xl border-2 border-white/20 backdrop-blur-sm">
                      <p className="text-base font-semibold text-blue-100 leading-relaxed">
                        {truncateToFirstParagraph(note.content)}
                      </p>
                      <p className="text-sm font-bold text-blue-300 mt-4">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-black/30 p-8 rounded-xl text-center text-blue-300 border-2 border-white/20 backdrop-blur-sm">
                    <p className="text-lg font-bold">No client notes found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Voice/Tone Section */}
            <div className="rounded-2xl shadow-2xl p-6 border-2 border-white/20 backdrop-blur-md" style={{ backgroundImage: 'linear-gradient( 105.9deg, rgba(0,122,184,1) 24.4%, rgba(46,0,184,0.88) 80.5% )' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white flex items-center">
                  <span className="w-4 h-4 bg-cyan-300 rounded-full mr-4 shadow-lg"></span>
                  Agent Voice & Tone
                </h2>
                <button
                  onClick={() => setShowAgentForm(!showAgentForm)}
                  className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white px-6 py-3 rounded-xl text-base transition-all duration-200 font-black shadow-lg hover:shadow-cyan-500/25 border-2 border-white/20"
                >
                  {showAgentForm ? 'Cancel' : '+ Add Voice'}
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-base font-semibold text-cyan-200 mb-4">
                  Add examples of your communication style to help AI generate follow-ups that match your voice.
                </p>
              </div>
              
              {showAgentForm && (
                <div className="mb-6 bg-black/30 rounded-xl p-6 border-2 border-white/20 backdrop-blur-sm">
                  <form onSubmit={handleAddAgentMessage}>
                    <textarea
                      value={newAgentMessage}
                      onChange={(e) => setNewAgentMessage(e.target.value)}
                      placeholder="Example: 'Hi Sarah! I'm excited to help you find your dream home. I noticed you're interested in the Fremont area - it's a fantastic neighborhood!'"
                      className="w-full p-4 border-2 border-cyan-400/50 bg-black/50 text-white rounded-xl resize-none placeholder-cyan-300 focus:border-cyan-300 focus:outline-none backdrop-blur-sm text-base font-semibold"
                      rows="4"
                    />
                    <div className="flex justify-end mt-4">
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white px-8 py-3 rounded-xl transition-all duration-200 font-black shadow-lg hover:shadow-cyan-500/25 border-2 border-white/20 text-base"
                      >
                        Save Voice
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                {agentMessages.length > 0 ? (
                  agentMessages.slice(0, 5).map((msg) => (
                    <div key={msg.id} className="bg-black/40 p-5 rounded-xl border-2 border-white/20 backdrop-blur-sm">
                      <p className="text-base font-semibold text-cyan-100 leading-relaxed">
                        {truncateToFirstParagraph(msg.message)}
                      </p>
                      <p className="text-sm font-bold text-cyan-300 mt-4">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-black/30 p-8 rounded-xl text-center text-cyan-300 border-2 border-white/20 backdrop-blur-sm">
                    <p className="text-lg font-bold">No voice examples yet</p>
                    <p className="text-sm font-semibold mt-2">Add examples to improve AI follow-ups</p>
                  </div>
                )}
              </div>
            </div>

            {/* Generated Messages Section */}
            <div className="rounded-2xl shadow-2xl p-6 border-2 border-white/20 backdrop-blur-md" style={{ backgroundImage: 'radial-gradient( circle 349px at 0.3% 48.6%, rgba(0,0,0,1) 0%, rgba(87,124,253,0.89) 100.7% )' }}>
              <h2 className="text-2xl font-black text-white mb-6 flex items-center">
                <span className="w-4 h-4 bg-purple-300 rounded-full mr-4 shadow-lg"></span>
                Generated Follow-Ups
              </h2>
              <div className="space-y-4">
                {generatedMessages.length > 0 ? (
                  generatedMessages.map((msg) => (
                    <div key={msg.id} className="bg-black/40 p-5 rounded-xl border-2 border-white/20 backdrop-blur-sm">
                      <p className="text-base font-semibold text-purple-100 leading-relaxed">
                        {truncateToFirstParagraph(msg.message)}
                      </p>
                      <p className="text-sm font-bold text-purple-300 mt-4">
                        {new Date(msg.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-black/30 p-8 rounded-xl text-center text-purple-300 border-2 border-white/20 backdrop-blur-sm">
                    <p className="text-lg font-bold">No generated messages yet</p>
                    <p className="text-sm font-semibold mt-2">Add client notes and agent voice to generate follow-ups</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 