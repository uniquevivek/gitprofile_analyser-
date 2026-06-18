# GitHub Profile Analyzer API & Dashboard

A comprehensive, production-ready Node.js & Express.js backend application that fetches developer profile details from the GitHub Public API, calculates deep analytics insights (aggregate stars, forks, open issues, repository language percentage breakdowns, and top starred repositories), and stores them in a database. It features a beautiful, dynamic **glassmorphism Frontend Dashboard** to search, explore, and compare profiles side-by-side.

Designed with dual-database support, it can run out-of-the-box using **SQLite** (zero-configuration local database) or connect to a standard **MySQL** server.

---

## 🚀 Key Features

*   **GitHub API Integration**: Fetches public user profile details and up to 100 repositories.
*   **Deep Insight Calculations**:
    *   Total stars accumulated across repositories.
    *   Total forks received.
    *   Total open issues.
    *   Primary language detection.
    *   Exact language distribution percentage breakdown.
    *   Top 5 most starred repositories.
*   **Aesthetic Frontend Dashboard (SPA)**:
    *   Sleek dark mode glassmorphism UI with smooth CSS transitions.
    *   **Insights Panel**: Renders interactive language breakdown doughnut charts (using Chart.js) and progress bars.
    *   **Side-by-Side Compare Mode**: Compare statistics of two developer profiles, highlighting the "winner" for each stat and rendering a comparison bar chart.
*   **Intelligent Caching Policy**: Database records act as a cache. Fresh fetches are skipped if a profile was analyzed in the last hour, reducing API calls and rate-limiting. A `?force=true` parameter bypasses the cache.
*   **Dual Database Layer**: Supports both MySQL (assignment requirement) and SQLite (easy local testing) via an environment variable switch.
*   **Database Integration Tests**: Verification scripts to test connection and model CRUD operations immediately.

---

## 🛠️ Tech Stack

*   **Backend**: Node.js, Express.js
*   **Database**: MySQL, SQLite (via conditional driver wrapper)
*   **Third-Party API**: GitHub REST API (with rate-limiting support)
*   **Frontend**: HTML5, CSS3 (Vanilla CSS Custom Styling), JavaScript (Vanilla ES6), Chart.js (CDN), FontAwesome (CDN)

---

## 📁 Project Structure

```text
Gitprofile_analysis/
├── config/
│   └── database.js      # Dynamic MySQL/SQLite database connection pool wrapper
├── controllers/
│   └── profileController.js # API controllers (validates inputs, coordinates cache, saves models)
├── db/
│   └── schema.sql       # MySQL Database Schema file
├── models/
│   └── profileModel.js  # CRUD database queries supporting JSON serialization
├── postman/
│   └── GitProfileAnalyzer.postman_collection.json # Postman testing collection
├── public/              # Static Frontend Dashboard files
│   ├── app.js           # Client-side state manager, comparisons, and Chart.js graphs
│   ├── index.html       # Single Page Application skeleton
│   └── style.css        # Rich Glassmorphism Dark Theme styling
├── routes/
│   └── profileRoutes.js # Express API endpoint routing
├── test/
│   └── db.test.js       # Database model integration test suite
├── .env.example         # Template for environment configuration
├── .env                 # Active environment settings
├── package.json         # Dependencies & scripts
└── server.js            # Main application entry point
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16+ recommended).

### 2. Clone & Install Dependencies
Navigate into the project directory and install the packages:
```bash
npm install
```

### 3. Environment Configuration (`.env`)
The project contains an `.env.example` file. Copy this file to create your local `.env`:
```bash
copy .env.example .env
```

Open `.env` and adjust settings. By default, the application is set to use SQLite:
```env
# Server configuration
PORT=3000

