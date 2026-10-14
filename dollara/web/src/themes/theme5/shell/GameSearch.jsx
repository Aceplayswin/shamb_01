'use client';

// Theme5 universal game search — one box that searches the whole catalog
// (every category and provider) from any page.
//
// Two presentations of the same controller, chosen by breakpoint in CSS:
//   • md: and up — an inline field in the white header, with the results in a
//     dropdown under it. "/" or Ctrl/⌘+K focuses it from anywhere.
//   • below md — a search icon pinned at the start of the category bar that
//     opens a full-screen sheet. On a phone the on-screen keyboard takes half
//     the viewport, so a dropdown under a small header field would leave room
//     for two or three rows; the sheet gives the results the whole screen.
//
// Results come from the games endpoint's `search` (matches game name, slug and
// provider), debounced by useGameSearch. With an empty query the panel shows
// the player's recent searches and the popular games from the cached catalog,
// so opening it is never a blank box. "View all" hands the term to the games
// listing (/games/all?q=…), which runs the same search without the row cap.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Clock, Loader2, Play, Search, X } from 'lucide-react';
import { useGameSearch } from '@/hooks/useGameSearch';
import { loadGameCatalog } from '@/hooks/useGameCatalog';
import { filterFeatured, playPath, NAV_GAME_LINKS } from '@/lib/gameRoutes';

const RESULT_LIMIT = 20;
const POPULAR_LIMIT = 6;
const RECENT_KEY = 't5:recentGameSearches';
const RECENT_MAX = 5;

// Recent searches are a per-device convenience, so localStorage is enough —
// and every access is guarded, since it throws in some private modes.
function readRecent() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((s) => typeof s === 'string').slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(list) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable — recent searches just won't persist.
  }
}

function viewAllHref(term) {
  return `${NAV_GAME_LINKS.allGames}?q=${encodeURIComponent(term)}`;
}

// "live_casino" -> "live casino"; the admin-set display name wins when present.
function categoryLabel(game) {
  return game.category_name || game.category?.replace(/_/g, ' ') || '';
}

// State shared by both presentations: the query, its results, the popular
// fallback, recent searches and the keyboard-highlighted row.
//
// `open` gates the empty-state data: recent searches and the catalog are read
// when the panel opens, not on page load, so pages where nobody searches never
// fetch the catalog for it.
function useSearchController({ open, onCommit }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const term = query.trim();
  const { results, loading } = useGameSearch(term, { limit: RESULT_LIMIT, debounceMs: 250 });
  const [popular, setPopular] = useState([]);
  const [recent, setRecent] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!open) return undefined;
    setRecent(readRecent());
    let active = true;
    loadGameCatalog()
      .then((games) => {
        if (active) setPopular(filterFeatured(games, POPULAR_LIMIT));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open]);

  // The rows the arrow keys move through: live results while searching, the
  // popular games otherwise.
  const items = term ? results : popular;

  useEffect(() => {
    setActiveIndex(-1);
  }, [items]);

  const remember = useCallback((value) => {
    const next = [
      value,
      ...readRecent().filter((r) => r.toLowerCase() !== value.toLowerCase()),
    ].slice(0, RECENT_MAX);
    writeRecent(next);
    setRecent(next);
  }, []);

  const clearRecent = useCallback(() => {
    writeRecent([]);
    setRecent([]);
  }, []);

  // A game row was chosen. Rows are real links, so a click navigates on its
  // own; the keyboard path passes `navigate` to push the route itself.
  const pickGame = (game, { navigate = false } = {}) => {
    if (term) remember(term);
    setQuery('');
    onCommit?.();
    if (navigate) router.push(playPath(game));
  };

  const viewAll = ({ navigate = false } = {}) => {
    if (!term) return;
    remember(term);
    setQuery('');
    onCommit?.();
    if (navigate) router.push(viewAllHref(term));
  };

  // Enter: open the highlighted row, else the full results page. Nothing
  // happens when a finished search came back empty — the panel already says
  // so, and the listing would only repeat it.
  const submit = () => {
    if (activeIndex >= 0 && items[activeIndex]) {
      pickGame(items[activeIndex], { navigate: true });
    } else if (term && (loading || results.length > 0)) {
      viewAll({ navigate: true });
    }
  };

  const move = (delta) => {
    if (!items.length) return;
    setActiveIndex((i) => {
      if (i < 0) return delta > 0 ? 0 : items.length - 1;
      return (i + delta + items.length) % items.length;
    });
  };

  return {
    query,
    setQuery,
    term,
    results,
    loading,
    popular,
    recent,
    items,
    activeIndex,
    setActiveIndex,
    pickGame,
    viewAll,
    submit,
    move,
    clearRecent,
  };
}

