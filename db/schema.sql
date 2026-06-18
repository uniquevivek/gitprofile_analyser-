-- MySQL Database Schema for GitHub Profile Analyzer

-- Create Database
CREATE DATABASE IF NOT EXISTS github_analyzer;
USE github_analyzer;

-- Drop table if exists (for reset purposes, use with caution)
-- DROP TABLE IF EXISTS profiles;

-- Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255),
    avatar_url VARCHAR(255),
    bio TEXT,
    blog VARCHAR(255),
    location VARCHAR(255),
    public_repos INT DEFAULT 0,
    public_gists INT DEFAULT 0,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    github_created_at DATETIME,
    github_updated_at DATETIME,
    total_stars INT DEFAULT 0,
    total_forks INT DEFAULT 0,
    total_open_issues INT DEFAULT 0,
    primary_language VARCHAR(100),
    language_breakdown JSON, -- Stores language percentage analysis
    top_repositories JSON,   -- Stores top starred repos information
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
