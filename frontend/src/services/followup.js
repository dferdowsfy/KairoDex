// Follow-up Email Generation Service
// Uses OpenAI to generate personalized follow-up emails based on client notes

/**
 * Generates a follow-up email draft using OpenAI based on client notes
 * @param {Object} params - Request parameters
 * @param {string} params.clientName - Client's name
 * @param {string} params.clientEmail - Client's email
 * @param {string} params.followUpNotes - Notes from column Y for follow-up generation
 * @param {string} params.clientStage - Current client stage
 * @param {string} params.agentName - Agent's name
 * @returns {Promise<Object>} - Generated email draft or error response
 */
export async function generateFollowUpEmail({ 
  clientName, 
  clientEmail, 
  followUpNotes, 
  clientStage, 
  agentName = "Your Real Estate Agent" 
}) {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  if (!followUpNotes) {
    return {
      status: "error",
      message: "No follow-up notes available for this client. Please add notes in column Y of your Google Sheets."
    };
  }

  try {
    console.log('🔗 Generating follow-up email...', {
      clientName,
      clientStage,
      notesPreview: followUpNotes.substring(0, 100) + '...'
    });

    const response = await fetch(`${apiUrl}/api/generate-followup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({
        client_name: clientName,
        client_email: clientEmail,
        follow_up_notes: followUpNotes,
        client_stage: clientStage,
        agent_name: agentName
      })
    });

    console.log('📡 Follow-up API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      let errorText = 'Unknown error';
      try {
        const errorData = await response.json();
        errorText = errorData.message || errorData.error || `HTTP ${response.status}`;
      } catch (e) {
        errorText = await response.text() || `HTTP ${response.status} ${response.statusText}`;
      }
      
      console.error('❌ Follow-up API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📄 Follow-up generated successfully:', {
      hasSubject: !!data.subject,
      hasBody: !!data.body,
      bodyLength: data.body?.length || 0
    });

    // Validate response structure
    if (data.status === "success" && data.subject && data.body) {
      return {
        status: "success",
        email: {
          to: clientEmail,
          subject: data.subject,
          body: data.body,
          client_name: clientName,
          generated_at: new Date().toISOString()
        }
      };
    } else {
      return {
        status: "error",
        message: data.message || "Unexpected response format from follow-up generator."
      };
    }

  } catch (error) {
    console.error('Error generating follow-up email:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        status: "error",
        message: "Network error. Please check your internet connection and try again."
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred while generating follow-up email."
    };
  }
}