// Arrow keys + Enter for either input. Enter goes through the form's submit so
// the phone keyboard's "Search" key takes the same path.
function handleNavKeys(e, ctl) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    ctl.move(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    ctl.move(-1);
  }
}

// Keep the keyboard-highlighted row visible inside the scrolling panel.
function useScrollActiveIntoView(listId, activeIndex) {
  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`${listId}-opt-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [listId, activeIndex]);
}

// Mark the matched part of a game or provider name.
function Highlight({ text, term }) {
  const at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-[#f5c518]/40 text-inherit">
        {text.slice(at, at + term.length)}
      </mark>
      {text.slice(at + term.length)}
    </>
  );
}

function ResultRow({ game, index, listId, ctl }) {
  const active = index === ctl.activeIndex;
  const meta = [game.provider_name, categoryLabel(game)].filter(Boolean).join(' · ');
  return (
    <li role="option" id={`${listId}-opt-${index}`} aria-selected={active}>
      <Link
        href={playPath(game)}
        tabIndex={-1}
        onClick={() => ctl.pickGame(game)}
        onMouseMove={() => {
          if (!active) ctl.setActiveIndex(index);
        }}
        className={`group flex min-h-[56px] items-center gap-3 px-3 py-2 transition-colors ${
          active ? 'bg-[#eef2ff]' : 'active:bg-[#f1f4f8]'
        }`}
      >
        <span className="relative grid h-[44px] w-[44px] shrink-0 place-items-center overflow-hidden rounded-lg bg-[#101c33]">
          {game.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={game.thumbnail_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Play className="h-4 w-4 text-white/40" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-black leading-tight text-[var(--t5-ink)]">
            <Highlight text={game.name ?? ''} term={ctl.term} />
          </span>
          {meta && (
            // The search also matches provider names, so mark the hit here too.
            <span className="mt-0.5 block truncate text-[12px] capitalize leading-tight text-[var(--t5-muted)]">
              <Highlight text={meta} term={ctl.term} />
            </span>
          )}
        </span>
        <span
          className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full transition-colors ${
            active ? 'bg-[var(--t5-blue)] text-white' : 'bg-[#f1f4f8] text-[var(--t5-muted)]'
          }`}
          aria-hidden
        >
          <Play className="h-3.5 w-3.5 fill-current" />
        </span>
      </Link>
    </li>
  );
}

function SectionLabel({ children, action }) {
  return (
    <div className="flex items-center justify-between px-3 pb-1.5 pt-3">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--t5-muted)]">
        {children}
      </span>
      {action}
    </div>
  );
}

