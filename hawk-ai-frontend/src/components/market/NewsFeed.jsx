import { useState } from 'react';

/** Headlines with sentiment; tap one to see how it moved the AI call. */
export default function NewsFeed({ items }) {
  const [openId, setOpenId] = useState(null);

  return (
    <section>
      <h6 className="side-title">News &amp; sentiment</h6>
      <div className="news-list">
        {items.map((n) => {
          const open = openId === n.id;
          return (
            <button
              key={n.id}
              type="button"
              className="news-item"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : n.id)}
            >
              <span className="news-meta">
                {n.time} · {n.symbol}
              </span>
              <span className="news-headline">{n.headline}</span>
              <span className="news-tags">
                <span className="tag tag-outline">{n.sentiment}</span>
                <span className="news-impact">{n.impact}</span>
              </span>
              {open && <span className="news-explanation">{n.explanation}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
