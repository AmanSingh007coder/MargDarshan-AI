const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/alertsController');

router.use(auth);

router.get('/', ctrl.getAlerts);
router.patch('/:id', ctrl.acknowledgeAlert);

module.exports = router;