# Choose database: sqlite or mysql
DB_TYPE=sqlite
DB_FILE=database.sqlite
```

#### Running on MySQL (Optional)
If you want to run the application on MySQL instead of SQLite:
1. Update `.env`:
   ```env
   DB_TYPE=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_DATABASE=github_analyzer
   ```
2. Import the database schema from the [schema.sql](file:///c:/Users/Vivek%20Kumar%20Sharma/Desktop/Gitprofile_analysis/db/schema.sql) file:
   ```bash
   mysql -u your_mysql_username -p < db/schema.sql
   ```

#### GitHub Personal Access Token (PAT)
Unauthenticated GitHub API calls are limited to 60 requests/hour. To increase this limit to 5000 requests/hour, generate a classic token on GitHub (no scopes needed for public profiles) and add it to `.env`:
```env
GITHUB_TOKEN=your_github_personal_access_token
```

---

## 🧪 Running Verification Tests

To verify your database connection, table initialization, and model CRUD operations, run the automated integration test script:
```bash
npm test
```
The test suite will check:
*   Database connectivity
*   Adding a mock profile (`ProfileModel.saveOrUpdate` - Insert)
*   Retrieving the profile (`ProfileModel.getByUsername` - Select)
*   Updating metrics (`ProfileModel.saveOrUpdate` - Update)
*   Deleting the mock profile (`ProfileModel.delete` - Delete)

---

## 🏃 Running the Application

### Start Development Server (Auto-reload)
```bash
npm run dev
```

### Start Production Server
```bash
npm start
```

Once started, open your web browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📡 REST API Documentation

All API endpoints are prefixed with `/api`.

### 1. Analyze and Store Profile
*   **Endpoint**: `POST /api/profiles/:username`
*   **Description**: Queries GitHub API for the specified username, calculates analytics, and stores it in the database. Returns the database record. If already analyzed in the last hour, returns the cached database record.
*   **Query Parameters**:
    *   `force=true` (optional): Bypasses the 1-hour database cache and forces a fresh query to GitHub API.
*   **Response (200 OK / 201 Created)**:
    ```json
    {
      "success": true,
      "source": "github", // 'github' (fresh) or 'cache' (retrieved from db cache)
      "message": "Profile analyzed and saved successfully.",
      "data": {
        "id": 1,
        "username": "torvalds",
        "name": "Linus Torvalds",
        "avatar_url": "https://avatars.githubusercontent.com/u/1024?v=4",
        "bio": "The Linux Kernel creator",
        "blog": "http://kernel.org",
        "location": "Portland, OR",
        "public_repos": 6,
        "public_gists": 0,
        "followers": 195000,
        "following": 0,
        "github_created_at": "2011-09-03T15:25:12.000Z",
        "github_updated_at": "2026-06-15T12:00:00.000Z",
        "total_stars": 125,
        "total_forks": 50,
        "total_open_issues": 10,
        "primary_language": "C",
        "language_breakdown": { "C": 85.5, "Makefile": 10.5, "Shell": 4.0 },
        "top_repositories": [
          { "name": "linux", "description": "Linux kernel source tree", "html_url": "...", "stars": 165000, "forks": 49000, "language": "C" }
        ],
        "analyzed_at": "2026-06-18T17:45:00.000Z"
      }
    }
    ```

### 2. List All Stored Profiles
*   **Endpoint**: `GET /api/profiles`
*   **Description**: Retrieves list summaries of all GitHub profiles previously analyzed and stored in the database.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "count": 1,
      "data": [
        {
          "id": 1,
          "username": "torvalds",
          "name": "Linus Torvalds",
          "avatar_url": "https://avatars.githubusercontent.com/u/1024?v=4",
          "public_repos": 6,
          "total_stars": 125,
          "followers": 195000,
          "primary_language": "C",
          "analyzed_at": "2026-06-18T17:45:00.000Z"
        }
      ]
    }
    ```

### 3. Fetch Data of a Single Profile
*   **Endpoint**: `GET /api/profiles/:username`
*   **Description**: Retrieves the complete saved profile detail and calculated insights from the database for the given username.
*   **Response (200 OK)**:
    Returns the same format as `data` object in `POST /api/profiles/:username`.
*   **Response (404 Not Found)**:
    If profile is not already analyzed:
    ```json
    {
      "success": false,
      "error": "Profile for \"torvalds\" has not been analyzed yet. Use POST /api/profiles/torvalds to analyze."
    }
    ```

### 4. Delete Stored Profile
*   **Endpoint**: `DELETE /api/profiles/:username`
*   **Description**: Removes the developer's analyzed profile record from the database.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Profile for \"torvalds\" deleted successfully."
    }
    ```

---

## 📮 Postman Collection

A Postman collection is available inside the project:
📄 [GitProfileAnalyzer.postman_collection.json](file:///c:/Users/Vivek%20Kumar%20Sharma/Desktop/Gitprofile_analysis/postman/GitProfileAnalyzer.postman_collection.json)

### Importing to Postman:
1. Open Postman.
2. Click **Import** in the top left.
3. Drag and drop the `GitProfileAnalyzer.postman_collection.json` file.
4. Set the `base_url` collection variable if you changed the server port (defaults to `http://localhost:3000`).

---

## 🗄️ Database Schema & Storage
The application abstracts the database queries, supporting MySQL's native `JSON` type and SQLite's text serialization.

### Tables
#### `profiles` Table structure:
| Column | MySQL Type | SQLite Type | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INT AUTO_INCREMENT` | `INTEGER PRIMARY KEY` | Internal Primary Key |
| `username` | `VARCHAR(100) UNIQUE` | `TEXT UNIQUE` | GitHub login handle (Index for search) |
| `name` | `VARCHAR(255)` | `TEXT` | GitHub Profile display name |
| `avatar_url` | `VARCHAR(255)` | `TEXT` | GitHub Avatar URL |
| `bio` | `TEXT` | `TEXT` | Profile bio text |
| `blog` | `VARCHAR(255)` | `TEXT` | Developer website URL |
| `location` | `VARCHAR(255)` | `TEXT` | Geographic location |
| `public_repos` | `INT` | `INTEGER` | Total public repositories count on GitHub |
| `public_gists` | `INT` | `INTEGER` | Total public gists |
| `followers` | `INT` | `INTEGER` | Followers count |
| `following` | `INT` | `INTEGER` | Following count |
| `github_created_at`| `DATETIME` | `TEXT` | Timestamp when user joined GitHub |
| `github_updated_at`| `DATETIME` | `TEXT` | Timestamp when user updated GitHub profile |
| `total_stars` | `INT` | `INTEGER` | Calculated sum of stars across repositories |
| `total_forks` | `INT` | `INTEGER` | Calculated sum of forks received |
| `total_open_issues`| `INT` | `INTEGER` | Calculated sum of open issues |
| `primary_language` | `VARCHAR(100)` | `TEXT` | Language used in most repositories |
| `language_breakdown`| `JSON` | `TEXT` | JSON object containing languages and percentages |
| `top_repositories` | `JSON` | `TEXT` | List containing top 5 starred repos |
| `analyzed_at` | `TIMESTAMP` | `TIMESTAMP` | Server timestamp when analysis completed |
