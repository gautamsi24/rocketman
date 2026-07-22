import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { username, password } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("username", username)
    .maybeSingle();
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const { data: learner, error: learnerError } = await supabase
    .from("learners")
    .select("id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (learnerError) {
    return NextResponse.json({ error: learnerError.message }, { status: 500 });
  }
  if (!learner) {
    return NextResponse.json(
      { error: "No learner profile is linked to this account" },
      { status: 403 }
    );
  }

  await createSessionCookie(learner.id);

  return NextResponse.json({ id: learner.id, displayName: learner.display_name });
}
