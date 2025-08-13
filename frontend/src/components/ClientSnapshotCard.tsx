import React from 'react';

interface ClientSnapshotCardProps {
  client: {
    client_id?: string;
    name: string;
    stage?: string;
    budget?: string;
    notes?: string;
    last_contact?: string;
    next_action?: string;
    next_action_due?: string;
  };
  answer?: string;
  customColors?: any;
  onSendFollowUp?: (text: string) => void;
  onOpenInCRM?: (clientId: string) => void;
}

const ClientSnapshotCard: React.FC<ClientSnapshotCardProps> = ({
  client,
  answer,
  customColors = {},
  onSendFollowUp,
  onOpenInCRM
}) => {
  const formatValue = (value?: string) => value || "—";
  
  const formatNextAction = () => {
    if (!client.next_action) return "—";
    if (client.next_action_due) {
      return `${client.next_action} (due ${client.next_action_due})`;
    }
    return client.next_action;
  };

  const handleSendFollowUp = () => {
    if (answer && onSendFollowUp) {
      onSendFollowUp(answer);
    }
  };

  const handleOpenInCRM = () => {
    if (client.client_id && onOpenInCRM) {
      onOpenInCRM(client.client_id);
    }
  };

  return (
    <div 
      className="rounded-lg border p-4 my-3 space-y-3 shadow-sm"
      style={{ 
        backgroundColor: customColors.cardBackground || 'rgba(255, 255, 255, 0.04)',
        borderColor: customColors.cardBorder || 'rgba(255, 255, 255, 0.08)',
        color: customColors.textPrimary || '#E2E8F0'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: customColors.cardBorder || 'rgba(255, 255, 255, 0.08)' }}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            📊
          </div>
          <div>
            <h3 className="font-semibold text-sm">Client Snapshot</h3>
            <p className="text-xs opacity-70">{new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Client Information Grid */}
      <div className="grid grid-cols-1 gap-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span 
              className="font-medium text-xs block mb-1" 
              style={{ color: customColors.textSecondary || '#94A3B8' }}
            >
              Client:
            </span>
            <span className="break-words">{formatValue(client.name)}</span>
          </div>
          <div>
            <span 
              className="font-medium text-xs block mb-1" 
              style={{ color: customColors.textSecondary || '#94A3B8' }}
            >
              Stage:
            </span>
            <span className="break-words">{formatValue(client.stage)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span 
              className="font-medium text-xs block mb-1" 
              style={{ color: customColors.textSecondary || '#94A3B8' }}
            >
              Budget:
            </span>
            <span className="break-words">{formatValue(client.budget)}</span>
          </div>
          <div>
            <span 
              className="font-medium text-xs block mb-1" 
              style={{ color: customColors.textSecondary || '#94A3B8' }}
            >
              Last Contact:
            </span>
            <span className="break-words">{formatValue(client.last_contact)}</span>
          </div>
        </div>

        <div>
          <span 
            className="font-medium text-xs block mb-1" 
            style={{ color: customColors.textSecondary || '#94A3B8' }}
          >
            Next Action:
          </span>
          <span className="break-words">{formatNextAction()}</span>
        </div>

        <div>
          <span 
            className="font-medium text-xs block mb-1" 
            style={{ color: customColors.textSecondary || '#94A3B8' }}
          >
            Notes:
          </span>
          <div className="bg-black bg-opacity-20 rounded p-2 text-xs max-h-16 overflow-y-auto">
            {formatValue(client.notes)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 pt-2">
        {answer && onSendFollowUp && (
          <button
            onClick={handleSendFollowUp}
            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-colors hover:opacity-90 flex items-center justify-center space-x-1"
            style={{ backgroundColor: customColors.primaryButton || '#2563EB', color: 'white' }}
          >
            <span>📧</span>
            <span>Send Follow-up</span>
          </button>
        )}
        
        {client.client_id && onOpenInCRM && (
          <button
            onClick={handleOpenInCRM}
            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-colors hover:opacity-90 flex items-center justify-center space-x-1"
            style={{ 
              backgroundColor: customColors.secondaryButton || '#059669', 
              color: 'white' 
            }}
          >
            <span>🔗</span>
            <span>Open in CRM</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ClientSnapshotCard;
