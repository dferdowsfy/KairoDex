import React, { useState, useEffect } from 'react';
import { logToBlockchain } from '../utils/blockchain';

const AgentDashboard = ({ 
  user, 
  customColors, 
  clientId, 
  setClientId, 
  clients,
  onGenerateFollowUp,
  onContractAmendment,
  onDocuSignCreate
}) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [reminders, setReminders] = useState([]);
  const [clientPipeline, setClientPipeline] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [blockchainActivities, setBlockchainActivities] = useState([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', date: '', priority: 'medium', clientId: '' });
  const [stats, setStats] = useState({
    activeClients: 0,
    pendingContracts: 0,
    scheduledShowings: 0,
    thisMonthDeals: 0
  });

  // State for expandable cards
  const [expandedActivityCards, setExpandedActivityCards] = useState(new Set());
  const [expandedClientCards, setExpandedClientCards] = useState(new Set());
  const [expandedReminderCards, setExpandedReminderCards] = useState(new Set());
  const [expandedBlockchainCards, setExpandedBlockchainCards] = useState(new Set());

  // State for dropdowns
  const [openDropdowns, setOpenDropdowns] = useState(new Set());
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedActivityForReminder, setSelectedActivityForReminder] = useState(null);
  const [newReminderFromActivity, setNewReminderFromActivity] = useState({
    title: '',
    date: '',
    priority: 'medium',
    clientId: '',
    activityId: ''
  });

  // Toggle expanded state for different card types
  const toggleActivityCard = (activityId) => {
    const newExpanded = new Set(expandedActivityCards);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivityCards(newExpanded);
  };

  const toggleClientCard = (clientId) => {
    const newExpanded = new Set(expandedClientCards);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClientCards(newExpanded);
  };

  const toggleReminderCard = (reminderId) => {
    const newExpanded = new Set(expandedReminderCards);
    if (newExpanded.has(reminderId)) {
      newExpanded.delete(reminderId);
    } else {
      newExpanded.add(reminderId);
    }
    setExpandedReminderCards(newExpanded);
  };

  const toggleBlockchainCard = (activityId) => {
    const newExpanded = new Set(expandedBlockchainCards);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedBlockchainCards(newExpanded);
  };

  // Toggle dropdown state
  const toggleDropdown = (dropdownId) => {
    const newOpenDropdowns = new Set(openDropdowns);
    if (newOpenDropdowns.has(dropdownId)) {
      newOpenDropdowns.delete(dropdownId);
    } else {
      newOpenDropdowns.add(dropdownId);
    }
    setOpenDropdowns(newOpenDropdowns);
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setOpenDropdowns(new Set());
  };

  // Handle dropdown action
  const handleDropdownAction = (action, activity) => {
    closeAllDropdowns();
    
    switch(action) {
      case 'generate_followup':
        onGenerateFollowUp();
        break;
      case 'set_reminder':
        setSelectedActivityForReminder(activity);
        setNewReminderFromActivity({
          title: `Follow up on ${activity.title}`,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Tomorrow
          priority: 'medium',
          clientId: activity.clientId,
          activityId: activity.id
        });
        setShowReminderModal(true);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // Add reminder from activity
  const addReminderFromActivity = async () => {
    if (!newReminderFromActivity.title || !newReminderFromActivity.date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const reminder = {
        id: Date.now(),
        title: newReminderFromActivity.title,
        date: newReminderFromActivity.date,
        priority: newReminderFromActivity.priority,
        clientId: newReminderFromActivity.clientId,
        activityId: newReminderFromActivity.activityId,
        completed: false
      };

      setReminders(prev => [...prev, reminder]);
      setShowReminderModal(false);
      setSelectedActivityForReminder(null);
      setNewReminderFromActivity({
        title: '',
        date: '',
        priority: 'medium',
        clientId: '',
        activityId: ''
      });

      // Log to blockchain
      await logToBlockchain('reminder_created', {
        reminderId: reminder.id,
        activityId: reminder.activityId,
        clientId: reminder.clientId,
        title: reminder.title,
        scheduledDate: reminder.date
      });

      console.log('Reminder added successfully:', reminder);
    } catch (error) {
      console.error('Error adding reminder:', error);
      alert('Failed to add reminder. Please try again.');
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sample data - in real app, this would come from API
  useEffect(() => {
    // Load dashboard data
    setReminders([
      {
        id: 1,
        title: 'Follow up with Sarah Johnson',
        date: '2025-08-07T10:00:00',
        priority: 'high',
        clientId: 'client1',
        completed: false
      },
      {
        id: 2,
        title: 'Contract review with Mike Chen',
        date: '2025-08-08T14:00:00',
        priority: 'medium',
        clientId: 'client2',
        completed: false
      },
      {
        id: 3,
        title: 'Property showing - 123 Main St',
        date: '2025-08-09T16:00:00',
        priority: 'high',
        clientId: 'client3',
        completed: false
      }
    ]);

    setClientPipeline([
      { id: 'client1', name: 'Sarah Johnson', stage: 'qualified', budget: '$450k-$550k', lastContact: '2 days ago' },
      { id: 'client2', name: 'Mike Chen', stage: 'contract', budget: '$600k-$750k', lastContact: '1 day ago' },
      { id: 'client3', name: 'Emily Rodriguez', stage: 'prospecting', budget: '$350k-$450k', lastContact: '3 days ago' },
      { id: 'client4', name: 'David Kim', stage: 'closing', budget: '$800k-$950k', lastContact: 'Today' }
    ]);

    setRecentActivities([
      {
        id: 1,
        type: 'followup_generated',
        title: 'AI Follow-up Generated',
        description: 'Generated personalized follow-up for Sarah Johnson',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        clientId: 'client1',
        blockchainTx: '0x1234...5678'
      },
      {
        id: 2,
        type: 'contract_amended',
        title: 'Contract Amended',
        description: 'Modified purchase agreement for Mike Chen',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        clientId: 'client2',
        blockchainTx: '0x8765...4321'
      },
      {
        id: 3,
        type: 'docusign_sent',
        title: 'DocuSign Envelope Sent',
        description: 'Sent contract for signature to Emily Rodriguez',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        clientId: 'client3',
        blockchainTx: '0xabcd...efgh'
      }
    ]);

    setStats({
      activeClients: 12,
      pendingContracts: 3,
      scheduledShowings: 5,
      thisMonthDeals: 2
    });
  }, []);

  const addReminder = async () => {
    if (!newReminder.title || !newReminder.date) return;

    const reminder = {
      id: Date.now(),
      ...newReminder,
      completed: false
    };

    setReminders([...reminders, reminder]);
    
    // Log to blockchain
    await logToBlockchain(
      `Reminder added: ${reminder.title} for ${reminder.date}`,
      'reminder_added'
    );

    setNewReminder({ title: '', date: '', priority: 'medium', clientId: '' });
    setShowAddReminder(false);
  };

  const completeReminder = async (reminderId) => {
    setReminders(reminders.map(r => 
      r.id === reminderId ? { ...r, completed: true } : r
    ));

    const reminder = reminders.find(r => r.id === reminderId);
    await logToBlockchain(
      `Reminder completed: ${reminder.title}`,
      'reminder_completed'
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'prospecting': return '#6B7280';
      case 'qualified': return '#3B82F6';
      case 'contract': return '#F59E0B';
      case 'closing': return '#10B981';
      default: return '#6B7280';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="pt-24 pb-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ background: customColors.gradientCardBlue, borderColor: customColors.cardBorder }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: customColors.textSecondary }}>
                Active Clients
              </p>
              <p className="text-2xl font-bold" style={{ color: customColors.textPrimary }}>
                {stats.activeClients}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ background: customColors.gradientCardYellow, borderColor: customColors.cardBorder }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: customColors.textSecondary }}>
                Pending Contracts
              </p>
              <p className="text-2xl font-bold" style={{ color: customColors.textPrimary }}>
                {stats.pendingContracts}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ background: customColors.gradientCardGreen, borderColor: customColors.cardBorder }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: customColors.textSecondary }}>
                Scheduled Showings
              </p>
              <p className="text-2xl font-bold" style={{ color: customColors.textPrimary }}>
                {stats.scheduledShowings}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ background: customColors.gradientCardPurple, borderColor: customColors.cardBorder }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: customColors.textSecondary }}>
                This Month Deals
              </p>
              <p className="text-2xl font-bold" style={{ color: customColors.textPrimary }}>
                {stats.thisMonthDeals}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-8">
        {['overview', 'pipeline', 'reminders', 'blockchain'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 capitalize ${
              activeSection === section 
                ? 'text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            style={{ 
              backgroundColor: activeSection === section ? customColors.primaryButton : 'transparent'
            }}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           {/* Recent Activities */}
                 <div 
                   className="rounded-xl border p-6 shadow-lg"
                   style={{ 
                     backgroundColor: customColors.cardBackground, 
                     borderColor: customColors.cardBorder,
                     opacity: 0.95
                   }}
                 >
                   <h3 className="text-xl font-bold mb-4" style={{ color: customColors.textPrimary }}>
                     Recent Activities
                   </h3>
                   <div className="space-y-4">
                     {recentActivities.map((activity) => (
                       <div 
                         key={activity.id} 
                         className="rounded-lg border transition-all duration-200 hover:bg-black hover:bg-opacity-10 shadow-sm hover:shadow-md"
                         style={{ borderColor: customColors.cardBorder }}
                       >
                         <div 
                           className="flex items-start space-x-3 p-4 cursor-pointer"
                           onClick={() => toggleActivityCard(activity.id)}
                         >
                           <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="text-sm font-semibold" style={{ color: customColors.textPrimary }}>
                               {activity.title}
                             </p>
                             <p className="text-xs" style={{ color: customColors.textSecondary }}>
                               {activity.description}
                             </p>
                             <p className="text-xs mt-1 flex items-center space-x-2" style={{ color: customColors.textSecondary }}>
                               <span>{formatTimeAgo(activity.timestamp)}</span>
                               <span>•</span>
                               <span className="font-mono text-xs">{activity.blockchainTx}</span>
                               <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                 Verified
                               </span>
                             </p>
                           </div>
                           <div className="flex-shrink-0 flex items-center space-x-2">
                             {/* Dropdown Menu */}
                             <div className="relative dropdown-container">
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   toggleDropdown(`activity-${activity.id}`);
                                 }}
                                 className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center space-x-1"
                               >
                                 <span>Actions</span>
                                 <svg 
                                   className={`w-3 h-3 transition-transform duration-200 ${openDropdowns.has(`activity-${activity.id}`) ? 'rotate-180' : ''}`} 
                                   fill="none" 
                                   stroke="currentColor" 
                                   viewBox="0 0 24 24"
                                 >
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                 </svg>
                               </button>
                               
                               {/* Dropdown Content */}
                               {openDropdowns.has(`activity-${activity.id}`) && (
                                 <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg z-50"
                                      style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder, border: '1px solid' }}>
                                   <div className="py-1">
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleDropdownAction('generate_followup', activity);
                                       }}
                                       className="w-full text-left px-4 py-2 text-sm hover:bg-black hover:bg-opacity-20 transition-colors flex items-center space-x-2"
                                       style={{ color: customColors.textPrimary }}
                                     >
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                       </svg>
                                       <span>Generate Follow-up</span>
                                     </button>
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleDropdownAction('set_reminder', activity);
                                       }}
                                       className="w-full text-left px-4 py-2 text-sm hover:bg-black hover:bg-opacity-20 transition-colors flex items-center space-x-2"
                                       style={{ color: customColors.textPrimary }}
                                     >
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                       </svg>
                                       <span>Set Reminder</span>
                                     </button>
                                   </div>
                                 </div>
                               )}
                             </div>
                             
                             <svg 
                               className={`w-4 h-4 transition-transform duration-200 ${expandedActivityCards.has(activity.id) ? 'rotate-180' : ''}`} 
                               style={{ color: customColors.textSecondary }} 
                               fill="none" 
                               stroke="currentColor" 
                               viewBox="0 0 24 24"
                             >
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                             </svg>
                           </div>
                         </div>
                         
                         {/* Expanded Details */}
                         {expandedActivityCards.has(activity.id) && (
                           <div className="px-4 pb-4 border-t" style={{ borderColor: customColors.cardBorder }}>
                             <div className="pt-4 space-y-3">
                               <div className="grid grid-cols-2 gap-4 text-xs">
                                 <div>
                                   <span className="font-semibold" style={{ color: customColors.textSecondary }}>Client:</span>
                                   <p style={{ color: customColors.textPrimary }}>
                                     {clients.find(c => c.id === activity.clientId)?.name || 'Unknown Client'}
                                   </p>
                                 </div>
                                 <div>
                                   <span className="font-semibold" style={{ color: customColors.textSecondary }}>Activity Type:</span>
                                   <p style={{ color: customColors.textPrimary }}>
                                     {activity.type.replace('_', ' ').toUpperCase()}
                                   </p>
                                 </div>
                                 <div>
                                   <span className="font-semibold" style={{ color: customColors.textSecondary }}>Timestamp:</span>
                                   <p style={{ color: customColors.textPrimary }}>
                                     {new Date(activity.timestamp).toLocaleString()}
                                   </p>
                                 </div>
                                 <div>
                                   <span className="font-semibold" style={{ color: customColors.textSecondary }}>Blockchain TX:</span>
                                   <p className="font-mono" style={{ color: customColors.textPrimary }}>
                                     {activity.blockchainTx}
                                   </p>
                                 </div>
                               </div>
                               <div>
                                 <span className="font-semibold text-xs" style={{ color: customColors.textSecondary }}>Full Description:</span>
                                 <p className="text-xs mt-1" style={{ color: customColors.textPrimary }}>
                                   {activity.description} - This activity was automatically logged to the blockchain for transparency and audit purposes. 
                                   The transaction hash above can be used to verify this activity on the blockchain explorer.
                                 </p>
                               </div>
                             </div>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 </div>

                           {/* Quick Actions */}
                 <div 
                   className="rounded-xl border p-6 shadow-lg"
                   style={{ 
                     backgroundColor: customColors.cardBackground, 
                     borderColor: customColors.cardBorder,
                     opacity: 0.95,
                     position: 'relative',
                     zIndex: 10
                   }}
                 >
                   <h3 className="text-xl font-bold mb-4" style={{ color: customColors.textPrimary }}>
                     Quick Actions
                   </h3>
                   <div className="grid grid-cols-1 gap-3">
                     <button
                       onClick={() => {
                         console.log('Generate Follow-up clicked - AgentDashboard');
                         console.log('onGenerateFollowUp function:', onGenerateFollowUp);
                         // Add visual feedback
                         const button = event.target.closest('button');
                         button.style.transform = 'scale(0.95)';
                         setTimeout(() => {
                           button.style.transform = 'scale(1)';
                         }, 150);
                         
                         if (onGenerateFollowUp) {
                           onGenerateFollowUp();
                         } else {
                           console.error('onGenerateFollowUp function is not defined');
                         }
                       }}
                       className="flex items-center space-x-3 p-4 rounded-lg bg-green-600 hover:bg-green-700 transition-all duration-200 text-white font-medium shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                       </svg>
                       <span>Generate Follow-up</span>
                     </button>
                     
                     <button
                       onClick={() => {
                         console.log('Amend Contract clicked - AgentDashboard');
                         console.log('onContractAmendment function:', onContractAmendment);
                         // Add visual feedback
                         const button = event.target.closest('button');
                         button.style.transform = 'scale(0.95)';
                         setTimeout(() => {
                           button.style.transform = 'scale(1)';
                         }, 150);
                         
                         if (onContractAmendment) {
                           onContractAmendment();
                         } else {
                           console.error('onContractAmendment function is not defined');
                         }
                       }}
                       className="flex items-center space-x-3 p-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-all duration-200 text-white font-medium shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                       </svg>
                       <span>Amend Contract</span>
                     </button>
                     
                     <button
                       onClick={() => {
                         console.log('Send DocuSign clicked - AgentDashboard');
                         console.log('onDocuSignCreate function:', onDocuSignCreate);
                         // Add visual feedback
                         const button = event.target.closest('button');
                         button.style.transform = 'scale(0.95)';
                         setTimeout(() => {
                           button.style.transform = 'scale(1)';
                         }, 150);
                         
                         if (onDocuSignCreate) {
                           onDocuSignCreate();
                         } else {
                           console.error('onDocuSignCreate function is not defined');
                         }
                       }}
                       className="flex items-center space-x-3 p-4 rounded-lg bg-purple-600 hover:bg-purple-700 transition-all duration-200 text-white font-medium shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <span>Send DocuSign</span>
                     </button>
                     
                     <button
                       onClick={() => {
                         console.log('Add Reminder clicked - AgentDashboard');
                         // Add visual feedback
                         const button = event.target.closest('button');
                         button.style.transform = 'scale(0.95)';
                         setTimeout(() => {
                           button.style.transform = 'scale(1)';
                         }, 150);
                         
                         setShowAddReminder(true);
                       }}
                       className="flex items-center space-x-3 p-4 rounded-lg bg-orange-600 hover:bg-orange-700 transition-all duration-200 text-white font-medium shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                       </svg>
                       <span>Add Reminder</span>
                     </button>
                   </div>
                 </div>
        </div>
      )}

      {/* Pipeline Section */}
      {activeSection === 'pipeline' && (
        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}
        >
          <h3 className="text-xl font-bold mb-6" style={{ color: customColors.textPrimary }}>
            Client Pipeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['prospecting', 'qualified', 'contract', 'closing'].map((stage) => (
              <div key={stage} className="space-y-3">
                <h4 className="font-semibold capitalize" style={{ color: customColors.textPrimary }}>
                  {stage} ({clientPipeline.filter(c => c.stage === stage).length})
                </h4>
                <div className="space-y-2">
                  {clientPipeline
                    .filter(client => client.stage === stage)
                    .map((client) => (
                      <div
                        key={client.id}
                        className="rounded-lg border hover:bg-black hover:bg-opacity-20 transition-colors"
                        style={{ borderColor: customColors.cardBorder }}
                      >
                        <div 
                          className="p-3 cursor-pointer"
                          onClick={() => toggleClientCard(client.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm" style={{ color: customColors.textPrimary }}>
                              {client.name}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span 
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{ backgroundColor: getStageColor(stage), color: 'white' }}
                              >
                                {client.stage}
                              </span>
                              <svg 
                                className={`w-4 h-4 transition-transform duration-200 ${expandedClientCards.has(client.id) ? 'rotate-180' : ''}`} 
                                style={{ color: customColors.textSecondary }} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs" style={{ color: customColors.textSecondary }}>
                            {client.budget}
                          </p>
                          <p className="text-xs" style={{ color: customColors.textSecondary }}>
                            Last: {client.lastContact}
                          </p>
                        </div>
                        
                        {/* Expanded Client Details */}
                        {expandedClientCards.has(client.id) && (
                          <div className="px-3 pb-3 border-t" style={{ borderColor: customColors.cardBorder }}>
                            <div className="pt-3 space-y-3">
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="font-semibold" style={{ color: customColors.textSecondary }}>Client ID:</span>
                                  <p style={{ color: customColors.textPrimary }}>{client.id}</p>
                                </div>
                                <div>
                                  <span className="font-semibold" style={{ color: customColors.textSecondary }}>Stage:</span>
                                  <p style={{ color: customColors.textPrimary }}>{client.stage}</p>
                                </div>
                                <div>
                                  <span className="font-semibold" style={{ color: customColors.textSecondary }}>Budget Range:</span>
                                  <p style={{ color: customColors.textPrimary }}>{client.budget}</p>
                                </div>
                                <div>
                                  <span className="font-semibold" style={{ color: customColors.textSecondary }}>Last Contact:</span>
                                  <p style={{ color: customColors.textPrimary }}>{client.lastContact}</p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setClientId(client.id);
                                  }}
                                  className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                >
                                  Select Client
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onGenerateFollowUp();
                                  }}
                                  className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
                                >
                                  Generate Follow-up
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminders Section */}
      {activeSection === 'reminders' && (
        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold" style={{ color: customColors.textPrimary }}>
              Reminders & Tasks
            </h3>
            <button
              onClick={() => setShowAddReminder(true)}
              className="px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ backgroundColor: customColors.primaryButton, color: 'white' }}
            >
              Add Reminder
            </button>
          </div>
          
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`rounded-lg border transition-all ${
                  reminder.completed ? 'opacity-60' : ''
                }`}
                style={{ borderColor: customColors.cardBorder }}
              >
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleReminderCard(reminder.id)}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        completeReminder(reminder.id);
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        reminder.completed ? 'bg-green-500 border-green-500' : 'border-gray-400'
                      }`}
                    >
                      {reminder.completed && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div>
                      <p className={`font-semibold ${reminder.completed ? 'line-through' : ''}`} style={{ color: customColors.textPrimary }}>
                        {reminder.title}
                      </p>
                      <p className="text-sm" style={{ color: customColors.textSecondary }}>
                        {new Date(reminder.date).toLocaleDateString()} at {new Date(reminder.date).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: getPriorityColor(reminder.priority), color: 'white' }}
                    >
                      {reminder.priority}
                    </span>
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${expandedReminderCards.has(reminder.id) ? 'rotate-180' : ''}`} 
                      style={{ color: customColors.textSecondary }} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {/* Expanded Reminder Details */}
                {expandedReminderCards.has(reminder.id) && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: customColors.cardBorder }}>
                    <div className="pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-semibold" style={{ color: customColors.textSecondary }}>Reminder ID:</span>
                          <p style={{ color: customColors.textPrimary }}>{reminder.id}</p>
                        </div>
                        <div>
                          <span className="font-semibold" style={{ color: customColors.textSecondary }}>Priority:</span>
                          <p style={{ color: customColors.textPrimary }}>{reminder.priority}</p>
                        </div>
                        <div>
                          <span className="font-semibold" style={{ color: customColors.textSecondary }}>Client:</span>
                          <p style={{ color: customColors.textPrimary }}>
                            {clients.find(c => c.id === reminder.clientId)?.name || 'No client assigned'}
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold" style={{ color: customColors.textSecondary }}>Status:</span>
                          <p style={{ color: customColors.textPrimary }}>
                            {reminder.completed ? 'Completed' : 'Pending'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-xs" style={{ color: customColors.textSecondary }}>Full Date/Time:</span>
                        <p className="text-xs mt-1" style={{ color: customColors.textPrimary }}>
                          {new Date(reminder.date).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZoneName: 'short'
                          })}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientId(reminder.clientId);
                          }}
                          className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          View Client
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onGenerateFollowUp();
                          }}
                          className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
                        >
                          Generate Follow-up
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blockchain Section */}
      {activeSection === 'blockchain' && (
        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}
        >
          <h3 className="text-xl font-bold mb-6" style={{ color: customColors.textPrimary }}>
            Blockchain Activity Log
          </h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="rounded-lg border" style={{ borderColor: customColors.cardBorder }}>
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => toggleBlockchainCard(activity.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-semibold" style={{ color: customColors.textPrimary }}>
                          {activity.title}
                        </span>
                      </div>
                      <p className="text-sm mb-2" style={{ color: customColors.textSecondary }}>
                        {activity.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs" style={{ color: customColors.textSecondary }}>
                        <span>Client: {clients.find(c => c.id === activity.clientId)?.name}</span>
                        <span>Time: {formatTimeAgo(activity.timestamp)}</span>
                        <span>TX: {activity.blockchainTx}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Verified
                      </span>
                      <svg 
                        className={`w-4 h-4 transition-transform duration-200 ${expandedBlockchainCards.has(activity.id) ? 'rotate-180' : ''}`} 
                        style={{ color: customColors.textSecondary }} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Blockchain Details */}
                {expandedBlockchainCards.has(activity.id) && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: customColors.cardBorder }}>
                    <div className="pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-semibold" style={{ color: customColors.textSecondary }}>Activity ID:</span>
                          <p style={{ color: customColors.textPrimary }}>{activity.id}</p>
                        </div>
                        <div>
                          <span className="font-semibold" style={{ color: customColors.textSecondary }}>Activity Type:</span>
                          <p style={{ color: customColors.textPrimary }}>
                            {activity.type.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold" style={{ color: customColors.textSecondary }}>Client:</span>
                          <p style={{ color: customColors.textPrimary }}>
                            {clients.find(c => c.id === activity.clientId)?.name || 'Unknown Client'}
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold" style={{ color: customColors.textSecondary }}>Status:</span>
                          <p className="text-green-500 font-semibold">Blockchain Verified</p>
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-xs" style={{ color: customColors.textSecondary }}>Full Timestamp:</span>
                        <p className="text-xs mt-1" style={{ color: customColors.textPrimary }}>
                          {new Date(activity.timestamp).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZoneName: 'short'
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-xs" style={{ color: customColors.textSecondary }}>Transaction Hash:</span>
                        <p className="text-xs mt-1 font-mono" style={{ color: customColors.textPrimary }}>
                          {activity.blockchainTx}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-xs" style={{ color: customColors.textSecondary }}>Blockchain Details:</span>
                        <p className="text-xs mt-1" style={{ color: customColors.textPrimary }}>
                          This activity has been permanently recorded on the blockchain for transparency and audit purposes. 
                          The transaction hash above can be used to verify this activity on any blockchain explorer.
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientId(activity.clientId);
                          }}
                          className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          View Client
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open PolygonScan for Polygon PoS transactions
                            if (activity.blockchainTx.startsWith('demo_')) {
                              alert('This is a demo transaction. Real transactions will be viewable on PolygonScan.');
                            } else {
                              window.open(`https://polygonscan.com/tx/${activity.blockchainTx}`, '_blank');
                            }
                          }}
                          className="px-3 py-1 text-xs rounded bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                        >
                          View on PolygonScan
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className="backdrop-blur-md rounded-xl border p-6 w-full max-w-md mx-4"
            style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: customColors.textPrimary }}>
              Add New Reminder
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: customColors.textSecondary }}>
                  Title
                </label>
                <input
                  type="text"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                  className="w-full p-3 rounded-lg border"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    borderColor: customColors.cardBorder,
                    color: customColors.textPrimary
                  }}
                  placeholder="Enter reminder title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: customColors.textSecondary }}>
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newReminder.date}
                  onChange={(e) => setNewReminder({...newReminder, date: e.target.value})}
                  className="w-full p-3 rounded-lg border"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    borderColor: customColors.cardBorder,
                    color: customColors.textPrimary
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: customColors.textSecondary }}>
                  Priority
                </label>
                <select
                  value={newReminder.priority}
                  onChange={(e) => setNewReminder({...newReminder, priority: e.target.value})}
                  className="w-full p-3 rounded-lg border"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    borderColor: customColors.cardBorder,
                    color: customColors.textPrimary
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: customColors.textSecondary }}>
                  Client (Optional)
                </label>
                <select
                  value={newReminder.clientId}
                  onChange={(e) => setNewReminder({...newReminder, clientId: e.target.value})}
                  className="w-full p-3 rounded-lg border"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    borderColor: customColors.cardBorder,
                    color: customColors.textPrimary
                  }}
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddReminder(false)}
                className="flex-1 px-4 py-2 rounded-lg border font-semibold transition-colors"
                style={{ 
                  borderColor: customColors.cardBorder,
                  color: customColors.textSecondary
                }}
              >
                Cancel
              </button>
              <button
                onClick={addReminder}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-colors"
                style={{ backgroundColor: customColors.primaryButton, color: 'white' }}
              >
                Add Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className="backdrop-blur-md rounded-xl border p-6 w-full max-w-md mx-4"
            style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: customColors.textPrimary }}>
              Set Reminder for Activity
            </h3>
            {selectedActivityForReminder && (
              <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: customColors.cardBorder }}>
                <p className="text-sm font-semibold" style={{ color: customColors.textPrimary }}>
                  {selectedActivityForReminder.title}
                </p>
                <p className="text-xs" style={{ color: customColors.textSecondary }}>
                  {selectedActivityForReminder.description}
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: customColors.textSecondary }}>
                  Reminder Title
                </label>
                <input
                  type="text"
                  value={newReminderFromActivity.title}
                  onChange={(e) => setNewReminderFromActivity({...newReminderFromActivity, title: e.target.value})}
                  className="w-full p-3 rounded-lg border"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    borderColor: customColors.cardBorder,
                    color: customColors.textPrimary
                  }}
                  placeholder="Enter reminder title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: customColors.textSecondary }}>
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newReminderFromActivity.date}
                  onChange={(e) => setNewReminderFromActivity({...newReminderFromActivity, date: e.target.value})}
                  className="w-full p-3 rounded-lg border"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    borderColor: customColors.cardBorder,
                    color: customColors.textPrimary
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: customColors.textSecondary }}>
                  Priority
                </label>
                <select
                  value={newReminderFromActivity.priority}
                  onChange={(e) => setNewReminderFromActivity({...newReminderFromActivity, priority: e.target.value})}
                  className="w-full p-3 rounded-lg border"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    borderColor: customColors.cardBorder,
                    color: customColors.textPrimary
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  setSelectedActivityForReminder(null);
                  setNewReminderFromActivity({
                    title: '',
                    date: '',
                    priority: 'medium',
                    clientId: '',
                    activityId: ''
                  });
                }}
                className="flex-1 px-4 py-2 rounded-lg border font-semibold transition-colors"
                style={{ 
                  borderColor: customColors.cardBorder,
                  color: customColors.textSecondary
                }}
              >
                Cancel
              </button>
              <button
                onClick={addReminderFromActivity}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-colors"
                style={{ backgroundColor: customColors.primaryButton, color: 'white' }}
              >
                Set Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDashboard; 