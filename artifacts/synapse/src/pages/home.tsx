import { useMemo, useState } from "react";
import { useExtractIdeas } from "@workspace/api-client-react";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Copy,
  Lightbulb,
  LoaderCircle,
  Moon,
  Plus,
  RotateCcw,
  Sparkles,
  Timer,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Role = "technical" | "design" | "product" | "marketing" | "ops";
type Member = { name: string; role: Role };
type Idea = {
  id: string;
  description: string;
  domain: Role;
  source_snippet?: string;
  score: number;
  assigned_to: string | null;
};

const roles: { value: Role; label: string; short: string }[] = [
  { value: "technical", label: "Technical", short: "Tech" },
  { value: "design", label: "Design", short: "Design" },
  { value: "product", label: "Product", short: "Product" },
  { value: "marketing", label: "Marketing", short: "Marketing" },
  { value: "ops", label: "Operations", short: "Ops" },
];

const domainStyles: Record<
  Role,
  { label: string; className: string; dot: string }
> = {
  technical: {
    label: "Technical",
    className: "tag-technical",
    dot: "bg-[#577a75]",
  },
  design: { label: "Design", className: "tag-design", dot: "bg-[#c88970]" },
  product: { label: "Product", className: "tag-product", dot: "bg-[#b4a05d]" },
  marketing: {
    label: "Marketing",
    className: "tag-marketing",
    dot: "bg-[#9581a1]",
  },
  ops: { label: "Operations", className: "tag-ops", dot: "bg-[#7b9b70]" },
};

const EXAMPLES = [
  {
    label: "Emergency Sync (High Stress)",
    notes:
      "Alright team, emergency alignment. We have a massive schedule bottleneck. Jhon, lock in the master schedule today. Andrei, critical blocker: fix the code bugs crashing the login screen immediately! This is a prerequisite. Also generate staging access credentials for Dsadsa. Later tonight, deploy the core database.",
    team: [
      { name: "Andrei", role: "technical" },
      { name: "Jhon", role: "product" },
      { name: "Dsadsa", role: "design" },
    ] as Member[],
  },
  {
    label: "Creative Kickoff (Standard)",
    notes:
      "Let's align on the new landing page. Priya, we need the final product requirements by tomorrow. Dsadsa, once you have the requirements, please design the hero section mockups. Mami, start drafting the marketing copy for the headlines next week. Babe, update our ops wiki whenever you have a moment, no rush.",
    team: [
      { name: "Priya", role: "product" },
      { name: "Dsadsa", role: "design" },
      { name: "Mami", role: "marketing" },
      { name: "Babe", role: "ops" },
    ] as Member[],
  },
  {
    label: "Messy Brainstorm (Mixed)",
    notes:
      "We want the first-time experience to feel less like a form and more like an invitation. The engineering team can add a small keyboard shortcut for power users. Let's test the new review flow with three existing customers next Thursday. Marketing should frame this as making room for better thinking, not as another productivity tool.",
    team: [
      { name: "Elena", role: "technical" },
      { name: "Marcus", role: "marketing" },
    ] as Member[],
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getExtractionErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return "We couldn't shape this round. Your notes are still here.";
}

function getExtractionErrorDetails(error: unknown): {
  statusCode?: number;
  rawError?: string;
} {
  if (error && typeof error === "object") {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object") {
      const details = data as { statusCode?: unknown; rawError?: unknown };
      return {
        statusCode:
          typeof details.statusCode === "number"
            ? details.statusCode
            : undefined,
        rawError:
          typeof details.rawError === "string" ? details.rawError : undefined,
      };
    }
  }
  return {};
}

