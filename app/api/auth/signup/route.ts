import { NextResponse } from "next/server";
import { z } from "zod";
import { serverErrorResponse } from "@/lib/api/error-response";
import { hashPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";

const SignupSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  password: z
    .string()
    .min(8, "Must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Must contain at least one letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character"),
  displayName: z.string().min(1).max(64).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { username, password, displayName } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existingError) {
    return serverErrorResponse(existingError);
  }
  if (existing) {
    return NextResponse.json(
      { error: { username: ["Username is already taken"] } },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({ username, password_hash: passwordHash, role: "learner" })
    .select("id")
    .single();
  if (userError) {
    return serverErrorResponse(userError);
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .single();
  if (tenantError) {
    await supabase.from("users").delete().eq("id", user.id);
    return serverErrorResponse(tenantError);
  }

  const { data: learner, error: learnerError } = await supabase
    .from("learners")
    .insert({
      tenant_id: tenant.id,
      display_name: displayName ?? username,
      user_id: user.id,
    })
    .select("id, display_name")
    .single();
  if (learnerError) {
    await supabase.from("users").delete().eq("id", user.id);
    return serverErrorResponse(learnerError);
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
