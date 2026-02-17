import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type AppRole = "admin" | "user";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  cognome: string;
  codice_fiscale: string;
  tenant_id: string | null;
  targa_automezzo: string | null;
  autista_alternativo: string | null;
  avatar_url: string | null;
  mn_context: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  refreshUserData: () => Promise<void>;
  signUp: (email: string, password: string, nome: string, cognome: string, codiceFiscale: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ADMIN_TENANT_EMAILS = [
    "globalreco@zolisoftware.cloud",
    "globalreco@zolisoftware.space",
    "multyproget@zolidragon.cloud",
    "nijol@zolidragon.cloud",
    "admin@zoli.live",
    "direzioneglobalreco@zoli.live",
    "formulariglobalreco@zoli.live",
    "amministrazioneglobalreco@zoli.live",
    "amministrazioneglobal@zoli.live",
    "segreteriaglobalreco@zoli.live",
    "multyniyol@zoli.live",
    "superadmin@zoli.live"
  ];

  const markPresence = async (userId: string, status: "online" | "offline") => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase
        .from("online_status")
        .upsert(
          {
            user_id: userId,
            status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (error) {
        console.warn("[Auth] presence upsert failed, trying edge function:", error);
        await supabase.functions.invoke("update-presence", { body: { status } });
      }
    } catch (e) {
      console.warn("[Auth] markPresence failed:", e);
    }
  };

  const fetchUserData = async (userId: string, userEmail?: string) => {
    try {
      const email = userEmail?.toLowerCase() ?? "";
      const isAdminTenantEmail = ADMIN_TENANT_EMAILS.some(
        (adminEmail) => adminEmail.toLowerCase() === email
      );

      if (isAdminTenantEmail) {
        try {
          const { error: bootstrapError } = await supabase.rpc("bootstrap_admin_role");
          if (bootstrapError) {
            console.warn("bootstrap_admin_role failed:", bootstrapError);
          }
        } catch (e) {
          console.warn("bootstrap_admin_role threw:", e);
        }
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      setProfile(profileData ? (profileData as Profile) : null);

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching role:", roleError);
      }

      if (roleData) {
        setRole(roleData.role as AppRole);
      } else if (isAdminTenantEmail) {
        setRole("admin");
      } else {
        setRole("user");
      }

      await markPresence(userId, "online");
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const refreshUserData = async () => {
    if (!user) return;
    await fetchUserData(user.id, user.email);
  };

  useEffect(() => {
    let initialLoad = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (!session?.user) {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
          return;
        }

        // For initial load, getSession handles it below
        if (!initialLoad) {
          setIsLoading(true);
          fetchUserData(session.user.id, session.user.email).then(() => {
            setIsLoading(false);
          });
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserData(session.user.id, session.user.email);
      }

      initialLoad = false;
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    nome: string,
    cognome: string,
    codiceFiscale: string
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome,
            cognome,
            codice_fiscale: codiceFiscale
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { data: defaultTenant } = await supabase
          .from("tenants")
          .select("id")
          .eq("is_default", true)
          .single();

        await supabase.from("profiles").insert({
          user_id: data.user.id,
          nome,
          cognome,
          codice_fiscale: codiceFiscale,
          tenant_id: defaultTenant?.id || null
        });

        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "user"
        });
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (user) await markPresence(user.id, "offline");

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        isAdmin: role === "admin",
        refreshUserData,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
