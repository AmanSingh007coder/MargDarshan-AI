const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/analyticsController');

router.use(auth);

router.get('/', ctrl.getAnalytics);

module.exports = router;