// The panel body — identical in the desktop dropdown and the phone sheet.
function SearchResults({ ctl, listId, onPickRecent }) {
  const { term, results, loading, popular, recent } = ctl;

  if (!term) {
    return (
      <div className="pb-2">
        {recent.length > 0 && (
          <>
            <SectionLabel
              action={
                <button
                  type="button"
                  onClick={ctl.clearRecent}
                  className="rounded px-1.5 py-1 text-[11px] font-bold text-[var(--t5-blue)] hover:underline"
                >
                  Clear
                </button>
              }
            >
              Recent searches
            </SectionLabel>
            <div className="flex flex-wrap gap-2 px-3 pb-1">
              {recent.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onPickRecent(r)}
                  className="inline-flex min-h-[34px] max-w-full items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-[13px] font-bold text-[var(--t5-ink)] transition hover:border-[var(--t5-blue)] hover:text-[var(--t5-blue)]"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--t5-muted)]" />
                  <span className="truncate">{r}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {popular.length > 0 ? (
          <>
            <SectionLabel>🔥 Popular games</SectionLabel>
            <ul id={listId} role="listbox" aria-label="Popular games">
              {popular.map((game, i) => (
                <ResultRow key={game.id} game={game} index={i} listId={listId} ctl={ctl} />
              ))}
            </ul>
          </>
        ) : (
          recent.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-[var(--t5-muted)]">
              Search every game and provider — slots, live casino, sports and more.
            </p>
          )
        )}
      </div>
    );
  }

  // First response for this term not back yet, and nothing earlier to show.
  if (loading && results.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-8 text-[13px] text-[var(--t5-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Searching…
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[14px] font-black text-[var(--t5-ink)]">
          No games match “{term}”
        </p>
        <p className="mt-1 text-[12px] text-[var(--t5-muted)]">
          Try a shorter word, or search by provider name.
        </p>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel>Games</SectionLabel>
      <ul id={listId} role="listbox" aria-label={`Games matching ${term}`}>
        {results.map((game, i) => (
          <ResultRow key={game.id} game={game} index={i} listId={listId} ctl={ctl} />
        ))}
      </ul>
      <Link
        href={viewAllHref(term)}
        onClick={() => ctl.viewAll()}
        className="sticky bottom-0 flex min-h-[48px] items-center justify-center gap-1 border-t border-black/[0.06] bg-white px-3 text-[12px] font-black uppercase tracking-wide text-[var(--t5-blue)] transition hover:bg-[#f5f7ff]"
      >
        <span className="truncate">View all results for “{term}”</span>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </Link>
    </div>
  );
}

// Left icon of both inputs: a spinner while a search is in flight.
function SearchIcon({ loading, className }) {
  const Icon = loading ? Loader2 : Search;
  return <Icon className={`${className} ${loading ? 'animate-spin' : ''}`} aria-hidden />;
}

// md: and up — inline header field with a dropdown.
export function Theme5SearchBar() {
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    inputRef.current?.blur();
  }, []);
  const ctl = useSearchController({ open, onCommit: close });

  useScrollActiveIntoView(listId, ctl.activeIndex);

  // A navigation (including the back button) always closes the dropdown.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // "/" (when not already typing somewhere) and Ctrl/⌘+K jump to search.
  // Skipped while the field is hidden below md, where the sheet owns search.
  useEffect(() => {
    const onKeyDown = (e) => {
      const el = e.target;
      const typing =
        el instanceof HTMLElement &&
        (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      const slash = e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey;
      const cmdK = (e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 'k';
      const input = inputRef.current;
      if ((!slash && !cmdK) || !input || input.offsetParent === null) return;
      e.preventDefault();
      input.focus();
      input.select();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const expanded = open && focused;

  return (
    <div
      ref={rootRef}
      role="search"
      className="relative hidden w-full max-w-[460px] md:block"
      onBlur={(e) => {
        // Close once focus leaves the whole widget (Tab away, click outside).
        if (!rootRef.current?.contains(e.relatedTarget)) {
          setFocused(false);
          setOpen(false);
        }
      }}
    >
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          ctl.submit();
        }}
      >
        <SearchIcon
          loading={ctl.loading}
          className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[var(--t5-muted)]"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search games"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={ctl.activeIndex >= 0 ? `${listId}-opt-${ctl.activeIndex}` : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="Search games or providers"
          value={ctl.query}
          onChange={(e) => {
            ctl.setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
              return;
            }
            setOpen(true);
            handleNavKeys(e, ctl);
          }}
          className="h-[40px] w-full rounded-full border border-black/10 bg-[#f1f4f8] pl-10 pr-10 text-[14px] font-semibold text-[var(--t5-ink)] placeholder-[#94a3b8] outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-2 focus:ring-[#1d4ed8]/15"
        />
        {ctl.query ? (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              ctl.setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 grid h-[26px] w-[26px] -translate-y-1/2 place-items-center rounded-full text-[var(--t5-muted)] transition hover:bg-black/5 hover:text-[var(--t5-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          !focused && (
            <kbd
              className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-black/15 bg-white px-1.5 font-sans text-[11px] font-bold leading-[18px] text-[var(--t5-muted)] lg:block"
              title="Press / to search"
            >
              /
            </kbd>
          )
        )}
      </form>

      {expanded && (
        // mousedown is cancelled inside the panel so the input keeps focus:
        // otherwise its blur would close the panel before a row's click lands.
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 top-full z-50 mt-2 max-h-[min(70vh,560px)] w-full min-w-[360px] overflow-y-auto overscroll-contain rounded-xl border border-black/[0.08] bg-white shadow-[0_18px_50px_-12px_rgba(16,28,51,0.35)]"
        >
          <SearchResults ctl={ctl} listId={listId} onPickRecent={(r) => ctl.setQuery(r)} />
        </div>
      )}
    </div>
  );
}

// Below md — the full-screen sheet the header's search icon opens.
function SearchSheet({ onClose }) {
  const listId = useId();
  const inputRef = useRef(null);
  const ctl = useSearchController({ open: true, onCommit: onClose });

  useScrollActiveIntoView(listId, ctl.activeIndex);

  // The sheet covers the page, so the page underneath must not scroll with it.
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    // Portalled to <body>, so it re-applies `theme5-root` for the palette.
    // z-[90]: over the header and the floating WhatsApp button, under the
    // z-[100] auth modals.
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search games"
      className="theme5-root fixed inset-0 z-[90] flex flex-col"
    >
      <div className="shrink-0 bg-white pt-[env(safe-area-inset-top)] shadow-sm">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            ctl.submit();
          }}
          className="flex items-center gap-1 px-2 py-2"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full text-[var(--t5-ink)] transition active:bg-black/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              loading={ctl.loading}
              className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--t5-muted)]"
            />
            {/* 16px text: iOS Safari zooms the page into any smaller input. */}
            <input
              ref={inputRef}
              // Mounted by the tap that opened the sheet, so the focus happens
              // inside that gesture and iOS raises the keyboard.
              autoFocus
              type="text"
              role="combobox"
              aria-label="Search games"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={ctl.activeIndex >= 0 ? `${listId}-opt-${ctl.activeIndex}` : undefined}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="search"
              enterKeyHint="search"
              placeholder="Search games or providers"
              value={ctl.query}
              onChange={(e) => ctl.setQuery(e.target.value)}
              onKeyDown={(e) => handleNavKeys(e, ctl)}
              className="h-[44px] w-full rounded-full border border-black/10 bg-[#f1f4f8] pl-10 pr-11 text-[16px] font-semibold text-[var(--t5-ink)] placeholder-[#94a3b8] outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-2 focus:ring-[#1d4ed8]/15"
            />
            {ctl.query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  ctl.setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-1 top-1/2 grid h-[38px] w-[38px] -translate-y-1/2 place-items-center rounded-full text-[var(--t5-muted)] active:bg-black/5"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white pb-[env(safe-area-inset-bottom)]">
        <SearchResults ctl={ctl} listId={listId} onPickRecent={(r) => ctl.setQuery(r)} />
      </div>
    </div>
  );
}

// Below md — the icon that opens the sheet. Styled by the caller, since it
// sits in whichever strip has room for it.
export function Theme5SearchButton({ className }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search games"
        aria-haspopup="dialog"
        className={className}
      >
        <Search className="h-[18px] w-[18px]" />
      </button>
      {open && createPortal(<SearchSheet onClose={close} />, document.body)}
    </>
  );
}
