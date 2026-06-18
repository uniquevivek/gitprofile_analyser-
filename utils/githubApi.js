import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Creates headers for GitHub API requests, adding authorization if token is available.
 */
function getHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Profile-Analyzer-API'
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

/**
 * Fetches basic profile details of a GitHub user.
 * @param {string} username 
 */
export async function fetchUserProfile(username) {
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/users/${username}`, {
      headers: getHeaders()
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error(`GitHub user "${username}" not found.`);
    }
    if (error.response && error.response.status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
      throw new Error('GitHub API rate limit exceeded. Please configure a GITHUB_TOKEN to increase limits.');
    }
    throw new Error(`Failed to fetch GitHub profile: ${error.message}`);
  }
}

/**
 * Fetches public repositories for a GitHub user (up to 100).
 * @param {string} username 
 */
export async function fetchUserRepos(username) {
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/users/${username}/repos`, {
      params: {
        per_page: 100,
        sort: 'updated'
      },
      headers: getHeaders()
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching repos for ${username}:`, error.message);
    return []; // Return empty array if repo fetch fails, so profile analysis can still proceed with basic data
  }
}

/**
 * Performs deep analysis on a GitHub profile by fetching user info and repositories.
 * Calculates totals, language statistics, and lists top repositories.
 * @param {string} username 
 */
export async function analyzeProfile(username) {
  const profileData = await fetchUserProfile(username);
  const repos = await fetchUserRepos(username);

  let totalStars = 0;
  let totalForks = 0;
  let totalOpenIssues = 0;
  const languageCounts = {};
  
  // Analyze repositories
  repos.forEach(repo => {
    totalStars += repo.stargazers_count || 0;
    totalForks += repo.forks_count || 0;
    totalOpenIssues += repo.open_issues_count || 0;

    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  });

  // Calculate language breakdown
  const totalReposWithLanguage = Object.values(languageCounts).reduce((a, b) => a + b, 0);
  const languageBreakdown = {};
  let primaryLanguage = 'None';
  let maxLangCount = 0;

  if (totalReposWithLanguage > 0) {
    Object.entries(languageCounts).forEach(([lang, count]) => {
      const percentage = parseFloat(((count / totalReposWithLanguage) * 100).toFixed(1));
      languageBreakdown[lang] = percentage;

      if (count > maxLangCount) {
        maxLangCount = count;
        primaryLanguage = lang;
      }
    });
  }

  // Get top 5 repositories by stargazers count
  const topRepositories = repos
    .map(repo => ({
      name: repo.name,
      description: repo.description || 'No description provided.',
      html_url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language || 'Unknown',
      updated_at: repo.updated_at
    }))
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 5);

  // Package all details and insights
  return {
    username: profileData.login,
    name: profileData.name || profileData.login,
    avatar_url: profileData.avatar_url,
    bio: profileData.bio || '',
    blog: profileData.blog || '',
    location: profileData.location || '',
    public_repos: profileData.public_repos || 0,
    public_gists: profileData.public_gists || 0,
    followers: profileData.followers || 0,
    following: profileData.following || 0,
    github_created_at: profileData.created_at,
    github_updated_at: profileData.updated_at,
    // Custom Insights
    total_stars: totalStars,
    total_forks: totalForks,
    total_open_issues: totalOpenIssues,
    primary_language: primaryLanguage,
    language_breakdown: languageBreakdown,
    top_repositories: topRepositories
  };
}
