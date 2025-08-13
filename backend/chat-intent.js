const crypto = require('crypto');

// Supported action catalog (baseline)
const ACTIONS = {
  FOLLOW_UP_SEND: { danger: false },
  FOLLOW_UP_DRAFT: { danger: false },
  CONTRACT_AMEND: { danger: true },
  CONTRACT_SEND_SIGNATURE: { danger: true },
  SHOWING_SCHEDULE: { danger: false },
  SHOWING_RESCHEDULE: { danger: false },
  LISTING_SHARE: { danger: false },
  LISTING_UPDATE_STATUS: { danger: true },
  LEDGER_LOG_EVENT: { danger: false },
  LEDGER_VIEW: { danger: false },
  CLIENT_SNAPSHOT: { danger: false }
};

function hashKey(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function extractIntents(message) {
  const m = message.toLowerCase();
  const intents = [];
  if (/follow.?up|check in|reach out/.test(m)) intents.push('follow_up');
  if (/amend|change|modify.*contract|seller credit|closing date/.test(m)) intents.push('contract_amend');
  if (/send.*(signature|sign)/.test(m)) intents.push('contract_send');
  if (/(book|schedule).*showing|showing.*(time|slot)|tour/.test(m)) intents.push('schedule_showing');
  if (/reschedule.*showing|move.*showing/.test(m)) intents.push('reschedule_showing');
  if (/share.*listing|send.*listing/.test(m)) intents.push('share_listing');
  if (/mark.*pending|update.*listing|change.*status/.test(m)) intents.push('update_listing');
  if (/\/snapshot|snapshot|client data|client snapshot|budget|notes|last contact|next action/.test(m)) intents.push('client_snapshot');
  if (/log.*(event|call|note)|record.*(conversation|call)/.test(m)) intents.push('ledger_log');
  if (/view.*ledger|show.*ledger|audit trail/.test(m)) intents.push('ledger_view');
  return intents;
}

function buildChip({ label, action_type, parameters = {}, danger = false, requires_confirmation, placeholders_present }) {
  const base = { label, action_type, parameters, danger };
  if (requires_confirmation == null) {
    base.requires_confirmation = danger || placeholders_present;
  } else {
    base.requires_confirmation = requires_confirmation;
  }
  base.idempotency_key = hashKey({ action_type, parameters });
  base.meta = { placeholders_present: !!placeholders_present };
  return base;
}

function generateAssistantPlan({ message, mode = 'GUIDED', clientContext = {}, clientId }) {
  const intents = extractIntents(message);
  const chips = [];
  let response_text;
  const auto_executed_actions = [];
  const placeholders = [];

  if (intents.length === 0) {
    response_text = 'Let me know what you would like to do next.';
    chips.push(buildChip({ label: 'Log Event', action_type: 'LEDGER_LOG_EVENT', parameters: { client_id: clientId, summary: '[summary]' }, placeholders_present: true }));
    return { response_text, chips, auto_executed_actions, mode, placeholders_present: placeholders.length > 0 };
  }

  const primary = intents[0];
  switch (primary) {
    case 'follow_up':
      response_text = 'I can help you create a personalized follow-up. What would you like to know about this client first?';
      chips.push(buildChip({ label: '📧 Check Last Correspondence', action_type: 'FOLLOW_UP_CHECK_LAST', parameters: { client_id: clientId }, placeholders_present: false }));
      chips.push(buildChip({ label: '👤 Get Client Details', action_type: 'FOLLOW_UP_CLIENT_DETAILS', parameters: { client_id: clientId }, placeholders_present: false }));
      chips.push(buildChip({ label: '🔍 Search Client History', action_type: 'FOLLOW_UP_SEARCH_HISTORY', parameters: { client_id: clientId }, placeholders_present: false }));
      chips.push(buildChip({ label: '✉️ Generate Follow-Up Now', action_type: 'FOLLOW_UP_GENERATE', parameters: { client_id: clientId }, placeholders_present: false }));
      break;
    case 'contract_amend':
      response_text = 'I can draft a contract amendment for those changes.';
      chips.push(buildChip({ label: 'Amend Contract', action_type: 'CONTRACT_AMEND', parameters: { client_id: clientId, contract_id: '[contract]', instruction: message }, danger: true, placeholders_present: true }));
      break;
    case 'contract_send':
      response_text = 'We can send the current contract for signature.';
      chips.push(buildChip({ label: 'Send for Signature', action_type: 'CONTRACT_SEND_SIGNATURE', parameters: { client_id: clientId, contract_id: '[contract]' }, danger: true, placeholders_present: true }));
      break;
    case 'schedule_showing':
      response_text = 'Let’s schedule a property showing.';
      chips.push(buildChip({ label: 'Schedule Showing', action_type: 'SHOWING_SCHEDULE', parameters: { client_id: clientId, property: '[address]', date: '[date]', time: '[time]' }, placeholders_present: true }));
      break;
    case 'reschedule_showing':
      response_text = 'We can reschedule the showing.';
      chips.push(buildChip({ label: 'Reschedule', action_type: 'SHOWING_RESCHEDULE', parameters: { client_id: clientId, showing_id: '[showing]', new_date: '[date]', new_time: '[time]' }, placeholders_present: true }));
      break;
    case 'share_listing':
      response_text = 'Ready to share the listing.';
      chips.push(buildChip({ label: 'Share Listing', action_type: 'LISTING_SHARE', parameters: { client_id: clientId, listing_id: '[listing]', channel: '[channel]' }, placeholders_present: true }));
      break;
    case 'update_listing':
      response_text = 'We can update the listing status.';
      chips.push(buildChip({ label: 'Update Listing', action_type: 'LISTING_UPDATE_STATUS', parameters: { listing_id: '[listing]', new_status: '[status]' }, danger: true, placeholders_present: true }));
      break;
    case 'ledger_log':
      response_text = 'I can log this event to the ledger.';
      chips.push(buildChip({ label: 'Log Event', action_type: 'LEDGER_LOG_EVENT', parameters: { client_id: clientId, summary: message }, placeholders_present: false }));
      chips.push(buildChip({ label: 'View Ledger', action_type: 'LEDGER_VIEW', parameters: { client_id: clientId }, placeholders_present: false }));
      break;
    case 'ledger_view':
      response_text = 'Opening recent ledger entries.';
      chips.push(buildChip({ label: 'View Ledger', action_type: 'LEDGER_VIEW', parameters: { client_id: clientId }, placeholders_present: false }));
      break;
    case 'client_snapshot':
      response_text = 'Fetching the latest client snapshot from your CRM...';
      chips.push(buildChip({ label: '📊 Get Client Snapshot', action_type: 'CLIENT_SNAPSHOT', parameters: { client_id: clientId }, placeholders_present: false }));
      break;
    default:
      response_text = 'Action detected, choose an option below.';
  }

  return { response_text, chips, auto_executed_actions, mode, placeholders_present: placeholders.length > 0 };
}

module.exports = { generateAssistantPlan };
