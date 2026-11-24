import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { AdminPage, EmptyPanel, ErrorPanel, FilterChips, Panel, Pill, SearchInput, TableSkeleton } from "@/components/admin/AdminUI";
import { td, th } from "@/components/admin/styles";
import { Button } from "@/components/ui/Button";
import { FormStatus, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminBannerApi } from "@/lib/api/admin";
import { bannerIsLive, byDisplayOrder } from "@/lib/api/banners";
import { BANNER_PLACEMENTS } from "@/lib/api/types";
import type { BannerDTO, BannerImageDTO, BannerInput, BannerPlacement } from "@/lib/api/types";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/orders";
import { cn } from "@/lib/cn";
import { toast } from "@/store/toast";

const PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  HERO: "Hero slider",
  SPLIT_ATTAR: "Attar panel",
  SPLIT_PERFUME: "Perfume panel",
  CATEGORY: "Shop by category",
  GIFTING: "Gifting band",
  BUILD_YOUR_BOX: "Build your own box",
  FRAGRANCE_DISCOVERY: "Fragrance discovery",
  JOURNAL: "The journal",
  PROMO_STRIP: "Promo strip",
};

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_FILES = 10;

interface Values {
  placement: string;
  internalName: string;
  eyebrow: string;
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  theme: string;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
}
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = {
  placement: "HERO",
  internalName: "",
  eyebrow: "",
  heading: "",
  subheading: "",
  ctaLabel: "",
  ctaHref: "",
  theme: "DARK",
  sortOrder: "",
  startsAt: "",
  endsAt: "",
};

type Filter = "all" | "live" | "scheduled" | "off";

const toLocalInput = (v: string | null) => (v ? v.slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? `${v}:00` : null);
const isUsableLink = (v: string) => /^(https?:\/\/|\/(?!\/))/i.test(v.trim());
const bannerName = (b: BannerDTO) => b.internalName || b.heading || b.eyebrow || `Banner ${b.bannerId}`;
const imagesOf = (b: BannerDTO) => [...(b.images ?? [])].sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0) || x.imageId - y.imageId);

const fromBanner = (b: BannerDTO): Values => ({
  placement: b.placement,
  internalName: b.internalName ?? "",
  eyebrow: b.eyebrow ?? "",
  heading: b.heading ?? "",
  subheading: b.subheading ?? "",
  ctaLabel: b.ctaLabel ?? "",
  ctaHref: b.ctaHref ?? "",
  theme: b.theme ?? "DARK",
  sortOrder: b.sortOrder != null ? String(b.sortOrder) : "",
  startsAt: toLocalInput(b.startsAt),
  endsAt: toLocalInput(b.endsAt),
});

function bannerState(b: BannerDTO, now = Date.now()): { label: string; tone: "good" | "warn" | "neutral" | "bad" } {
  if (b.active === false) return { label: "Off", tone: "bad" };
  if (imagesOf(b).length === 0) return { label: "No image", tone: "neutral" };
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return { label: "Scheduled", tone: "warn" };
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return { label: "Ended", tone: "neutral" };
  return { label: "Live", tone: "good" };
}

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.eyebrow.trim() && !v.heading.trim() && !v.subheading.trim()) {
    e.heading = "Add a headline, or at least an eyebrow or subheading.";
  } else if (v.heading.length > 200) {
    e.heading = "Keep the headline to 200 characters or fewer.";
  }
  if (v.eyebrow.length > 80) e.eyebrow = "Keep the eyebrow to 80 characters or fewer.";
  if (v.subheading.length > 300) e.subheading = "Keep the subheading to 300 characters or fewer.";
  if (v.internalName.length > 120) e.internalName = "Keep the name to 120 characters or fewer.";

  if (v.ctaHref.trim() && !isUsableLink(v.ctaHref)) e.ctaHref = "Enter a full https:// address or a path starting with /.";
  if (v.ctaLabel.trim() && !v.ctaHref.trim()) e.ctaHref = "Add where the button should go.";
  if (v.ctaLabel.length > 40) e.ctaLabel = "Keep the button text to 40 characters or fewer.";

  if (v.sortOrder && !/^\d{1,4}$/.test(v.sortOrder)) e.sortOrder = "Enter a whole number, or leave blank.";
  if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) e.endsAt = "The end must be after the start.";
  return e;
}

