import React from 'react'

function Logo() {
  return (
    <img className="logo" src="/logo.svg" alt="co-frame logo" width="88" height="88" />
  )
}

export default function App() {
  return (
    <div className="page">
      <header className="hero">
        <Logo />
        <h1 className="title">co-frame</h1>
        <p className="tag">Context Framework • Template • Project</p>
        <p className="desc">LLM‑ready design + dev governance for consistent apps.</p>
        <div className="cta">
          <a className="btn primary" href="../coframe/semantics.base.json" target="_blank" rel="noreferrer">Semantics</a>
          <a className="btn" href="../templates/spa.the-choosen-one.cft.json" target="_blank" rel="noreferrer">Template</a>
          <a className="btn" href="../implementations/the-choosen-one.cfi.json" target="_blank" rel="noreferrer">Implementation</a>
        </div>
      </header>

      <main className="content">
        <section>
          <h2>Why CoFrame?</h2>
          <ul>
            <li>Rulebook clarity (Semantics) without prescribing tools.</li>
            <li>Menus of allowed choices (Templates) mapped to behaviors.</li>
            <li>Concrete, reviewable decisions (Implementations) with commands and params.</li>
          </ul>
        </section>
      </main>

      <footer className="foot">Made with the the‑choosen‑one theme.</footer>
    </div>
  )
}