function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [docUrl, setDocUrl] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<Role>("product");
  const [notes, setNotes] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [risks, setRisks] = useState<{ issue: string; fix: string }[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isDark, setIsDark] = useState(false); // <--- State for dark mode
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);

  const loadSample = () => {
    const sample = EXAMPLES[sampleIndex];
    setNotes(sample.notes);
    setMembers(sample.team);
    setSampleIndex((prev) => (prev + 1) % EXAMPLES.length);
  };
  const extractIdeas = useExtractIdeas();

  const canGenerate = notes.trim().length > 0 || docUrl.trim().length > 0;
  const helperCopy = useMemo(() => {
    if (members.length === 0)
      return "Add the people who shaped this conversation.";
    if (members.length === 1)
      return "One voice in the room. Add more context if useful.";
    return `${members.length} voices ready to give the notes some shape.`;
  }, [members.length]);

  const addMember = () => {
    const name = memberName.trim();
    if (!name) return;
    setMembers((current) => [...current, { name, role: memberRole }]);
    setMemberName("");
  };

  const removeMember = (index: number) => {
    setMembers((current) =>
      current.filter((_, memberIndex) => memberIndex !== index),
    );
  };

  const generatePlan = () => {
    if (!canGenerate || extractIdeas.isPending) return;
    extractIdeas.mutate(
      {
        data: {
          notes: notes.trim(),
          team: members,
          docUrl: docUrl.trim() || undefined,
        } as any,
      },
      {
        onSuccess: (result) => {
          setIdeas(result.ideas);
          setRisks(result.risks);
        },
      },
    );
  };

  const resetWorkspace = () => {
    setNotes("");
    setIdeas([]);
    setRisks([]);
    setCompletedIds(new Set());
    setMembers([]);
    extractIdeas.reset();
  };
  const toggleIdea = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  return (
    <main className="synapse-app min-h-[100dvh] overflow-x-hidden">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3" data-testid="brand-synapse">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="font-display text-[18px] font-semibold tracking-[-0.04em] text-ink">
            synapse
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted sm:inline">
            private workspace
          </span>
          {/* BUTON DARK MODE */}
          <button
            className="quiet-icon-button"
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
          >
            <Moon
              size={17}
              strokeWidth={1.8}
              className={isDark ? "fill-ink" : ""}
            />
          </button>
          <button
            className="quiet-icon-button"
            type="button"
            aria-label="Help"
            data-testid="button-help"
            onClick={() => setIsHelpOpen(true)}
          >
            <CircleHelp size={17} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-10 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-20 lg:px-12 lg:pb-24 lg:pt-20">
        <div className="min-w-0">
          <div className="eyebrow reveal-in" style={{ animationDelay: "80ms" }}>
            <span className="eyebrow-line" />
            meeting room / 01
          </div>
          <div
            className="mt-6 max-w-[760px] reveal-in"
            style={{ animationDelay: "140ms" }}
          >
            <h1 className="font-display text-[clamp(3.5rem,8vw,7.5rem)] font-medium leading-[0.9] tracking-[-0.075em] text-ink">
              Make room
              <br />
              for the <em>good</em> ideas.
            </h1>
            <p className="mt-7 max-w-[470px] text-[15px] leading-7 text-ink-muted">
              Bring the unfiltered conversation. Synapse finds the threads worth
              carrying forward.
            </p>
          </div>

          <div
            className="mt-16 reveal-in lg:mt-24"
            style={{ animationDelay: "220ms" }}
          >
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="section-kicker">The raw material</div>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Paste notes, fragments, or the whole messy thing.
                </p>
              </div>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint sm:block">
                {notes.length
                  ? `${notes.length} characters`
                  : "private by default"}
              </span>
            </div>
            <div className={`notes-shell ${notes ? "notes-shell-active" : ""}`}>
              <input
                value={docUrl}
                onChange={(event) => setDocUrl(event.target.value)}
                placeholder="Or paste a Google Doc link instead"
                className="member-input mb-3 w-full"
                data-testid="input-doc-url"
                aria-label="Google Doc link"
              />
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What was said? What felt unfinished?"
                className="notes-input"
                data-testid="input-meeting-notes"
                aria-label="Meeting notes"
              />
              {!notes && (
                <button
                  type="button"
                  onClick={loadSample}
                  className="sample-notes-button"
                  data-testid="button-use-sample-notes"
                >
                  <Sparkles size={14} />
                  {sampleIndex === 0
                    ? "Try a sample meeting"
                    : "Try another sample"}
                </button>
              )}
              <div className="notes-footer">
                <span className="flex items-center gap-2 text-[11px] text-ink-faint">
                  <span className="pulse-dot" /> Your notes stay in this room
                </span>
                <button
                  type="button"
                  onClick={generatePlan}
                  disabled={!canGenerate || extractIdeas.isPending}
                  className="generate-button"
                  data-testid="button-generate-plan"
                >
                  {extractIdeas.isPending ? (
                    <>
                      <LoaderCircle size={15} className="animate-spin" />
                      Finding threads
                    </>
                  ) : (
                    <>
                      Generate plan <ArrowUpRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {extractIdeas.isPending && <LoadingState />}
          {extractIdeas.isError &&
            !extractIdeas.isPending &&
            (getExtractionErrorDetails(extractIdeas.error).statusCode ===
            429 ? (
              <CooldownScreen />
            ) : (
              <div className="error-state mt-8 reveal-in" role="alert">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    Gemini needs attention.
                  </p>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    {getExtractionErrorMessage(extractIdeas.error)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generatePlan}
                  className="retry-button"
                >
                  <RotateCcw size={14} /> Try again
                </button>
              </div>
            ))}
          {!extractIdeas.isPending &&
            !extractIdeas.isError &&
            ideas.length > 0 && (
              <IdeasResults
                ideas={ideas}
                risks={risks}
                onClear={resetWorkspace}
                completedIds={completedIds}
                onToggleIdea={toggleIdea}
              />
            )}
          {!extractIdeas.isPending &&
            !extractIdeas.isError &&
            ideas.length === 0 && (
              <div
                className="empty-plan mt-12 reveal-in"
                style={{ animationDelay: "320ms" }}
                data-testid="empty-plan-state"
              >
                <div className="empty-plan-icon">
                  <Lightbulb size={19} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-ink">
                    Your plan will land here.
                  </p>
                  <p className="mt-1 max-w-[355px] text-[13px] leading-5 text-ink-muted">
                    Once you generate, we'll separate the signal into a few
                    clear next moves.
                  </p>
                </div>
              </div>
            )}
        </div>

        <aside
          className="reveal-in lg:pt-[155px]"
          style={{ animationDelay: "280ms" }}
        >
          <div className="member-panel">
            <div className="flex items-start justify-between">
              <div>
                <div className="section-kicker flex items-center gap-2">
                  <Users size={14} strokeWidth={1.8} /> Who's in the room
                </div>
                <p className="mt-2 text-[13px] leading-5 text-ink-muted">
                  {helperCopy}
                </p>
              </div>
              <span className="member-count" data-testid="text-member-count">
                {String(members.length).padStart(2, "0")}
              </span>
            </div>

            {members.length > 0 && (
              <div className="mt-6 space-y-2" data-testid="member-list">
                {members.map((member, index) => (
                  <div
                    className="member-row"
                    key={`${member.name}-${index}`}
                    data-testid={`row-member-${index}`}
                  >
                    <div className="avatar">{getInitials(member.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink">
                        {member.name}
                      </div>
                      <div className="mt-0.5 text-[11px] capitalize text-ink-muted">
                        {member.role}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="remove-member"
                      onClick={() => removeMember(index)}
                      aria-label={`Remove ${member.name}`}
                      data-testid={`button-remove-member-${index}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-member-form">
              <div className="relative">
                <input
                  value={memberName}
                  onChange={(event) => setMemberName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addMember();
                  }}
                  placeholder="Name"
                  className="member-input"
                  data-testid="input-member-name"
                  aria-label="Member name"
                />
                <span className="input-hint">↵</span>
              </div>
              <div className="relative">
                <select
                  value={memberRole}
                  onChange={(event) =>
                    setMemberRole(event.target.value as Role)
                  }
                  className="member-input member-select"
                  data-testid="select-member-role"
                  aria-label="Member role"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  size={14}
                />
              </div>
              <button
                type="button"
                onClick={addMember}
                disabled={!memberName.trim()}
                className="add-member-button"
                data-testid="button-add-member"
              >
                <Plus size={16} /> Add to room
              </button>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 px-1 text-[11px] leading-5 text-ink-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d09b78]" />
            Roles help us sort the conversation, not box it in.
          </div>
        </aside>
      </section>

      <footer className="mx-auto flex w-full max-w-[1440px] items-center justify-between border-t border-line px-5 py-6 text-[11px] text-ink-faint sm:px-8 lg:px-12">
        <span>synapse / a quieter way forward</span>
        <span className="font-mono tracking-[0.12em]">v.02</span>
      </footer>
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4">
          <div className="bg-[#f5f1e8] dark:bg-[#131b1c] border border-[#ded8ca] dark:border-[#273839] p-7 rounded-2xl shadow-xl max-w-[500px] w-full relative reveal-in">
            <button
              onClick={() => setIsHelpOpen(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink transition-colors"
            >
              <X size={18} />
            </button>
            <h3 className="font-display text-[24px] text-ink mb-3">
              How Synapse Works
            </h3>
            <div className="text-[14px] text-ink-muted space-y-4">
              <p>
                <strong>The Scoring Engine:</strong> Synapse uses a
                deterministic mathematical model (Term Frequency) rather than
                relying on AI guessing. This ensures fast, consistent, and
                logical task prioritization based on urgency and dependencies.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-ink">Score 5-6 (Critical):</strong>{" "}
                  Tasks containing blockers, prerequisites, or urgent deadlines
                  (e.g., "today", "immediately", "blocker").
                </li>
                <li>
                  <strong className="text-ink">Score 3-4 (Standard):</strong>{" "}
                  Core tasks that need to be done soon but aren't bottlenecking
                  the pipeline.
                </li>
                <li>
                  <strong className="text-ink">Score 1-2 (Routine):</strong> Low
                  priority tasks marked with "whenever" or "later".
                </li>
              </ul>
              <p>
                <strong>Pro Tip:</strong> Add team members and their roles. The
                engine grants a <em>+1.5 Domain Match Bonus</em> if a task fits
                someone's expertise perfectly.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function LoadingState() {
  return (
    <div className="mt-12" data-testid="status-extraction-loading">
      <div className="mb-5 flex items-center gap-3">
        <div className="thinking-mark">
          <span />
          <span />
          <span />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-ink">
            Listening for the shape of it...
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">
            Sorting signals across the room
          </p>
        </div>
      </div>
      <div className="skeleton-stack">
        <div className="skeleton-line w-[88%]" />
        <div className="skeleton-line w-[66%]" />
        <div className="skeleton-line w-[78%]" />
      </div>
    </div>
  );
}

function CooldownScreen() {
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      className="cooldown-panel mt-12 reveal-in relative overflow-hidden"
      data-testid="status-cooldown"
    >
      {/* Animația satisfăcătoare pe fundal */}
      <div className="bouncing-ball" />

      <div className="relative z-10 flex flex-col items-center justify-center py-10 text-center">
        <Timer size={42} strokeWidth={1.2} className="text-[#c18f4e] mb-4" />
        <h3 className="font-display text-[26px] text-ink mb-2">
          Synapse is resting
        </h3>
        <p className="max-w-[340px] text-[14px] leading-6 text-ink-muted mb-6">
          To protect the system, you can only generate a few plans at a time.
          The room will reopen shortly.
        </p>
        <div className="font-mono text-[42px] font-semibold text-ink tracking-tight">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}

function IdeasResults({
  ideas,
  risks,
  onClear,
  completedIds,
  onToggleIdea,
}: {
  ideas: Idea[];
  risks: { issue: string; fix: string }[];
  onClear: () => void;
  completedIds: Set<string>;
  onToggleIdea: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    let md = `Synapse Plan\n\n`;
    ideas.forEach((idea, i) => {
      const status = completedIds.has(idea.id) ? "[x]" : "[ ]";
      md += `${i + 1}. ${status} [${idea.domain.toUpperCase()}] (Score: ${idea.score})\n`;
      md += `   ${idea.description}\n`;
      if (idea.assigned_to) md += `   Assigned to: ${idea.assigned_to}\n`;
      md += `\n`;
    });

    if (risks.length > 0) {
      md += `---\n⚠️ Arguer Flagged Risks:\n`;
      risks.forEach((r) => (md += `- ${r.issue}\n  Fix: ${r.fix}\n`));
    }

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <section className="mt-16" data-testid="section-extracted-plan">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> the clear part
          </div>
          <h2 className="mt-3 font-display text-[32px] tracking-[-0.055em] text-ink">
            A plan with a pulse.
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={copyToClipboard}
            className="clear-button !text-[#b38c4a] hover:!text-[#8a642c]"
          >
            {copied ? <CheckCheck size={14} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy Plan"}
          </button>

          <button
            type="button"
            onClick={onClear}
            className="clear-button"
            data-testid="button-clear-plan"
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>
      <div className="idea-list">
        {ideas.map((idea, index) => {
          const domain = domainStyles[idea.domain] ?? domainStyles.product;
          const isCompleted = completedIds.has(idea.id);

          return (
            <article
              className={`idea-card reveal-in transition-all duration-300 ${isCompleted ? "opacity-40 grayscale" : ""}`}
              style={{ animationDelay: `${index * 70}ms` }}
              key={idea.id}
              data-testid={`card-extracted-idea-${idea.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="idea-index">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`domain-tag ${domain.className}`}>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${domain.dot}`}
                      />
                      {domain.label}
                    </span>
                    <span
                      className={`plan-meta transition-all duration-300 ${
                        idea.score >= 5
                          ? "!bg-[#9b624e] !text-white !border-[#754638] font-bold shadow-sm"
                          : idea.score <= 2
                            ? "opacity-50 grayscale"
                            : ""
                      }`}
                    >
                      Score {idea.score}
                    </span>
                    <span
                      className={`plan-owner ${idea.assigned_to ? "" : "plan-owner-unassigned"}`}
                    >
                      {idea.assigned_to
                        ? `Assigned to ${idea.assigned_to}`
                        : "Unassigned"}
                    </span>
                  </div>
                  <p
                    className="max-w-[650px] text-[15px] font-medium leading-6 text-ink"
                    data-testid={`text-idea-description-${idea.id}`}
                  >
                    {idea.description}
                  </p>
                  {idea.source_snippet && (
                    <blockquote className="mt-4 border-l-2 border-[#dfb067] pl-3 text-[12px] italic leading-5 text-ink-muted">
                      “{idea.source_snippet}”
                    </blockquote>
                  )}
                </div>
                <button
                  type="button"
                  className={`idea-check transition-colors ${isCompleted ? "bg-ink text-white" : ""}`}
                  aria-label="Mark idea as complete"
                  data-testid={`button-complete-idea-${idea.id}`}
                  onClick={() => onToggleIdea(idea.id)}
                >
                  <Check size={14} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {risks.length > 0 && (
        <section
          className="arguer-panel reveal-in"
          data-testid="section-arguer-risks"
        >
          <div className="arguer-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" /> arguer flagged
              </div>
              <p className="mt-2 text-[13px] leading-5 text-ink-muted">
                A second pass found a few things worth pressure-testing.
              </p>
            </div>
            <span className="arguer-count">{risks.length}</span>
          </div>
          <ul className="arguer-list">
            {risks.map((risk, index) => (
              <li
                key={`${risk.issue}-${index}`}
                data-testid={`text-arguer-risk-${index}`}
              >
                <span className="arguer-bullet" />
                <span>
                  <strong>{risk.issue}</strong>
                  <span className="block mt-1 text-ink-muted">
                    → {risk.fix}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

export default Home;
