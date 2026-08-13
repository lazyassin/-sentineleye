import { supabase } from '../supabase'

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    // The employee row comes along so the UI can identify the signed-in
    // person by their roster identity rather than their auth email — the two
    // are separate values and can legitimately differ. RLS allows this join:
    // an employee may read their own employees row.
    .select('id, role, employee_id, must_change_password, employees(full_name, email)')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}
