import { supabase } from '../supabase'

export async function fetchEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, email, department, risk_score, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
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