const toInput = (v: Values): BannerInput => ({
  placement: v.placement as BannerPlacement,
  internalName: v.internalName.trim() || null,
  eyebrow: v.eyebrow.trim() || null,
  heading: v.heading.trim() || null,
  subheading: v.subheading.trim() || null,
  ctaLabel: v.ctaLabel.trim() || null,
  ctaHref: v.ctaHref.trim() || null,
  theme: v.theme === "LIGHT" ? "LIGHT" : "DARK",
  sortOrder: v.sortOrder ? Number(v.sortOrder) : null,
  startsAt: fromLocalInput(v.startsAt),
  endsAt: fromLocalInput(v.endsAt),
});

export default function AdminBanners() {
  usePageMeta("Banners · Admin", undefined, { noindex: true });
  const banners = useLoad(() => adminBannerApi.all());
  const [editing, setEditing] = useState<BannerDTO | "new" | null>(null);
  const [removing, setRemoving] = useState<BannerDTO | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const formRef = useRef<HTMLDivElement>(null);

  const all = useMemo(() => [...(banners.data ?? [])].sort(byDisplayOrder), [banners.data]);

  const counts = useMemo(
    () => ({
      all: all.length,
      live: all.filter((b) => bannerIsLive(b) && imagesOf(b).length > 0).length,
      scheduled: all.filter((b) => b.active !== false && b.startsAt && new Date(b.startsAt).getTime() > Date.now()).length,
      off: all.filter((b) => b.active === false).length,
    }),
    [all],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((b) => {
      if (filter === "live" && !(bannerIsLive(b) && imagesOf(b).length > 0)) return false;
      if (filter === "scheduled" && !(b.active !== false && b.startsAt && new Date(b.startsAt).getTime() > Date.now())) return false;
      if (filter === "off" && b.active !== false) return false;
      if (!q) return true;
      return bannerName(b).toLowerCase().includes(q) || (b.subheading ?? "").toLowerCase().includes(q);
    });
  }, [all, filter, query]);

  const scrollToForm = () => requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  const open = (b: BannerDTO | "new") => {
    setRemoving(null);
    setEditing(b);
    scrollToForm();
  };
  const upsert = (b: BannerDTO) => banners.setData((prev) => [...(prev ?? []).filter((x) => x.bannerId !== b.bannerId), b]);

  return (
    <AdminPage
      eyebrow="Storefront"
      title="Homepage banners"
      actions={
        editing === null && removing === null ? (
          <Button type="button" size="sm" onClick={() => open("new")}>
            <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} /> New banner
          </Button>
        ) : undefined
      }
    >
      <div ref={formRef} className="scroll-mt-6">
        {removing !== null && (
          <DeleteConfirm
            banner={removing}
            onDone={(deleted) => {
              if (deleted) banners.setData((prev) => (prev ?? []).filter((x) => x.bannerId !== removing.bannerId));
              setRemoving(null);
            }}
          />
        )}
        {editing !== null && removing === null && (
          <BannerForm
            key={editing === "new" ? "new" : editing.bannerId}
            banner={editing === "new" ? null : editing}
            nextOrder={all.length ? Math.max(...all.map((b) => b.sortOrder ?? 0)) + 1 : 0}
            onSaved={(saved) => {
              upsert(saved);
              setEditing(saved);
            }}
            onClose={() => setEditing(null)}
          />
        )}
      </div>

      <div className={editing !== null || removing !== null ? "mt-8" : undefined}>
        {banners.error ? (
          <ErrorPanel error={banners.error} onRetry={banners.reload} what="banners" />
        ) : !banners.data ? (
          <TableSkeleton rows={3} />
        ) : all.length === 0 ? (
          editing === null && (
            <EmptyPanel
              title="No banners yet"
              body="Banners drive the image-led sections of the homepage. With none, the storefront keeps its built-in artwork exactly as it is."
              action={
                <Button type="button" size="sm" onClick={() => open("new")}>
                  New banner
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <FilterChips<Filter>
                label="Filter banners"
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: "All", count: counts.all },
                  { id: "live", label: "Live", count: counts.live },
                  { id: "scheduled", label: "Scheduled", count: counts.scheduled },
                  { id: "off", label: "Off", count: counts.off },
                ]}
              />
              <SearchInput value={query} onChange={setQuery} placeholder="Search banners" label="Search banners" />
            </div>

            {list.length === 0 ? (
              <EmptyPanel title="Nothing matches" body="Try a different search or filter." />
            ) : (
              <div className="relative overflow-x-auto border border-hair bg-white/70">
                <table className="w-full min-w-[62rem]">
                  <thead className="border-b border-hair">
                    <tr>
                      <th className={th}>Banner</th>
                      <th className={th}>Section</th>
                      <th className={th}>Images</th>
                      <th className={th}>Shows</th>
                      <th className={th}>Order</th>
                      <th className={th}>Status</th>
                      <th className={th}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hair">
                    {list.map((b, i) => (
                      <BannerRow
                        key={b.bannerId}
                        banner={b}
                        first={i === 0}
                        last={i === list.length - 1}
                        onEdit={() => open(b)}
                        onDelete={() => {
                          setEditing(null);
                          setRemoving(b);
                          scrollToForm();
                        }}
                        onSaved={upsert}
                        onMove={async (dir) => {
                          const peers = all.filter((x) => x.placement === b.placement);
                          const index = peers.findIndex((x) => x.bannerId === b.bannerId);
                          const swap = peers[index + dir];
                          if (!swap) return;
                          const ids = peers.map((x) => x.bannerId);
                          ids[index] = swap.bannerId;
                          ids[index + dir] = b.bannerId;
                          for (const saved of await adminBannerApi.reorder(b.placement, ids)) upsert(saved);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminPage>
  );
}

function BannerRow({
  banner: b,
  first,
  last,
  onEdit,
  onDelete,
  onSaved,
  onMove,
}: {
  banner: BannerDTO;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSaved: (b: BannerDTO) => void;
  onMove: (dir: -1 | 1) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const state = bannerState(b);
  const pictures = imagesOf(b);
  const name = bannerName(b);

  const run = async (job: () => Promise<void>, failure: string) => {
    setBusy(true);
    try {
      await job();
    } catch (e) {
      toast({ title: failure, description: errorMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="hover:bg-sand/30">
      <td className={td}>
        <div className="flex items-center gap-3">
          <span className="flex shrink-0 gap-1">
            {pictures.slice(0, 3).map((img) => (
              <span key={img.imageId} className="grid h-11 w-14 place-items-center overflow-hidden border border-hair bg-sand/40">
                <img src={img.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
              </span>
            ))}
            {pictures.length === 0 && <span className="grid h-11 w-14 place-items-center border border-dashed border-hair text-[0.58rem] uppercase tracking-[0.12em] text-ink-faint">None</span>}
          </span>
          <span className="min-w-0">
            <span className="block font-medium">{name}</span>
            {b.subheading && <span className="block max-w-[22rem] truncate text-[0.76rem] text-ink-muted">{b.subheading}</span>}
          </span>
        </div>
      </td>
      <td className={cn(td, "text-[0.8rem] text-ink-muted")}>{PLACEMENT_LABELS[b.placement] ?? b.placement}</td>
      <td className={cn(td, "tabular text-[0.82rem] text-ink-muted")}>{pictures.length}</td>
      <td className={cn(td, "text-[0.78rem] text-ink-muted")}>
        {b.startsAt || b.endsAt ? (
          <>
            {b.startsAt ? formatDateTime(b.startsAt, false) : "Now"} → {b.endsAt ? formatDateTime(b.endsAt, false) : "no end"}
          </>
        ) : (
          "Always"
        )}
      </td>
      <td className={cn(td, "tabular text-ink-muted")}>
        <span className="mr-2">{b.sortOrder ?? 0}</span>
        <button type="button" onClick={() => run(() => onMove(-1), "Couldn't reorder")} disabled={busy || first} aria-label={`Move ${name} earlier`} className="px-1 disabled:opacity-30">
          ↑
        </button>
        <button type="button" onClick={() => run(() => onMove(1), "Couldn't reorder")} disabled={busy || last} aria-label={`Move ${name} later`} className="px-1 disabled:opacity-30">
          ↓
        </button>
      </td>
      <td className={td}>
        <Pill tone={state.tone}>{state.label}</Pill>
      </td>
      <td className={cn(td, "whitespace-nowrap text-right")}>
        <button type="button" onClick={onEdit} className="label mr-4 text-[0.58rem] underline-offset-4 hover:underline">
          Edit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const active = b.active === false;
              onSaved(await adminBannerApi.setActive(b.bannerId, active));
              toast({ title: `${name} ${active ? "switched on" : "switched off"}` });
            }, `Couldn't update ${name}`)
          }
          className="label mr-4 text-[0.58rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
        >
          {busy ? "Saving" : b.active === false ? "Switch on" : "Switch off"}
        </button>
        <button type="button" onClick={onDelete} className="label text-[0.58rem] text-[#9b3b2a] underline-offset-4 hover:underline">
          Delete
        </button>
      </td>
    </tr>
  );
}

function DeleteConfirm({ banner, onDone }: { banner: BannerDTO; onDone: (deleted: boolean) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = bannerName(banner);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminBannerApi.remove(banner.bannerId);
      toast({ title: `${name} deleted` });
      onDone(true);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Panel title={`Delete ${name}?`}>
      <div className="max-w-xl">
        <p className="text-[0.9rem] text-ink-muted">
          This removes the banner and every image under it for good. To take it down without losing it, switch it off instead.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" size="sm" onClick={remove} disabled={busy} aria-busy={busy}>
            {busy ? "Deleting" : "Delete banner"}
          </Button>
          <button type="button" onClick={() => onDone(false)} disabled={busy} className="label text-[0.6rem] text-ink-muted hover:text-ink">
            Cancel
          </button>
          <FormStatus error={error} pending={busy} />
        </div>
      </div>
    </Panel>
  );
}

function BannerForm({
  banner,
  nextOrder,
  onSaved,
  onClose,
}: {
  banner: BannerDTO | null;
  nextOrder: number;
  onSaved: (saved: BannerDTO) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Values>(banner ? fromBanner(banner) : { ...EMPTY, sortOrder: String(nextOrder) });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set =
    <K extends keyof Values>(k: K) =>
    (v: Values[K]) => {
      setValues((x) => ({ ...x, [k]: v }));
      if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
    };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next = validate(values);
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const input = toInput(values);
      const saved = banner ? await adminBannerApi.update(banner.bannerId, input) : await adminBannerApi.create(input);
      toast({ title: banner ? `${bannerName(saved)} saved` : `${bannerName(saved)} created. Now add its images.` });
      onSaved(saved);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title={banner ? `Edit ${bannerName(banner)}` : "New banner"}>
      <form onSubmit={submit} noValidate aria-label={banner ? `Edit banner ${bannerName(banner)}` : "New banner"} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SelectField label="Section" value={values.placement} onChange={set("placement")} hint="Where on the homepage this appears.">
          {BANNER_PLACEMENTS.map((p) => (
            <option key={p} value={p}>
              {PLACEMENT_LABELS[p]}
            </option>
          ))}
        </SelectField>
        <TextField label="Name" value={values.internalName} onChange={set("internalName")} error={errors.internalName} hint="Optional. Only you see this, in the list above." maxLength={120} />

        <TextField label="Eyebrow" value={values.eyebrow} onChange={set("eyebrow")} error={errors.eyebrow} hint="Optional. Small line above the headline." maxLength={80} />
        <SelectField label="Theme" value={values.theme} onChange={set("theme")} hint="Dark artwork takes light type, and the other way round.">
          <option value="DARK">Dark artwork, light type</option>
          <option value="LIGHT">Light artwork, dark type</option>
        </SelectField>

        <TextField label="Headline" value={values.heading} onChange={set("heading")} error={errors.heading} hint="Large type over the image. Line breaks are kept." maxLength={200} className="md:col-span-2" />
        <TextAreaField label="Subheading" value={values.subheading} onChange={set("subheading")} error={errors.subheading} hint="Optional. One line under the headline." maxLength={300} rows={2} className="md:col-span-2" />

        <TextField label="Button text" value={values.ctaLabel} onChange={set("ctaLabel")} error={errors.ctaLabel} hint="Optional, e.g. Shop attars." maxLength={40} />
        <TextField label="Button link" value={values.ctaHref} onChange={set("ctaHref")} error={errors.ctaHref} hint="e.g. /collections/attars. Each image can override this." spellCheck={false} autoComplete="off" />

        <TextField label="Display order" inputMode="numeric" value={values.sortOrder} onChange={(v) => set("sortOrder")(v.replace(/\D/g, ""))} error={errors.sortOrder} hint="Lower numbers show first." />
        <div className="hidden md:block" />
        <TextField label="Starts" type="datetime-local" value={values.startsAt} onChange={set("startsAt")} error={errors.startsAt} hint="Optional. Blank shows it straight away." />
        <TextField label="Ends" type="datetime-local" value={values.endsAt} onChange={set("endsAt")} error={errors.endsAt} hint="Optional. Blank leaves it up." />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:col-span-2">
          <Button type="submit" size="sm" disabled={saving} aria-busy={saving}>
            {saving ? "Saving" : banner ? "Save banner" : "Create banner"}
          </Button>
          <button type="button" onClick={onClose} disabled={saving} className="label text-[0.6rem] text-ink-muted hover:text-ink">
            {banner ? "Done" : "Cancel"}
          </button>
          <FormStatus error={formError} pending={saving} />
        </div>
      </form>

      {banner ? (
        <BannerGallery banner={banner} onChange={onSaved} />
      ) : (
        <p className="mt-8 border-t border-hair pt-6 text-[0.86rem] text-ink-muted">Create the banner first, then upload its images here.</p>
      )}
    </Panel>
  );
}

function BannerGallery({ banner, onChange }: { banner: BannerDTO; onChange: (b: BannerDTO) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pictures = imagesOf(banner);

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (files.length > MAX_FILES) {
      setError(`Upload up to ${MAX_FILES} images at a time.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await adminBannerApi.uploadImages(banner.bannerId, files);
      onChange(res.banner);
      const failed = (res.results ?? []).filter((r) => !r.uploaded);
      const added = (res.results ?? []).length - failed.length;
      toast({
        title: `${added} image${added === 1 ? "" : "s"} added`,
        description: failed.length ? `${failed.map((f) => f.fileName ?? "a file").join(", ")} did not upload.` : undefined,
        tone: failed.length ? "error" : undefined,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = pictures[index + dir];
    if (!target) return;
    const ids = pictures.map((p) => p.imageId);
    ids[index] = target.imageId;
    ids[index + dir] = pictures[index].imageId;
    setBusy(true);
    setError(null);
    try {
      onChange(await adminBannerApi.reorderImages(banner.bannerId, ids));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Banner images" className="mt-8 border-t border-hair pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Images</h3>
          <p className="mt-1 text-[0.82rem] text-ink-muted">
            Each image is a slide with its own link. The first one shows in sections that hold only one.
          </p>
        </div>
        <label className={cn("label inline-flex h-11 cursor-pointer items-center gap-2 border border-espresso/70 px-5 text-[0.6rem] hover:bg-espresso hover:text-ivory", busy && "pointer-events-none opacity-50")}>
          <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
          {busy ? "Working" : "Upload images"}
          <input type="file" accept={ACCEPT} multiple onChange={upload} disabled={busy} className="sr-only" />
        </label>
      </div>

      <FormStatus error={error} pending={busy} className="mt-3" />

      {pictures.length === 0 ? (
        <p className="mt-6 border border-dashed border-hair p-6 text-center text-[0.84rem] text-ink-muted">
          No images yet. Upload up to {MAX_FILES} at a time, JPEG, PNG or WebP, 5 MB each.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {pictures.map((image, i) => (
            <BannerImageRow
              key={image.imageId}
              banner={banner}
              image={image}
              first={i === 0}
              last={i === pictures.length - 1}
              onChange={onChange}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function BannerImageRow({
  banner,
  image,
  first,
  last,
  onChange,
  onMove,
}: {
  banner: BannerDTO;
  image: BannerImageDTO;
  first: boolean;
  last: boolean;
  onChange: (b: BannerDTO) => void;
  onMove: (dir: -1 | 1) => Promise<void>;
}) {
  const [altText, setAltText] = useState(image.altText ?? "");
  const [decorative, setDecorative] = useState(image.decorative === true);
  const [linkHref, setLinkHref] = useState(image.linkHref ?? "");
  const [linkLabel, setLinkLabel] = useState(image.linkLabel ?? "");
  const [heading, setHeading] = useState(image.heading ?? "");
  const [subheading, setSubheading] = useState(image.subheading ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (job: () => Promise<BannerDTO>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await job());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (linkLabel.trim() && !linkHref.trim()) {
      setError("Add where the button should go.");
      return;
    }
    if (linkHref.trim() && !isUsableLink(linkHref)) {
      setError("Enter a full https:// address or a path starting with /.");
      return;
    }
    if (!decorative && !altText.trim()) {
      setError("Describe this image, or mark it decorative.");
      return;
    }
    return run(() =>
      adminBannerApi.updateImage(banner.bannerId, image.imageId, {
        altText: decorative ? null : altText.trim() || null,
        decorative,
        linkHref: linkHref.trim() || null,
        linkLabel: linkLabel.trim() || null,
        eyebrow: null,
        heading: heading.trim() || null,
        subheading: subheading.trim() || null,
      }),
    );
  };

  const pickMobile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) run(() => adminBannerApi.setMobileImage(banner.bannerId, image.imageId, file));
  };

  const pickDesktop = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) run(() => adminBannerApi.replaceImage(banner.bannerId, image.imageId, file));
  };

  return (
    <li className="grid gap-5 border border-hair bg-white/60 p-4 lg:grid-cols-[14rem_1fr]">
      <div>
        <img src={image.imageUrl} alt="" className="aspect-[2/1] w-full border border-hair object-cover" loading="lazy" decoding="async" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="label cursor-pointer text-[0.58rem] underline-offset-4 hover:underline">
            Replace
            <input type="file" accept={ACCEPT} onChange={pickDesktop} disabled={busy} className="sr-only" />
          </label>
          <label className="label cursor-pointer text-[0.58rem] underline-offset-4 hover:underline">
            {image.mobileImageUrl ? "Change mobile" : "Add mobile"}
            <input type="file" accept={ACCEPT} onChange={pickMobile} disabled={busy} className="sr-only" />
          </label>
          {image.mobileImageUrl && (
            <button type="button" disabled={busy} onClick={() => run(() => adminBannerApi.removeMobileImage(banner.bannerId, image.imageId))} className="label text-[0.58rem] text-ink-muted underline-offset-4 hover:underline">
              Clear mobile
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Alt text" value={altText} onChange={setAltText} disabled={decorative} hint="What the picture shows, for screen readers." maxLength={200} className="sm:col-span-2" />
        <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
          <input type="checkbox" checked={decorative} onChange={(e) => setDecorative(e.target.checked)} className="h-4 w-4 accent-espresso" />
          <span className="text-[0.86rem]">Decorative, skip it in screen readers</span>
        </label>

        <TextField label="This image links to" value={linkHref} onChange={setLinkHref} hint="Leave blank to use the banner's button link." spellCheck={false} autoComplete="off" />
        <TextField label="Button text" value={linkLabel} onChange={setLinkLabel} maxLength={40} hint="Leave blank to use the banner's." />

        <TextField label="Headline for this image" value={heading} onChange={setHeading} maxLength={200} hint="Optional override." />
        <TextField label="Subheading for this image" value={subheading} onChange={setSubheading} maxLength={300} hint="Optional override." />

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <Button type="button" size="sm" onClick={save} disabled={busy} aria-busy={busy}>
            {busy ? "Saving" : "Save image"}
          </Button>
          <button type="button" onClick={() => onMove(-1)} disabled={busy || first} aria-label="Move image earlier" className="label text-[0.58rem] disabled:opacity-30">
            ↑ Earlier
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={busy || last} aria-label="Move image later" className="label text-[0.58rem] disabled:opacity-30">
            ↓ Later
          </button>
          <button type="button" disabled={busy} onClick={() => run(() => adminBannerApi.removeImage(banner.bannerId, image.imageId))} className="label text-[0.58rem] text-[#9b3b2a] underline-offset-4 hover:underline">
            Delete image
          </button>
          <FormStatus error={error} pending={busy} />
        </div>
      </div>
    </li>
  );
}
