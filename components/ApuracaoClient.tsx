"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ApuracaoBadge } from "./ApuracaoButton";
import { MunicipalMap } from "./MunicipalMap";
import { PartyBadge } from "./PartyBadge";
import { OFFICES, OFFICES_ORDER, type OfficeId } from "@/lib/offices";
import { assetUrl } from "@/lib/asset-url";
import { STATES, UF_MAP, formatPercent, formatVotes } from "@/lib/states";
import { RUNOFF_UFS, SEGUNDO_TURNO } from "@/lib/segundo-turno";
import {
  briefComplete,
  briefFromTally,
  MISSING_BRIEF,
  parseMunConfig,
  type MunBrief,
  type Municipio,
} from "@/lib/municipios";
import {
  andamentoLabel,
  isProportional,
  MUN_CONFIG_URL,
  municipalityResultUrl,
  parseResult,
  resultUrl,
  tallyComplete,
  winnerFill,
  type CandidateTally,
  type PartyTally,
  type Tally,
} from "@/lib/apuracao";

const TSE_PAGE: Record<OfficeId, string> = {
  presidente: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6257/uf/br/cargo/1/vis/nominal/resultados",
  governador: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6259/uf/br/cargo/3/vis/nominal/resultados",
  senador: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6259/uf/br/cargo/5/vis/nominal/resultados",
  deputado_federal: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6259/uf/br/cargo/6/vis/nominal/resultados",
  deputado_estadual: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6259/uf/br/cargo/7/vis/nominal/resultados",
};

const OFFICE_SHORT: Record<OfficeId, string> = {
  presidente: "Presidente",
  governador: "Governador",
  senador: "Senadores",
  deputado_federal: "Dep. Federal",
  deputado_estadual: "Dep. Estadual",
};

function placeName(uf: string, office: OfficeId) {
  if (uf === "BR") return "Brasil";
  const state = UF_MAP[uf];
  if (office === "deputado_estadual" && uf === "DF") return "Distrito Federal";
  return state?.name ?? uf;
}

function officeHeading(office: OfficeId, uf: string) {
  if (office === "deputado_estadual" && uf === "DF") return "Deputado distrital";
  return OFFICES[office].label;
}

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function reducedMotionSubscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function reducedMotionServer() {
  return false;
}

type ReelFrame = { place: string; from: string; to: string; gen: number };

/** Digits travel upward only, passing each number in between, like a meter wheel. */
function upwardGlyphs(from: string, to: string) {
  if (from === to) return [to];
  if (from >= "0" && from <= "9" && to >= "0" && to <= "9") {
    const start = Number(from);
    const turns = (Number(to) - start + 10) % 10;
    return Array.from({ length: turns + 1 }, (_, index) => String((start + index) % 10));
  }
  return [from, to];
}

function reelKind(chars: string[]) {
  const visible = chars.filter((char) => char !== "\0");
  if (visible.length === 0 || visible.every((char) => char >= "0" && char <= "9")) return "digit";
  if (visible.every((char) => char === "." || char === ",")) return "sep";
  if (visible.every((char) => char === "%")) return "mark";
  return "other";
}

