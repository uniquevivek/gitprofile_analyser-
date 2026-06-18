import ProfileModel from '../models/profileModel.js';
import { analyzeProfile } from '../utils/githubApi.js';

// Cache expiration set to 1 hour (3600000 ms)
const CACHE_DURATION_MS = 60 * 60 * 1000;

const ProfileController = {
  /**
   * POST /api/profiles/:username
   * Analyzes a GitHub profile, saves/updates it in the database, and returns the result.
   * Supports force refreshing using the query param ?force=true
   */
  async analyzeAndSaveProfile(req, res) {
    const { username } = req.params;
    const forceRefresh = req.query.force === 'true';

    try {
      if (!username || username.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Username is required.'
        });
      }

      const cleanUsername = username.trim().toLowerCase();

      // Check if profile is already stored and within cache duration
      const existing = await ProfileModel.getByUsername(cleanUsername);
      if (existing && !forceRefresh) {
        // SQLite stores timestamp in UTC, MySQL might be local or UTC depending on DB settings
        // To be safe, we parse the analyzed_at time
        const analyzedTime = new Date(existing.analyzed_at).getTime();
        const age = Date.now() - analyzedTime;
        
        if (age < CACHE_DURATION_MS) {
          return res.status(200).json({
            success: true,
            source: 'cache',
            message: 'Profile retrieved from local cache.',
            data: existing
          });
        }
      }

      // Fetch fresh data from GitHub and calculate insights
      console.log(`Analyzing GitHub profile for username: ${cleanUsername}...`);
      const analyzedData = await analyzeProfile(cleanUsername);
      
      // Save or update in database
      const savedProfile = await ProfileModel.saveOrUpdate(analyzedData);

      return res.status(existing ? 200 : 201).json({
        success: true,
        source: 'github',
        message: existing ? 'Profile updated successfully.' : 'Profile analyzed and saved successfully.',
        data: savedProfile
      });

    } catch (error) {
      console.error(`Error in analyzeAndSaveProfile for "${username}":`, error.message);
      
      // Check for specific github errors
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: `GitHub user "${username}" was not found.`
        });
      }
      
      if (error.message.includes('rate limit')) {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }

      return res.status(500).json({
        success: false,
        error: 'An internal server error occurred while analyzing the profile.',
        details: error.message
      });
    }
  },

  /**
   * GET /api/profiles
   * Fetches the list of all stored analyzed profiles.
   */
  async getAllProfiles(req, res) {
    try {
      const profiles = await ProfileModel.getAll();
      return res.status(200).json({
        success: true,
        count: profiles.length,
        data: profiles
      });
    } catch (error) {
      console.error('Error in getAllProfiles:', error.message);
      return res.status(500).json({
        success: false,
        error: 'An internal server error occurred while fetching profiles.',
        details: error.message
      });
    }
  },

  /**
   * GET /api/profiles/:username
   * Fetches data for a single stored profile.
   */
  async getProfile(req, res) {
    const { username } = req.params;

    try {
      if (!username || username.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Username is required.'
        });
      }

      const cleanUsername = username.trim().toLowerCase();
      const profile = await ProfileModel.getByUsername(cleanUsername);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: `Profile for "${username}" has not been analyzed yet. Use POST /api/profiles/${username} to analyze.`
        });
      }

      return res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error(`Error in getProfile for "${username}":`, error.message);
      return res.status(500).json({
        success: false,
        error: 'An internal server error occurred while retrieving the profile.',
        details: error.message
      });
    }
  },

  /**
   * DELETE /api/profiles/:username
   * Deletes a stored profile.
   */
  async deleteProfile(req, res) {
    const { username } = req.params;

    try {
      if (!username || username.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Username is required.'
        });
      }

      const cleanUsername = username.trim().toLowerCase();
      const deleted = await ProfileModel.delete(cleanUsername);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: `Profile for "${username}" not found in database.`
        });
      }

      return res.status(200).json({
        success: true,
        message: `Profile for "${username}" deleted successfully.`
      });
    } catch (error) {
      console.error(`Error in deleteProfile for "${username}":`, error.message);
      return res.status(500).json({
        success: false,
        error: 'An internal server error occurred while deleting the profile.',
        details: error.message
      });
    }
  }
};

export default ProfileController;
