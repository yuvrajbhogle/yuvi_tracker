/* Alpine.js Application Logic for Yuvi Tracker - Interactive Interview Prep Tracker */

document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    questionBank: null,
    userState: null,
    todayStr: '',
    contributionDays: [],
    loading: true,
    darkMode: true,
    showBackupModal: false,
    showReportModal: false,
    reportMarkdown: '',
    
    // Mock Interview State
    showMockModal: false,
    mockTimeRemaining: 2700,
    mockQuestions: [],
    mockAnswers: { dsa: '', core: '', arch: '' },
    mockIsActive: false,
    mockInterval: null,
    explorerTab: 'tier_1_core',
    explorerSearch: '',
    
    // Stats overview
    masteredCount: 0,
    totalQuestions: 100,
    dsaCompletedCount: 0,
    totalDsa: 75,
    
    async init() {
      // Set theme
      if (localStorage.getItem('theme') === 'light') {
        this.darkMode = false;
        document.documentElement.classList.remove('dark');
      } else {
        this.darkMode = true;
        document.documentElement.classList.add('dark');
      }

      this.todayStr = new Date().toLocaleDateString('sv'); // YYYY-MM-DD local time
      
      // 1. Load Question Bank
      const localQBank = localStorage.getItem('prep_tracker_question_bank');
      if (localQBank) {
        this.questionBank = JSON.parse(localQBank);
      } else {
        try {
          const res = await fetch('question_bank.json');
          if (!res.ok) throw new Error("Could not fetch question_bank.json");
          this.questionBank = await res.json();
          localStorage.setItem('prep_tracker_question_bank', JSON.stringify(this.questionBank));
        } catch (err) {
          console.error("Failed to load question bank:", err);
          // Alert fallback
          alert("Error loading question_bank.json. Please check console.");
          return;
        }
      }

      // 2. Load User State
      const localUserState = localStorage.getItem('prep_tracker_user_state');
      if (localUserState) {
        this.userState = JSON.parse(localUserState);
        if (!this.userState.notes) {
          this.userState.notes = {};
        }
      } else {
        this.userState = {
          current_streak: 0,
          longest_streak: 0,
          last_login_date: '',
          history: {},
          notes: {}
        };
      }

      // 3. Run the Dealer Logic
      this.runDealer();

      // 4. Update stats and calendar
      this.updateStats();
      this.contributionDays = this.getContributionDays();
      
      this.loading = false;
    },

    toggleTheme() {
      this.darkMode = !this.darkMode;
      if (this.darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    },

    // Save state helper
    saveState() {
      localStorage.setItem('prep_tracker_question_bank', JSON.stringify(this.questionBank));
      localStorage.setItem('prep_tracker_user_state', JSON.stringify(this.userState));
      this.updateStats();
    },

    // Update derived statistics
    updateStats() {
      if (!this.questionBank) return;
      
      // Calculate mastered tier questions
      const qBank = this.questionBank;
      const t1 = qBank.tier_1_core.filter(q => q.mastered).length;
      const t2 = qBank.tier_2_resume.filter(q => q.mastered).length;
      const t3 = qBank.tier_3_leadership.filter(q => q.mastered).length;
      const t4 = qBank.tier_4_system_design.filter(q => q.mastered).length;
      
      this.masteredCount = t1 + t2 + t3 + t4;
      this.totalQuestions = qBank.tier_1_core.length + qBank.tier_2_resume.length + 
                            qBank.tier_3_leadership.length + qBank.tier_4_system_design.length;
      
      // Calculate completed DSA problems
      this.dsaCompletedCount = qBank.dsa_problems.filter(p => p.completed).length;
      this.totalDsa = qBank.dsa_problems.length;
    },

    // Date calculations mid-day to avoid TZ shifting bugs
    getYesterdayStr(dateStr) {
      const d = new Date(dateStr + "T12:00:00");
      d.setDate(d.getDate() - 1);
      return d.toLocaleDateString('sv');
    },

    // Core Dealer logic executed on app load
    runDealer() {
      const todayStr = this.todayStr;
      const lastLogin = this.userState.last_login_date;

      if (!lastLogin) {
        // App opened for the very first time
        this.userState.last_login_date = todayStr;
        const dailyTasks = this.drawDailyTasks();
        const dsaCount = dailyTasks.filter(t => t.type === 'dsa').length;
        const dailyTip = this.drawDailyTip();

        this.userState.history[todayStr] = {
          rings: {
            dsa: { target: dsaCount, completed: 0, color: "red" },
            core_knowledge: { target: 3, completed: 0, color: "green" },
            architecture: { target: 1, completed: 0, color: "blue" }
          },
          daily_tasks: dailyTasks,
          daily_tip: dailyTip
        };
        
        this.calculateStreaks();
        this.saveState();
      } else if (lastLogin !== todayStr) {
        // First login of a new day
        
        // Dynamic streak calculator handles yesterday checks,
        // we just set the new login date.
        this.userState.last_login_date = todayStr;

        // Draw fresh tasks for the new day
        const dailyTasks = this.drawDailyTasks();
        const dsaCount = dailyTasks.filter(t => t.type === 'dsa').length;
        const dailyTip = this.drawDailyTip();

        this.userState.history[todayStr] = {
          rings: {
            dsa: { target: dsaCount, completed: 0, color: "red" },
            core_knowledge: { target: 3, completed: 0, color: "green" },
            architecture: { target: 1, completed: 0, color: "blue" }
          },
          daily_tasks: dailyTasks,
          daily_tip: dailyTip
        };

        this.calculateStreaks();
        this.saveState();
      } else {
        // Same day login/reload
        // Safely check if today's history structure is intact
        if (!this.userState.history[todayStr]) {
          const dailyTasks = this.drawDailyTasks();
          const dsaCount = dailyTasks.filter(t => t.type === 'dsa').length;
          const dailyTip = this.drawDailyTip();
          
          this.userState.history[todayStr] = {
            rings: {
              dsa: { target: dsaCount, completed: 0, color: "red" },
              core_knowledge: { target: 3, completed: 0, color: "green" },
              architecture: { target: 1, completed: 0, color: "blue" }
            },
            daily_tasks: dailyTasks,
            daily_tip: dailyTip
          };
        }
        this.calculateStreaks();
      }
    },

    // Draws fresh daily tasks
    drawDailyTasks() {
      const qBank = this.questionBank;
      
      // 1. Draw 1-2 incomplete problems from dsa_problems
      let incompleteDsa = qBank.dsa_problems.filter(p => !p.completed);
      if (incompleteDsa.length === 0) {
        incompleteDsa = qBank.dsa_problems; // Fallback to all if everything is completed
      }
      const numDsaToDraw = Math.floor(Math.random() * 2) + 1; // 1 or 2
      const selectedDsa = this.getRandomElements(incompleteDsa, Math.min(numDsaToDraw, incompleteDsa.length));
      
      // 2. Draw 3 incomplete questions randomly from tier_1_core or tier_2_resume
      let corePool = [...qBank.tier_1_core, ...qBank.tier_2_resume].filter(q => !q.mastered);
      if (corePool.length === 0) {
        corePool = [...qBank.tier_1_core, ...qBank.tier_2_resume];
      }
      const selectedCore = this.getRandomElements(corePool, Math.min(3, corePool.length));

      // 3. Draw 1 incomplete question randomly from tier_3_leadership or tier_4_system_design
      let archPool = [...qBank.tier_3_leadership, ...qBank.tier_4_system_design].filter(q => !q.mastered);
      if (archPool.length === 0) {
        archPool = [...qBank.tier_3_leadership, ...qBank.tier_4_system_design];
      }
      const selectedArch = this.getRandomElements(archPool, Math.min(1, archPool.length));

      const dailyTasks = [];
      
      // Push selected items with default task fields
      selectedDsa.forEach(p => {
        dailyTasks.push({
          id: p.id,
          type: 'dsa',
          title: p.title,
          category: p.category,
          leetcode_url: p.leetcode_url,
          completed: false,
          time_spent_mins: 0,
          difficulty: 'Medium'
        });
      });

      selectedCore.forEach(q => {
        const isTier1 = qBank.tier_1_core.some(x => x.id === q.id);
        const tierTitle = isTier1 ? 'Tier 1: Core Knowledge' : 'Tier 2: Resume & Experience';
        dailyTasks.push({
          id: q.id,
          type: 'core',
          title: tierTitle,
          question: q.question,
          category: q.topic,
          completed: false,
          mastered: false,
          needs_review: false,
          revealed: false
        });
      });

      selectedArch.forEach(q => {
        const isTier3 = qBank.tier_3_leadership.some(x => x.id === q.id);
        const tierTitle = isTier3 ? 'Tier 3: Leadership' : 'Tier 4: System Design';
        dailyTasks.push({
          id: q.id,
          type: 'architecture',
          title: tierTitle,
          question: q.question,
          category: q.topic,
          completed: false,
          mastered: false,
          needs_review: false,
          revealed: false
        });
      });

      return dailyTasks;
    },

    // Shuffles and slices array
    getRandomElements(arr, count) {
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    },

    // Draws 1 random tip from the daily_tips array
    drawDailyTip() {
      const qBank = this.questionBank;
      if (qBank && qBank.daily_tips && qBank.daily_tips.length > 0) {
        const idx = Math.floor(Math.random() * qBank.daily_tips.length);
        return qBank.daily_tips[idx];
      }
      return "When explaining system design, always start with clarifying requirements before drawing a single box.";
    },

    // Dynamic streak calculation based on the actual history record
    calculateStreaks() {
      const history = this.userState.history;
      const todayStr = this.todayStr;
      const yesterdayStr = this.getYesterdayStr(todayStr);

      const isCompleted = (dateStr) => {
        const entry = history[dateStr];
        if (!entry || !entry.rings) return false;
        const r = entry.rings;
        return (r.dsa.completed >= r.dsa.target) &&
               (r.core_knowledge.completed >= r.core_knowledge.target) &&
               (r.architecture.completed >= r.architecture.target);
      };

      // Current Streak Calculation
      let current = 0;
      let startFromToday = isCompleted(todayStr);
      let startFromYesterday = isCompleted(yesterdayStr);

      if (startFromToday) {
        current = 1;
        let d = new Date(todayStr + "T12:00:00");
        d.setDate(d.getDate() - 1);
        while (true) {
          const dStr = d.toLocaleDateString('sv');
          if (isCompleted(dStr)) {
            current++;
            d.setDate(d.getDate() - 1);
          } else {
            break;
          }
        }
      } else if (startFromYesterday) {
        current = 1;
        let d = new Date(yesterdayStr + "T12:00:00");
        d.setDate(d.getDate() - 1);
        while (true) {
          const dStr = d.toLocaleDateString('sv');
          if (isCompleted(dStr)) {
            current++;
            d.setDate(d.getDate() - 1);
          } else {
            break;
          }
        }
      } else {
        current = 0;
      }

      this.userState.current_streak = current;

      // Longest Streak Calculation across entire history
      const dates = Object.keys(history).sort();
      let longest = 0;
      let tempStreak = 0;

      if (dates.length > 0) {
        const oldestStr = dates[0];
        const oldestDate = new Date(oldestStr + "T12:00:00");
        const todayDate = new Date(todayStr + "T12:00:00");
        
        let d = new Date(oldestDate);
        while (d <= todayDate) {
          const dStr = d.toLocaleDateString('sv');
          if (isCompleted(dStr)) {
            tempStreak++;
            if (tempStreak > longest) {
              longest = tempStreak;
            }
          } else {
            tempStreak = 0;
          }
          d.setDate(d.getDate() + 1);
        }
      }

      this.userState.longest_streak = Math.max(longest, this.userState.longest_streak || 0);
    },

    // Task Actions
    toggleDsaTask(task) {
      task.completed = !task.completed;
      
      // Update in static list
      const problem = this.questionBank.dsa_problems.find(p => p.id === task.id);
      if (problem) {
        problem.completed = task.completed;
      }

      // Update current day's rings
      const todayEntry = this.userState.history[this.todayStr];
      todayEntry.rings.dsa.completed = todayEntry.daily_tasks.filter(t => t.type === 'dsa' && t.completed).length;

      this.calculateStreaks();
      this.saveState();
    },

    completeTask(task, status) {
      task.completed = true;
      task.revealed = false;
      
      if (status === 'mastered') {
        task.mastered = true;
        task.needs_review = false;
        this.setQuestionMastery(task.id, true);
      } else if (status === 'review') {
        task.mastered = false;
        task.needs_review = true;
        this.setQuestionMastery(task.id, false);
      }

      // Update current day's rings
      const todayEntry = this.userState.history[this.todayStr];
      if (task.type === 'core') {
        todayEntry.rings.core_knowledge.completed = todayEntry.daily_tasks.filter(t => t.type === 'core' && t.completed).length;
      } else if (task.type === 'architecture') {
        todayEntry.rings.architecture.completed = todayEntry.daily_tasks.filter(t => t.type === 'architecture' && t.completed).length;
      } else if (task.type === 'dsa') {
        todayEntry.rings.dsa.completed = todayEntry.daily_tasks.filter(t => t.type === 'dsa' && t.completed).length;
      }

      this.calculateStreaks();
      this.saveState();
    },

    masterTask(task) {
      this.completeTask(task, 'mastered');
    },

    reviewTask(task) {
      this.completeTask(task, 'review');
    },

    undoTask(task) {
      task.completed = false;
      task.mastered = false;
      task.needs_review = false;
      task.revealed = false;

      // Reset in question bank
      this.setQuestionMastery(task.id, false);

      // Update current day's rings
      const todayEntry = this.userState.history[this.todayStr];
      if (task.type === 'core') {
        todayEntry.rings.core_knowledge.completed = todayEntry.daily_tasks.filter(t => t.type === 'core' && t.completed).length;
      } else {
        todayEntry.rings.architecture.completed = todayEntry.daily_tasks.filter(t => t.type === 'architecture' && t.completed).length;
      }

      this.calculateStreaks();
      this.saveState();
    },

    setQuestionMastery(id, isMastered) {
      const qBank = this.questionBank;
      let q = qBank.tier_1_core.find(x => x.id === id);
      if (!q) q = qBank.tier_2_resume.find(x => x.id === id);
      if (!q) q = qBank.tier_3_leadership.find(x => x.id === id);
      if (!q) q = qBank.tier_4_system_design.find(x => x.id === id);
      
      if (q) {
        q.mastered = isMastered;
      }
    },

    // Ring Calculations
    getRingOffset(type) {
      if (!this.userState || !this.userState.history || !this.todayStr) {
        return type === 'dsa' ? 502.65 : type === 'core' ? 376.99 : 251.33;
      }
      const todayEntry = this.userState.history[this.todayStr];
      if (!todayEntry || !todayEntry.rings) {
        return type === 'dsa' ? 502.65 : type === 'core' ? 376.99 : 251.33;
      }
      
      let ring, circumference;
      if (type === 'dsa') {
        ring = todayEntry.rings.dsa;
        circumference = 502.65; // 2 * pi * r(80)
      } else if (type === 'core') {
        ring = todayEntry.rings.core_knowledge;
        circumference = 376.99; // 2 * pi * r(60)
      } else if (type === 'architecture') {
        ring = todayEntry.rings.architecture;
        circumference = 251.33; // 2 * pi * r(40)
      }
      
      if (!ring || ring.target === 0) return circumference;
      const pct = Math.min(ring.completed / ring.target, 1);
      return circumference * (1 - pct);
    },

    getRingPercent(type) {
      if (!this.userState || !this.userState.history || !this.todayStr) return 0;
      const todayEntry = this.userState.history[this.todayStr];
      if (!todayEntry || !todayEntry.rings) return 0;
      
      let ring;
      if (type === 'dsa') ring = todayEntry.rings.dsa;
      else if (type === 'core') ring = todayEntry.rings.core_knowledge;
      else if (type === 'architecture') ring = todayEntry.rings.architecture;
      
      if (!ring || ring.target === 0) return 0;
      return Math.round((ring.completed / ring.target) * 100);
    },

    getClosedRingsCount(dateStr) {
      if (!this.userState || !this.userState.history) return 0;
      const entry = this.userState.history[dateStr];
      if (!entry || !entry.rings) return 0;
      const rings = entry.rings;
      let closed = 0;
      if (rings.dsa && rings.dsa.completed >= rings.dsa.target && rings.dsa.target > 0) closed++;
      if (rings.core_knowledge && rings.core_knowledge.completed >= rings.core_knowledge.target && rings.core_knowledge.target > 0) closed++;
      if (rings.architecture && rings.architecture.completed >= rings.architecture.target && rings.architecture.target > 0) closed++;
      return closed;
    },

    getCalendarClass(dateStr) {
      const count = this.getClosedRingsCount(dateStr);
      if (count === 0) {
        return this.darkMode 
          ? 'bg-slate-800/40 border border-slate-700/20 text-transparent' 
          : 'bg-slate-100 border border-slate-200/60 text-transparent';
      }
      if (count === 1) {
        return this.darkMode 
          ? 'bg-emerald-500/20 border border-emerald-500/20 text-emerald-500/60' 
          : 'bg-emerald-100 border border-emerald-200 text-emerald-700';
      }
      if (count === 2) {
        return this.darkMode 
          ? 'bg-emerald-500/50 border border-emerald-500/40 text-emerald-200' 
          : 'bg-emerald-200 border border-emerald-300 text-emerald-800';
      }
      return this.darkMode 
        ? 'bg-emerald-500 border border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
        : 'bg-emerald-500 border border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.2)]';
    },

    // Contribution Days for Calendar (exact last 91 days - grid of 13 weeks * 7 days)
    getContributionDays() {
      const days = [];
      const today = new Date();
      // Calculate how many days we need to go back to find the Sunday 13 weeks ago
      // (so that we start neatly on Sunday)
      const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
      const totalDaysToDraw = 91; // 13 weeks
      
      for (let i = totalDaysToDraw - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toLocaleDateString('sv');
        
        // Find if they closed any rings
        const ringsClosed = this.getClosedRingsCount(dateStr);
        const entry = this.userState && this.userState.history ? this.userState.history[dateStr] : null;
        
        let details = 'No activity';
        if (entry && entry.rings) {
          details = `DSA: ${entry.rings.dsa.completed}/${entry.rings.dsa.target}, ` +
                    `Core: ${entry.rings.core_knowledge.completed}/${entry.rings.core_knowledge.target}, ` +
                    `Arch: ${entry.rings.architecture.completed}/${entry.rings.architecture.target}`;
        }

        days.push({
          dateStr: dateStr,
          displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          ringsClosed: ringsClosed,
          details: details
        });
      }
      return days;
    },

    // Sync Report (last 7 days of history and mastery stats formatted as Markdown)
    generateWeeklyReport() {
      const today = new Date();
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        last7Days.push(d.toLocaleDateString('sv'));
      }

      let markdown = `# 🚀 Yuvi Tracker - Weekly Preparation Sync Report\n`;
      markdown += `*Generated on: ${new Date().toLocaleString()}*\n\n`;
      
      markdown += `## 📊 Overall Progress Summary\n`;
      markdown += `- **Current Streak:** 🔥 ${this.userState.current_streak} days\n`;
      markdown += `- **Longest Streak:** 🏆 ${this.userState.longest_streak} days\n`;
      markdown += `- **Mastery (Tiers 1-4):** 🧠 ${this.masteredCount} / ${this.totalQuestions} questions (${Math.round((this.masteredCount / this.totalQuestions) * 100)}%)\n`;
      markdown += `- **DSA Problems:** 💻 ${this.dsaCompletedCount} / ${this.totalDsa} problems (${Math.round((this.dsaCompletedCount / this.totalDsa) * 100)}%)\n\n`;

      markdown += `### Category Breakdown\n`;
      const qBank = this.questionBank;
      const t1 = qBank.tier_1_core.filter(q => q.mastered).length;
      const t2 = qBank.tier_2_resume.filter(q => q.mastered).length;
      const t3 = qBank.tier_3_leadership.filter(q => q.mastered).length;
      const t4 = qBank.tier_4_system_design.filter(q => q.mastered).length;
      markdown += `- **Tier 1 (Core Knowledge):** ${t1} / ${qBank.tier_1_core.length} mastered\n`;
      markdown += `- **Tier 2 (Resume & Experience):** ${t2} / ${qBank.tier_2_resume.length} mastered\n`;
      markdown += `- **Tier 3 (Leadership):** ${t3} / ${qBank.tier_3_leadership.length} mastered\n`;
      markdown += `- **Tier 4 (System Design):** ${t4} / ${qBank.tier_4_system_design.length} mastered\n`;
      markdown += `- **Blind 75 DSA:** ${this.dsaCompletedCount} / ${qBank.dsa_problems.length} completed\n\n`;

      markdown += `## 📅 Last 7 Days Log\n\n`;
      markdown += `| Date | DSA Progress | Core Progress | Architecture Progress | Status |\n`;
      markdown += `| :--- | :--- | :--- | :--- | :--- |\n`;

      last7Days.forEach(date => {
        const entry = this.userState.history[date];
        if (entry && entry.rings) {
          const r = entry.rings;
          const dsaPct = r.dsa.target > 0 ? Math.round((r.dsa.completed / r.dsa.target) * 100) : 100;
          const corePct = r.core_knowledge.target > 0 ? Math.round((r.core_knowledge.completed / r.core_knowledge.target) * 100) : 100;
          const archPct = r.architecture.target > 0 ? Math.round((r.architecture.completed / r.architecture.target) * 100) : 100;
          
          const closed = (r.dsa.completed >= r.dsa.target) &&
                         (r.core_knowledge.completed >= r.core_knowledge.target) &&
                         (r.architecture.completed >= r.architecture.target);
                         
          const statusStr = closed ? "🔥 Closed" : "⏳ Incomplete";
          
          markdown += `| ${date} | ${r.dsa.completed}/${r.dsa.target} (${dsaPct}%) | ${r.core_knowledge.completed}/${r.core_knowledge.target} (${corePct}%) | ${r.architecture.completed}/${r.architecture.target} (${archPct}%) | ${statusStr} |\n`;
        } else {
          markdown += `| ${date} | - | - | - | 💤 No Session |\n`;
        }
      });
      
      markdown += `\n## 📝 Day-by-Day Activity Details\n\n`;
      last7Days.forEach(date => {
        markdown += `### 🗓️ Date: ${date}\n`;
        const entry = this.userState.history[date];
        if (entry && entry.daily_tasks && entry.daily_tasks.length > 0) {
          entry.daily_tasks.forEach(task => {
            const checkSym = task.completed ? "✅" : "❌";
            if (task.type === 'dsa') {
              markdown += `- ${checkSym} **[DSA]** ${task.category}: *${task.title}* | Time: ${task.time_spent_mins || 0} mins | Difficulty: ${task.difficulty || 'Medium'} | [LeetCode](${task.leetcode_url})\n`;
            } else {
              const tag = task.type === 'core' ? 'Core' : 'Architecture';
              const masteredTag = task.mastered ? "(Mastered)" : task.needs_review ? "(Needs Review)" : "";
              markdown += `- ${checkSym} **[${tag}]** ${task.title} (${task.category}): *${task.question}* ${masteredTag}\n`;
            }
          });
        } else {
          markdown += `*No tasks recorded.*\n`;
        }
        markdown += `\n`;
      });

      markdown += `\n---\n*Keep crushing it! Generated by Yuvi Tracker.*`;
      
      this.reportMarkdown = markdown;
      this.showReportModal = true;
    },

    downloadReport() {
      const blob = new Blob([this.reportMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly_report_${this.todayStr}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // Data Backup & Restore
    downloadBackup() {
      const backupData = {
        question_bank: this.questionBank,
        user_state: this.userState
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yuvi_tracker_backup_${this.todayStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    uploadBackup(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.question_bank || !data.user_state) {
            alert("Invalid backup file format. Must contain 'question_bank' and 'user_state'.");
            return;
          }
          this.questionBank = data.question_bank;
          this.userState = data.user_state;
          this.saveState();
          this.contributionDays = this.getContributionDays();
          this.calculateStreaks();
          
          alert("Backup successfully restored! Reloading the page...");
          window.location.reload();
        } catch (err) {
          alert("Failed to parse the backup file. Ensure it is valid JSON.");
        }
      };
      reader.readAsText(file);
    },

    // Reset all progress completely
    resetProgress() {
      if (confirm("Are you sure you want to reset all preparation progress, streaks, and mastery status? This cannot be undone.")) {
        localStorage.removeItem('prep_tracker_question_bank');
        localStorage.removeItem('prep_tracker_user_state');
        window.location.reload();
      }
    },

    // Filter question bank for curriculum explorer
    getFilteredQuestions(tierKey) {
      if (!this.questionBank || !this.questionBank[tierKey]) return [];
      const query = this.explorerSearch.toLowerCase().trim();
      return this.questionBank[tierKey].filter(q => {
        const questionText = q.question || '';
        const topicText = q.topic || '';
        return questionText.toLowerCase().includes(query) || 
               topicText.toLowerCase().includes(query);
      });
    },

    getFilteredDsa() {
      if (!this.questionBank || !this.questionBank.dsa_problems) return [];
      const query = this.explorerSearch.toLowerCase().trim();
      return this.questionBank.dsa_problems.filter(p => {
        const titleText = p.title || '';
        const categoryText = p.category || '';
        return titleText.toLowerCase().includes(query) || 
               categoryText.toLowerCase().includes(query);
      });
    },

    toggleQuestionMasteryDirect(question, status) {
      const id = question.id;
      const isMastered = status === 'mastered';
      const isCompleted = status !== 'unprepared';

      // Update in static list
      this.setQuestionMastery(id, isMastered);

      // Check if it exists in today's tasks
      if (this.userState && this.userState.history) {
        const todayEntry = this.userState.history[this.todayStr];
        if (todayEntry && todayEntry.daily_tasks) {
          const activeTask = todayEntry.daily_tasks.find(t => t.id === id);
          if (activeTask) {
            activeTask.completed = isCompleted;
            activeTask.mastered = isMastered;
            activeTask.needs_review = status === 'review';
          }
          // Update rings
          todayEntry.rings.core_knowledge.completed = todayEntry.daily_tasks.filter(t => t.type === 'core' && t.completed).length;
          todayEntry.rings.architecture.completed = todayEntry.daily_tasks.filter(t => t.type === 'architecture' && t.completed).length;
        }
      }

      this.calculateStreaks();
      this.saveState();
    },

    toggleDsaDirect(problem) {
      problem.completed = !problem.completed;

      // Check if it exists in today's tasks
      if (this.userState && this.userState.history) {
        const todayEntry = this.userState.history[this.todayStr];
        if (todayEntry && todayEntry.daily_tasks) {
          const activeTask = todayEntry.daily_tasks.find(t => t.id === problem.id);
          if (activeTask) {
            activeTask.completed = problem.completed;
          }
          // Update rings
          todayEntry.rings.dsa.completed = todayEntry.daily_tasks.filter(t => t.type === 'dsa' && t.completed).length;
        }
      }

      this.calculateStreaks();
      this.saveState();
    },

    saveNote(id, noteText) {
      if (!this.userState.notes) {
        this.userState.notes = {};
      }
      this.userState.notes[id] = noteText;
      this.saveState();
    },

    formatMockTimer() {
      const minutes = Math.floor(this.mockTimeRemaining / 60);
      const seconds = this.mockTimeRemaining % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    startMockInterview() {
      // Clear previous timer
      if (this.mockInterval) clearInterval(this.mockInterval);
      
      const qBank = this.questionBank;
      if (!qBank) return;
      
      // Draw random questions
      // 1. DSA
      const dsaList = qBank.dsa_problems;
      const dsaProblem = dsaList[Math.floor(Math.random() * dsaList.length)];
      
      // 2. Core (Tiers 1 & 2)
      const coreList = [...qBank.tier_1_core, ...qBank.tier_2_resume];
      const coreQuestion = coreList[Math.floor(Math.random() * coreList.length)];
      
      // 3. Architecture (Tiers 3 & 4)
      const archList = [...qBank.tier_3_leadership, ...qBank.tier_4_system_design];
      const archQuestion = archList[Math.floor(Math.random() * archList.length)];
      
      this.mockQuestions = [
        { type: 'dsa', id: dsaProblem.id, title: dsaProblem.title, category: dsaProblem.category, extra: dsaProblem.leetcode_url },
        { type: 'core', id: coreQuestion.id, title: coreQuestion.question, category: coreQuestion.topic },
        { type: 'architecture', id: archQuestion.id, title: archQuestion.question, category: archQuestion.topic }
      ];
      
      this.mockAnswers = { dsa: '', core: '', arch: '' };
      this.mockTimeRemaining = 2700; // 45 minutes
      this.mockIsActive = true;
      this.showMockModal = true;
      
      this.mockInterval = setInterval(() => {
        if (this.mockTimeRemaining > 0) {
          this.mockTimeRemaining--;
        } else {
          clearInterval(this.mockInterval);
          alert("Time's up for the mock interview! Please write up your answers and export.");
        }
      }, 1000);
    },

    closeMockInterview() {
      if (this.mockInterval) clearInterval(this.mockInterval);
      this.mockIsActive = false;
      this.showMockModal = false;
    },

    exportMockMarkdown() {
      const dsaQ = this.mockQuestions.find(q => q.type === 'dsa');
      const coreQ = this.mockQuestions.find(q => q.type === 'core');
      const archQ = this.mockQuestions.find(q => q.type === 'architecture');
      
      const timeSpentSecs = 2700 - this.mockTimeRemaining;
      const minutesSpent = Math.floor(timeSpentSecs / 60);
      const secondsSpent = timeSpentSecs % 60;
      const timeString = `${minutesSpent}m ${secondsSpent}s`;

      const mdContent = `# Yuvi Tracker - Mock Interview Session Report
Date: ${new Date().toLocaleDateString()}
Time Taken: ${timeString} / 45:00

---

## AI EVALUATION PROMPT (Copy the text below and paste it into your AI assistant)
\`\`\`
You are a Principal Software Engineer / Staff Architect conducting a technical and behavioral mock interview. 
I have completed a mock interview session under a 45-minute timer. Please review my questions and solutions below.
Grade each section on a scale of 1-10, provide constructive critique, point out any flaws/limitations in my approach, and write an improved model answer for each.

Criteria:
1. DSA: Correctness, Time/Space Complexity optimality, edge case coverage.
2. Core/Resume: Depth of technical knowledge, clarity, professional maturity.
3. System Design/Behavioral: Scaling trade-offs, architecture choices, use of the STAR method.
\`\`\`

---

## Section 1: DSA Problem
* **Problem**: [${dsaQ.title}](${dsaQ.extra})
* **Category**: ${dsaQ.category}

### My Approach & Solution:
${this.mockAnswers.dsa || '_No answer provided._'}

---

## Section 2: Core Knowledge / Resume
* **Question**: ${coreQ.title}
* **Topic**: ${coreQ.category}

### My Answer / Talking Points:
${this.mockAnswers.core || '_No answer provided._'}

---

## Section 3: Architecture & Leadership
* **Question**: ${archQ.title}
* **Topic**: ${archQ.category}

### My Architecture / Behavioral Response:
${this.mockAnswers.arch || '_No answer provided._'}
`;

      const blob = new Blob([mdContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mock_interview_${new Date().toLocaleDateString('sv')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    getLast7DaysStats() {
      const stats = [];
      const history = this.userState ? (this.userState.history || {}) : {};
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('sv');
        const entry = history[dateStr];
        
        let dsaMins = 0;
        let conceptsCompleted = 0;
        
        if (entry && entry.daily_tasks) {
          entry.daily_tasks.forEach(t => {
            if (t.type === 'dsa') {
              dsaMins += Number(t.time_spent_mins || 0);
            } else if (t.completed) {
              conceptsCompleted++;
            }
          });
        }
        
        const shortName = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        stats.push({
          dateStr,
          shortName,
          label,
          dsaMins,
          conceptsCompleted
        });
      }
      return stats;
    }
  }));
});
