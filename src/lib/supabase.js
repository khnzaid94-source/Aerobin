// Supabase client singleton — optional dependency, not a requirement.
//
// The anon key is public-by-design (same trust model as the OpenWeather
// key): the tables are protected by RLS policies (see supabase/schema.sql)
// which allow only anonymous INSERTs (+ SELECT on dispatch_log) — never
// updates or deletes. When either env var is missing, getClient() returns
// null and every caller degrades to localStorage-only behavior, matching
// the app-wide honesty contract (v1.0 behavior, nothing silently faked).

import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

let client = null

/** Returns the Supabase client when configured, else null. */
export function getClient() {
  if (!URL || !ANON_KEY) return null
  if (!client) client = createClient(URL, ANON_KEY)
  return client
}

/** True when both env vars are present. */
export function isConfigured() {
  return Boolean(URL && ANON_KEY)
}

// ---- dispatch_log ---------------------------------------------------------

/**
 * Insert one dispatch entry in the background. Never throws — failure is
 * swallowed (local state remains the source of truth; this is a best-effort
 * sync for cross-device visibility).
 */
export function insertDispatchEntry(entry, { demo = false } = {}) {
  const supabase = getClient()
  if (!supabase || entry.id?.startsWith('seed-')) return
  supabase
    .from('dispatch_log')
    .insert({
      id: entry.id,
      ward_id: entry.wardId,
      ward_name: entry.wardName,
      score: entry.score,
      action: entry.action,
      result: entry.result,
      session: entry.session ?? true,
      demo,
      created_at: entry.time ? new Date(entry.time).toISOString() : undefined,
    })
    .then(() => {}, () => {})
}

/**
 * Fetch the last 24h of real (non-demo) dispatch entries. Resolves to an
 * empty array on any problem — callers merge on top of their local seed.
 */
export async function fetchDispatchLog() {
  const supabase = getClient()
  if (!supabase) return []
  try {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data, error } = await supabase
      .from('dispatch_log')
      .select('id, ward_id, ward_name, score, action, result, created_at')
      .eq('demo', false)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
    if (error) return []
    return (data ?? []).map((row) => ({
      id: row.id,
      wardId: row.ward_id,
      wardName: row.ward_name,
      score: row.score,
      action: row.action,
      result: row.result,
      time: new Date(row.created_at).getTime(),
      session: true, // remote rows are genuine actions, render like session rows
      remote: true,
    }))
  } catch {
    return []
  }
}

// ---- feedback ---------------------------------------------------------------

/**
 * Insert one citizen feedback vote in the background. Never throws.
 */
export function insertFeedback({ wardId, wardName, vote, burnRiskScore, demo = false }) {
  const supabase = getClient()
  if (!supabase) return
  supabase
    .from('feedback')
    .insert({
      ward_id: wardId,
      ward_name: wardName,
      vote,
      burn_risk_score: burnRiskScore ?? null,
      demo,
    })
    .then(() => {}, () => {})
}
