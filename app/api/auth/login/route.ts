import { NextResponse } from "next/server";
import { z } from "zod";
import { serverErrorResponse } from "@/lib/api/error-response";
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
    .select("id, password_hash, role")
    .eq("username", username)
    .maybeSingle();
  if (userError) {
    return serverErrorResponse(userError);
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

  // Tutors have no learner profile; give them a tutor session and let the
  // client route them to the tutor space.
  if (user.role === "tutor") {
    await createSessionCookie({ userId: user.id, role: "tutor", learnerId: null });
    return NextResponse.json({ role: "tutor" });
  }

  if (user.role !== "learner") {
    return NextResponse.json(
      { error: "This account type can't sign in yet" },
      { status: 403 }
    );
  }

  const { data: learner, error: learnerError } = await supabase
    .from("learners")
    .select("id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (learnerError) {
    return serverErrorResponse(learnerError);
  }
  if (!learner) {
    return NextResponse.json(
      { error: "No learner profile is linked to this account" },
      { status: 403 }
    );
  }

  await createSessionCookie({
    userId: user.id,
    role: "learner",
    learnerId: learner.id,
  });

  return NextResponse.json({
    role: "learner",
    id: learner.id,
    displayName: learner.display_name,
  });
}
