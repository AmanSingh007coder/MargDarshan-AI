const supabase = require('../utils/supabaseClient');

async function registerCompany(req, res, next) {
  try {
    const { auth_user_id, company_name, email } = req.body;

    if (!auth_user_id || !company_name || !email) {
      return res.status(400).json({ error: 'auth_user_id, company_name, and email are required' });
    }

    const { data, error } = await supabase
      .from('companies')
      .insert({ auth_user_id, company_name, email })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Company with this email already exists' });
      }
      throw error;
    }

    res.status(201).json({ company_id: data.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerCompany };
