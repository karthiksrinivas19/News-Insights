const apiBase = 'http://127.0.0.1:8000';

let articlesData = [];
let filteredArticles = [];
let currentPage = 1;
const articlesPerPage = 10;

const sourceFilter = document.getElementById('source-filter');

let sourceStats = {};
let overallSentimentSummary = {};

function sentimentClass(sentiment) {
  if (!sentiment) return '';
  return sentiment.toLowerCase();
}

function renderSentimentSummary(data) {
  const total = data.positive + data.neutral + data.negative;
  const container = document.getElementById('summary');
  if (total === 0) {
    container.innerHTML = '<h2>Sentiment</h2><p class="loading">No data available</p>';
    return;
  }
  container.innerHTML = `
    <h2>Sentiment</h2>
    <div class="sentiment-bars">
      <div class="sentiment-item">
        <span class="sentiment-label">Positive</span>
        <div class="sentiment-bar-container">
          <div class="sentiment-bar" style="width: ${(data.positive / total * 100)}%"></div>
        </div>
        <span class="sentiment-count">${data.positive}</span>
      </div>
      <div class="sentiment-item">
        <span class="sentiment-label">Neutral</span>
        <div class="sentiment-bar-container">
          <div class="sentiment-bar" style="width: ${(data.neutral / total * 100)}%"></div>
        </div>
        <span class="sentiment-count">${data.neutral}</span>
      </div>
      <div class="sentiment-item">
        <span class="sentiment-label">Negative</span>
        <div class="sentiment-bar-container">
          <div class="sentiment-bar" style="width: ${(data.negative / total * 100)}%"></div>
        </div>
        <span class="sentiment-count">${data.negative}</span>
      </div>
    </div>
  `;
}

function renderTopTopics(data) {
  const container = document.getElementById('topics');
  if (data.topics && data.topics.length > 0) {
    container.innerHTML = `
      <h2>Topics</h2>
      <div class="topics-container">
        ${data.topics.map(t => `<span class="topic-tag">${t}</span>`).join('')}
      </div>
    `;
  } else {
    container.innerHTML = '<h2>Topics</h2><p class="loading">No topics found</p>';
  }
}

function renderSourceOptions() {
  const sources = Object.keys(sourceStats);
  sourceFilter.innerHTML = `<option value="All">All Sources</option>` + sources.map(source =>
    `<option value="${source}">${source}</option>`
  ).join('');
}

function filterBySource(source) {
  if (source === "All") {
    filteredArticles = articlesData.slice();
    renderSentimentSummary(overallSentimentSummary);
  } else {
    filteredArticles = articlesData.filter(a => a.source === source);
    const sStats = sourceStats[source] || { positive: 0, neutral: 0, negative: 0 };
    renderSentimentSummary(sStats);
  }
  currentPage = 1;
  renderArticles();
}

function renderArticles() {
  const container = document.getElementById('articles');
  if (filteredArticles.length === 0) {
    container.innerHTML = '<div class="loading">No articles found</div>';
    document.getElementById('page-info').textContent = 'Page 0';
    document.getElementById('prev-btn').disabled = true;
    document.getElementById('next-btn').disabled = true;
    return;
  }

  const start = (currentPage - 1) * articlesPerPage;
  const end = start + articlesPerPage;
  const pageArticles = filteredArticles.slice(start, end);

  container.innerHTML = pageArticles.map((article, idx) => `
    <div class="article-card" style="animation-delay: ${idx * 0.05}s">
      <div class="article-header">
        <h3>${article.title}</h3>
        <span class="sentiment-badge badge-${sentimentClass(article.sentiment)}">${article.sentiment || 'N/A'}</span>
      </div>
      <div class="article-meta">
        <span>${article.source}</span>
        <span>${new Date(article.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <p>${article.description || 'No description available.'}</p>
    </div>
  `).join('');

  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
  document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prev-btn').disabled = currentPage === 1;
  document.getElementById('next-btn').disabled = currentPage === totalPages;
}

async function fetchSourceStats() {
  try {
    const res = await fetch(`${apiBase}/api/source-stats`);
    const data = await res.json();
    sourceStats = {};
    overallSentimentSummary = { positive: 0, neutral: 0, negative: 0 };

    for (const [source, sentiments] of Object.entries(data)) {
      sourceStats[source] = {
        positive: sentiments.positive || 0,
        neutral: sentiments.neutral || 0,
        negative: sentiments.negative || 0,
      };
      overallSentimentSummary.positive += sourceStats[source].positive;
      overallSentimentSummary.neutral += sourceStats[source].neutral;
      overallSentimentSummary.negative += sourceStats[source].negative;
    }
    renderSourceOptions();
    renderSentimentSummary(overallSentimentSummary);
  } catch (e) {
    document.getElementById('summary').innerHTML = '<h2>Sentiment</h2><p class="loading">Error loading</p>';
    console.error("Error fetching source-stats", e);
  }
}

async function fetchTopTopics() {
  try {
    const res = await fetch(`${apiBase}/api/topics?top_n=10`);
    const data = await res.json();
    renderTopTopics(data);
  } catch (e) {
    document.getElementById('topics').innerHTML = '<h2>Topics</h2><p class="loading">Error loading</p>';
  }
}

async function fetchArticles() {
  try {
    const res = await fetch(`${apiBase}/articles`);
    articlesData = await res.json();
    filterBySource(sourceFilter.value || "All");
  } catch (e) {
    document.getElementById('articles').innerHTML = '<div class="loading">Error loading</div>';
  }
}

document.getElementById('prev-btn').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

document.getElementById('next-btn').addEventListener('click', () => {
  if (currentPage < Math.ceil(filteredArticles.length / articlesPerPage)) {
    currentPage++;
    renderArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

sourceFilter.addEventListener('change', () => {
  filterBySource(sourceFilter.value);
});

async function triggerFetchArticles() {
  const btn = document.getElementById('fetch-btn');
  const status = document.getElementById('fetch-status');

  btn.disabled = true;
  status.textContent = 'Fetching articles...';

  try {
    const res = await fetch(`${apiBase}/fetch-articles`);
    if (res.ok) {
      status.textContent = 'Articles fetched successfully!';
      setTimeout(() => loadData(), 1000);
    } else {
      status.textContent = 'Error fetching articles';
    }
  } catch (e) {
    console.error('Error triggering article fetch:', e);
    status.textContent = 'Error: Could not connect to server';
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      status.textContent = '';
    }, 3000);
  }
}

async function loadData() {
  await Promise.all([
    fetchSourceStats(),
    fetchTopTopics(),
    fetchArticles()
  ]);
}

document.getElementById('fetch-btn').addEventListener('click', triggerFetchArticles);
window.onload = loadData;
