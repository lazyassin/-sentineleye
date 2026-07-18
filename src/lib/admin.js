import { supabase } from '../supabase'

export async function fetchEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, email, department, risk_score, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchEmployeeDetail(employeeId) {
  const [empRes, modulesRes, completionsRes, eventsRes] = await Promise.all([
    supabase
      .from('employees')
      .select('id, full_name, email, department')
      .eq('id', employeeId)
      .single(),
    supabase.from('training_modules').select('id, title, category, duration_minutes').order('title'),
    supabase
      .from('training_completions')
      .select('module_id, completed_at, score, total')
      .eq('employee_id', employeeId),
    supabase
      .from('phishing_events')
      .select('id, opened, clicked, reported, occurred_at, phishing_campaigns(template, sent_at)')
      .eq('employee_id', employeeId)
      .order('occurred_at', { ascending: false }),
  ])

  if (empRes.error) throw empRes.error
  if (modulesRes.error) throw modulesRes.error
  if (completionsRes.error) throw completionsRes.error
  if (eventsRes.error) throw eventsRes.error

  const completedByModule = {}
  for (const row of completionsRes.data) completedByModule[row.module_id] = row

  const modules = modulesRes.data.map((m) => {
    const completion = completedByModule[m.id]
    return {
      ...m,
      completed: Boolean(completion),
      completedAt: completion?.completed_at ?? null,
      score: completion?.score ?? null,
      total: completion?.total ?? null,
    }
  })

  const events = eventsRes.data.map((e) => ({
    id: e.id,
    template: e.phishing_campaigns?.template ?? 'Unknown',
    sentAt: e.phishing_campaigns?.sent_at ?? e.occurred_at,
    opened: e.opened,
    clicked: e.clicked,
    reported: e.reported,
  }))

  return { employee: empRes.data, modules, events }
}

export async function addEmployee({ full_name, email, department }) {
  const { data, error } = await supabase.functions.invoke('provision-employee', {
    body: { full_name, email: email.trim().toLowerCase(), department },
  })

  if (error) {
    let message = error.message
    if (typeof error.context?.json === 'function') {
      try {
        const body = await error.context.json()
        if (body?.error) message = body.error
      } catch {
        // Non-JSON error body — fall back to the generic FunctionsError message.
      }
    }
    throw new Error(message)
  }

  return data // { employee, temp_password, warning }
}
