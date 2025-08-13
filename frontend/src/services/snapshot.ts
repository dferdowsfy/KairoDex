// Client Snapshot Service
// Integrates with Make.com webhook to fetch client data from Google Sheets

export type SnapshotResponse =
  | { status: "ok"; client: { client_id?: string; name: string; stage?: string; budget?: string; notes?: string; last_contact?: string; next_action?: string; next_action_due?: string }; answer?: string }
  | { status: "multiple"; options: Array<{ client_id: string; name: string }> }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

interface SnapshotRequestParams {
  clientId: string;
  agentId: string;
  question?: string;
}

/**
 * Fetches client snapshot data from Google Sheets via Make.com webhook
 * @param params - Request parameters including clientId, agentId, and optional question
 * @returns Promise<SnapshotResponse> - Structured client data or error response
 */
export async function fetchClientSnapshot({ 
  clientId, 
  agentId, 
  question = "client snapshot" 
}: SnapshotRequestParams): Promise<SnapshotResponse> {
  const makeUrl = process.env.NEXT_PUBLIC_MAKE_SNAPSHOT_URL;
  const makeApiKey = process.env.NEXT_PUBLIC_MAKE_APIKEY;

  if (!makeUrl) {
    return {
      status: "error",
      message: "Make.com webhook URL not configured. Please check environment variables."
    };
  }

  try {
    const response = await fetch(makeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(makeApiKey && { 'x-make-apikey': makeApiKey })
      },
      body: JSON.stringify({
        client_id: clientId,
        agent_id: agentId,
        question: question
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

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
        options: data.options.map((option: any) => ({
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
