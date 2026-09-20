import { useState } from 'react';
import { api, SCREENER_TABS } from '../api';
import IndexCard from '../components/market/IndexCard';
import MarketPulse from '../components/market/MarketPulse';
import NewsFeed from '../components/market/NewsFeed';
import PolicyWatch from '../components/market/PolicyWatch';
import ScreenerTable from '../components/market/ScreenerTable';
import SectorHeat from '../components/market/SectorHeat';
import { ErrorBox, Loading } from '../components/ui/Status';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { usePageTitle } from '../hooks/usePageTitle';

/** Screen 02 — market mood, indices, screeners, sector heat, news and policy. */
export default function MarketPage() {
  usePageTitle('Market');
  const { settings } = useSettings();
  const refreshMs = settings.liveUpdates ? 30000 : 0;
  const [screenerId, setScreenerId] = useState(SCREENER_TABS[0].id);

  const overview = useApi(() => api.getMarketOverview(), [], { refreshMs });
  const screener = useApi(() => api.getScreener(screenerId), [screenerId], { refreshMs });
  const news = useApi(() => api.getNews(), [], { refreshMs });
  const policy = useApi(() => api.getPolicy(), []);

  const block = (query, render, lines = 4) =>
    query.data ? render(query.data) : query.error ? <ErrorBox error={query.error} onRetry={query.reload} /> : <Loading lines={lines} />;

  return (
    <main className="page page-scroll page-market">
      <div className="market-grid">
        <div className="market-main">
          {block(
            overview,
            (o) => (
              <div className="market-top">
                <MarketPulse pulse={o.pulse} />
                <div className="index-grid">
                  {o.indices.map((i) => (
                    <IndexCard key={i.name} index={i} />
                  ))}
                </div>
              </div>
            ),
            6,
          )}

          <ScreenerTable active={screenerId} onChange={setScreenerId} query={screener} />

          {overview.data && <SectorHeat sectors={overview.data.sectors} />}
        </div>

        <div className="market-side">
          {block(news, (items) => <NewsFeed items={items} />, 8)}
          {block(policy, (items) => <PolicyWatch items={items} />, 3)}
        </div>
      </div>
    </main>
  );
}
