const supabase = require('../utils/supabaseClient');

async function getAlerts(req, res, next) {
  try {
    const { acknowledged, alert_type, limit = 50 } = req.query;

    let query = supabase
      .from('alerts')
      .select('*')
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged === 'true');
    }
    if (alert_type) {
      query = query.eq('alert_type', alert_type);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function acknowledgeAlert(req, res, next) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('alerts')
      .update({ acknowledged: true })
      .eq('id', id)
      .eq('company_id', req.companyId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Alert not found' });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAlerts, acknowledgeAlert };
