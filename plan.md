# Project: Interactive Interview Prep Tracker

## 1. Project Overview
Build a client-side only, Single Page Application (SPA) designed to track daily software engineering interview preparation. The application will be deployed on GitHub Pages. It must gamify the learning process using daily visual rings (similar to Apple Fitness) and a continuous streak calendar (similar to GitHub contributions). 

## 2. Tech Stack Requirements
*   **Frontend Framework:** Alpine.js (via CDN for reactive state management).
*   **Styling:** Tailwind CSS (via CDN).
*   **Icons:** FontAwesome or Heroicons (via CDN).
*   **Data Storage:** Browser `localStorage`.
*   **File Format:** JSON for importing/exporting state.
*   **Architecture:** Zero build-step required. Just `index.html`, `app.js`, `styles.css`, and local `.json` files.

## 3. Data Architecture
The application requires two primary data structures. Initialize these in state and persist them to `localStorage`.

### A. Question Bank (`question_bank.json`)
A static list of 100 interview questions and the Blind 75 DSA problems.
*   `tier_1_core`: Array of objects `{ id, topic, question, mastered: boolean }`
*   `tier_2_resume`: Array of objects `{ id, topic, question, mastered: boolean }`
*   `tier_3_leadership`: Array of objects `{ id, topic, question, mastered: boolean }`
*   `tier_4_system_design`: Array of objects `{ id, topic, question, mastered: boolean }`
*   `dsa_problems`: Array of objects `{ id, title, category, leetcode_url, completed: boolean }`

### B. User Progress (`user_state.json`)
Tracks daily activity, streaks, and current active tasks.
*   `current_streak`: Integer.
*   `longest_streak`: Integer.
*   `last_login_date`: String (YYYY-MM-DD).
*   `history`: Object keyed by date string (e.g., "2026-07-07"), containing:
    *   `rings`: Object tracking target vs completed for `dsa` (Red), `core_knowledge` (Green), and `architecture` (Blue).
    *   `daily_tasks`: Array of assigned task objects for that specific day.

## 4. Core Application Logic (The "Dealer")
On application load, check the current date against `last_login_date`. If it is a new day, execute the daily reset logic:
*   Check if yesterday's rings were closed. If yes, increment `current_streak`. If no, reset `current_streak` to 0.
*   Draw 1-2 incomplete problems from `dsa_problems`.
*   Draw 3 incomplete questions randomly from `tier_1_core` or `tier_2_resume`.
*   Draw 1 incomplete question randomly from `tier_3_leadership` or `tier_4_system_design`.
*   Populate the current day's `daily_tasks` array and save to `localStorage`.

## 5. UI/UX Components to Build

### A. The Dashboard (Daily Rings)
*   Create an SVG-based concentric ring component.
*   **Outer Ring (Red - DSA):** Stroke dashoffset maps to DSA task completion percentage.
*   **Middle Ring (Green - Core):** Stroke dashoffset maps to Tier 1/Tier 2 completion.
*   **Inner Ring (Blue - Architecture):** Stroke dashoffset maps to Tier 3/Tier 4 completion.
*   Ensure smooth CSS transitions when a user checks off a task and the ring fills.

### B. The Streak Calendar
*   Render a grid of squares representing the last 30-90 days.
*   Color mapping based on completion:
    *   0 rings closed: Gray/Empty
    *   1 ring closed: Light Green opacity (33%)
    *   2 rings closed: Medium Green opacity (66%)
    *   3 rings closed: Full Green opacity (100%)

### C. The Task Drawer (Interactive Flashcards)
*   Render the `daily_tasks` as clickable cards.
*   **DSA Cards:** Provide a link out to the problem, an input for `time_spent_mins`, and a dropdown for `difficulty` (Easy, Medium, Hard).
*   **Question Cards (Tiers 1-4):** Act as flashcards. Click to reveal the question. Provide two buttons: "Mark as Mastered" (removes from future draws) and "Needs Review" (keeps in the pool). 
*   Checking off a card must immediately update the Alpine.js state and animate the corresponding SVG ring.

## 6. Export and Sync Functionality
*   **Generate Sync Report:** Create a JavaScript function that compiles the last 7 days of `history` and the overall `question_bank` mastery stats into a formatted Markdown string.
*   Trigger a browser download of this generated string as `weekly_report.md`.
*   **Data Backup:** Provide a button to download the entire `localStorage` state as a `backup.json` file, and an input to upload/restore a backup file.


