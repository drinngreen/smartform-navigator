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
        // ── Registro FIR ──
        case "registro": {
          const { data } = await supabase.from("fir").select("stato, quantita_prevista, quantita_verificata, created_at");
          const statoCounts: Record<string, number> = {};
          let totalPrevista = 0;
          let totalVerificata = 0;
          const monthCounts: Record<string, number> = {};

          data?.forEach((r) => {
            statoCounts[r.stato] = (statoCounts[r.stato] || 0) + 1;
            totalPrevista += r.quantita_prevista || 0;
            totalVerificata += r.quantita_verificata || 0;
            const month = r.created_at?.substring(0, 7);
            if (month) monthCounts[month] = (monthCounts[month] || 0) + 1;
          });

          const recentMonths = Object.entries(monthCounts)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 6)
            .reverse();

          const charts: IconChartData[] = [
            {
              title: "FIR per Stato",
              type: "pie",
              data: [
                { name: "Bozze", value: statoCounts["DRAFT"] || 0, color: "#fbbf24" },
                { name: "Pronti", value: statoCounts["READY_TO_SEND"] || 0, color: "#a78bfa" },
                { name: "Attivi", value: statoCounts["ACTIVE"] || 0, color: "#22c55e" },
                { name: "In Transito", value: statoCounts["IN_TRANSIT"] || 0, color: "#3b82f6" },
                { name: "Consegnati", value: statoCounts["DELIVERED_PENDING_ACCEPTANCE"] || 0, color: "#f97316" },
                { name: "Chiusi", value: statoCounts["CLOSED"] || 0, color: "#6b7280" },
                { name: "Inviati RENTRI", value: statoCounts["SENT_TO_RENTRI_DATA"] || 0, color: "#ec4899" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Quantità (kg)",
              type: "bar",
              data: [
                { name: "Prevista", value: Math.round(totalPrevista), color: "#3b82f6" },
                { name: "Verificata", value: Math.round(totalVerificata), color: "#22c55e" },
              ],
            },
          ];

          if (recentMonths.length > 1) {
            charts.push({
              title: "FIR per Mese",
              type: "bar",
              data: recentMonths.map(([m, v]) => ({
                name: m.substring(5),
                value: v,
                color: "#06b6d4",
              })),
            });
          }

          return charts;
        }

        // ── Gestione FIR (Pool numeri) ──
        case "gestione-fir": {
          const { data } = await supabase.from("fir_number_pool").select("status, suspended");
          const statusCounts: Record<string, number> = {};
          let suspended = 0;
          data?.forEach((f) => {
            statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
            if (f.suspended) suspended++;
          });

          return [
            {
              title: "Pool Numeri FIR",
              type: "pie",
              data: [
                { name: "Disponibili", value: statusCounts["available"] || 0, color: "#22c55e" },
                { name: "Riservati", value: statusCounts["reserved"] || 0, color: "#3b82f6" },
                { name: "Consumati", value: statusCounts["consumed"] || 0, color: "#f97316" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Stato Numeri",
              type: "bar",
              data: [
                { name: "Totale", value: data?.length || 0, color: "#06b6d4" },
                { name: "Sospesi", value: suspended, color: "#ef4444" },
                { name: "Attivi", value: (data?.length || 0) - suspended, color: "#22c55e" },
              ],
            },
          ];
        }

        // ── RENTRI ──
        case "rentri": {
          const { data } = await supabase.from("register_movements").select("tipo, stato_invio, quantita_kg, data_movimento");
          const carico = data?.filter((m) => m.tipo === "CARICO") || [];
          const scarico = data?.filter((m) => m.tipo === "SCARICO") || [];
          const sent = data?.filter((m) => m.stato_invio === "SENT").length || 0;
          const pending = data?.filter((m) => m.stato_invio === "PENDING").length || 0;
          const kgCarico = carico.reduce((s, m) => s + (m.quantita_kg || 0), 0);
          const kgScarico = scarico.reduce((s, m) => s + (m.quantita_kg || 0), 0);

          return [
            {
              title: "Movimenti per Tipo",
              type: "pie",
              data: [
                { name: "Carico", value: carico.length, color: "#22c55e" },
                { name: "Scarico", value: scarico.length, color: "#ef4444" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Kg Movimentati",
              type: "bar",
              data: [
                { name: "Carico", value: Math.round(kgCarico), color: "#22c55e" },
                { name: "Scarico", value: Math.round(kgScarico), color: "#ef4444" },
                { name: "Saldo", value: Math.round(kgCarico - kgScarico), color: "#3b82f6" },
              ],
            },
            {
              title: "Stato Invio RENTRI",
              type: "pie",
              data: [
                { name: "Inviati", value: sent, color: "#22c55e" },
                { name: "In Attesa", value: pending, color: "#fbbf24" },
              ].filter((d) => d.value > 0),
            },
          ];
        }

        // ── Personale ──
        case "personale": {
          const { data: profiles } = await supabase.from("profiles").select("id, targa_automezzo");
          const { data: roles } = await supabase.from("user_roles").select("role");
          const { data: online } = await supabase.from("online_status").select("status");

          const admins = roles?.filter((r) => r.role === "admin").length || 0;
          const users = roles?.filter((r) => r.role === "user").length || 0;
          const withVehicle = profiles?.filter((p) => p.targa_automezzo).length || 0;
          const withoutVehicle = (profiles?.length || 0) - withVehicle;

          const onlineCount = online?.filter((o) => o.status === "online").length || 0;
          const busyCount = online?.filter((o) => o.status === "busy").length || 0;
          const offlineCount = online?.filter((o) => o.status === "offline" || o.status === "away").length || 0;

          return [
            {
              title: "Ruoli Utenti",
              type: "pie",
              data: [
                { name: "Admin", value: admins, color: "#f97316" },
                { name: "Utenti", value: users, color: "#22c55e" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Stato Presenza",
              type: "pie",
              data: [
                { name: "Online", value: onlineCount, color: "#22c55e" },
                { name: "Occupato", value: busyCount, color: "#fbbf24" },
                { name: "Offline", value: offlineCount, color: "#6b7280" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Automezzi",
              type: "bar",
              data: [
                { name: "Totale Profili", value: profiles?.length || 0, color: "#06b6d4" },
                { name: "Con Targa", value: withVehicle, color: "#22c55e" },
                { name: "Senza Targa", value: withoutVehicle, color: "#fbbf24" },
              ],
            },
          ];
        }

        // ── Formulari ──
        case "formulari": {
          const { data } = await supabase.from("fir_forms").select("status, deleted_by_user, created_at, quantita").eq("deleted_by_user", false);
          const counts: Record<string, number> = {};
          let totalQty = 0;
          const monthCounts: Record<string, number> = {};

          data?.forEach((r) => {
            counts[r.status] = (counts[r.status] || 0) + 1;
            totalQty += r.quantita || 0;
            const month = r.created_at?.substring(0, 7);
            if (month) monthCounts[month] = (monthCounts[month] || 0) + 1;
          });

          const { count: deletedCount } = await supabase.from("fir_forms").select("id", { count: "exact", head: true }).eq("deleted_by_user", true);

          const recentMonths = Object.entries(monthCounts)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 6)
            .reverse();

          const charts: IconChartData[] = [
            {
              title: "Formulari per Stato",
              type: "pie",
              data: [
                { name: "Bozza", value: counts["draft"] || 0, color: "#fbbf24" },
                { name: "Inviati", value: counts["submitted"] || 0, color: "#3b82f6" },
                { name: "Completati", value: counts["completed"] || 0, color: "#22c55e" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Riepilogo Formulari",
              type: "bar",
              data: [
                { name: "Attivi", value: data?.length || 0, color: "#06b6d4" },
                { name: "Eliminati", value: deletedCount || 0, color: "#ef4444" },
                { name: "Kg Totali", value: Math.round(totalQty), color: "#22c55e" },
              ],
            },
          ];

          if (recentMonths.length > 1) {
            charts.push({
              title: "Formulari per Mese",
              type: "bar",
              data: recentMonths.map(([m, v]) => ({
                name: m.substring(5),
                value: v,
                color: "#a78bfa",
              })),
            });
          }

          return charts;
        }

        // ── Chiamate ──
        case "chiamate": {
          const { data } = await supabase.from("office_calls").select("status, direction, duration_ms, call_successful, user_sentiment");
          const inbound = data?.filter((c) => c.direction === "inbound").length || 0;
          const outbound = data?.filter((c) => c.direction === "outbound").length || 0;
          const successful = data?.filter((c) => c.call_successful).length || 0;
          const failed = (data?.length || 0) - successful;
          const totalDurationMin = Math.round((data?.reduce((s, c) => s + (c.duration_ms || 0), 0) || 0) / 60000);

          const sentiments: Record<string, number> = {};
          data?.forEach((c) => {
            if (c.user_sentiment) {
              sentiments[c.user_sentiment] = (sentiments[c.user_sentiment] || 0) + 1;
            }
          });

          const charts: IconChartData[] = [
            {
              title: "Direzione Chiamate",
              type: "pie",
              data: [
                { name: "In Entrata", value: inbound, color: "#22c55e" },
                { name: "In Uscita", value: outbound, color: "#3b82f6" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Esito Chiamate",
              type: "pie",
              data: [
                { name: "Riuscite", value: successful, color: "#22c55e" },
                { name: "Non Riuscite", value: failed, color: "#ef4444" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Riepilogo",
              type: "bar",
              data: [
                { name: "Totale", value: data?.length || 0, color: "#06b6d4" },
                { name: "Durata (min)", value: totalDurationMin, color: "#a78bfa" },
              ],
            },
          ];

          if (Object.keys(sentiments).length > 0) {
            charts.push({
              title: "Sentiment Utenti",
              type: "pie",
              data: Object.entries(sentiments).map(([name, value], i) => ({
                name,
                value,
                color: ["#22c55e", "#fbbf24", "#ef4444", "#3b82f6", "#a78bfa"][i % 5],
              })),
            });
          }

          return charts;
        }

        // ── Messaggi ──
        case "messaggi": {
          const { data } = await supabase.from("messages").select("is_read, created_at, deleted_by_sender, deleted_by_receiver");
          const read = data?.filter((m) => m.is_read).length || 0;
          const unread = data?.filter((m) => !m.is_read).length || 0;
          const deleted = data?.filter((m) => m.deleted_by_sender || m.deleted_by_receiver).length || 0;

          const monthCounts: Record<string, number> = {};
          data?.forEach((m) => {
            const month = m.created_at?.substring(0, 7);
            if (month) monthCounts[month] = (monthCounts[month] || 0) + 1;
          });
          const recentMonths = Object.entries(monthCounts)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 6)
            .reverse();

          const charts: IconChartData[] = [
            {
              title: "Stato Messaggi",
              type: "pie",
              data: [
                { name: "Letti", value: read, color: "#22c55e" },
                { name: "Non Letti", value: unread, color: "#ef4444" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Riepilogo",
              type: "bar",
              data: [
                { name: "Totale", value: data?.length || 0, color: "#06b6d4" },
                { name: "Eliminati", value: deleted, color: "#ef4444" },
              ],
            },
          ];

          if (recentMonths.length > 1) {
            charts.push({
              title: "Messaggi per Mese",
              type: "bar",
              data: recentMonths.map(([m, v]) => ({
                name: m.substring(5),
                value: v,
                color: "#ec4899",
              })),
            });
          }

          return charts;
        }

        // ── Fatturazione ──
        case "fatturazione": {
          const { data } = await supabase.from("pagamenti_privati").select("stato, importo, data_scad");
          const pagati = data?.filter((p) => p.stato === "pagato") || [];
          const nonPagati = data?.filter((p) => p.stato !== "pagato") || [];
          const totPagato = pagati.reduce((s, p) => s + (p.importo || 0), 0);
          const totInAttesa = nonPagati.reduce((s, p) => s + (p.importo || 0), 0);

          const { data: conferimenti } = await supabase.from("privati_conferimenti").select("kg_pesati, metodo_pag");
          const totalKg = conferimenti?.reduce((s, c) => s + (c.kg_pesati || 0), 0) || 0;
          const metodiPag: Record<string, number> = {};
          conferimenti?.forEach((c) => {
            if (c.metodo_pag) metodiPag[c.metodo_pag] = (metodiPag[c.metodo_pag] || 0) + 1;
          });

          const charts: IconChartData[] = [
            {
              title: "Importi Pagamenti (€)",
              type: "pie",
              data: [
                { name: "Pagati", value: Math.round(totPagato), color: "#22c55e" },
                { name: "In Attesa", value: Math.round(totInAttesa), color: "#fbbf24" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Conteggio Pagamenti",
              type: "bar",
              data: [
                { name: "Pagati", value: pagati.length, color: "#22c55e" },
                { name: "In Attesa", value: nonPagati.length, color: "#fbbf24" },
                { name: "Totale Conf.", value: conferimenti?.length || 0, color: "#06b6d4" },
              ],
            },
            {
              title: "Conferimenti Privati",
              type: "bar",
              data: [
                { name: "Kg Totali", value: Math.round(totalKg), color: "#3b82f6" },
                { name: "N° Conf.", value: conferimenti?.length || 0, color: "#a78bfa" },
              ],
            },
          ];

          if (Object.keys(metodiPag).length > 0) {
            charts.push({
              title: "Metodi di Pagamento",
              type: "pie",
              data: Object.entries(metodiPag).map(([name, value], i) => ({
                name,
                value,
                color: ["#22c55e", "#3b82f6", "#fbbf24", "#ef4444", "#a78bfa"][i % 5],
              })),
            });
          }

          return charts;
        }

        // ── GPS Flotta ──
        case "gps": {
          const windowAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { data } = await supabase.from("driver_locations").select("user_id, speed, accuracy, created_at").gte("created_at", windowAgo).order("created_at", { ascending: false }).limit(500);

          const uniqueDrivers = new Set(data?.map((d) => d.user_id));
          const withSpeed = data?.filter((d) => d.speed != null && d.speed > 0) || [];
          const avgSpeed = withSpeed.length > 0 ? withSpeed.reduce((s, d) => s + (d.speed || 0) * 3.6, 0) / withSpeed.length : 0;
          const moving = new Set(withSpeed.map((d) => d.user_id)).size;
          const stationary = uniqueDrivers.size - moving;

          return [
            {
              title: "Stato Autisti (30 min)",
              type: "pie",
              data: [
                { name: "In Movimento", value: moving, color: "#22c55e" },
                { name: "Fermi", value: stationary, color: "#6b7280" },
              ].filter((d) => d.value > 0),
            },
            {
              title: "Riepilogo GPS",
              type: "bar",
              data: [
                { name: "Autisti Attivi", value: uniqueDrivers.size, color: "#06b6d4" },
                { name: "Posizioni", value: data?.length || 0, color: "#3b82f6" },
                { name: "Vel. Media (km/h)", value: Math.round(avgSpeed), color: "#fbbf24" },
              ],
            },
          ];
        }

        // ── AI / Analytics / App / Notifiche (in sviluppo) ──
        case "ai":
        case "analytics":
        case "app":
        case "notifiche": {
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
