import { supabase } from '../supabase'

export function riskBand(score) {
  if (score < 25) return 'good'
  if (score < 50) return 'warning'
  if (score < 75) return 'serious'
  return 'critical'
}

function mapBreakdown(data) {
  return {
    score: data.risk_score,
    modulesCompleted: data.modules_completed,
    modulesTotal: data.modules_total,
    trainingRate: Number(data.training_completion_rate),
    phishingSent: data.phishing_sent,
    phishingClicked: data.phishing_clicked,
    phishingReported: data.phishing_reported,
    // Already reporting-weighted: a clicked-and-reported event counts at
    // half the weight of a clicked-and-unreported one. This is the exact
    // rate the score's 60% component uses, not a raw clicked/sent ratio.
    clickRate: Number(data.phishing_click_rate),
  }
}

// Mirrors the documented formula: risk = 100 * (0.4*(1-training) + 0.6*click_rate),
// where click_rate already gives partial credit for reporting a click.
// Computed live from training_completions + phishing_events rather than
// read off a stored column, so what's shown is always auditable against
// the underlying rows, not a value that can silently drift out of sync.
export async function fetchMyRisk() {
  const { data, error } = await supabase.rpc('get_my_risk_breakdown').single()
  if (error) throw error
  return mapBreakdown(data)
}

// Admin-only (or self) — same formula, explicit employee_id. Enforced by
// the RPC itself (is_admin() OR employee_id = current_employee_id()), not
// just by who's expected to call this from the UI.
export async function fetchEmployeeRisk(employeeId) {
  const { data, error } = await supabase
    .rpc('get_employee_risk_breakdown', { p_employee_id: employeeId })
    .single()
  if (error) throw error
  return mapBreakdown(data)
}
