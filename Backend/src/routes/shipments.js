const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/shipmentsController');

router.use(auth);

router.post('/', ctrl.createShipment);
router.get('/', ctrl.getShipments);
router.get('/active', ctrl.getActiveShipments);
router.get('/:id', ctrl.getShipment);
router.post('/:id/position', ctrl.updatePosition);
router.post('/:id/reroute', ctrl.manualReroute);

module.exports = router;
