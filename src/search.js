const TAVILY_API_KEY = process.env.TAVILY_API_KEY?.trim();

// Tavilyで最新情報を検索して、要約と参考リンクを返す
export async function webSearch(query) {
  if (!TAVILY_API_KEY) throw new Error('TAVILY_API_KEY not set');

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = await res.json();

  const answer = data.answer || '';
  const results = (data.results || [])
    .map((r) => `・${r.title}: ${r.content?.slice(0, 200) ?? ''}\n  (${r.url})`)
    .join('\n');

  return { answer, results };
}

export const hasSearch = () => !!TAVILY_API_KEY;
