import { supabase } from '../supabase'

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, employee_id, must_change_password')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}
