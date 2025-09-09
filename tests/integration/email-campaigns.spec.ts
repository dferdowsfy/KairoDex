import { createCampaign, executeCampaign } from '../../app/api/email/campaigns';
import { expect } from 'chai';

describe('Email Campaigns', () => {
    it('should create a campaign successfully', async () => {
        const campaignData = { name: 'Test Campaign', recipients: ['test@example.com'], content: 'Hello World' };
        const campaign = await createCampaign(campaignData);
        expect(campaign).to.have.property('id');
        expect(campaign.name).to.equal(campaignData.name);
    });

    it('should execute a campaign successfully', async () => {
        const campaignId = '12345'; // Assume this ID is valid
        const result = await executeCampaign(campaignId);
        expect(result).to.equal('Campaign executed successfully');
    });
});