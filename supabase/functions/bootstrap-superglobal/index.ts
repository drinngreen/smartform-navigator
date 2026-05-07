import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);
  const email = "superadminglobal@zoli.live";
  const password = "123stella";

  const { data: existing } = await admin.auth.admin.listUsers();
  let user = existing?.users?.find((u: any) => u.email?.toLowerCase() === email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    user = data.user!;
  } else {
    await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  }

  await admin.from("user_roles").delete().eq("user_id", user.id);
  await admin.from("user_roles").insert({ user_id: user.id, role: "admin" });

  return new Response(JSON.stringify({ ok: true, user_id: user.id, email }), {
    headers: { "content-type": "application/json" },
  });
});
