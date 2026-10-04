import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" to="/" aria-label="CourtSide home">
          <span className="landing-brand-name">CourtSide</span>
          <span className="landing-brand-tag">Campus equipment</span>
        </Link>
        <nav className="landing-nav-actions" aria-label="Main navigation">
          <a className="landing-nav-about" href="#how-it-works">How it works</a>
          <Link className="landing-signin" to="/login">Sign in</Link>
          <Link className="landing-nav-cta" to="/login?mode=register">Create account <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-content">
            <div className="landing-eyebrow"><span /> Your campus. Your court.</div>
            <h1 id="landing-title">CourtSide<span>.</span></h1>
            <p className="landing-intro">Gear up for the game.<br />Reserve what you need, right on campus.</p>
            <div className="landing-hero-actions">
              <Link className="landing-primary-cta" to="/login?mode=register">Get started <span aria-hidden="true">↗</span></Link>
              <Link className="landing-secondary-cta" to="/login">I have an account</Link>
            </div>
            <div className="landing-hours"><span>RESERVATIONS</span> 7:00 AM <i /> 7:00 PM</div>
          </div>
          <div className="landing-hero-index">01 <span>/</span> CAMPUS SPORTS</div>
        </section>

        <section className="landing-how" id="how-it-works">
          <div className="landing-how-heading">
            <div className="landing-section-kicker">A better way to get in the game <span>01—03</span></div>
            <h2>Ready when<br />you are.</h2>
          </div>
          <div className="landing-steps">
            <article className="landing-step">
              <span className="landing-step-number">01</span>
              <h3>Find your gear</h3>
              <p>Browse the campus equipment catalog and check availability.</p>
            </article>
            <article className="landing-step">
              <span className="landing-step-number">02</span>
              <h3>Choose your time</h3>
              <p>Pick a convenient one-hour reservation slot, from 7 AM to 7 PM.</p>
            </article>
            <article className="landing-step">
              <span className="landing-step-number">03</span>
              <h3>Play your game</h3>
              <p>Collect your approved booking from the campus sports office.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="landing-footer-brand">CourtSide</span>
        <span>Make room for the next game.</span>
        <Link to="/login">Sign in <span aria-hidden="true">↗</span></Link>
      </footer>
    </div>
  );
}