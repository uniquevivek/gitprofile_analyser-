// Client-side Javascript for GitProfile Analyzer Dashboard

const API_BASE = '/api';

// Language Color Mapping for UI visual tags
const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  PHP: '#4F5D95',
  Ruby: '#701516',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Rust: '#dea584',
  Shell: '#89e051',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  TypeScript: '#3178c6',
  Vue: '#41b883',
  Angular: '#dd0031',
  Unknown: '#94a3b8'
};

// State Store
let storedProfiles = [];
let languageChartInstance = null;
let compareChartInstance = null;

// DOM Elements
const searchForm = document.getElementById('search-form');
const usernameInput = document.getElementById('username-input');
const analyzeBtn = document.getElementById('analyze-btn');
const toggleCompareBtn = document.getElementById('toggle-compare-btn');

const compareSection = document.getElementById('compare-section');
const closeCompareBtn = document.getElementById('close-compare-btn');
const compareUser1Select = document.getElementById('compare-user-1');
const compareUser2Select = document.getElementById('compare-user-2');
const compareResults = document.getElementById('compare-results');
const comparePlaceholder = document.getElementById('compare-placeholder');

const detailSection = document.getElementById('detail-section');
const closeDetailBtn = document.getElementById('close-detail-btn');
const detailForceRefreshBtn = document.getElementById('detail-force-refresh');

const loadingSpinner = document.getElementById('loading-spinner');
const emptyState = document.getElementById('empty-state');
const profilesGrid = document.getElementById('profiles-grid');
const profilesCount = document.getElementById('profiles-count');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  fetchProfiles();
  setupEventListeners();
});

