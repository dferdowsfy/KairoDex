// Mock DocuSign service for testing purposes
// This simulates DocuSign functionality without requiring real authentication

const mockDocuSignService = {
  // Mock envelope creation
  createEnvelope: async (accountId, envelopeDefinition) => {
    console.log('🔧 Mock DocuSign: Creating envelope...');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      envelopeId: `mock-envelope-${Date.now()}`,
      status: 'created',
      uri: `/envelopes/mock-envelope-${Date.now()}`
    };
  },

  // Mock recipient view creation
  createRecipientView: async (accountId, envelopeId, viewRequest) => {
    console.log('🔧 Mock DocuSign: Creating recipient view...');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return a mock signing URL that will work in iFrame
    return {
      url: `http://localhost:3001/mock-docusign-signing?envelopeId=${envelopeId}&clientName=${encodeURIComponent(viewRequest.recipientViewRequest.userName)}&clientEmail=${encodeURIComponent(viewRequest.recipientViewRequest.email)}`,
      token: `mock-token-${Date.now()}`
    };
  },

  // Mock envelope status
  getEnvelope: async (accountId, envelopeId) => {
    console.log('🔧 Mock DocuSign: Getting envelope status...');
    
    return {
      envelopeId: envelopeId,
      status: 'sent',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
  }
};

// Mock DocuSign API client
class MockDocuSignClient {
  constructor() {
    this.envelopesApi = mockDocuSignService;
  }
}

module.exports = {
  mockDocuSignService,
  MockDocuSignClient
}; 