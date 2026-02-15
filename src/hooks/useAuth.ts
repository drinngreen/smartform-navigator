import { useState, useEffect } from "react"
import type { User, Session } from "@supabase/supabase-js"

let supabaseClient: any = null

async function getSupabase() {
  if (!supabaseClient) {
    const mod = await import("@/integrations/supabase/client")
    supabaseClient = mod.supabase
  }
  return supabaseClient
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let subscription: any = null

    getSupabase().then(async (supabase) => {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (_event: string, session: Session | null) => {
          setSession(session)
          setUser(session?.user ?? null)

          if (session?.user) {
            const { data } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "admin")
              .maybeSingle()
            setIsAdmin(!!data)
          } else {
            setIsAdmin(false)
          }
          setLoading(false)
        }
      )
      subscription = sub

      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", s.user.id)
          .eq("role", "admin")
          .maybeSingle()
        setIsAdmin(!!data)
      }
      setLoading(false)
    }).catch((e) => {
      console.error("Supabase init error:", e)
      setError(e.message)
      setLoading(false)
    })

    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = await getSupabase()
    await supabase.auth.signOut()
  }

  return { user, session, loading, isAdmin, signOut, error }
}
