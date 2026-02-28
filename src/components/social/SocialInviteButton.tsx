import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus, Copy, Check } from "lucide-react";

export function SocialInviteButton() {
  const { user } = useAuth();
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateInvite = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("social_invites")
      .insert({ invited_by: user.id })
      .select("invite_code")
      .single();

    if (data) {
      const link = `${window.location.origin}/social/guest?invite=${data.invite_code}`;
      setInviteLink(link);
    }
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus size={16} className="text-accent" />
        <span className="text-sm font-semibold text-foreground">Invita un Ospite</span>
      </div>

      {!inviteLink ? (
        <button
          onClick={generateInvite}
          disabled={loading}
          className="w-full py-2.5 bg-accent/20 text-accent border border-accent/30 rounded-lg text-xs font-semibold hover:bg-accent/30 disabled:opacity-50 transition-all"
        >
          {loading ? "Generazione..." : "Genera Link di Invito"}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={inviteLink}
              readOnly
              className="flex-1 px-3 py-2 text-xs bg-secondary border border-border rounded-lg font-mono"
            />
            <button onClick={copyLink} className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-all">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">Il link scade tra 7 giorni</p>
        </div>
      )}
    </div>
  );
}
