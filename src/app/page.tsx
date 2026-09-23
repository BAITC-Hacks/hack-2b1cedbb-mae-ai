"use client";

import { useEffect, useReducer, useRef } from "react";
import { ArrowRight, Building2, Check, Cpu, Leaf, MoveRight, Route, ShieldCheck, Users } from "lucide-react";
import { INITIAL_BUDGET, METRICS, ROUNDS, createSimulation, getDecisionAvailability, calculateQoL, calculateImbalancePenalty, simulationReducer, type CityMetrics } from "@/lib/simulation";
import { decisionCopy } from "./decision-copy";
import { ScoreExplanation } from "./score-explanation";

const metricIcons = { mobility: Route, ecology: Leaf, social: Users, safety: ShieldCheck, services: Cpu };

function CityIndicators({ metrics }: { metrics: CityMetrics }) {
  return (
    <section className="indicators" aria-label="Показатели города">
      {METRICS.map(({ key, label }) => {
        const Icon = metricIcons[key];
        return (
          <div className="indicator" key={key}>
            <div className="indicator-label"><Icon size={17} /><span>{label}</span></div>
            <div className="indicator-value">{metrics[key]}<span>/ 100</span></div>
            <div className="meter" role="meter" aria-label={label} aria-valuenow={metrics[key]} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${metrics[key]}%` }} /></div>
          </div>
        );
      })}
    </section>
  );
}

function Skyline() {
  return (
    <svg className="skyline" viewBox="0 0 800 330" fill="none" aria-hidden="true">
      <defs><linearGradient id="skyline-fill" x1="400" y1="80" x2="400" y2="330" gradientUnits="userSpaceOnUse"><stop stopColor="#123848" /><stop offset="1" stopColor="#09121e" /></linearGradient></defs>
      <g fill="url(#skyline-fill)" stroke="currentColor" strokeWidth="1.2">
        <path d="M20 300V225H70V300M40 225V210H60V225M95 300V175H140V300M105 190H130M105 207H130M105 224H130M105 241H130M165 300V195L200 178L235 195V300M175 207H225M175 225H225M175 243H225" />
        <path d="M270 300V158L303 134L336 158V300M280 176H326M280 195H326M280 214H326M280 233H326M303 134V116" />
        <path d="M371 300L388 151H412L429 300M382 190H418M379 220H421M375 253H425M386 300L400 162L414 300" />
        <circle cx="400" cy="121" r="34" /><ellipse cx="400" cy="121" rx="17" ry="34" /><path d="M369 108H431M366 123H434M371 138H429" />
        <path d="M465 300V200H480V150L500 126L520 150V200H535V300M491 151V283M509 151V283M476 218H524M476 237H524M476 256H524" />
        <path d="M564 300L623 201L682 300ZM586 300L623 201L660 300M623 201V178M575 281H671M586 263H660" />
        <path d="M698 300V196H739V300M709 208H728M709 225H728M709 242H728M761 300V242H790V300" />
        <path d="M0 301H800M0 319H800" />
      </g>
      <circle cx="400" cy="121" r="48" stroke="currentColor" strokeDasharray="2 7" opacity=".4" />
    </svg>
  );
}

export default function Home() {
  const [state, dispatch] = useReducer(simulationReducer, undefined, createSimulation);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const quality = calculateQoL(state.metrics);
  const imbalancePenalty = calculateImbalancePenalty(state.metrics);
  const round = ROUNDS[state.choices.length];

  useEffect(() => {
    if (state.status !== "START") headingRef.current?.focus();
  }, [state.status, state.choices.length]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand"><span className="brand-icon"><Building2 size={22} /></span><span>AKIM <span className="cyan">5H</span></span></div>
        <span className="header-caption">ЦЕНТР УПРАВЛЕНИЯ АСТАНОЙ</span>
        <div className="status-tag"><span className="status-dot" />{state.status === "RESULT" ? "ЗАВЕРШЕНО" : "СИМУЛЯЦИЯ ГОРОДА"}</div>
      </header>
      <main>
        {state.status === "START" && (
          <section className="start-screen">
            <div className="eyebrow"><span className="small-line" /> ГОРОД НАЧИНАЕТСЯ С РЕШЕНИЙ</div>
            <h1 className="hero-title">AKIM <span>5H<span className="hero-dot">.</span></span></h1>
            <p className="hero-subtitle">ЦЕНТР УПРАВЛЕНИЯ АСТАНОЙ</p>
            <p className="hero-copy">Пять решений.<br />Один городской бюджет.<br /><span>Множество последствий.</span></p>
            <button className="primary-button start-button" onClick={() => dispatch({ type: "START" })}>ПРИНЯТЬ УПРАВЛЕНИЕ <ArrowRight size={19} /></button>
            <div className="start-facts"><span><strong>05</strong> раундов</span><span><strong>100</strong> бюджет</span><span><strong>01</strong> город</span></div>
            <Skyline />
            <div className="skyline-caption"><span>АСТАНА, КАЗАХСТАН</span><span>51°10′ с. ш. &nbsp; 71°26′ в. д.</span></div>
          </section>
        )}
        {state.status === "SIMULATION" && round && (
          <div className="dashboard">
            <section className="overview" aria-label="Состояние симуляции" aria-live="polite">
              <div><span className="eyebrow">ХОД СИМУЛЯЦИИ</span><div className="overview-number">РЕШЕНИЕ <strong>{state.choices.length + 1}</strong><span> ИЗ 5</span></div></div>
              <div><span className="eyebrow">ГОРОДСКОЙ БЮДЖЕТ</span><div className="overview-number">БЮДЖЕТ <strong>{state.budget}</strong><span> / 100</span></div></div>
              <div className="quality-overview"><span className="eyebrow">ИНДЕКС КАЧЕСТВА ЖИЗНИ АСТАНЫ</span><div className="quality-number">{quality.toFixed(1)}<span>/ 100</span></div><ScoreExplanation penalty={imbalancePenalty} /></div>
            </section>
            <CityIndicators metrics={state.metrics} />
            <ol className="round-track" aria-label="Пять раундов">
              {ROUNDS.map((item, index) => <li key={item.id} className={index === state.choices.length ? "active" : index < state.choices.length ? "complete" : ""} aria-current={index === state.choices.length ? "step" : undefined}><span className="step-number">{index < state.choices.length ? <Check size={14} /> : `0${index + 1}`}</span><span>{item.title}</span></li>)}
            </ol>
            <section className="decision-section" aria-labelledby="round-heading">
              <div className="section-heading"><div><p className="eyebrow cyan">РЕШЕНИЕ {state.choices.length + 1} ИЗ 5</p><h1 id="round-heading" ref={headingRef} tabIndex={-1}>{round.title}</h1><p className="section-description">{round.description}</p></div><span className="selection-note">3 варианта · 1 решение</span></div>
              <div className="decision-grid">
                {round.decisions.map((decision, index) => {
                  const availability = getDecisionAvailability(state, decision.id);
                  return <article key={decision.id} className={`decision-card${availability.allowed ? "" : " decision-card-unavailable"}`}>
                    <div className="card-topline"><span className="option-number">ВАРИАНТ 0{index + 1}</span><span className="cost"><span>Стоимость </span>{decision.cost}</span></div>
                    <h2>{decisionCopy[decision.id].name}</h2>
                    <p className="decision-description">{decisionCopy[decision.id].description}</p>
                    <p className="impact-caption">Влияние</p>
                    <dl className="impact-list">{METRICS.map(({ key, label }) => {
                      const Icon = metricIcons[key];
                      const value = decision.effects[key];
                      return <div key={key}><dt><Icon size={16} />{label}</dt><dd className={value > 0 ? "positive" : value < 0 ? "negative" : "neutral"}>{value > 0 ? `+${value}` : value}</dd></div>;
                    })}</dl>
                    <button className="select-button" disabled={!availability.allowed} aria-label={`Выбрать: ${decisionCopy[decision.id].name}`} aria-describedby={!availability.allowed ? `reason-${decision.id}` : undefined} onClick={() => dispatch({ type: "CHOOSE", decisionId: decision.id })}>ВЫБРАТЬ <MoveRight size={18} /></button>
                    {!availability.allowed && <p className="budget-reason" id={`reason-${decision.id}`}>{availability.reason}</p>}
                  </article>;
                })}
              </div>
              <p className="round-footnote">Стоимость списывается сразу. Сохраняйте бюджет на все пять решений.</p>
            </section>
          </div>
        )}
        {state.status === "RESULT" && (
          <div className="dashboard result-screen">
            <section className="result-hero"><div className="completion-icon"><Check size={23} /></div><p className="eyebrow cyan">СИМУЛЯЦИЯ ЗАВЕРШЕНА</p><h1 ref={headingRef} tabIndex={-1}>ИТОГИ УПРАВЛЕНИЯ</h1><p className="result-label">ИНДЕКС КАЧЕСТВА ЖИЗНИ АСТАНЫ</p><div className="result-score">{quality.toFixed(1)}<span>/ 100</span></div><ScoreExplanation penalty={imbalancePenalty} /><p className="score-change">+{(quality - 50).toFixed(1)} к начальному качеству жизни</p></section>
            <CityIndicators metrics={state.metrics} />
            <div className="result-budget"><div><span>Потрачено бюджета</span><strong>{INITIAL_BUDGET - state.budget}<small> / 100</small></strong></div><div><span>Осталось бюджета</span><strong className="cyan">{state.budget}<small> / 100</small></strong></div></div>
            <section className="choices-section"><div className="section-heading"><h2>Принятые решения</h2><span className="selection-note">5 из 5 реализовано</span></div><ol className="chosen-list">{state.choices.map((choice, index) => <li key={choice.id}><span className="chosen-number">0{index + 1}</span><div><p>{ROUNDS[index].title}</p><h3>{decisionCopy[choice.id].name}</h3></div><span className="chosen-cost">{choice.cost}<small> бюджет</small></span><Check className="cyan chosen-check" size={18} /></li>)}</ol></section>
          </div>
        )}
      </main>
      <p className="model-note">AKIM 5H использует виртуальную модель для сравнения управленческих сценариев. Показатели симуляции не являются официальным прогнозом развития города.</p>
      <footer className="site-footer"><span>AKIM 5H <span className="footer-divider">/</span> СИМУЛЯТОР УПРАВЛЕНИЯ ГОРОДОМ</span><span>ПЯТЬ РЕШЕНИЙ. ОДНО БУДУЩЕЕ.</span></footer>
    </div>
  );
}