function RollingText({ value, place }: { value: string; place: string }) {
  const reduce = useSyncExternalStore(reducedMotionSubscribe, reducedMotionSnapshot, reducedMotionServer);
  const [frame, setFrame] = useState<ReelFrame>({ place, from: value, to: value, gen: 0 });
  if (reduce) {
    if (frame.place !== place || frame.from !== value || frame.to !== value) {
      setFrame({ place, from: value, to: value, gen: frame.gen });
    }
  } else if (frame.place !== place) {
    setFrame({ place, from: value, to: value, gen: frame.gen + 1 });
  } else if (frame.to !== value) {
    setFrame({ place, from: frame.to, to: value, gen: frame.gen + 1 });
  }

  const width = Math.max(frame.from.length, frame.to.length);
  const fromChars = frame.from.padStart(width, "\0").split("");
  const toChars = frame.to.padStart(width, "\0").split("");
  const sequences = fromChars.map((char, index) => upwardGlyphs(char, toChars[index]));
  const maxSteps = sequences.reduce((max, seq) => Math.max(max, seq.length - 1), 0);
  const duration = Math.min(0.9, 0.42 + Math.max(0, maxSteps - 1) * 0.07);

  return (
    <span className="inline-flex items-end whitespace-nowrap align-bottom tabular-nums">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-flex">
        {sequences.map((seq, index) => {
          const steps = seq.length - 1;
          return (
            <span key={width - index} className="vote-reel" data-kind={reelKind(seq)}>
              {steps > 0 ? (
                <span
                  key={frame.gen}
                  className="vote-reel-strip"
                  style={{ animationDuration: `${duration}s`, ["--reel-steps" as string]: String(steps) }}
                  onAnimationEnd={(event) => {
                    if (event.target !== event.currentTarget || steps !== maxSteps) return;
                    setFrame((current) => (current.gen !== frame.gen || current.from === current.to ? current : { ...current, from: current.to }));
                  }}
                >
                  {seq.map((char, step) => (
                    <span key={step} className="vote-reel-cell">{char === "\0" ? "" : char}</span>
                  ))}
                </span>
              ) : (
                <span className="vote-reel-cell">{seq[0] === "\0" ? "" : seq[0]}</span>
              )}
            </span>
          );
        })}
      </span>
    </span>
  );
}

const PLACEHOLDER = "/candidates/senators/placeholder.svg";

const CURATED_PHOTOS: Record<string, string> = {
  "280002551544": "/candidates/flavio-bolsonaro.jpg",
  "280002542548": "/candidates/lula.jpg",
  "280002540694": "/candidates/renan-santos.jpg",
  "280002551547": "/candidates/augusto-cury.jpg",
  "280002551932": "/candidates/ronaldo-caiado.jpg",
  "280002539826": "/candidates/zema.jpg",
};

type ResultRow = CandidateTally | PartyTally;

function rowSq(row: ResultRow) {
  return "sq" in row ? row.sq : "";
}

function rowSituacao(row: ResultRow) {
  return "situacao" in row ? row.situacao : "";
}

/** TSE fills cand.st on state races. For a finished majoritarian count it can still be blank, as with presidente. */
function displayedSituacao(row: ResultRow, rows: ResultRow[], sectionsPct: number, proportional: boolean) {
  const own = rowSituacao(row);
  if (own || proportional || sectionsPct < 99.9) return own;
  const people = rows.filter((item): item is CandidateTally => "sq" in item && item.sq !== "");
  if (people.length < 2 || people.some((item) => item.situacao)) return "";
  const [first, second] = people;
  if (first.pct > 50) return row === first ? "Eleito" : "Não eleito";
  if (row === first || row === second) return "2º turno";
  return "Não eleito";
}

function tsePhoto(office: OfficeId, uf: string, sq: string) {
  const ele = office === "presidente" ? "6257" : "6259";
  const code = office === "presidente" ? "br" : uf.toLowerCase();
  return `https://resultados.tse.jus.br/oficial/ele2026/${ele}/fotos/${code}/${sq}.jpeg`;
}

function photoSources(sq: string, office: OfficeId, uf: string) {
  if (!sq) return [PLACEHOLDER];
  const remote = tsePhoto(office, uf, sq);
  const curated = CURATED_PHOTOS[sq];
  if (curated) return [curated, remote, PLACEHOLDER];
  return [`/candidate-photos/${sq}.jpg`, `/candidate-photos/${sq}.png`, remote, PLACEHOLDER];
}

function situacaoTone(situacao: string) {
  if (situacao.startsWith("Eleito")) return "bg-emerald-700 text-white";
  if (situacao.includes("turno")) return "bg-amber-600 text-white";
  if (situacao === "Suplente") return "bg-sky-800 text-white";
  return "bg-neutral-500 text-white";
}

