import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export interface IconChartData {
  title: string;
  type: "pie" | "bar";
  data: { name: string; value: number; color: string }[];
}

export function useIconStats(iconId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["icon-stats", iconId, user?.id],
    queryFn: async (): Promise<IconChartData[]> => {
      if (!iconId) return [];

      switch (iconId) {
        case "registro": {
          const { data } = await supabase.from("fir").select("stato");
          const counts: Record<string, number> = {};
          data?.forEach((r) => {
            counts[r.stato] = (counts[r.stato] || 0) + 1;
          });
          return [
            {
              title: "FIR per Stato",
              type: "pie",
              data: [
                { name: "Bozze", value: counts["DRAFT"] || 0, color: "#fbbf24" },
                { name: "Attivi", value: counts["ACTIVE"] || 0, color: "#22c55e" },
                { name: "In Transito", value: counts["IN_TRANSIT"] || 0, color: "#3b82f6" },
                { name: "Consegnati", value: counts["DELIVERED_PENDING_ACCEPTANCE"] || 0, color: "#f97316" },
                { name: "Chiusi", value: counts["CLOSED"] || 0, color: "#6b7280" },
                { name: "Inviati RENTRI", value: counts["SENT_TO_RENTRI_DATA"] || 0, color: "#ec4899" },
              ].filter((d) => d.value > 0),
            },
          ];
        }

        case "gestione-fir": {
          const { data } = await supabase.from("fir").select("stato");
          const total = data?.length || 0;
          const active = data?.filter((f) => f.stato === "ACTIVE" || f.stato === "IN_TRANSIT").length || 0;
          const closed = data?.filter((f) => f.stato === "CLOSED" || f.stato === "SENT_TO_RENTRI_DATA").length || 0;
          const pending = total - active - closed;
          return [
            {
              title: "Gestione FIR",
              type: "pie",
              data: [
                { name: "In Corso", value: active, color: "#22c55e" },
                { name: "Chiusi", value: closed, color: "#6b7280" },
                { name: "Altro", value: pending, color: "#fbbf24" },
              ].filter((d) => d.value > 0),
            },
          ];
        }

        case "rentri": {
          const { data } = await supabase.from("register_movements").select("tipo, stato_invio");
          const carico = data?.filter((m) => m.tipo === "CARICO").length || 0;
          const scarico = data?.filter((m) => m.tipo === "SCARICO").length || 0;
          const sent = data?.filter((m) => m.stato_invio === "SENT").length || 0;
          const pending = data?.filter((m) => m.stato_invio === "PENDING").length || 0;
          return [
            {
              title: "Movimenti Registro",
              type: "pie",
              data: [
                { name: "Carico", value: carico, color: "#22c55e" },
                { name: "Scarico", value: scarico, color: "#ef4444" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Stato Invio",
              type: "pie",
              data: [
                { name: "Inviati", value: sent, color: "#3b82f6" },
                { name: "In Attesa", value: pending, color: "#fbbf24" },
              ].filter((d) => d.value > 0),
            },
          ];
        }

        case "personale": {
          const { data } = await supabase.from("profiles").select("id");
          const { data: roles } = await supabase.from("user_roles").select("role");
          const admins = roles?.filter((r) => r.role === "admin").length || 0;
          const users = roles?.filter((r) => r.role === "user").length || 0;
          return [
            {
              title: "Personale",
              type: "bar",
              data: [
                { name: "Totale Profili", value: data?.length || 0, color: "#06b6d4" },
                { name: "Admin", value: admins, color: "#f97316" },
                { name: "Utenti", value: users, color: "#22c55e" },
              ],
            },
          ];
        }

        case "formulari": {
          const { data } = await supabase.from("fir_forms").select("status").eq("deleted_by_user", false);
          const counts: Record<string, number> = {};
          data?.forEach((r) => {
            counts[r.status] = (counts[r.status] || 0) + 1;
          });
          return [
            {
              title: "Formulari per Stato",
              type: "pie",
              data: [
                { name: "Bozza", value: counts["draft"] || 0, color: "#fbbf24" },
                { name: "Inviati", value: counts["submitted"] || 0, color: "#3b82f6" },
                { name: "Completati", value: counts["completed"] || 0, color: "#22c55e" },
              ].filter((d) => d.value > 0),
            },
          ];
        }

        case "chiamate": {
          const { data } = await supabase.from("office_calls").select("status, direction");
          const inbound = data?.filter((c) => c.direction === "inbound").length || 0;
          const outbound = data?.filter((c) => c.direction === "outbound").length || 0;
          return [
            {
              title: "Chiamate per Direzione",
              type: "pie",
              data: [
                { name: "In Entrata", value: inbound, color: "#22c55e" },
                { name: "In Uscita", value: outbound, color: "#3b82f6" },
              ].filter((d) => d.value > 0),
            },
          ];
        }

        case "messaggi": {
          const { data } = await supabase.from("messages").select("is_read");
          const read = data?.filter((m) => m.is_read).length || 0;
          const unread = data?.filter((m) => !m.is_read).length || 0;
          return [
            {
              title: "Messaggi",
              type: "pie",
              data: [
                { name: "Letti", value: read, color: "#22c55e" },
                { name: "Non Letti", value: unread, color: "#ef4444" },
              ].filter((d) => d.value > 0),
            },
          ];
        }

        case "fatturazione": {
          const { data } = await supabase.from("pagamenti_privati").select("stato, importo");
          const pagati = data?.filter((p) => p.stato === "pagato") || [];
          const nonPagati = data?.filter((p) => p.stato !== "pagato") || [];
          return [
            {
              title: "Pagamenti",
              type: "pie",
              data: [
                { name: "Pagati", value: pagati.reduce((s, p) => s + p.importo, 0), color: "#22c55e" },
                { name: "In Attesa", value: nonPagati.reduce((s, p) => s + p.importo, 0), color: "#fbbf24" },
              ].filter((d) => d.value > 0),
            },
          ];
        }

        case "gps": {
          const { data } = await supabase.from("driver_locations").select("user_id").order("created_at", { ascending: false }).limit(100);
          const uniqueDrivers = new Set(data?.map((d) => d.user_id)).size;
          return [
            {
              title: "GPS Flotta",
              type: "bar",
              data: [
                { name: "Autisti Tracciati", value: uniqueDrivers, color: "#06b6d4" },
                { name: "Posizioni Recenti", value: data?.length || 0, color: "#3b82f6" },
              ],
            },
          ];
        }

        case "notifiche":
        case "impianti":
        case "magazzino":
        case "privati":
        case "registro-kg": {
          return [
            {
              title: "__IN_SVILUPPO__",
              type: "bar",
              data: [],
            },
          ];
        }

        default:
          return [
            {
              title: "__IN_SVILUPPO__",
              type: "bar",
              data: [],
            },
          ];
      }
    },
    enabled: !!iconId && !!user,
    staleTime: 30_000,
  });
}