# UPDATES 2

## 3. Data Architecture Update

### A. Question Bank & Tips (`question_bank.json`)
Maintain the existing `tier_1_core`, `tier_2_resume`, `tier_3_leadership`, `tier_4_system_design`, and `dsa_problems` arrays.
* **NEW:** Add a `daily_tips` array containing strings of interview advice.

### B. User Progress (`user_state.json`)
The `history` object for the current day must explicitly track targets and completions for all three rings.
```json
"2026-07-08": {
  "rings": {
    "dsa": { "target": 2, "completed": 0, "color": "red" },
    "core_knowledge": { "target": 3, "completed": 0, "color": "green" },
    "architecture": { "target": 1, "completed": 0, "color": "blue" }
  },
  "daily_tasks": [ ... ],
  "daily_tip": "Speak in 'We' for teamwork, but 'I' for architecture decisions."
}


============== Some dump of discussion =============================

4. Core Application Logic (The "Dealer" & State Mapping)
The Daily Reset Logic
On application load, if it is a new day:

Draw incomplete problems to populate daily_tasks.

1-2 from dsa_problems (Category: DSA).

3 from tier_1_core or tier_2_resume (Category: Core).

1 from tier_3_leadership or tier_4_system_design (Category: Architecture).

Draw 1 random tip from the daily_tips array and save it to the day's state.

Explicit Ring State Mapping (CRITICAL FIX)
When a user interacts with a task card, Alpine.js MUST execute the following state updates:

DSA Card: When marked "Completed" -> Increment rings.dsa.completed.

Core Card (Tiers 1 & 2): When clicked "Mark as Mastered" OR "Needs Review" (both count as finishing the daily rep) -> Increment rings.core_knowledge.completed.

Architecture Card (Tiers 3 & 4): When clicked "Mark as Mastered" OR "Needs Review" -> Increment rings.architecture.completed.

5. UI/UX Components to Build
A. The Dashboard (Daily Rings)
Outer Ring (Red - DSA): (rings.dsa.completed / rings.dsa.target) * 100

Middle Ring (Green - Core): (rings.core_knowledge.completed / rings.core_knowledge.target) * 100

Inner Ring (Blue - Architecture): (rings.architecture.completed / rings.architecture.target) * 100

Bind the SVG stroke-dashoffset directly to these calculated percentages using Alpine.js :style bindings to ensure they animate instantly when a task button is clicked.

B. The Daily Tip Widget (NEW)
Render a clean, subtle banner above the Task Drawer displaying the daily_tip string for the current day. Include a lightbulb icon.

C. The Task Drawer (Interactive Flashcards)
Render the daily_tasks as clickable cards.

Ensure the buttons on the flashcards (Mark as Mastered, Needs Review) fire a single Alpine method (e.g., completeTask(taskId, category)) that handles BOTH marking the task done AND incrementing the correct ring integer.

6. Export and Sync Functionality
Maintain the JavaScript function that compiles the last 7 days of history into a formatted Markdown string (weekly_report.md) for download.


***

### The Daily Tips JSON Array
Here is a curated array of daily tips to append to your `question_bank.json`. I've tailored these to highlight technical leadership, system design failovers, and backend optimization to keep your mind anchored in senior-level execution.

```json
  "daily_tips": [
    "When explaining system design, always start with clarifying requirements before drawing a single box.",
    "Speak in 'We' for teamwork and cross-functional success, but strictly use 'I' when detailing architecture decisions and code you wrote.",
    "If asked about third-party API outages, immediately pivot to discussing circuit breakers, failovers, and vendor chaining.",
    "Don't just mention a tech stack like HTMX and Alpine.js; explain the business value, like reducing feature delivery time or cutting SaaS costs.",
    "In behavioral rounds, use the STAR method (Situation, Task, Action, Result). Always end with a quantifiable metric.",
    "When discussing database scaling, clearly articulate the tipping point where you would choose database sharding over primary-replica read/write splitting.",
    "Admit when you don't know the exact syntax for a DSA problem, but verbally explain the optimal time and space complexity you are aiming for.",
    "Security isn't an afterthought. Mention rate-limiting, request throttling, and payload validation early in any API design prompt.",
    "When asked about handling underperformers or mentoring, emphasize building internal tools or hands-on environments (like CTFs) to safely build skills.",
    "Silence is fine during a whiteboard session. Say 'I'm going to take 30 seconds to think about the edge cases here,' and then actually take it."
  ]