import { requireUser } from "@/lib/tenant";
import { UsersManager } from "./users-manager";

export default async function UsersPage() {
  const user = await requireUser();
  if (!user || user.role !== "ADMIN") {
    return (
      <div>
        <h1 className="text-xl font-semibold">403</h1>
        <p className="mt-2 text-sm text-slate-500">无权限</p>
      </div>
    );
  }
  return <UsersManager />;
}
