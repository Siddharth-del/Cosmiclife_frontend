import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import Link from "@/components/ui/Link";
import { AdminPage, EmptyPanel, ErrorPanel, Panel, Pill, SearchInput, TableSkeleton } from "@/components/admin/AdminUI";
import { td, th } from "@/components/admin/styles";
import { Button } from "@/components/ui/Button";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminUserApi } from "@/lib/api/users";
import { normaliseUser, roleLabel, type AdminUser } from "@/lib/api/types";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 20;

export default function AdminUsers() {
  usePageMeta("Users · Admin", undefined, { noindex: true });

  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(query.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const key = `${term}|${page}`;
  const users = useLoad(
    () => (term ? adminUserApi.search(term, { pageNumber: page, pageSize: PAGE_SIZE }) : adminUserApi.list({ pageNumber: page, pageSize: PAGE_SIZE })),
    key,
  );

  const rows: AdminUser[] = useMemo(() => (users.data?.content ?? []).map(normaliseUser), [users.data]);
  const totalPages = users.data?.totalPages ?? 1;
  const total = users.data?.totalElements ?? 0;
  const admins = rows.filter((u) => u.admin).length;
  const showRoles = rows.some((u) => u.roles.length > 0);

  return (
    <AdminPage eyebrow="People" title="Users">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-[0.84rem] text-ink-muted">
          Every account that has signed up, whether or not it has ordered. Accounts can&rsquo;t be created, edited or disabled from here: the API only reads them.
        </p>
        <SearchInput value={query} onChange={setQuery} placeholder="Search by username" label="Search users" />
      </div>

      {users.data && !users.error && (
        <p className="mt-4 text-[0.78rem] text-ink-faint">
          {term ? (
            <>
              {total.toLocaleString("en-IN")} matching &ldquo;{term}&rdquo;
            </>
          ) : (
            <>{total.toLocaleString("en-IN")} accounts</>
          )}
          {admins > 0 && ` · ${admins} admin${admins === 1 ? "" : "s"} on this page`}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div>
          {users.error ? (
            <ErrorPanel error={users.error} onRetry={users.reload} what="users" />
          ) : !users.data ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <EmptyPanel title={term ? "Nothing matches" : "No accounts yet"} body={term ? "Try part of a username, or clear the search." : "Accounts appear here as soon as someone signs up."} />
          ) : (
            <>
              <div className="relative overflow-x-auto border border-hair bg-white/70">
                <table className={cn("w-full", showRoles ? "min-w-[40rem]" : "min-w-[32rem]")}>
                  <thead className="border-b border-hair">
                    <tr>
                      <th className={th}>Username</th>
                      <th className={th}>Email</th>
                      {showRoles && <th className={th}>Roles</th>}
                      <th className={cn(th, "text-right")}>ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hair">
                    {rows.map((u, i) => (
                      <tr
                        key={u.userId ?? `${u.email}-${i}`}
                        onClick={() => u.userId != null && setSelected(u.userId)}
                        className={cn("cursor-pointer hover:bg-sand/30", selected != null && selected === u.userId && "bg-sand/40")}
                      >
                        <td className={cn(td, "max-w-[14rem] truncate")}>
                          <span className="inline-flex items-center gap-2">
                            {u.admin ? <ShieldCheck aria-hidden className="h-3.5 w-3.5 shrink-0 text-gold-deep" strokeWidth={1.5} /> : <UserRound aria-hidden className="h-3.5 w-3.5 shrink-0 text-ink-faint" strokeWidth={1.4} />}
                            {u.username || <span className="text-ink-faint">—</span>}
                          </span>
                        </td>
                        <td className={cn(td, "max-w-[18rem] truncate")}>
                          {u.email ? (
                            <Link href={`/admin/orders?q=${encodeURIComponent(u.email)}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                              {u.email}
                            </Link>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                        {showRoles && (
                          <td className={td}>
                            <span className="flex flex-wrap gap-1">
                              {u.roles.length ? (
                                u.roles.map((r) => (
                                  <Pill key={r} tone={r.endsWith("ADMIN") ? "gold" : "neutral"}>
                                    {roleLabel(r)}
                                  </Pill>
                                ))
                              ) : (
                                <span className="text-ink-faint">—</span>
                              )}
                            </span>
                          </td>
                        )}
                        <td className={cn(td, "text-right tabular text-ink-muted")}>{u.userId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-4">
                  <Button type="button" variant="outline" size="sm" disabled={page === 0 || users.loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                    Previous
                  </Button>
                  <span className="text-[0.78rem] text-ink-muted">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button type="button" variant="outline" size="sm" disabled={users.data.lastPage || page + 1 >= totalPages || users.loading} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <UserDetail userId={selected} onClose={() => setSelected(null)} />
      </div>
    </AdminPage>
  );
}

function UserDetail({ userId, onClose }: { userId: number | null; onClose: () => void }) {
  const detail = useLoad(() => (userId == null ? Promise.resolve(null) : adminUserApi.byId(userId)), userId);

  if (userId == null) {
    return (
      <Panel title="Account">
        <p className="text-[0.82rem] text-ink-muted">Choose a row to see that account on its own.</p>
      </Panel>
    );
  }
  if (detail.error) return <ErrorPanel error={detail.error} onRetry={detail.reload} what="this account" />;
  if (!detail.data) {
    return (
      <Panel title="Account">
        <p className="text-[0.82rem] text-ink-muted">Loading…</p>
      </Panel>
    );
  }

  const u = normaliseUser(detail.data);
  return (
    <Panel
      title="Account"
      action={
        <button type="button" onClick={onClose} className="label text-[0.58rem] text-ink-muted hover:text-ink">
          Close
        </button>
      }
    >
      <dl className="space-y-3 text-[0.84rem]">
        <Field k="Username" v={u.username || "—"} />
        <Field k="Email" v={u.email || "—"} />
        <Field k="User ID" v={String(u.userId ?? "—")} />
        {u.roles.length > 0 && (
          <div>
            <dt className="text-ink-muted">Roles</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {u.roles.map((r) => (
                <Pill key={r} tone={r.endsWith("ADMIN") ? "gold" : "neutral"}>
                  {roleLabel(r)}
                </Pill>
              ))}
            </dd>
          </div>
        )}
      </dl>
      {u.email && (
        <Link href={`/admin/orders?q=${encodeURIComponent(u.email)}`} className="label mt-6 inline-block underline underline-offset-4">
          See their orders
        </Link>
      )}
    </Panel>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="min-w-0 truncate text-right">{v}</dd>
    </div>
  );
}
