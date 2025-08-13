// Client Snapshot Service
// Integrates with Make.com webhook to fetch client data from Google Sheets

/**
 * Fetches client snapshot data from Google Sheets via Make.com webhook
 * @param {Object} params - Request parameters
 * @param {string} params.clientId - Client ID from frontend
 * @param {Object} params.clientData - Complete client object with name, email, etc.
 * @param {string} params.agentId - Agent ID  
 * @param {string} [params.question] - Optional question (defaults to "client snapshot")
 * @returns {Promise<Object>} - Structured client data or error response
 */
export async function fetchClientSnapshot({ 
  clientId, 
  clientData,
  agentId, 
  question = "client snapshot" 
}) {
  const makeUrl = process.env.REACT_APP_MAKE_SNAPSHOT_URL || process.env.NEXT_PUBLIC_MAKE_SNAPSHOT_URL;
  const makeApiKey = process.env.REACT_APP_MAKE_APIKEY || process.env.NEXT_PUBLIC_MAKE_APIKEY;

  if (!makeUrl) {
    return {
      status: "error",
      message: "Make.com webhook URL not configured. Please check environment variables."
    };
  }

  try {
    // Make.com webhook configured without authentication
    let requestUrl = makeUrl;
    let headers = {
      'Content-Type': 'application/json'
    };

    // Don't send API key - webhook works without authentication
    console.log('🔗 Webhook Request Details:', {
      url: requestUrl,
      headers: headers,
      authentication: 'none (as configured in Make.com)'
    });

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        client_id: clientId,
        client_name: clientData?.name || clientData?.full_name || '',
        client_email: clientData?.email || '',
        client_phone: clientData?.phone || '',
        agent_id: agentId,
        question: question,
        // Fallback search fields for Make.com to try matching
        search_fields: {
          name: clientData?.name || clientData?.full_name || '',
          email: clientData?.email || '',
          phone: clientData?.phone || '',
          first_name: clientData?.first_name || (clientData?.name || '').split(' ')[0] || '',
          last_name: clientData?.last_name || (clientData?.name || '').split(' ').slice(1).join(' ') || ''
        }
      })
    });

    console.log('📡 Webhook Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorText = 'Unknown error';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = `Status ${response.status} ${response.statusText}`;
      }
      
      console.error('❌ Webhook Error Details:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    let data;
    try {
      // Try to parse as JSON first
      data = await response.json();
      console.log('📄 Make.com returned JSON:', data);
    } catch (jsonError) {
      // If JSON parsing fails, try to get as text (but response might already be consumed)
      console.log('📄 JSON parsing failed, Make.com likely returned non-JSON response');
      
      return {
        status: "error",
        message: `Make.com returned invalid JSON. Response status: ${response.status}. Please check your webhook response module configuration.`
      };
    }

    // Validate response structure
    if (data.status === "ok" && data.client) {
      return {
        status: "ok",
        client: {
          client_id: data.client.client_id,
          name: data.client.name || "Unknown Client",
          stage: data.client.stage,
          budget: data.client.budget,
          notes: data.client.notes,
          last_contact: data.client.last_contact,
          next_action: data.client.next_action,
          next_action_due: data.client.next_action_due
        },
        answer: data.answer
      };
    } else if (data.status === "multiple" && Array.isArray(data.options)) {
      return {
        status: "multiple",
        options: data.options.map((option) => ({
          client_id: option.client_id || "",
          name: option.name || "Unknown Client"
        }))
      };
    } else if (data.status === "not_found") {
      return {
        status: "not_found",
        message: data.message || "Client not found in the system."
      };
    } else {
      return {
        status: "error",
        message: data.message || "Unexpected response format from Make.com webhook."
      };
    }

  } catch (error) {
    console.error('Error fetching client snapshot:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        status: "error",
        message: "Network error. Please check your internet connection and try again."
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred while fetching client snapshot."
    };
  }
}
