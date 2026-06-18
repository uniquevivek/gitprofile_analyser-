import assert from 'assert';
import db from '../config/database.js';
import ProfileModel from '../models/profileModel.js';

async function runTests() {
  console.log('===================================================');
  console.log('🧪 Starting database model integration tests...');
  console.log('===================================================');

  try {
    // 1. Connection check
    console.log('🔌 Step 1: Checking database connection...');
    const [connCheck] = await db.query('SELECT 1');
    assert.ok(connCheck, 'Database should return response for simple ping query');
    console.log('✅ Database connection is alive.');

    // 2. Clean up any existing test profile
    const testUsername = 'test-developer-999';
    await ProfileModel.delete(testUsername);

    // 3. Create mock profile (Testing Insert)
    console.log('📥 Step 2: Testing ProfileModel.saveOrUpdate (Insert)...');
    const mockProfile = {
      username: testUsername,
      name: 'Test Dev',
      avatar_url: 'https://github.com/avatar.png',
      bio: 'Test bio info',
      blog: 'https://testdev.com',
      location: 'Earth',
      public_repos: 10,
      public_gists: 2,
      followers: 100,
      following: 50,
      github_created_at: '2015-01-01T00:00:00Z',
      github_updated_at: '2026-01-01T00:00:00Z',
      total_stars: 45,
      total_forks: 12,
      total_open_issues: 3,
      primary_language: 'JavaScript',
      language_breakdown: { JavaScript: 80, CSS: 20 },
      top_repositories: [
        { name: 'repo-1', stars: 30, forks: 8, language: 'JavaScript' },
        { name: 'repo-2', stars: 15, forks: 4, language: 'CSS' }
      ]
    };

    const inserted = await ProfileModel.saveOrUpdate(mockProfile);
    assert.ok(inserted, 'Inserted object should not be null');
    assert.strictEqual(inserted.username, testUsername);
    assert.strictEqual(inserted.name, 'Test Dev');
    assert.strictEqual(inserted.primary_language, 'JavaScript');
    assert.strictEqual(inserted.language_breakdown.JavaScript, 80);
    assert.strictEqual(inserted.top_repositories[0].name, 'repo-1');
    console.log('✅ saveOrUpdate (Insert) succeeded and verified.');

    // 4. Retrieve profile (Testing Select)
    console.log('🔍 Step 3: Testing ProfileModel.getByUsername...');
    const retrieved = await ProfileModel.getByUsername(testUsername);
    assert.ok(retrieved, 'Profile should be retrieved');
    assert.strictEqual(retrieved.name, 'Test Dev');
    console.log('✅ getByUsername retrieved correct details.');

    // 5. Update profile (Testing Update)
    console.log('✏️ Step 4: Testing ProfileModel.saveOrUpdate (Update)...');
    const updatedProfile = {
      ...mockProfile,
      name: 'Test Dev Updated',
      total_stars: 50
    };
    const updated = await ProfileModel.saveOrUpdate(updatedProfile);
    assert.ok(updated, 'Updated object should not be null');
    assert.strictEqual(updated.name, 'Test Dev Updated');
    assert.strictEqual(updated.total_stars, 50);
    console.log('✅ saveOrUpdate (Update) succeeded and verified.');

    // 6. Delete profile (Testing Delete)
    console.log('🗑️ Step 5: Testing ProfileModel.delete...');
    const deleted = await ProfileModel.delete(testUsername);
    assert.strictEqual(deleted, true, 'Delete should return true for deleted row');

    const retrievedAfterDelete = await ProfileModel.getByUsername(testUsername);
    assert.strictEqual(retrievedAfterDelete, null, 'Deleted profile should not exist in database');
    console.log('✅ delete completed and verified.');

    console.log('===================================================');
    console.log('🎉 All database integration tests passed successfully!');
    console.log('===================================================');
    
    // Explicitly close connection if sqlite, mysql pool closes on process exit
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

runTests();
