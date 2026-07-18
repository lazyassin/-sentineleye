import { supabase } from '../supabase'

export async function fetchPhishingOverview() {
  const [campaignsRes, eventsRes] = await Promise.all([
    supabase
      .from('phishing_campaigns')
      .select('id, name, template, sent_at, target_count')
      .order('sent_at', { ascending: false }),
    supabase
      .from('phishing_events')
      .select('campaign_id, opened, clicked, reported'),
  ])

  if (campaignsRes.error) throw campaignsRes.error
  if (eventsRes.error) throw eventsRes.error

  const events = eventsRes.data
  const sent = events.length
  const opened = events.filter((e) => e.opened || e.clicked).length
  const clicked = events.filter((e) => e.clicked).length
  const reported = events.filter((e) => e.reported).length

  const campaigns = campaignsRes.data.map((c) => {
    const rows = events.filter((e) => e.campaign_id === c.id)
    const total = rows.length || c.target_count || 1
    return {
      ...c,
      clickRate: Math.round((rows.filter((e) => e.clicked).length / total) * 100),
      reportRate: Math.round((rows.filter((e) => e.reported).length / total) * 100),
      isManual: c.target_count === 1,
    }
  })

  return {
    funnel: { sent, opened, clicked },
    clickRate: sent ? Math.round((clicked / sent) * 100) : 0,
    reportRate: sent ? Math.round((reported / sent) * 100) : 0,
    campaignCount: campaignsRes.data.length,
    campaigns,
  }
}

export async function fetchMyPhishingEvents(employeeId) {
  const { data, error } = await supabase
    .from('phishing_events')
    .select('id, opened, clicked, reported, occurred_at, phishing_campaigns(template, sent_at)')
    .eq('employee_id', employeeId)
    .order('occurred_at', { ascending: false })

  if (error) throw error

  return data.map((e) => ({
    id: e.id,
    template: e.phishing_campaigns?.template ?? 'Unknown',
    sentAt: e.phishing_campaigns?.sent_at ?? e.occurred_at,
    opened: e.opened,
    clicked: e.clicked,
    reported: e.reported,
  }))
}

export async function reportPhishingEvent(eventId) {
  const { error } = await supabase.rpc('report_phishing_event', { p_event_id: eventId })
  if (error) throw error
}

export async function sendPhishingEmail({ employee_id, template }) {
  const { data, error } = await supabase.functions.invoke('send-phishing-email', {
    body: { employee_id, template },
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

  return data // { campaign, event, tracking_link, email_sent, warning }
}
