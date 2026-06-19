import db, { dbType } from '../config/database.js';

/**
 * Helper to convert ISO 8601 strings to MySQL-compatible DATETIME format.
 */
function toSqlDateTime(dateStr) {
  if (!dateStr) return null;
  if (dbType === 'mysql') {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 19).replace('T', ' ');
      }
    } catch (e) {
      // Fallback to original string if error occurs
    }
  }
  return dateStr;
}

/**
 * Format database row to parse JSON fields safely.
 * Handles differences between MySQL (JSON columns parsed automatically)
 * and SQLite (JSON stored as text).
 */
function formatProfileRow(row) {
  if (!row) return null;
  
  let languageBreakdown = row.language_breakdown;
  let topRepositories = row.top_repositories;

  if (typeof languageBreakdown === 'string') {
    try {
      languageBreakdown = JSON.parse(languageBreakdown);
    } catch (e) {
      languageBreakdown = {};
    }
  }

  if (typeof topRepositories === 'string') {
    try {
      topRepositories = JSON.parse(topRepositories);
    } catch (e) {
      topRepositories = [];
    }
  }

  return {
    ...row,
    language_breakdown: languageBreakdown,
    top_repositories: topRepositories
  };
}

const ProfileModel = {
  /**
   * Retrieves all analyzed profiles.
   */
  async getAll() {
    const [rows] = await db.query('SELECT * FROM profiles ORDER BY analyzed_at DESC');
    return rows.map(formatProfileRow);
  },

  /**
   * Finds a single profile by username.
   */
  async getByUsername(username) {
    const [rows] = await db.query('SELECT * FROM profiles WHERE username = ?', [username]);
    if (!rows || rows.length === 0) return null;
    return formatProfileRow(rows[0]);
  },

  /**
   * Deletes a profile by username.
   */
  async delete(username) {
    const [result] = await db.query('DELETE FROM profiles WHERE username = ?', [username]);
    return result.affectedRows > 0;
  },

  /**
   * Saves a new analyzed profile or updates an existing one.
   */
  async saveOrUpdate(profile) {
    const existing = await this.getByUsername(profile.username);
    
    // Convert objects to JSON string representations for safe SQL storage
    const languageBreakdownStr = JSON.stringify(profile.language_breakdown || {});
    const topRepositoriesStr = JSON.stringify(profile.top_repositories || []);

    if (existing) {
      // Update existing profile
      const query = `
        UPDATE profiles SET
          name = ?,
          avatar_url = ?,
          bio = ?,
          blog = ?,
          location = ?,
          public_repos = ?,
          public_gists = ?,
          followers = ?,
          following = ?,
          github_created_at = ?,
          github_updated_at = ?,
          total_stars = ?,
          total_forks = ?,
          total_open_issues = ?,
          primary_language = ?,
          language_breakdown = ?,
          top_repositories = ?,
          analyzed_at = CURRENT_TIMESTAMP
        WHERE username = ?
      `;
      
      const params = [
        profile.name,
        profile.avatar_url,
        profile.bio,
        profile.blog,
        profile.location,
        profile.public_repos,
        profile.public_gists,
        profile.followers,
        profile.following,
        toSqlDateTime(profile.github_created_at),
        toSqlDateTime(profile.github_updated_at),
        profile.total_stars,
        profile.total_forks,
        profile.total_open_issues,
        profile.primary_language,
        languageBreakdownStr,
        topRepositoriesStr,
        profile.username // WHERE parameter
      ];

      await db.query(query, params);
      return await this.getByUsername(profile.username);
    } else {
      // Insert new profile
      const query = `
        INSERT INTO profiles (
          username, name, avatar_url, bio, blog, location, 
          public_repos, public_gists, followers, following, 
          github_created_at, github_updated_at, total_stars, 
          total_forks, total_open_issues, primary_language, 
          language_breakdown, top_repositories
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        profile.username,
        profile.name,
        profile.avatar_url,
        profile.bio,
        profile.blog,
        profile.location,
        profile.public_repos,
        profile.public_gists,
        profile.followers,
        profile.following,
        toSqlDateTime(profile.github_created_at),
        toSqlDateTime(profile.github_updated_at),
        profile.total_stars,
        profile.total_forks,
        profile.total_open_issues,
        profile.primary_language,
        languageBreakdownStr,
        topRepositoriesStr
      ];

      await db.query(query, params);
      return await this.getByUsername(profile.username);
    }
  }
};

export default ProfileModel;
