import { useMemo, useState } from 'react';
import { useExtractIdeas } from '@workspace/api-client-react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Lightbulb,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';

type Role = 'technical' | 'design' | 'product' | 'marketing' | 'ops';
type Member = { name: string; role: Role };
type Idea = { id: string; description: string; domain: Role; source_snippet?: string };

const roles: { value: Role; label: string; short: string }[] = [
  { value: 'technical', label: 'Technical', short: 'Tech' },
  { value: 'design', label: 'Design', short: 'Design' },
  { value: 'product', label: 'Product', short: 'Product' },
  { value: 'marketing', label: 'Marketing', short: 'Marketing' },
  { value: 'ops', label: 'Operations', short: 'Ops' },
];

const domainStyles: Record<Role, { label: string; className: string; dot: string }> = {
  technical: { label: 'Technical', className: 'tag-technical', dot: 'bg-[#577a75]' },
  design: { label: 'Design', className: 'tag-design', dot: 'bg-[#c88970]' },
  product: { label: 'Product', className: 'tag-product', dot: 'bg-[#b4a05d]' },
  marketing: { label: 'Marketing', className: 'tag-marketing', dot: 'bg-[#9581a1]' },
  ops: { label: 'Operations', className: 'tag-ops', dot: 'bg-[#7b9b70]' },
};

const starterNotes =
  "We want the first-time experience to feel less like a form and more like an invitation. Priya thinks we should keep the welcome quiet and let the first useful action lead. The engineering team can add a small keyboard shortcut for people who live in this space. Let's test the new review flow with three existing customers next Thursday. Marketing should frame this as making room for better thinking, not as another productivity tool.";

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getExtractionErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return "We couldn't shape this round. Your notes are still here.";
}

function getExtractionErrorDetails(error: unknown): { statusCode?: number; rawError?: string } {
  if (error && typeof error === 'object') {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object') {
      const details = data as { statusCode?: unknown; rawError?: unknown };
      return {
        statusCode: typeof details.statusCode === 'number' ? details.statusCode : undefined,
        rawError: typeof details.rawError === 'string' ? details.rawError : undefined,
      };
    }
  }
  return {};
}

