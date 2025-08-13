-- Sample Data for AgentHub Conversational Flows
-- Run this AFTER the schema is created and you are logged in to your application
-- This provides test data to explore the conversational flows

-- =========================================
-- SAMPLE PROPERTY LISTINGS
-- =========================================
INSERT INTO property_listings (agent_id, address, city, state, zip_code, price, property_type, beds, baths, sqft, listing_agent_name, listing_agent_email, listing_agent_phone) VALUES 
    (auth.uid(), '123 Main St', 'Denver', 'CO', '80202', 450000.00, 'Single Family', 3, 2.0, 1500, 'John Smith', 'john@realty.com', '555-0123'),
    (auth.uid(), '456 Oak Ave', 'Denver', 'CO', '80203', 675000.00, 'Townhouse', 4, 3.0, 2200, 'Jane Doe', 'jane@realty.com', '555-0456'),
    (auth.uid(), '789 Pine Rd', 'Boulder', 'CO', '80301', 850000.00, 'Single Family', 5, 3.5, 2800, 'Bob Wilson', 'bob@realty.com', '555-0789'),
    (auth.uid(), '321 Elm Street', 'Aurora', 'CO', '80014', 375000.00, 'Condo', 2, 1.5, 1200, 'Lisa Green', 'lisa@realty.com', '555-0321'),
    (auth.uid(), '654 Cherry Lane', 'Lakewood', 'CO', '80226', 525000.00, 'Single Family', 4, 2.5, 1800, 'Tom Brown', 'tom@realty.com', '555-0654')
ON CONFLICT DO NOTHING;

-- =========================================
-- SAMPLE CLIENTS
-- =========================================
INSERT INTO clients (agent_id, full_name, email, phone, state, preferences) VALUES 
    (auth.uid(), 'Sarah Johnson', 'sarah.johnson@email.com', '555-0100', 'CO', '{"preferred_contact": "email", "budget_max": 500000, "property_type": "Single Family", "beds_min": 3}'),
    (auth.uid(), 'Mike Chen', 'mike.chen@email.com', '555-0200', 'CO', '{"preferred_contact": "sms", "budget_max": 750000, "property_type": "Townhouse", "beds_min": 3}'),
    (auth.uid(), 'Emily Rodriguez', 'emily.r@email.com', '555-0300', 'CO', '{"preferred_contact": "email", "budget_max": 400000, "property_type": "Condo", "beds_min": 2}'),
    (auth.uid(), 'David Kim', 'david.kim@email.com', '555-0400', 'CO', '{"preferred_contact": "sms", "budget_max": 600000, "property_type": "Single Family", "beds_min": 4}')
ON CONFLICT DO NOTHING;

-- =========================================
-- SAMPLE INTERACTIONS
-- =========================================
-- Get client IDs for interactions (this will work after clients are inserted)
WITH client_data AS (
    SELECT id as client_id, full_name FROM clients WHERE agent_id = auth.uid()
)
INSERT INTO interactions (client_id, agent_id, channel, subject, body_text, metadata)
SELECT 
    cd.client_id,
    auth.uid(),
    'email',
    'Initial Property Inquiry',
    'Hi ' || cd.full_name || ', thank you for your interest in Denver area properties. I have several listings that match your criteria. Would you like to schedule a viewing this week?',
    '{"email_type": "initial_inquiry", "properties_mentioned": 2}'
FROM client_data
WHERE cd.full_name = 'Sarah Johnson';

WITH client_data AS (
    SELECT id as client_id, full_name FROM clients WHERE agent_id = auth.uid()
)
INSERT INTO interactions (client_id, agent_id, channel, subject, body_text, metadata)
SELECT 
    cd.client_id,
    auth.uid(),
    'sms',
    NULL,
    'Hi Mike! Found a great townhouse on Oak Ave that fits your budget. 4BR/3BA, $675k. Want to see it this weekend?',
    '{"sms_type": "property_alert", "property_address": "456 Oak Ave"}'
FROM client_data
WHERE cd.full_name = 'Mike Chen';

