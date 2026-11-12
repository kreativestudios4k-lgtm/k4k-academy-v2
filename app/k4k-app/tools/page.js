import Link from 'next/link';
import '../studio.css';

export const metadata = {
  title: 'K4K APP — AI tools',
  description: 'The K4K APP tool set. Each tool shows whether it is connected yet.',
};

// Status is shown honestly. Nothing here is connected to a generation provider yet.
const TOOLS = [
  {
    name: 'Motion Transfer',
    summary: 'Keep the motion of a reference video and recast the characters.',
    status: 'Not connected yet',
    detail: 'Waiting for an approved provider endpoint and a spending cap.',
  },
  {
    name: 'Image to Video',
    summary: 'Turn one image into a short clip with a motion prompt.',
    status: 'Not connected yet',
    detail: 'Model and provider still to be verified.',
  },
  {
    name: 'Text to Video',
    summary: 'Describe a clip and choose duration and aspect ratio.',
    status: 'Not connected yet',
    detail: 'Model and provider still to be verified.',
  },
  {
    name: 'Character Swap',
    summary: 'Swap one or more people in a video, with protected-character controls.',
    status: 'Not connected yet',
    detail: 'Depends on the Motion Transfer integration.',
  },
  {
    name: 'Image Generation',
    summary: 'Create and edit images, with character consistency and saved results.',
    status: 'Not connected yet',
    detail: 'Provider still to be verified.',
  },
  {
    name: 'Templates',
    summary: 'Start from a trending template with its reference previews and image count.',
    status: 'Available to browse',
    detail: 'Browse templates on the K4K Motion home page.',
  },
];

export default function ToolsIndex() {
  return (
    <main className="k4k-market">
      <header className="market-nav">
        <Link href="/k4k-app" className="market-logo">K4K<span> APP</span></Link>
        <nav>
          <Link href="/k4k-app">Home</Link>
          <Link href="/k4k-app/coming-soon">New features</Link>
        </nav>
      </header>

      <section className="market-section">
        <div className="market-section-head">
          <div>
            <span className="market-kicker">AI TOOLS</span>
            <h1>Choose a <span>tool.</span></h1>
          </div>
        </div>
        <p className="market-note">
          Tools marked “Not connected yet” cannot generate content yet. No credits are charged for them.
        </p>

        <div className="market-grid">
          {TOOLS.map((tool) => (
            <article className="market-tile" key={tool.name}>
              <div className="market-tile-caption">
                <div>
                  <strong>{tool.name}</strong>
                  <small>{tool.summary}</small>
                </div>
              </div>
              <p><b>{tool.status}</b></p>
              <p className="market-note">{tool.detail}</p>
              <Link className="market-use" href="/k4k-app/coming-soon">See what is next ↗</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