function Portrait({ sources, className }: { sources: string[]; className?: string }) {
  const list = sources.length > 0 ? sources : [PLACEHOLDER];
  const [step, setStep] = useState(0);
  const chosen = list[Math.min(step, list.length - 1)];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={chosen.startsWith("https://") ? chosen : assetUrl(chosen)}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setStep((current) => (current >= list.length - 1 ? current : current + 1))}
      className={className ?? "h-12 w-12 shrink-0 rounded-full object-cover object-top ring-2 ring-white shadow-sm"}
    />
  );
}

function SituacaoBadge({ situacao }: { situacao: string }) {
  if (!situacao) return null;
  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${situacaoTone(situacao)}`}>
      {situacao}
    </span>
  );
}

function TurnoDrawer({ round, onChange }: { round: 1 | 2; onChange: (round: 1 | 2) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(next: 1 | 2) {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      {open ? (
        <button type="button" aria-label="Fechar menu de turnos" className="fixed inset-0 z-30 bg-black/20" onClick={() => setOpen(false)} />
      ) : null}
      <div className={`fixed left-0 top-1/2 z-40 -translate-y-1/2 overflow-hidden rounded-r-2xl border border-l-0 border-neutral-200 bg-white shadow-xl transition-[width] duration-300 ease-out ${open ? "w-64" : "w-10"}`}>
        <div className={`flex w-64 items-stretch transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-[calc(100%-2.5rem)]"}`}>
        <div inert={!open} className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-3 pl-3 pr-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Turno</p>
          {([1, 2] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={round === item}
              onClick={() => choose(item)}
              className={`rounded-full px-3 py-2 text-left text-sm font-semibold ${round === item ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"}`}
            >
              {item}º Turno
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Fechar menu de turnos" : "Abrir menu de turnos"}
          onClick={() => setOpen((current) => !current)}
          className="flex w-10 shrink-0 items-center justify-center border-l border-neutral-200 text-neutral-950"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d={open ? "M14.5 6 8.5 12l6 6" : "M9.5 6 15.5 12l-6 6"} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        </div>
      </div>
    </>
  );
}

function SecondRoundPanel({ focus, onFocus }: { focus: string; onFocus: (uf: string) => void }) {
  const contests = focus === "ALL" ? SEGUNDO_TURNO : SEGUNDO_TURNO.filter((contest) => contest.uf === focus);
  const shown = contests.length > 0 ? contests : SEGUNDO_TURNO;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-3 sm:p-4 lg:sticky lg:top-24">
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">25 de outubro de 2026</p>
        <h2 className="text-base font-semibold text-neutral-950">2º turno</h2>
        <p className="text-xs text-neutral-500">Presidente e os estados que voltam às urnas. O TSE ainda não liberou a apuração do segundo turno.</p>
      </div>
      <label className="mb-3 block">
        <span className="sr-only">Disputa do segundo turno</span>
        <select value={focus} onChange={(event) => onFocus(event.target.value)} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-950 outline-none focus:border-neutral-400">
          <option value="ALL">Todos os segundos turnos</option>
          {SEGUNDO_TURNO.map((contest) => (
            <option key={contest.uf} value={contest.uf}>{contest.place} — {contest.office}</option>
          ))}
        </select>
      </label>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {shown.map((contest) => (
          <section key={contest.uf}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{contest.place}</p>
            <h3 className="mb-2 text-sm font-semibold text-neutral-950">{contest.office}</h3>
            <ul className="flex flex-col gap-1.5">
              {contest.candidates.map((candidate) => (
                <li key={`${contest.uf}-${candidate.number}`} className="flex items-center gap-2.5 rounded-xl border border-black p-2">
                  <Portrait sources={[candidate.photo, PLACEHOLDER]} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-950">{candidate.name}</span>
                    <span className="mt-0.5 block truncate text-[10px] uppercase tracking-wide text-neutral-500">{candidate.party}</span>
                  </div>
                  <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-lg font-extrabold tabular-nums tracking-wide text-emerald-900 ring-1 ring-emerald-200">{candidate.number}</span>
                  <PartyBadge party={candidate.party} size={30} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ApuracaoClient() {
  const [round, setRound] = useState<1 | 2>(1);
  const [roundFocus, setRoundFocus] = useState("ALL");
  const [office, setOffice] = useState<OfficeId>("presidente");
  const [selected, setSelected] = useState<string>("BR");
  const [presidentByUf, setPresidentByUf] = useState<Record<string, Tally>>({});
  const [byUf, setByUf] = useState<Record<string, Tally>>({});
  const [error, setError] = useState("");
  const [clock, setClock] = useState("");
  const [query, setQuery] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [catalog, setCatalog] = useState<Municipio[]>([]);
  const [briefs, setBriefs] = useState<Record<string, MunBrief>>({});
  const [munProgress, setMunProgress] = useState({ done: 0, total: 0 });
  const [munTally, setMunTally] = useState<Tally | null>(null);

  useEffect(() => {
    let stopped = false;
    let running = false;
    let timer = 0;
    const pollOffice = round === 2 ? "presidente" : office;
    const proportional = isProportional(pollOffice);
    const jobs = [
      ...STATES.map((state) => ({ bucket: "president" as const, uf: state.uf, office: "presidente" as const })),
      { bucket: "president" as const, uf: "BR", office: "presidente" as const },
      ...(pollOffice === "presidente"
        ? []
        : STATES.map((state) => ({ bucket: "office" as const, uf: state.uf, office: pollOffice }))),
    ];

    async function tick() {
      if (running) return;
      running = true;
      try {
        const pairs = await Promise.all(
          jobs.map(async (job) => {
            try {
              const response = await fetch(resultUrl(job.office, job.uf), { cache: "no-store" });
              if (!response.ok) return null;
              return [job, parseResult(await response.json(), job.uf, job.bucket === "president" ? false : proportional)] as const;
            } catch {
              return null;
            }
          }),
        );
        if (stopped) return;
        const ready = pairs.filter((pair): pair is readonly [(typeof jobs)[number], Tally] => pair !== null);
        if (ready.length === 0) throw new Error("empty");
        setPresidentByUf((current) => {
          const next = { ...current };
          for (const [job, tally] of ready) if (job.bucket === "president") next[job.uf] = tally;
          return next;
        });
        if (pollOffice !== "presidente") {
          setByUf((current) => {
            const next = { ...current };
            for (const [job, tally] of ready) if (job.bucket === "office") next[job.uf] = tally;
            return next;
          });
        }
        setError(ready.length === jobs.length ? "" : "Parte dos estados não atualizou nesta leitura.");
        setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        if (ready.length === jobs.length && ready.every(([job, tally]) => tallyComplete(tally, job.office))) {
          stopped = true;
          window.clearInterval(timer);
        }
      } catch {
        if (!stopped) setError("Não foi possível atualizar os dados do TSE agora.");
      } finally {
        running = false;
      }
    }

    timer = window.setInterval(() => void tick(), 5000);
    void tick();
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [office, round]);

  useEffect(() => {
    let stopped = false;

    async function pool(items: Municipio[], worker: (mun: Municipio) => Promise<void>) {
      let index = 0;
      async function run() {
        while (index < items.length && !stopped) {
          const current = items[index];
          index += 1;
          await worker(current);
        }
      }
      await Promise.all(Array.from({ length: Math.min(6, items.length) }, () => run()));
    }

    async function load() {
      let response = await fetch(assetUrl("/mun-config.json"));
      if (!response.ok) response = await fetch(MUN_CONFIG_URL);
      if (!response.ok) throw new Error("config");
      const list = parseMunConfig(await response.json());
      if (stopped) return;
      setCatalog(list);
      let stored: Record<string, MunBrief> = {};
      try {
        const raw = sessionStorage.getItem("meuvoto-mun-presidente-v2");
        if (raw) stored = JSON.parse(raw) as Record<string, MunBrief>;
      } catch {
        stored = {};
      }
      const briefsNext = { ...stored };
      let pauseUntil = 0;
      setBriefs(briefsNext);
      const counted = () => list.filter((mun) => briefsNext[mun.ibge] && briefComplete(briefsNext[mun.ibge])).length;
      setMunProgress({ done: counted(), total: list.length });

      while (!stopped) {
        const pending = list.filter((mun) => !briefsNext[mun.ibge] || !briefComplete(briefsNext[mun.ibge]));
        if (pending.length === 0) {
          try {
            sessionStorage.setItem("meuvoto-mun-presidente-v2", JSON.stringify(briefsNext));
          } catch {
            // A full country cache can exceed the browser limit. The map still uses memory.
          }
          setMunProgress({ done: list.length, total: list.length });
          return;
        }
        let batch = 0;
        let got = 0;
        await pool(pending, async (mun) => {
          if (stopped) return;
          if (Date.now() < pauseUntil) {
            await new Promise((resolve) => window.setTimeout(resolve, pauseUntil - Date.now()));
          }
          if (stopped) return;
          try {
            const file = await fetch(municipalityResultUrl("presidente", mun.uf, mun.cd), { cache: "no-store" });
            if (file.status === 404) briefsNext[mun.ibge] = MISSING_BRIEF;
            else if (file.status === 429 || file.status === 503) {
              pauseUntil = Date.now() + 20000;
              return;
            } else if (file.ok) {
              briefsNext[mun.ibge] = briefFromTally(parseResult(await file.json(), mun.uf, false));
              got += 1;
            }
          } catch {
            return;
          }
          batch += 1;
          if (batch >= 60) {
            batch = 0;
            setBriefs({ ...briefsNext });
            setMunProgress({ done: counted(), total: list.length });
          }
        });
        if (stopped) return;
        setBriefs({ ...briefsNext });
        setMunProgress({ done: counted(), total: list.length });
        if (list.every((mun) => briefsNext[mun.ibge] && briefComplete(briefsNext[mun.ibge]))) {
          try {
            sessionStorage.setItem("meuvoto-mun-presidente-v2", JSON.stringify(briefsNext));
          } catch {
            // Ignore a full cache.
          }
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, got === 0 ? 60000 : 15000));
      }
    }

    void load().catch(() => {
      if (!stopped) setError("Não foi possível carregar os municípios agora.");
    });
    return () => {
      stopped = true;
    };
  }, []);

  useEffect(() => {
    if (round === 2 || !municipio || selected === "BR") return;
    const mun = catalog.find((item) => item.uf === selected && item.cd === municipio);
    if (!mun) return;
    const current = mun;
    let stopped = false;
    let timer = 0;
    async function tick() {
      try {
        const response = await fetch(municipalityResultUrl(office, current.uf, current.cd), { cache: "no-store" });
        if (!response.ok) throw new Error("mun");
        const tally = parseResult(await response.json(), current.uf, isProportional(office));
        if (stopped) return;
        setMunTally(tally);
        if (tallyComplete(tally, office)) {
          stopped = true;
          window.clearInterval(timer);
        }
      } catch {
        if (!stopped) setError("Não foi possível ler este município agora.");
      }
    }
    timer = window.setInterval(() => void tick(), 5000);
    void tick();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [catalog, municipio, office, round, selected]);

  const panelByUf = office === "presidente" ? presidentByUf : byUf;

  const settled = useMemo(() => {
    const presidentReady = STATES.every((state) => {
      const tally = presidentByUf[state.uf];
      return Boolean(tally && tallyComplete(tally));
    }) && Boolean(presidentByUf.BR && tallyComplete(presidentByUf.BR));
    if (!presidentReady) return false;
    if (round === 2 || office === "presidente") return true;
    return STATES.every((state) => {
      const tally = byUf[state.uf];
      return Boolean(tally && tallyComplete(tally, office));
    });
  }, [byUf, office, presidentByUf, round]);
  const panelSettled = municipio ? Boolean(munTally && tallyComplete(munTally, office)) : settled;

  const shown = useMemo(() => {
    if (municipio) return munTally;
    const uf = office !== "presidente" && selected === "BR" ? "SP" : selected;
    return panelByUf[uf] ?? null;
  }, [municipio, munTally, office, panelByUf, selected]);

  const fills = useMemo(() => {
    const next: Record<string, string> = {};
    for (const [ibge, brief] of Object.entries(briefs)) next[ibge] = winnerFill(brief.pt, brief.pl, brief.valid);
    return next;
  }, [briefs]);

  const stateMarks = useMemo(() => {
    const next: Record<string, string | null> = {};
    for (const state of STATES) {
      const tally = presidentByUf[state.uf];
      next[state.uf] = tally && tally.valid > 0 ? String(Math.round((Math.max(tally.pt, tally.pl) / tally.valid) * 100)) : null;
    }
    return next;
  }, [presidentByUf]);

  const byIbge = useMemo(() => {
    const next = new Map<string, Municipio>();
    for (const mun of catalog) next.set(mun.ibge, mun);
    return next;
  }, [catalog]);

  const munOptions = useMemo(() => {
    if (selected === "BR") return [];
    return catalog.filter((mun) => mun.uf === selected).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [catalog, selected]);

  const activeIbge = municipio ? munOptions.find((mun) => mun.cd === municipio)?.ibge ?? null : null;
  const selectedMun = activeIbge ? byIbge.get(activeIbge) : undefined;

  const onMapSelect = useCallback((ibge: string) => {
    const mun = byIbge.get(ibge);
    if (!mun) return;
    if (round === 2) {
      setRoundFocus((current) => (RUNOFF_UFS.has(mun.uf) ? (current === mun.uf ? "ALL" : mun.uf) : "ALL"));
      return;
    }
    setSelected(mun.uf);
    setMunicipio(mun.cd);
    setMunTally(null);
    setQuery("");
  }, [byIbge, round]);

  const mapTip = useCallback((ibge: string) => {
    const mun = byIbge.get(ibge);
    if (!mun) return null;
    const brief = briefs[ibge];
    return (
      <>
        <p className="mb-1.5 truncate text-xs font-semibold text-[#FAFAF9]">{mun.nome}</p>
        {!brief ? <p className="text-[11px] text-[#A6A39C]">Carregando votos</p> : null}
        {brief && brief.top.length === 0 ? <p className="text-[11px] text-[#A6A39C]">Sem votos publicados</p> : null}
        {brief && brief.top.length > 0 ? (
          <ul className="space-y-1">
            {brief.top.map((candidate) => (
              <li key={`${candidate.sq}-${candidate.numero}`} className="flex items-center gap-2">
                <Portrait className="h-8 w-8 shrink-0 rounded-full object-cover object-top" sources={photoSources(candidate.sq, "presidente", mun.uf)} />
                <span className="min-w-0 flex-1 truncate text-[11px] text-[#D6D4CF]">{candidate.nome}</span>
                <span className="shrink-0 text-xs font-semibold text-[#FAFAF9]">{formatPercent(candidate.pct)}%</span>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );
  }, [briefs, byIbge]);

  const rows = useMemo(
    () => (shown && shown.candidates.length > 0 ? shown.candidates : shown?.parties ?? []),
    [shown],
  );
  const filteredRows = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return rows;
    return rows.filter((row) => fold(`${row.nome} ${row.numero} ${row.sigla}`).includes(needle));
  }, [query, rows]);
  const ptPct = shown && shown.valid > 0 ? (shown.pt / shown.valid) * 100 : 0;
  const plPct = shown && shown.valid > 0 ? (shown.pl / shown.valid) * 100 : 0;
  const votePlace = shown?.uf ?? "";

  return (
    <div className="flex min-h-full flex-col bg-white">
      <TurnoDrawer round={round} onChange={(next) => { setRound(next); setMunTally(null); }} />
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-950 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m5 13.5 5 5L20 7" stroke="#22c55e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-tight text-neutral-950">meu<span className="text-emerald-600">voto</span><span className="text-neutral-400">.digital</span></span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <ApuracaoBadge />
            <Link href="/" className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">VOLTAR À CÉDULA</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:py-8">
        <section className="relative min-w-0 flex-1">
          <div className="mb-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">{round === 2 ? "Apuração do 2º turno" : `Apuração para ${OFFICES[office].label.toLowerCase()}`}</h1>
            <p className="mt-1 text-sm text-neutral-500">{round === 2 ? "O mapa mantém o 1º turno. Vermelho é Lula, verde é Flávio, e o tom mostra a vantagem: até 10, 25, 45 ou mais pontos." : "Vermelho onde Lula teve mais votos que Flávio, verde no sentido contrário. O tom mostra a vantagem: até 10, 25, 45 ou mais pontos. O mapa é sempre da eleição para presidente."}</p>
          </div>
          {round === 1 ? <div className="mb-3 flex gap-1 overflow-x-auto">
            {OFFICES_ORDER.map((id) => (
              <button key={id} type="button" onClick={() => { if (id === office) return; setOffice(id); setByUf({}); setError(""); setQuery(""); setMunicipio(""); setMunTally(null); if (id !== "presidente") setSelected((current) => (current === "BR" ? "SP" : current)); }} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${office === id ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500"}`}>{OFFICE_SHORT[id]}</button>
            ))}
          </div> : null}
          <div className="relative mx-auto w-full max-w-3xl">
            <MunicipalMap fills={fills} marks={stateMarks} activeIbge={round === 1 ? activeIbge : null} onSelect={onMapSelect} tip={mapTip} />
            {munProgress.total > 0 && munProgress.done < munProgress.total ? (
              <p className="mt-2 text-center text-xs text-neutral-400">Municípios {munProgress.done.toLocaleString("pt-BR")} de {munProgress.total.toLocaleString("pt-BR")}</p>
            ) : null}
          </div>
          <p className="mt-3 text-center text-sm text-neutral-400 lg:hidden">{round === 2 ? "Toque em um estado com segundo turno" : "Toque em um município para ver os votos"}</p>
        </section>

        <aside className="w-full shrink-0 lg:w-[520px]">
          {round === 2 ? <SecondRoundPanel focus={roundFocus} onFocus={setRoundFocus} /> : (
          <div className="rounded-3xl border border-neutral-200 bg-white p-3 sm:p-4 lg:sticky lg:top-24">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{selectedMun ? `${selectedMun.nome} (${selectedMun.uf})` : placeName(selected, office)}</p>
                <h2 className="text-base font-semibold text-neutral-950">{officeHeading(office, selected)}</h2>
                <p className="text-xs text-neutral-500">{shown ? (tallyComplete(shown, office) ? "Apuração encerrada" : andamentoLabel(shown.andamento)) : municipio ? "Carregando município" : "Carregando dados do TSE"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-neutral-400">{clock ? `Atualizado às ${clock}` : "Atualizando"}</p>
                {shown ? <p className="mt-1 text-xs font-medium text-neutral-500">{formatPercent(shown.sectionsPct)}% das urnas apuradas</p> : null}
              </div>
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <label>
                <span className="sr-only">Estado</span>
                <select value={selected} onChange={(event) => { setSelected(event.target.value); setMunicipio(""); setMunTally(null); setQuery(""); }} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-950 outline-none focus:border-neutral-400">
                  {office === "presidente" ? <option value="BR">Brasil</option> : null}
                  {STATES.map((state) => <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Município</span>
                <select value={municipio} disabled={selected === "BR" || munOptions.length === 0} onChange={(event) => { setMunicipio(event.target.value); setMunTally(null); setQuery(""); }} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-950 outline-none focus:border-neutral-400 disabled:opacity-60">
                  <option value="">Todos</option>
                  {munOptions.map((mun) => <option key={mun.cd} value={mun.cd}>{mun.nome}</option>)}
                </select>
              </label>
            </div>

            <label className="mb-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-neutral-400">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome" className="w-full bg-transparent text-xs text-neutral-950 outline-none placeholder:text-neutral-400" />
            </label>

            {error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            {office === "presidente" ? (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-red-600 px-3 py-3 text-white">
                  <p className="text-xs font-semibold">LULA</p>
                  <p className="text-2xl font-semibold tracking-tight"><RollingText value={`${formatPercent(ptPct)}%`} place={votePlace} /></p>
                  <p className="text-xs text-red-100"><RollingText value={formatVotes(shown?.pt ?? 0)} place={votePlace} /> votos</p>
                </div>
                <div className="rounded-2xl bg-green-700 px-3 py-3 text-white">
                  <p className="text-xs font-semibold">FLAVIO BOLSONARO</p>
                  <p className="text-2xl font-semibold tracking-tight"><RollingText value={`${formatPercent(plPct)}%`} place={votePlace} /></p>
                  <p className="text-xs text-green-100"><RollingText value={formatVotes(shown?.pl ?? 0)} place={votePlace} /> votos</p>
                </div>
              </div>
            ) : null}

            {shown?.generated || (selected === "BR" && office === "presidente") ? (
              <p className="mb-3 text-xs text-neutral-500">
                {shown?.generated ? `TSE ${shown.generated}` : ""}
                {selected === "BR" && office === "presidente" ? `${shown?.generated ? " · " : ""}inclui o voto no exterior` : ""}
              </p>
            ) : null}

            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {filteredRows.map((row) => {
                const tone = row.sigla === "PT" ? "bg-red-600" : row.sigla === "PL" ? "bg-green-700" : "bg-neutral-800";
                const sq = rowSq(row);
                const situacao = displayedSituacao(row, rows, shown?.sectionsPct ?? 0, isProportional(office));
                return (
                  <div key={`${row.sigla}-${row.numero}-${row.nome}`} className="rounded-2xl border border-neutral-200 px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      {sq ? <Portrait key={sq} sources={photoSources(sq, office, shown?.uf || selected)} /> : <PartyBadge party={row.sigla} size={48} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold text-neutral-950">
                            <span className="mr-2 text-neutral-400">{row.numero}</span>{row.nome}
                            <span className="ml-2 text-xs font-medium text-neutral-500">{row.sigla}</span>
                          </p>
                          <p className="shrink-0 text-sm font-semibold text-neutral-950">{formatPercent(row.pct)}%</p>
                        </div>
                        <SituacaoBadge situacao={situacao} />
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                          <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">{formatVotes(row.votos)} votos</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {query.trim() && filteredRows.length === 0 ? <p className="px-1 py-3 text-center text-xs text-neutral-400">Nenhum candidato com esse nome.</p> : null}
            </div>

            {shown ? (
              <p className="mt-3 text-xs text-neutral-400">
                Válidos {formatVotes(shown.valid)} · Brancos {formatVotes(shown.blank)} · Nulos {formatVotes(shown.nulls)}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-neutral-400">
              {panelSettled
                ? munProgress.total > 0 && munProgress.done < munProgress.total
                  ? "Apuração encerrada no TSE. O mapa ainda está carregando os municípios."
                  : "Apuração encerrada no TSE. A página parou de atualizar."
                : "Dados oficiais parciais do TSE, atualizados a cada 5 segundos."}{" "}
              <a href={TSE_PAGE[office]} target="_blank" rel="noopener noreferrer" className="underline">Fonte</a>
            </p>
          </div>
          )}
        </aside>
      </main>
    </div>
  );
}