-- =========================================
-- SAMPLE CLIENT PROPERTIES (INTERESTS)
-- =========================================
-- Link clients to properties they're interested in
WITH sarah_client AS (
    SELECT id FROM clients WHERE agent_id = auth.uid() AND full_name = 'Sarah Johnson'
),
main_st_property AS (
    SELECT id FROM property_listings WHERE agent_id = auth.uid() AND address = '123 Main St'
)
INSERT INTO client_properties (client_id, property_listing_id, agent_id, interest_level, notes)
SELECT sc.id, msp.id, auth.uid(), 'favorited', 'Loves the neighborhood and school district'
FROM sarah_client sc, main_st_property msp;

WITH mike_client AS (
    SELECT id FROM clients WHERE agent_id = auth.uid() AND full_name = 'Mike Chen'
),
oak_property AS (
    SELECT id FROM property_listings WHERE agent_id = auth.uid() AND address = '456 Oak Ave'
)
INSERT INTO client_properties (client_id, property_listing_id, agent_id, interest_level, notes)
SELECT mc.id, op.id, auth.uid(), 'viewing', 'Scheduled showing for this weekend'
FROM mike_client mc, oak_property op;

-- =========================================
-- SAMPLE SHOWINGS
-- =========================================
-- Schedule a showing for Mike Chen
WITH mike_client AS (
    SELECT id FROM clients WHERE agent_id = auth.uid() AND full_name = 'Mike Chen'
)
INSERT INTO showings (client_id, agent_id, property_id, property_address, start_time, end_time, status, meta)
SELECT 
    mc.id,
    auth.uid(),
    'OAK456',
    '456 Oak Ave',
    (CURRENT_TIMESTAMP + INTERVAL '2 days')::timestamptz,
    (CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '1 hour')::timestamptz,
    'booked',
    '{"listing_agent": "Jane Doe", "access_code": "1234", "notes": "Client prefers morning appointments"}'
FROM mike_client mc;

-- =========================================
-- SAMPLE AGENT CALENDAR
-- =========================================
-- Add some calendar events for the agent
INSERT INTO agent_calendar (agent_id, title, start_time, end_time, event_type, metadata) VALUES 
    (auth.uid(), 'Team Meeting', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '1 hour', 'meeting', '{"location": "Office", "recurring": false}'),
    (auth.uid(), 'Client Call - Sarah Johnson', CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '30 minutes', 'meeting', '{"type": "phone_call", "client_name": "Sarah Johnson"}'),
    (auth.uid(), 'Property Evaluation', CURRENT_TIMESTAMP + INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '2 hours', 'busy', '{"property": "789 Pine Rd", "type": "evaluation"}'
);

-- =========================================
-- SAMPLE SCHEDULED MESSAGES
-- =========================================
-- Schedule a follow-up message for tomorrow
WITH sarah_client AS (
    SELECT id FROM clients WHERE agent_id = auth.uid() AND full_name = 'Sarah Johnson'
)
INSERT INTO scheduled_messages (client_id, agent_id, channel, subject, body_text, scheduled_for, status)
SELECT 
    sc.id,
    auth.uid(),
    'email',
    'Follow-up: Property Viewing Updates',
    'Hi Sarah! I wanted to follow up on the properties we discussed. I have a new listing on Main St that I think you would love. Would you like to schedule a viewing this week?',
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    'pending'
FROM sarah_client sc;

-- =========================================
-- VERIFICATION QUERIES
-- =========================================
-- Run these to verify your sample data was inserted correctly:

-- Check clients
-- SELECT full_name, email, preferences FROM clients WHERE agent_id = auth.uid();

-- Check properties  
-- SELECT address, city, price, property_type FROM property_listings WHERE agent_id = auth.uid();

-- Check interactions
-- SELECT c.full_name, i.channel, i.body_text, i.created_at 
-- FROM interactions i 
-- JOIN clients c ON i.client_id = c.id 
-- WHERE i.agent_id = auth.uid() 
-- ORDER BY i.created_at DESC;

-- Check showings
-- SELECT c.full_name, s.property_address, s.start_time, s.status 
-- FROM showings s 
-- JOIN clients c ON s.client_id = c.id 
-- WHERE s.agent_id = auth.uid();

-- Check scheduled messages
-- SELECT c.full_name, sm.channel, sm.subject, sm.scheduled_for, sm.status
-- FROM scheduled_messages sm
-- JOIN clients c ON sm.client_id = c.id 
-- WHERE sm.agent_id = auth.uid();
