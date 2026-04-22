const express = require('express');
const router = express.Router();
const { registerCompany } = require('../controllers/authController');

router.post('/register-company', registerCompany);

module.exports = router;
