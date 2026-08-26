import { getCurrentUser, type CurrentUser } from "./getCurrentUser";

/** Server-only guard for admin routes/pages. */
export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.isAdmin ? user : null;
}
