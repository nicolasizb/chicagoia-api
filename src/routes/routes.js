const express = require('express')
const router = express.Router()

const { getAccounts, getCampaigns } = require('../controllers/controllers.js')
router.get('/get-accounts', getAccounts)
router.get('/get-campaigns', getCampaigns)

module.exports = router;