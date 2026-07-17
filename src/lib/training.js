import { supabase } from '../supabase'

export async function fetchMyTraining(employeeId) {
  const [modulesRes, completionsRes] = await Promise.all([
    supabase
      .from('training_modules')
      .select('id, title, description, category, duration_minutes')
      .order('title'),
    supabase
      .from('training_completions')
      .select('module_id, completed_at, score, total')
      .eq('employee_id', employeeId),
  ])

  if (modulesRes.error) throw modulesRes.error
  if (completionsRes.error) throw completionsRes.error

  const completedByModule = {}
  for (const row of completionsRes.data) {
    completedByModule[row.module_id] = row
  }

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

  return {
    modules,
    completedCount: modules.filter((m) => m.completed).length,
  }
}

// NOTE: quiz.correct_id is included here and is therefore visible in the
// network response to the employee before they answer — accepted
// limitation for a 5-module internal awareness tool with no certification
// stakes. See supabase/training_content.sql for the full reasoning.
export async function fetchModule(moduleId) {
  const { data, error } = await supabase
    .from('training_modules')
    .select('id, title, description, category, duration_minutes, content_md, scenario, quiz')
    .eq('id', moduleId)
    .single()

  if (error) throw error
  return data
}

export async function completeModule(employeeId, moduleId, score, total) {
  const { error } = await supabase
    .from('training_completions')
    .insert({ employee_id: employeeId, module_id: moduleId, score, total })

  if (error && error.code !== '23505') throw error
}