function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<Role>('product');
  const [notes, setNotes] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const extractIdeas = useExtractIdeas();

  const canGenerate = notes.trim().length > 0;
  const helperCopy = useMemo(() => {
    if (members.length === 0) return 'Add the people who shaped this conversation.';
    if (members.length === 1) return 'One voice in the room. Add more context if useful.';
    return `${members.length} voices ready to give the notes some shape.`;
  }, [members.length]);

  const addMember = () => {
    const name = memberName.trim();
    if (!name) return;
    setMembers((current) => [...current, { name, role: memberRole }]);
    setMemberName('');
  };

  const removeMember = (index: number) => {
    setMembers((current) => current.filter((_, memberIndex) => memberIndex !== index));
  };

  const generatePlan = () => {
    if (!canGenerate || extractIdeas.isPending) return;
    extractIdeas.mutate(
      { data: { notes: notes.trim(), team: members } },
      {
        onSuccess: (result) => {
          setIdeas(result.ideas as Idea[]);
        },
      },
    );
  };

  const resetWorkspace = () => {
    setNotes('');
    setIdeas([]);
    extractIdeas.reset();
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
          <span className="font-display text-[18px] font-semibold tracking-[-0.04em] text-ink">synapse</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted sm:inline">
            private workspace
          </span>
          <button className="quiet-icon-button" type="button" aria-label="Help" data-testid="button-help">
            <CircleHelp size={17} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-10 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-20 lg:px-12 lg:pb-24 lg:pt-20">
        <div className="min-w-0">
          <div className="eyebrow reveal-in" style={{ animationDelay: '80ms' }}>
            <span className="eyebrow-line" />
            meeting room / 01
          </div>
          <div className="mt-6 max-w-[760px] reveal-in" style={{ animationDelay: '140ms' }}>
            <h1 className="font-display text-[clamp(3.5rem,8vw,7.5rem)] font-medium leading-[0.9] tracking-[-0.075em] text-ink">
              Make room
              <br />
              for the <em>good</em> ideas.
            </h1>
            <p className="mt-7 max-w-[470px] text-[15px] leading-7 text-ink-muted">
              Bring the unfiltered conversation. Synapse finds the threads worth carrying forward.
            </p>
          </div>

          <div className="mt-16 reveal-in lg:mt-24" style={{ animationDelay: '220ms' }}>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="section-kicker">The raw material</div>
                <p className="mt-1 text-[13px] text-ink-muted">Paste notes, fragments, or the whole messy thing.</p>
              </div>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint sm:block">
                {notes.length ? `${notes.length} characters` : 'private by default'}
              </span>
            </div>
            <div className={`notes-shell ${notes ? 'notes-shell-active' : ''}`}>
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
                  onClick={() => setNotes(starterNotes)}
                  className="sample-notes-button"
                  data-testid="button-use-sample-notes"
                >
                  <Sparkles size={14} />
                  Try a sample meeting
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
          {extractIdeas.isError && !extractIdeas.isPending && (
            <div className="error-state mt-8" role="alert" data-testid="status-extraction-error">
              <div className="min-w-0">
                <p className="font-semibold text-ink">Gemini needs attention.</p>
                {(() => {
                  const details = getExtractionErrorDetails(extractIdeas.error);
                  return (
                    <>
                      <p className="mt-1 max-w-[620px] text-[13px] leading-5 text-ink-muted">
                        {details.statusCode
                          ? `Gemini returned HTTP ${details.statusCode}.`
                          : getExtractionErrorMessage(extractIdeas.error)}
                      </p>
                      {details.rawError && (
                        <pre className="mt-3 max-h-40 max-w-[680px] overflow-auto whitespace-pre-wrap rounded-md border border-line bg-white/50 p-3 font-mono text-[11px] leading-5 text-ink-muted">
                          {details.rawError}
                        </pre>
                      )}
                    </>
                  );
                })()}
              </div>
              <button type="button" onClick={generatePlan} className="retry-button" data-testid="button-retry-extraction">
                <RotateCcw size={14} /> Try again
              </button>
            </div>
          )}
          {!extractIdeas.isPending && !extractIdeas.isError && ideas.length > 0 && (
            <IdeasResults ideas={ideas} onClear={resetWorkspace} />
          )}
          {!extractIdeas.isPending && !extractIdeas.isError && ideas.length === 0 && (
            <div className="empty-plan mt-12 reveal-in" style={{ animationDelay: '320ms' }} data-testid="empty-plan-state">
              <div className="empty-plan-icon">
                <Lightbulb size={19} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-ink">Your plan will land here.</p>
                <p className="mt-1 max-w-[355px] text-[13px] leading-5 text-ink-muted">
                  Once you generate, we'll separate the signal into a few clear next moves.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="reveal-in lg:pt-[155px]" style={{ animationDelay: '280ms' }}>
          <div className="member-panel">
            <div className="flex items-start justify-between">
              <div>
                <div className="section-kicker flex items-center gap-2">
                  <Users size={14} strokeWidth={1.8} /> Who's in the room
                </div>
                <p className="mt-2 text-[13px] leading-5 text-ink-muted">{helperCopy}</p>
              </div>
              <span className="member-count" data-testid="text-member-count">{String(members.length).padStart(2, '0')}</span>
            </div>

            {members.length > 0 && (
              <div className="mt-6 space-y-2" data-testid="member-list">
                {members.map((member, index) => (
                  <div className="member-row" key={`${member.name}-${index}`} data-testid={`row-member-${index}`}>
                    <div className="avatar">{getInitials(member.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink">{member.name}</div>
                      <div className="mt-0.5 text-[11px] capitalize text-ink-muted">{member.role}</div>
                    </div>
                    <button type="button" className="remove-member" onClick={() => removeMember(index)} aria-label={`Remove ${member.name}`} data-testid={`button-remove-member-${index}`}>
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
                    if (event.key === 'Enter') addMember();
                  }}
                  placeholder="Name"
                  className="member-input"
                  data-testid="input-member-name"
                  aria-label="Member name"
                />
                <span className="input-hint">↵</span>
              </div>
              <div className="relative">
                <select value={memberRole} onChange={(event) => setMemberRole(event.target.value as Role)} className="member-input member-select" data-testid="select-member-role" aria-label="Member role">
                  {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" size={14} />
              </div>
              <button type="button" onClick={addMember} disabled={!memberName.trim()} className="add-member-button" data-testid="button-add-member">
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
        <span className="font-mono tracking-[0.12em]">v.01</span>
      </footer>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="mt-12" data-testid="status-extraction-loading">
      <div className="mb-5 flex items-center gap-3">
        <div className="thinking-mark"><span /><span /><span /></div>
        <div>
          <p className="text-[14px] font-semibold text-ink">Listening for the shape of it...</p>
          <p className="mt-1 text-[12px] text-ink-muted">Sorting signals across the room</p>
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

function IdeasResults({ ideas, onClear }: { ideas: Idea[]; onClear: () => void }) {
  return (
    <section className="mt-16" data-testid="section-extracted-plan">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> the clear part</div>
          <h2 className="mt-3 font-display text-[32px] tracking-[-0.055em] text-ink">A plan with a pulse.</h2>
        </div>
        <button type="button" onClick={onClear} className="clear-button" data-testid="button-clear-plan">
          <Trash2 size={13} /> Clear
        </button>
      </div>
      <div className="idea-list">
        {ideas.map((idea, index) => {
          const domain = domainStyles[idea.domain] ?? domainStyles.product;
          return (
            <article className="idea-card reveal-in" style={{ animationDelay: `${index * 70}ms` }} key={idea.id} data-testid={`card-extracted-idea-${idea.id}`}>
              <div className="flex items-start gap-4">
                <div className="idea-index">{String(index + 1).padStart(2, '0')}</div>
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`domain-tag ${domain.className}`}><span className={`h-1.5 w-1.5 rounded-full ${domain.dot}`} />{domain.label}</span>
                  </div>
                  <p className="max-w-[650px] text-[15px] font-medium leading-6 text-ink" data-testid={`text-idea-description-${idea.id}`}>{idea.description}</p>
                  {idea.source_snippet && (
                    <blockquote className="mt-4 border-l-2 border-[#dfb067] pl-3 text-[12px] italic leading-5 text-ink-muted">
                      “{idea.source_snippet}”
                    </blockquote>
                  )}
                </div>
                <button type="button" className="idea-check" aria-label="Mark idea as complete" data-testid={`button-complete-idea-${idea.id}`}><Check size={14} /></button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default Home;