// Setup Events
function setupEventListeners() {
  // Search Form Submit
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username) {
      analyzeProfile(username);
    }
  });

  // Toggle Compare Mode
  toggleCompareBtn.addEventListener('click', () => {
    compareSection.classList.toggle('hidden');
    if (!compareSection.classList.contains('hidden')) {
      populateCompareDropdowns();
      compareSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Close Compare Panel
  closeCompareBtn.addEventListener('click', () => {
    compareSection.classList.add('hidden');
  });

  // Compare dropdown changes
  compareUser1Select.addEventListener('change', runComparison);
  compareUser2Select.addEventListener('change', runComparison);

  // Close Detail View
  closeDetailBtn.addEventListener('click', () => {
    detailSection.classList.add('hidden');
  });

  // Force Update Profile
  detailForceRefreshBtn.addEventListener('click', () => {
    const username = detailForceRefreshBtn.dataset.username;
    if (username) {
      analyzeProfile(username, true);
    }
  });
}

// Fetch all profiles from local database
async function fetchProfiles() {
  try {
    const res = await fetch(`${API_BASE}/profiles`);
    const result = await res.json();
    
    if (result.success) {
      storedProfiles = result.data;
      renderProfilesGrid();
      populateCompareDropdowns();
    } else {
      console.error('Failed to retrieve profiles:', result.error);
    }
  } catch (error) {
    console.error('Network error fetching profiles:', error);
  }
}

// Render the profiles list cards
function renderProfilesGrid() {
  profilesCount.textContent = `${storedProfiles.length} analyzed`;
  
  if (storedProfiles.length === 0) {
    emptyState.classList.remove('hidden');
    profilesGrid.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  profilesGrid.classList.remove('hidden');
  
  profilesGrid.innerHTML = '';
  storedProfiles.forEach(profile => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    
    const langColor = LANG_COLORS[profile.primary_language] || LANG_COLORS.Unknown;
    
    card.innerHTML = `
      <div class="card-upper">
        <img src="${profile.avatar_url}" alt="${profile.name}" class="card-avatar">
        <div class="card-user-info">
          <h3>${escapeHtml(profile.name)}</h3>
          <p>@${escapeHtml(profile.username)}</p>
        </div>
      </div>
      <div class="card-stats">
        <div class="card-stat-item">
          <div class="val">${profile.public_repos}</div>
          <div class="lbl">Repos</div>
        </div>
        <div class="card-stat-item">
          <div class="val">${profile.total_stars}</div>
          <div class="lbl">Stars</div>
        </div>
        <div class="card-stat-item">
          <div class="val">${profile.followers}</div>
          <div class="lbl">Followers</div>
        </div>
      </div>
      <div>
        <span class="badge" style="background-color: ${langColor}15; color: ${langColor}; border-color: ${langColor}30;">
          <i class="fa-solid fa-code"></i> ${profile.primary_language || 'None'}
        </span>
      </div>
      <div class="card-actions">
        <button class="card-btn btn-view" onclick="showProfileDetails('${profile.username}')">
          <i class="fa-solid fa-chart-pie"></i> Insights
        </button>
        <button class="card-btn btn-delete" onclick="deleteProfile('${profile.username}')" title="Delete record">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
    profilesGrid.appendChild(card);
  });
}

// Populate drop-downs for Compare mode
function populateCompareDropdowns() {
  const currentVal1 = compareUser1Select.value;
  const currentVal2 = compareUser2Select.value;

  compareUser1Select.innerHTML = '<option value="">Select first profile...</option>';
  compareUser2Select.innerHTML = '<option value="">Select second profile...</option>';

  storedProfiles.forEach(profile => {
    const option1 = `<option value="${profile.username}">${escapeHtml(profile.name)} (@${profile.username})</option>`;
    const option2 = `<option value="${profile.username}">${escapeHtml(profile.name)} (@${profile.username})</option>`;
    
    compareUser1Select.insertAdjacentHTML('beforeend', option1);
    compareUser2Select.insertAdjacentHTML('beforeend', option2);
  });

  // Restore selections if still valid
  if (storedProfiles.some(p => p.username === currentVal1)) {
    compareUser1Select.value = currentVal1;
  }
  if (storedProfiles.some(p => p.username === currentVal2)) {
    compareUser2Select.value = currentVal2;
  }

  runComparison();
}

// Analyze profile from GitHub API (Saves to DB)
async function analyzeProfile(username, force = false) {
  setLoadingState(true);
  
  try {
    const url = `${API_BASE}/profiles/${encodeURIComponent(username)}${force ? '?force=true' : ''}`;
    const res = await fetch(url, { method: 'POST' });
    const result = await res.json();
    
    if (result.success) {
      usernameInput.value = '';
      await fetchProfiles();
      showProfileDetails(result.data.username);
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Request failed:', error);
    alert('Failed to connect to the profile analyzer server. Make sure it is running.');
  } finally {
    setLoadingState(false);
  }
}

// Delete a profile from DB
async function deleteProfile(username) {
  if (!confirm(`Are you sure you want to delete the analyzed profile for @${username}?`)) {
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(username)}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    
    if (result.success) {
      // If deleting the active detailed profile, hide the details section
      if (detailForceRefreshBtn.dataset.username === username) {
        detailSection.classList.add('hidden');
      }
      
      await fetchProfiles();
    } else {
      alert(`Delete error: ${result.error}`);
    }
  } catch (error) {
    console.error('Delete request failed:', error);
  }
}

// Show detailed statistics for a profile
function showProfileDetails(username) {
  const profile = storedProfiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  if (!profile) return;

  // Set refresh token dataset
  detailForceRefreshBtn.dataset.username = profile.username;

  // Populate basic info
  document.getElementById('detail-avatar').src = profile.avatar_url;
  document.getElementById('detail-name').textContent = profile.name || profile.username;
  document.getElementById('detail-username').textContent = `@${profile.username}`;
  document.getElementById('detail-bio').textContent = profile.bio || 'No developer bio provided.';

  // Location
  const locContainer = document.getElementById('detail-location-container');
  if (profile.location) {
    locContainer.classList.remove('hidden');
    document.getElementById('detail-location').textContent = profile.location;
  } else {
    locContainer.classList.add('hidden');
  }

  // Website
  const blogContainer = document.getElementById('detail-blog-container');
  if (profile.blog) {
    blogContainer.classList.remove('hidden');
    const blogLink = document.getElementById('detail-blog');
    blogLink.href = profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`;
    blogLink.textContent = profile.blog.replace(/https?:\/\/(www\.)?/, '');
  } else {
    blogContainer.classList.add('hidden');
  }

  // Timestamps
  const joinedDate = new Date(profile.github_created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  document.getElementById('detail-joined').textContent = joinedDate;
  
  const analyzedDate = new Date(profile.analyzed_at).toLocaleString();
  document.getElementById('detail-analyzed').textContent = analyzedDate;

  // Stats Counters
  document.getElementById('metric-stars').textContent = profile.total_stars.toLocaleString();
  document.getElementById('metric-forks').textContent = profile.total_forks.toLocaleString();
  document.getElementById('metric-repos').textContent = profile.public_repos.toLocaleString();
  document.getElementById('metric-followers').textContent = profile.followers.toLocaleString();

  // Render language list & chart
  renderLanguages(profile);

  // Render top repos
  renderTopRepositories(profile.top_repositories);

  // Show detailed panel & scroll
  detailSection.classList.remove('hidden');
  detailSection.scrollIntoView({ behavior: 'smooth' });
}

// Render Languages Progress Bars and Chart.js Doughnut Chart
function renderLanguages(profile) {
  const listContainer = document.getElementById('language-list');
  listContainer.innerHTML = '';
  
  const breakdown = profile.language_breakdown || {};
  const languages = Object.keys(breakdown);

  if (languages.length === 0) {
    listContainer.innerHTML = '<p class="text-muted">No language data available.</p>';
    if (languageChartInstance) {
      languageChartInstance.destroy();
      languageChartInstance = null;
    }
    return;
  }

  // Render progress list
  languages.forEach(lang => {
    const percentage = breakdown[lang];
    const color = LANG_COLORS[lang] || LANG_COLORS.Unknown;
    
    const item = document.createElement('div');
    item.className = 'lang-list-item';
    item.innerHTML = `
      <div class="lang-list-header">
        <span><i class="fa-solid fa-circle" style="color: ${color}; font-size: 0.75rem;"></i> ${escapeHtml(lang)}</span>
        <strong>${percentage}%</strong>
      </div>
      <div class="lang-bar-bg">
        <div class="lang-bar-fill" style="width: ${percentage}%; background-color: ${color}"></div>
      </div>
    `;
    listContainer.appendChild(item);
  });

  // Render Chart
  const ctx = document.getElementById('languageChart').getContext('2d');
  
  if (languageChartInstance) {
    languageChartInstance.destroy();
  }

  const chartData = {
    labels: languages,
    datasets: [{
      data: Object.values(breakdown),
      backgroundColor: languages.map(lang => LANG_COLORS[lang] || LANG_COLORS.Unknown),
      borderWidth: 1,
      borderColor: '#1e293b'
    }]
  };

  languageChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // We show details in progress list
        },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.label}: ${context.raw}%`
          }
        }
      },
      cutout: '65%'
    }
  });
}

// Render Top Starred Repositories list
function renderTopRepositories(repos = []) {
  const container = document.getElementById('top-repos-list');
  container.innerHTML = '';

  if (repos.length === 0) {
    container.innerHTML = '<p class="text-muted" style="grid-column: span 2">No repositories analyzed.</p>';
    return;
  }

  repos.forEach(repo => {
    const langColor = LANG_COLORS[repo.language] || LANG_COLORS.Unknown;
    const card = document.createElement('div');
    card.className = 'repo-item-card';
    
    card.innerHTML = `
      <div class="repo-title-row">
        <a href="${repo.html_url}" target="_blank" class="repo-name">${escapeHtml(repo.name)}</a>
        <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.8rem; color: var(--text-muted);"></i>
      </div>
      <p class="repo-desc">${escapeHtml(repo.description)}</p>
      <div class="repo-footer">
        <div class="repo-stat">
          <span class="repo-lang-bullet" style="background-color: ${langColor}"></span>
          <span>${repo.language}</span>
        </div>
        <div class="repo-stat">
          <i class="fa-solid fa-star" style="color: var(--warning)"></i>
          <span>${repo.stars.toLocaleString()}</span>
        </div>
        <div class="repo-stat">
          <i class="fa-solid fa-code-branch" style="color: var(--accent)"></i>
          <span>${repo.forks.toLocaleString()}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Side-by-side Developer Stats Comparison
function runComparison() {
  const user1Name = compareUser1Select.value;
  const user2Name = compareUser2Select.value;

  if (!user1Name || !user2Name) {
    compareResults.classList.add('hidden');
    comparePlaceholder.classList.remove('hidden');
    return;
  }

  const user1 = storedProfiles.find(p => p.username === user1Name);
  const user2 = storedProfiles.find(p => p.username === user2Name);

  if (!user1 || !user2) return;

  // Show panel
  compareResults.classList.remove('hidden');
  comparePlaceholder.classList.add('hidden');

  // Populate Card 1
  document.getElementById('comp-avatar-1').src = user1.avatar_url;
  document.getElementById('comp-name-1').textContent = user1.name || user1.username;
  document.getElementById('comp-login-1').textContent = `@${user1.username}`;
  
  // Populate Card 2
  document.getElementById('comp-avatar-2').src = user2.avatar_url;
  document.getElementById('comp-name-2').textContent = user2.name || user2.username;
  document.getElementById('comp-login-2').textContent = `@${user2.username}`;

  // Populate comparisons and highlight winners
  compareStatsHighlight('comp-repos-1', user1.public_repos, 'comp-repos-2', user2.public_repos);
  compareStatsHighlight('comp-stars-1', user1.total_stars, 'comp-stars-2', user2.total_stars);
  compareStatsHighlight('comp-followers-1', user1.followers, 'comp-followers-2', user2.followers);
  compareStatsHighlight('comp-forks-1', user1.total_forks, 'comp-forks-2', user2.total_forks);

  // Set Language tags (no highlights for strings, just display)
  const lang1El = document.getElementById('comp-lang-1');
  const lang2El = document.getElementById('comp-lang-2');
  
  lang1El.textContent = user1.primary_language || 'None';
  lang1El.style.backgroundColor = (LANG_COLORS[user1.primary_language] || LANG_COLORS.Unknown) + '15';
  lang1El.style.color = LANG_COLORS[user1.primary_language] || LANG_COLORS.Unknown;
  
  lang2El.textContent = user2.primary_language || 'None';
  lang2El.style.backgroundColor = (LANG_COLORS[user2.primary_language] || LANG_COLORS.Unknown) + '15';
  lang2El.style.color = LANG_COLORS[user2.primary_language] || LANG_COLORS.Unknown;

  // Determine overall winner for card highlights
  const u1WinnerScore = 
    (user1.public_repos > user2.public_repos ? 1 : 0) +
    (user1.total_stars > user2.total_stars ? 1 : 0) +
    (user1.followers > user2.followers ? 1 : 0) +
    (user1.total_forks > user2.total_forks ? 1 : 0);

  const u2WinnerScore = 
    (user2.public_repos > user1.public_repos ? 1 : 0) +
    (user2.total_stars > user1.total_stars ? 1 : 0) +
    (user2.followers > user1.followers ? 1 : 0) +
    (user2.total_forks > user1.total_forks ? 1 : 0);

  const card1 = document.getElementById('comp-card-1');
  const card2 = document.getElementById('comp-card-2');

  card1.classList.remove('winner');
  card2.classList.remove('winner');

  if (u1WinnerScore > u2WinnerScore) {
    card1.classList.add('winner');
  } else if (u2WinnerScore > u1WinnerScore) {
    card2.classList.add('winner');
  }

  // Draw side-by-side stats Chart
  renderComparisonChart(user1, user2);
}

// Sub-helper to compare values and highlight the larger one in green
function compareStatsHighlight(id1, val1, id2, val2) {
  const el1 = document.getElementById(id1);
  const el2 = document.getElementById(id2);

  el1.textContent = val1.toLocaleString();
  el2.textContent = val2.toLocaleString();

  el1.classList.remove('winner');
  el2.classList.remove('winner');

  if (val1 > val2) {
    el1.classList.add('winner');
  } else if (val2 > val1) {
    el2.classList.add('winner');
  }
}

// Render comparison bar chart using Chart.js
function renderComparisonChart(user1, user2) {
  const ctx = document.getElementById('compareChart').getContext('2d');
  
  if (compareChartInstance) {
    compareChartInstance.destroy();
  }

  compareChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Stars', 'Forks', 'Public Repos', 'Followers'],
      datasets: [
        {
          label: user1.name || user1.username,
          data: [user1.total_stars, user1.total_forks, user1.public_repos, user1.followers],
          backgroundColor: '#0ea5e9',
          borderRadius: 4
        },
        {
          label: user2.name || user2.username,
          data: [user2.total_stars, user2.total_forks, user2.public_repos, user2.followers],
          backgroundColor: '#a855f7',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#94a3b8'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#94a3b8'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#f1f5f9',
            font: {
              family: "'Outfit', sans-serif"
            }
          }
        }
      }
    }
  });
}

// Helpers
function setLoadingState(isLoading) {
  if (isLoading) {
    loadingSpinner.classList.remove('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
    usernameInput.disabled = true;
  } else {
    loadingSpinner.classList.add('hidden');
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '<i class="fa-solid fa-chart-line"></i> Analyze Profile';
    usernameInput.disabled = false;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
