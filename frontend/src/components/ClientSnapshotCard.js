import React, { useState } from 'react';
import { generateFollowUpEmail } from '../services/followup';

const ClientSnapshotCard = ({
  client,
  answer,
  customColors = {},
  onSendFollowUp,
  onOpenInCRM
}) => {
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState(null);
  
  const formatValue = (value) => value || "—";
  
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

  const handleGenerateFollowUp = async () => {
    if (!client.follow_up_notes) {
      alert('No follow-up notes available for this client.');
      return;
    }

    setIsGeneratingFollowUp(true);
    try {
      const result = await generateFollowUpEmail({
        client_name: client.name,
        client_email: client.email || '',
        follow_up_notes: client.follow_up_notes,
        client_stage: client.stage,
        agent_name: 'Real Estate Agent' // You can make this dynamic if needed
      });

      if (result.success) {
        setGeneratedEmail(result.data);
      } else {
        alert('Failed to generate follow-up email: ' + result.message);
      }
    } catch (error) {
      console.error('Error generating follow-up:', error);
      alert('Error generating follow-up email. Please try again.');
    } finally {
      setIsGeneratingFollowUp(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
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
              City:
            </span>
            <span className="break-words">{formatValue(client.city)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span 
              className="font-medium text-xs block mb-1" 
              style={{ color: customColors.textSecondary || '#94A3B8' }}
            >
              Last Contact:
            </span>
            <span className="break-words">{formatValue(client.last_contact)}</span>
          </div>
          <div>
            <span 
              className="font-medium text-xs block mb-1" 
              style={{ color: customColors.textSecondary || '#94A3B8' }}
            >
              Timeline:
            </span>
            <span className="break-words">{formatValue(client.timeline)}</span>
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
            Follow-up Notes (Column Y):
          </span>
          <div className="bg-black bg-opacity-20 rounded p-2 text-xs max-h-16 overflow-y-auto">
            {formatValue(client.follow_up_notes)}
          </div>
        </div>

        {generatedEmail && (
          <div>
            <span 
              className="font-medium text-xs block mb-1" 
              style={{ color: customColors.textSecondary || '#94A3B8' }}
            >
              Generated Follow-up Email:
            </span>
            <div className="bg-black bg-opacity-20 rounded p-2 text-xs space-y-2">
              <div>
                <strong>Subject:</strong> {generatedEmail.subject}
                <button 
                  onClick={() => copyToClipboard(generatedEmail.subject)}
                  className="ml-2 text-blue-400 hover:text-blue-300"
                  title="Copy subject"
                >
                  📋
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto">
                <strong>Body:</strong>
                <div className="mt-1 whitespace-pre-wrap">{generatedEmail.body}</div>
                <button 
                  onClick={() => copyToClipboard(generatedEmail.body)}
                  className="mt-2 text-blue-400 hover:text-blue-300"
                  title="Copy body"
                >
                  📋 Copy Email Body
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 pt-2">
        {client.follow_up_notes && (
          <button
            onClick={handleGenerateFollowUp}
            disabled={isGeneratingFollowUp}
            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-colors hover:opacity-90 flex items-center justify-center space-x-1 disabled:opacity-50"
            style={{ backgroundColor: customColors.primaryButton || '#7C3AED', color: 'white' }}
          >
            <span>🤖</span>
            <span>{isGeneratingFollowUp ? 'Generating...' : 'Generate Follow-up'}</span>
          </button>
        )}
        
        {answer && onSendFollowUp && (
          <button
            onClick={handleSendFollowUp}
            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-colors hover:opacity-90 flex items-center justify-center space-x-1"
            style={{ backgroundColor: customColors.secondaryButton || '#2563EB', color: 'white' }}
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
              backgroundColor: customColors.tertiaryButton || '#059669', 
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
