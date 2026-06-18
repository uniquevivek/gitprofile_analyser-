import express from 'express';
import ProfileController from '../controllers/profileController.js';

const router = express.Router();

// Route to analyze a new profile (or update an existing one)
router.post('/profiles/:username', ProfileController.analyzeAndSaveProfile);

// Route to list all stored profiles
router.get('/profiles', ProfileController.getAllProfiles);

// Route to view a single stored profile
router.get('/profiles/:username', ProfileController.getProfile);

// Route to delete a stored profile
router.delete('/profiles/:username', ProfileController.deleteProfile);

export default router;
