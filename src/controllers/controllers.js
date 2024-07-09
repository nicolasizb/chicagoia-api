const axios = require('axios');
require('dotenv').config();

const API_URL = 'https://graph.facebook.com/v20.0'

function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDateRange() {
    const today = new Date();
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);
    return {
        since: getFormattedDate(last30Days),
        until: getFormattedDate(today)
    };
}

async function getAccounts(req, res) {
    try {
        const response = await axios.get(`${API_URL}/me/adaccounts`, {
            headers: {
                Authorization: `Bearer ${process.env.TOKEN}`
            }
        });
        res.status(200).json(response.data);
    } catch (error) {
        const errorInfo = {
            message: error.message,
            stack: error.stack
        };
        res.status(400).json({ error: errorInfo });
    }
}

async function getCampaigns(req, res) {
    try {
        const accountsResponse = await axios.get(`${API_URL}/me/adaccounts`, {
            headers: {
                Authorization: `Bearer ${process.env.TOKEN}`
            }
        });

        const accounts = accountsResponse.data.data;
        const campaignsAll = [];
        const dateRange = getDateRange();

        for (const account of accounts) {
            const campaignResponse = await axios.get(`${API_URL}/act_${account.account_id}/campaigns`, {
                headers: {
                    Authorization: `Bearer ${process.env.TOKEN}`
                },
                params: {
                    fields: 'id,name,status,start_time,end_time,daily_budget,insights{cost_per_action_type,spend,actions,objective,website_purchase_roas}',
                    time_range: JSON.stringify(dateRange)
                }
            });

            const campaigns = campaignResponse.data.data;

            for (const campaign of campaigns) {
                const insights = campaign.insights ? campaign.insights.data[0] : {};
                const spend = insights.spend ? parseFloat(insights.spend) : 0;
                const purchaseROAS = insights.website_purchase_roas ? insights.website_purchase_roas[0].value : 0;
                const purchaseActions = insights.actions ? insights.actions.find(action => action.action_type === 'purchase') : null;
                const purchaseValue = purchaseActions ? parseFloat(purchaseActions.value) : 0;
                const calculatedROAS = spend > 0 ? (purchaseValue / spend).toFixed(2) : 0;

                campaignsAll.push({
                    accountID: account.account_id,
                    id: campaign.id,
                    name: campaign.name,
                    status: campaign.status,
                    start_time: campaign.start_time,
                    end_time: campaign.end_time,
                    daily_budget: campaign.daily_budget,
                    insights: {
                        cpa: insights.cost_per_action_type ? insights.cost_per_action_type[0].value : null,
                        spend: spend,
                        actions: insights.actions ? insights.actions : [],
                        objective: insights.objective ? insights.objective : null,
                        website_purchase_roas: purchaseROAS,
                        calculated_roas: calculatedROAS
                    }
                });
            }

            console.log(campaignResponse.data);
        }

        res.status(200).json(campaignsAll);
    } catch (error) {
        const errorInfo = {
            message: error.message,
            stack: error.stack
        };
        res.status(400).json({ error: errorInfo });
    }
}

module.exports = {
    getAccounts,
    getCampaigns
};
