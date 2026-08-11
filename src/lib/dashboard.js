import { supabase } from '../supabase'

export async function fetchOverview() {
  const [historyRes, countRes, topRiskRes, metricsRes, moduleCountRes, completionCountRes] =
    await Promise.all([
      supabase
        .from('risk_score_history')
        .select('score, recorded_at')
        .is('employee_id', null)
        .order('recorded_at', { ascending: true }),
      supabase.from('employees').select('*', { count: 'exact', head: true }),
      supabase
        .from('employees')
        .select('id, full_name, email, department, risk_score')
        .order('risk_score', { ascending: false })
        .limit(5),
      supabase
        .from('security_metrics')
        .select('metric_key, metric_value, recorded_at')
        .order('recorded_at', { ascending: true }),
      supabase.from('training_modules').select('*', { count: 'exact', head: true }),
      supabase.from('training_completions').select('*', { count: 'exact', head: true }),
    ])

  for (const res of [historyRes, countRes, topRiskRes, metricsRes, moduleCountRes, completionCountRes]) {
    if (res.error) throw res.error
  }

  const metricsByKey = {}
  for (const row of metricsRes.data) {
    ;(metricsByKey[row.metric_key] ??= []).push(row)
  }
  const metrics = {}
  for (const [key, rows] of Object.entries(metricsByKey)) {
    const sorted = [...rows].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    metrics[key] = {
      latest: sorted[sorted.length - 1]?.metric_value ?? null,
      previous: sorted.length > 1 ? sorted[sorted.length - 2].metric_value : null,
    }
  }

  const history = historyRes.data
  const orgScore = history.length ? history[history.length - 1].score : null
  const orgScorePrev = history.length > 1 ? history[history.length - 2].score : null

  const employeeCount = countRes.count ?? 0
  const moduleCount = moduleCountRes.count ?? 0
  const completionCount = completionCountRes.count ?? 0
  const possible = employeeCount * moduleCount
  const trainingCompletionRate = possible > 0 ? Math.round((completionCount / possible) * 100) : null

  return {
    history,
    orgScore,
    orgScorePrev,
    employeeCount,
    topRisk: topRiskRes.data,
    metrics,
    trainingCompletionRate,
  }
}

// Admin-only, enforced inside the RPC rather than here. The average is
// computed from the same formula as the individual scores, so a department
// figure can't drift away from the employees it summarises.
export async function fetchDepartmentRisk() {
  const { data, error } = await supabase.rpc('get_department_risk')
  if (error) throw error

  return data.map((row) => ({
    department: row.department,
    employeeCount: row.employee_count,
    avgRisk: Number(row.avg_risk_score),
    clickedEvents: row.clicked_events,
    totalEvents: row.total_events,
  }))
}
