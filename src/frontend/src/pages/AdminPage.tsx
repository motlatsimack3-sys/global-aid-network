import type { CauseId, CauseInput, CauseView } from "@/backend";
import { CauseStatus } from "@/backend";
import { SignInButton } from "@/components/InternetIdentity";
import { ProgressBar } from "@/components/ProgressBar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useAllCauses,
  useCloseCause,
  useCreateCause,
  useDonationLedger,
  useEditCause,
  useIsCallerAdmin,
  usePublishCause,
  useSetCauseGoal,
} from "@/hooks/useQueries";
import { formatCents, formatDate, parseDollarsToCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Lock,
  Pencil,
  Plus,
  Target,
  XCircle,
} from "lucide-react";
import { type FormEvent, useState } from "react";

const statusMeta: Record<CauseStatus, { label: string; className: string }> = {
  [CauseStatus.draft]: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  [CauseStatus.published]: {
    label: "Published",
    className: "bg-success/15 text-success",
  },
  [CauseStatus.closed]: {
    label: "Closed",
    className: "bg-destructive/10 text-destructive",
  },
};

function StatusBadge({ status }: { status: CauseStatus }) {
  const meta = statusMeta[status];
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-semibold", meta.className)}
    >
      {meta.label}
    </Badge>
  );
}

type CauseDraft = {
  title: string;
  description: string;
  imageRef: string;
  goal: string;
};

const emptyDraft: CauseDraft = {
  title: "",
  description: "",
  imageRef: "",
  goal: "",
};

function draftFromCause(cause: CauseView): CauseDraft {
  return {
    title: cause.title,
    description: cause.description,
    imageRef: cause.imageRef,
    goal: (Number(cause.goalCents) / 100).toString(),
  };
}

/** Owner-only sign-in gate: never renders tools or ledger to other visitors. */
function OwnerGate() {
  return (
    <section
      data-ocid="admin.gate"
      className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-20 text-center md:py-28"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="size-6" aria-hidden="true" />
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Owner access only
      </h1>
      <p className="max-w-md text-muted-foreground">
        These tools manage causes and the donation ledger. Sign in with the site
        owner&rsquo;s Internet Identity to continue.
      </p>
      <SignInButton className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-smooth hover:bg-primary/90 hover:shadow-elevated disabled:opacity-60" />
      <Link
        to="/"
        data-ocid="admin.back_link"
        className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
      >
        Back to causes
      </Link>
    </section>
  );
}

function CauseFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CauseView | null;
}) {
  const createCause = useCreateCause();
  const editCause = useEditCause();
  const [draft, setDraft] = useState<CauseDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  const editingKey = editing ? editing.id.toString() : "new";
  if (open && initializedFor !== editingKey) {
    setInitializedFor(editingKey);
    setDraft(editing ? draftFromCause(editing) : emptyDraft);
    setError(null);
  }

  const pending = createCause.isPending || editCause.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const goalCents = parseDollarsToCents(draft.goal);
    if (draft.title.trim() === "") {
      setError("Give the cause a title.");
      return;
    }
    if (goalCents === null) {
      setError("Enter a funding goal greater than zero.");
      return;
    }
    const input: CauseInput = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      imageRef: draft.imageRef.trim(),
      goalCents,
    };
    setError(null);
    if (editing) {
      editCause.mutate(
        { id: editing.id, input },
        {
          onSuccess: () => onOpenChange(false),
          onError: () => setError("Could not save the cause. Please retry."),
        },
      );
    } else {
      createCause.mutate(input, {
        onSuccess: () => onOpenChange(false),
        onError: () => setError("Could not create the cause. Please retry."),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="admin.cause_dialog" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {editing ? "Edit cause" : "New cause"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the cause details and funding goal."
              : "Draft a new cause. Publish it when it is ready to receive donations."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cause-title">Title</Label>
            <Input
              id="cause-title"
              data-ocid="admin.cause_title_input"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Nepal Earthquake Relief"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cause-description">Description</Label>
            <Textarea
              id="cause-description"
              data-ocid="admin.cause_description_input"
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="How the funds will help the community."
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cause-image">Image reference</Label>
              <Input
                id="cause-image"
                data-ocid="admin.cause_image_input"
                value={draft.imageRef}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    imageRef: event.target.value,
                  }))
                }
                placeholder="/assets/images/nepal.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cause-goal">Funding goal (USD)</Label>
              <Input
                id="cause-goal"
                data-ocid="admin.cause_goal_input"
                inputMode="decimal"
                value={draft.goal}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    goal: event.target.value,
                  }))
                }
                placeholder="250000"
                required
              />
            </div>
          </div>
          {error && (
            <p
              role="alert"
              data-ocid="admin.cause_form.error_state"
              className="text-sm font-medium text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="admin.cause_form.cancel_button"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="admin.cause_form.submit_button"
              disabled={pending}
              className="rounded-full"
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Create draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoalDialog({
  cause,
  onOpenChange,
}: {
  cause: CauseView | null;
  onOpenChange: (open: boolean) => void;
}) {
  const setGoalMutation = useSetCauseGoal();
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  const key = cause ? cause.id.toString() : "none";
  if (cause && initializedFor !== key) {
    setInitializedFor(key);
    setGoal((Number(cause.goalCents) / 100).toString());
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cause) return;
    const goalCents = parseDollarsToCents(goal);
    if (goalCents === null) {
      setError("Enter a funding goal greater than zero.");
      return;
    }
    setError(null);
    setGoalMutation.mutate(
      { id: cause.id, goalCents },
      {
        onSuccess: () => onOpenChange(false),
        onError: () => setError("Could not update the goal. Please retry."),
      },
    );
  }

  return (
    <Dialog open={!!cause} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="admin.goal_dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Set funding goal
          </DialogTitle>
          <DialogDescription>
            {cause ? cause.title : ""} — the target amount in US dollars.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-amount">Funding goal (USD)</Label>
            <Input
              id="goal-amount"
              data-ocid="admin.goal_input"
              inputMode="decimal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              required
            />
          </div>
          {error && (
            <p
              role="alert"
              data-ocid="admin.goal_form.error_state"
              className="text-sm font-medium text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="admin.goal_form.cancel_button"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="admin.goal_form.submit_button"
              disabled={setGoalMutation.isPending}
              className="rounded-full"
            >
              {setGoalMutation.isPending ? "Saving…" : "Save goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CauseRow({
  cause,
  index,
  selected,
  onSelect,
  onEdit,
  onSetGoal,
}: {
  cause: CauseView;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSetGoal: () => void;
}) {
  const publishCause = usePublishCause();
  const closeCause = useCloseCause();
  const busy = publishCause.isPending || closeCause.isPending;

  return (
    <Card
      data-ocid={`admin.cause_card.${index + 1}`}
      className={cn(
        "gap-4 rounded-xl border bg-card py-5 shadow-subtle transition-smooth",
        selected && "border-primary/60 ring-1 ring-primary/30",
      )}
    >
      <CardHeader className="gap-2 px-5">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="font-display text-lg leading-snug">
            {cause.title}
          </CardTitle>
          <StatusBadge status={cause.status} />
        </div>
        <CardDescription className="line-clamp-2">
          {cause.description || "No description yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <ProgressBar progressBps={cause.progressBps} />
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Raised</span>
          <span className="font-mono font-semibold text-foreground">
            {formatCents(cause.raisedCents)} / {formatCents(cause.goalCents)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={selected ? "default" : "outline"}
            size="sm"
            data-ocid={`admin.cause_ledger_button.${index + 1}`}
            onClick={onSelect}
            className="rounded-full"
          >
            <FileText className="size-4" aria-hidden="true" />
            {selected ? "Viewing ledger" : "View ledger"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid={`admin.cause_edit_button.${index + 1}`}
            onClick={onEdit}
            className="rounded-full"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid={`admin.cause_goal_button.${index + 1}`}
            onClick={onSetGoal}
            className="rounded-full"
          >
            <Target className="size-4" aria-hidden="true" />
            Set goal
          </Button>
          {cause.status !== CauseStatus.published && (
            <Button
              type="button"
              size="sm"
              data-ocid={`admin.cause_publish_button.${index + 1}`}
              disabled={busy}
              onClick={() => publishCause.mutate(cause.id)}
              className="rounded-full"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Publish
            </Button>
          )}
          {cause.status !== CauseStatus.closed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-ocid={`admin.cause_close_button.${index + 1}`}
              disabled={busy}
              onClick={() => closeCause.mutate(cause.id)}
              className="rounded-full text-destructive hover:text-destructive"
            >
              <XCircle className="size-4" aria-hidden="true" />
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LedgerPanel({ cause }: { cause: CauseView | null }) {
  const ledger = useDonationLedger(cause?.id);

  if (!cause) {
    return (
      <Card
        data-ocid="admin.ledger.empty_state"
        className="rounded-xl border bg-card shadow-subtle"
      >
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <p className="font-display text-lg font-semibold text-foreground">
            Select a cause
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Choose a cause to review its full donation ledger, including donor
            names, amounts, dates and receipt references.
          </p>
        </CardContent>
      </Card>
    );
  }

  const donations = ledger.data ?? [];
  const total = donations.reduce(
    (sum, donation) => sum + donation.amountCents,
    0n,
  );

  return (
    <Card
      data-ocid="admin.ledger.panel"
      className="rounded-xl border bg-card shadow-subtle"
    >
      <CardHeader className="gap-1 border-b border-border pb-5">
        <CardTitle className="font-display text-xl">Donation ledger</CardTitle>
        <CardDescription>
          {cause.title} — {donations.length}{" "}
          {donations.length === 1 ? "donation" : "donations"} totalling{" "}
          <span className="font-mono font-semibold text-foreground">
            {formatCents(total)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        {ledger.isLoading ? (
          <div
            data-ocid="admin.ledger.loading_state"
            className="space-y-3 px-6 py-6"
          >
            {Array.from({ length: 4 }, (_, i) => `ledger-skeleton-${i}`).map(
              (id) => (
                <Skeleton key={id} className="h-10 w-full" />
              ),
            )}
          </div>
        ) : ledger.isError ? (
          <div className="px-6 py-6">
            <Alert variant="destructive" data-ocid="admin.ledger.error_state">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertTitle>Could not load the ledger</AlertTitle>
              <AlertDescription>
                Please refresh the page and try again.
              </AlertDescription>
            </Alert>
          </div>
        ) : donations.length === 0 ? (
          <div
            data-ocid="admin.ledger.empty_state"
            className="flex flex-col items-center gap-2 px-6 py-12 text-center"
          >
            <p className="font-display text-base font-semibold text-foreground">
              No donations yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Completed donations for this cause will appear here.
            </p>
          </div>
        ) : (
          <Table data-ocid="admin.ledger.table">
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className="pl-6">Donor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="pr-6">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((donation, index) => (
                <TableRow
                  key={donation.id.toString()}
                  data-ocid={`admin.ledger.row.${index + 1}`}
                >
                  <TableCell className="pl-6 font-medium text-foreground">
                    {donation.donorName?.trim() || "Anonymous"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    {formatCents(donation.amountCents)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(donation.createdAt)}
                  </TableCell>
                  <TableCell className="pr-6 font-mono text-xs text-muted-foreground">
                    {donation.receiptRef}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function OwnerTools() {
  const causes = useAllCauses();
  const [selectedId, setSelectedId] = useState<CauseId | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CauseView | null>(null);
  const [goalCause, setGoalCause] = useState<CauseView | null>(null);

  const list = causes.data ?? [];
  const selected =
    list.find((cause) => cause.id === selectedId) ?? list[0] ?? null;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(cause: CauseView) {
    setEditing(cause);
    setFormOpen(true);
  }

  return (
    <section
      data-ocid="admin.page"
      className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16"
    >
      <header className="flex flex-col gap-4 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Owner tools
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Manage causes
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Create and publish relief causes, set funding goals, and review the
            full donation ledger for each cause.
          </p>
        </div>
        <Button
          type="button"
          data-ocid="admin.create_cause_button"
          onClick={openCreate}
          className="rounded-full"
        >
          <Plus className="size-4" aria-hidden="true" />
          New cause
        </Button>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            All causes
          </h2>
          {causes.isLoading ? (
            <div data-ocid="admin.causes.loading_state" className="space-y-4">
              {Array.from({ length: 3 }, (_, i) => `cause-skeleton-${i}`).map(
                (id) => (
                  <Skeleton key={id} className="h-48 w-full rounded-xl" />
                ),
              )}
            </div>
          ) : causes.isError ? (
            <Alert variant="destructive" data-ocid="admin.causes.error_state">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertTitle>Could not load causes</AlertTitle>
              <AlertDescription>
                Please refresh the page and try again.
              </AlertDescription>
            </Alert>
          ) : list.length === 0 ? (
            <Card
              data-ocid="admin.causes.empty_state"
              className="rounded-xl border bg-card shadow-subtle"
            >
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Plus className="size-5" aria-hidden="true" />
                </span>
                <p className="font-display text-lg font-semibold text-foreground">
                  No causes yet
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Create your first relief cause, then publish it to start
                  collecting donations.
                </p>
                <Button
                  type="button"
                  data-ocid="admin.empty_create_button"
                  onClick={openCreate}
                  className="rounded-full"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  New cause
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {list.map((cause, index) => (
                <CauseRow
                  key={cause.id.toString()}
                  cause={cause}
                  index={index}
                  selected={selected?.id === cause.id}
                  onSelect={() => setSelectedId(cause.id)}
                  onEdit={() => openEdit(cause)}
                  onSetGoal={() => setGoalCause(cause)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Donations
          </h2>
          <LedgerPanel cause={selected} />
        </div>
      </div>

      <CauseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />
      <GoalDialog
        cause={goalCause}
        onOpenChange={(open) => {
          if (!open) setGoalCause(null);
        }}
      />
    </section>
  );
}

/** Owner tools page: gated on the signed-in site owner. */
export default function AdminPage() {
  const { identity, isInitializing, isLoggingIn } = useInternetIdentity();
  const authenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();

  if (isInitializing || isLoggingIn) {
    return (
      <output
        data-ocid="admin.loading_state"
        className="mx-auto block max-w-6xl px-4 py-20 text-center text-muted-foreground md:px-6"
      >
        Checking your access…
      </output>
    );
  }

  if (!authenticated) {
    return <OwnerGate />;
  }

  if (adminLoading || isAdmin === undefined) {
    return (
      <output
        data-ocid="admin.loading_state"
        className="mx-auto block max-w-6xl px-4 py-20 text-center text-muted-foreground md:px-6"
      >
        Checking your access…
      </output>
    );
  }

  if (!isAdmin) {
    return <OwnerGate />;
  }

  return <OwnerTools />;
}
