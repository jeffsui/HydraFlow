// 全局状态管理
const WaterReminderApp = {
  // 应用状态
  state: {
    dailyGoal: 2000, // 每日目标 (ml)
    currentAmount: 0, // 当前饮水量
    reminderInterval: 60, // 提醒间隔 (分钟)
    isReminderEnabled: true,
    lastReminderTime: null,
    nextReminderTime: null,
    todayRecords: [], // 今日饮水记录
    achievements: [],
    theme: "light", // 默认浅色主题
  },

  // 初始化应用
  init() {
    this.loadData();
    this.setupEventListeners();
    this.initWaterAnimation();
    this.updateDisplay();
    this.startReminderSystem();
    this.checkAchievements();
    this.applyTheme(); // 应用保存的主题

    console.log("水滴助手已启动 🚀");
  },

  // 加载保存的数据
  loadData() {
    const savedData = localStorage.getItem("waterReminderData");
    if (savedData) {
      const data = JSON.parse(savedData);
      this.state = { ...this.state, ...data };

      // 兼容独立存储的 theme 键
      const themeKey = localStorage.getItem("theme");
      if (themeKey === "dark" || themeKey === "light") {
        this.state.theme = themeKey;
      }

      // 检查是否是新的一天
      const today = new Date().toDateString();
      const lastDate = localStorage.getItem("lastActiveDate");
      if (lastDate !== today) {
        this.resetDailyData();
        localStorage.setItem("lastActiveDate", today);
      }
    }
  },

  // 保存数据
  saveData() {
    localStorage.setItem("waterReminderData", JSON.stringify(this.state));
  },

  // 重置每日数据
  resetDailyData() {
    this.state.currentAmount = 0;
    this.state.todayRecords = [];
    this.state.achievements = [];
    this.saveData();
  },

  // 设置事件监听器
  setupEventListeners() {
    // 主题切换按钮
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        console.log("切换主题");
        this.toggleTheme();
      });
    } else {
      console.error("Theme toggle button not found");
    }

    // 快速添加按钮
    document.querySelectorAll(".quick-add-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const amount = parseInt(e.target.dataset.amount);
        this.addWater(amount);
      });
    });

    // 自定义滑块
    const customSlider = document.getElementById("customAmount");
    const customValue = document.getElementById("customAmountValue");
    customSlider.addEventListener("input", (e) => {
      customValue.textContent = e.target.value + "ml";
    });

    // 自定义添加按钮
    document.getElementById("addCustomAmount").addEventListener("click", () => {
      const amount = parseInt(customSlider.value);
      this.addWater(amount);
    });

    // 提醒开关
    document
      .getElementById("reminderToggle")
      .addEventListener("change", (e) => {
        this.state.isReminderEnabled = e.target.checked;
        this.saveData();
        if (e.target.checked) {
          this.startReminderSystem();
        } else {
          this.stopReminderSystem();
        }
      });

    // 提醒间隔设置
    document.querySelectorAll(".interval-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const interval = parseInt(e.target.dataset.interval);
        this.setReminderInterval(interval);

        // 更新按钮样式
        document.querySelectorAll(".interval-btn").forEach((b) => {
          b.className =
            "interval-btn bg-blue-100 text-blue-700 py-3 px-4 rounded-xl font-semibold hover:bg-blue-200 transition-colors";
        });
        e.target.className =
          "interval-btn bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold";
      });
    });

    // 关闭通知
    document
      .getElementById("closeNotification")
      .addEventListener("click", () => {
        this.hideNotification();
      });
  },

  // 添加饮水记录
  addWater(amount) {
    this.state.currentAmount += amount;

    // 记录饮水时间
    const record = {
      amount: amount,
      time: new Date().toISOString(),
      timestamp: Date.now(),
    };
    this.state.todayRecords.push(record);

    // 添加动画效果
    this.animateWaterAdd(amount);

    // 更新显示
    this.updateDisplay();
    this.checkAchievements();
    this.saveData();

    console.log(
      `添加了 ${amount}ml 水，当前总量: ${this.state.currentAmount}ml`
    );
  },

  // 设置提醒间隔
  setReminderInterval(minutes) {
    this.state.reminderInterval = minutes;
    this.saveData();
    this.updateDisplay();

    // 重启提醒系统
    if (this.state.isReminderEnabled) {
      this.startReminderSystem();
    }
  },

  // 启动提醒系统
  startReminderSystem() {
    if (!this.state.isReminderEnabled) return;

    // 清除之前的提醒
    if (this.reminderTimeout) {
      clearTimeout(this.reminderTimeout);
    }

    // 设置下次提醒时间
    const nextReminder = new Date(
      Date.now() + this.state.reminderInterval * 60 * 1000
    );
    this.state.nextReminderTime = nextReminder;

    this.reminderTimeout = setTimeout(() => {
      this.showReminder();
      this.startReminderSystem(); // 循环提醒
    }, this.state.reminderInterval * 60 * 1000);

    this.updateDisplay();
  },

  // 停止提醒系统
  stopReminderSystem() {
    if (this.reminderTimeout) {
      clearTimeout(this.reminderTimeout);
      this.reminderTimeout = null;
    }
    this.state.nextReminderTime = null;
    this.updateDisplay();
  },

  // 显示提醒
  showReminder() {
    const notification = document.getElementById("notificationPopup");
    notification.classList.add("show");

    // 播放提醒音效
    this.playReminderSound();

    // 3秒后自动隐藏
    setTimeout(() => {
      this.hideNotification();
    }, 5000);

    // 浏览器通知
    if (Notification.permission === "granted") {
      new Notification("喝水时间到了！", {
        body: "该补充水分了，保持身体健康",
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%230077B6"/><text y="60" x="50" text-anchor="middle" font-size="40">💧</text></svg>',
      });
    }
  },

  // 隐藏提醒
  hideNotification() {
    const notification = document.getElementById("notificationPopup");
    notification.classList.remove("show");
  },

  // 播放提醒音效
  playReminderSound() {
    // 创建简单的音效
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.3
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  },

  // 更新显示
  updateDisplay() {
    // 更新进度
    const progress = Math.min(
      (this.state.currentAmount / this.state.dailyGoal) * 100,
      100
    );
    document.getElementById("todayProgress").textContent =
      Math.round(progress) + "%";
    document.getElementById("todayAmount").textContent =
      this.state.currentAmount + "ml";
    document.getElementById("dailyGoal").textContent =
      this.state.dailyGoal + "ml";

    // 更新剩余目标
    const remaining = Math.max(
      this.state.dailyGoal - this.state.currentAmount,
      0
    );
    document.getElementById("remainingAmount").textContent = remaining + "ml";

    // 更新提醒间隔
    document.getElementById("reminderInterval").textContent =
      this.state.reminderInterval + "分钟";

    // 更新下次提醒时间
    if (this.state.nextReminderTime) {
      const nextTime = new Date(this.state.nextReminderTime);
      const timeStr = nextTime.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      document.getElementById("nextReminder").textContent = timeStr;
    } else {
      document.getElementById("nextReminder").textContent = "--:--";
    }

    // 更新水位动画
    this.updateWaterLevel(progress);
  },

  // 初始化水位动画
  initWaterAnimation() {
    const container = document.getElementById("waterCanvasContainer");

    // 使用p5.js创建水位动画
    const sketch = (p) => {
      let waterLevel = 0;
      let targetLevel = 0;
      let particles = [];

      p.setup = () => {
        const canvas = p.createCanvas(256, 256);
        canvas.parent("waterCanvasContainer");

        // 初始化粒子
        for (let i = 0; i < 20; i++) {
          particles.push({
            x: p.random(p.width),
            y: p.random(p.height),
            size: p.random(2, 6),
            speed: p.random(0.5, 2),
            opacity: p.random(0.3, 0.8),
          });
        }
      };

      p.draw = () => {
        // 清空画布
        p.clear();

        // 绘制容器边框
        p.stroke(255, 255, 255, 100);
        p.strokeWeight(3);
        p.noFill();
        p.circle(p.width / 2, p.height / 2, 240);

        // 绘制水位
        const centerX = p.width / 2;
        const centerY = p.height / 2;
        const radius = 120;

        // 水位渐变
        for (let r = 0; r < radius; r++) {
          const alpha = p.map(r, 0, radius, 150, 0);
          p.fill(0, 180, 255, alpha);
          p.noStroke();

          const currentRadius = r;
          const waterHeight = (waterLevel / 100) * 2 * currentRadius;
          const angle = p.acos((currentRadius - waterHeight) / currentRadius);

          p.arc(
            centerX,
            centerY,
            currentRadius * 2,
            currentRadius * 2,
            p.PI / 2 - angle,
            p.PI / 2 + angle
          );
        }

        // 绘制水滴粒子
        p.fill(255, 255, 255, 150);
        p.noStroke();
        particles.forEach((particle) => {
          p.circle(particle.x, particle.y, particle.size);

          // 更新粒子位置
          particle.y -= particle.speed;
          if (particle.y < 0) {
            particle.y = p.height;
            particle.x = p.random(p.width);
          }
        });

        // 更新水位
        waterLevel = p.lerp(waterLevel, targetLevel, 0.05);

        // 绘制百分比文字
        p.fill(255, 255, 255, 200);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(32);
        p.text(Math.round(waterLevel) + "%", centerX, centerY);
      };

      // 更新水位的外部方法
      this.updateWaterLevel = (level) => {
        targetLevel = level;
      };
    };

    new p5(sketch);
  },

  // 添加水的动画效果
  animateWaterAdd(amount) {
    // 创建临时动画元素
    const animation = document.createElement("div");
    animation.textContent = `+${amount}ml`;
    animation.className =
      "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-blue-500 pointer-events-none z-50";
    document.body.appendChild(animation);

    // 使用anime.js创建动画
    anime({
      targets: animation,
      translateY: -100,
      opacity: [1, 0],
      scale: [1, 1.5],
      duration: 1500,
      easing: "easeOutQuart",
      complete: () => {
        document.body.removeChild(animation);
      },
    });

    // 水位容器脉冲效果
    const container = document.getElementById("waterCanvasContainer");
    anime({
      targets: container,
      scale: [1, 1.1, 1],
      duration: 600,
      easing: "easeOutElastic(1, .8)",
    });
  },

  // 检查成就
  checkAchievements() {
    const progress = (this.state.currentAmount / this.state.dailyGoal) * 100;
    const achievements = document.querySelectorAll(".achievement-badge");

    // 首次记录成就
    if (this.state.todayRecords.length === 1) {
      achievements[0].classList.remove("opacity-50", "bg-gray-100");
      achievements[0].classList.add("bg-yellow-100", "pulse-animation");
    }

    // 50%完成成就
    if (progress >= 50) {
      achievements[1].classList.remove("opacity-50", "bg-gray-100");
      achievements[1].classList.add("bg-blue-100", "pulse-animation");
    }

    // 100%完成成就
    if (progress >= 100) {
      achievements[2].classList.remove("opacity-50", "bg-gray-100");
      achievements[2].classList.add("bg-green-100", "pulse-animation");

      // 庆祝动画
      this.celebrateCompletion();
    }
  },

  // 完成庆祝动画
  celebrateCompletion() {
    // 创建庆祝粒子效果
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement("div");
      particle.textContent = ["🎉", "⭐", "💧", "🏆"][
        Math.floor(Math.random() * 4)
      ];
      particle.className = "fixed pointer-events-none z-50 text-2xl";
      particle.style.left = Math.random() * window.innerWidth + "px";
      particle.style.top = Math.random() * window.innerHeight + "px";
      document.body.appendChild(particle);

      anime({
        targets: particle,
        translateY: -200,
        translateX: (Math.random() - 0.5) * 200,
        opacity: [1, 0],
        rotate: Math.random() * 360,
        duration: 3000,
        easing: "easeOutQuart",
        complete: () => {
          document.body.removeChild(particle);
        },
      });
    }

    // 显示完成消息
    const message = document.createElement("div");
    message.innerHTML = `
            <div class="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-2xl shadow-2xl text-center">
                <div class="text-4xl mb-2">🎉</div>
                <div class="text-2xl font-bold mb-2">恭喜完成今日目标！</div>
                <div class="text-lg opacity-90">继续保持健康的饮水习惯</div>
            </div>
        `;
    message.className =
      "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50";
    document.body.appendChild(message);

    setTimeout(() => {
      anime({
        targets: message,
        opacity: [1, 0],
        scale: [1, 0.8],
        duration: 1000,
        complete: () => {
          document.body.removeChild(message);
        },
      });
    }, 3000);
  },

  // 主题切换功能
  toggleTheme() {
    console.log("切换主题，当前主题:", this.state.theme);

    const body = document.body;
    const themeIcon = document.getElementById("themeIcon");

    if (!themeIcon) {
      console.error("Theme icon not found");
      return;
    }

    if (this.state.theme === "light") {
      // 切换到深色主题
      this.state.theme = "dark";
      body.classList.add("dark-theme");
      body.classList.remove("bg-gray-50");
      themeIcon.textContent = "☀️";
      console.log("切换到深色主题");
    } else {
      // 切换到浅色主题
      this.state.theme = "light";
      body.classList.remove("dark-theme");
      body.classList.add("bg-gray-50");
      themeIcon.textContent = "🌙";
      console.log("切换到浅色主题");
    }

    // 保存主题设置（双写，以确保跨页面一致）
    this.saveData();
    try {
      localStorage.setItem("theme", this.state.theme);
    } catch (e) {
      console.error("保存 theme 键失败:", e);
    }

    // 添加切换动画
    anime({
      targets: themeIcon,
      rotate: "1turn",
      duration: 500,
      easing: "easeInOutQuart",
    });
  },

  // 应用保存的主题
  applyTheme() {
    console.log("应用主题:", this.state.theme);

    const body = document.body;
    const themeIcon = document.getElementById("themeIcon");

    if (!themeIcon) {
      console.error("Theme icon not found when applying theme");
      return;
    }

    if (this.state.theme === "dark") {
      body.classList.add("dark-theme");
      body.classList.remove("bg-gray-50");
      themeIcon.textContent = "☀️";
    } else {
      body.classList.remove("dark-theme");
      body.classList.add("bg-gray-50");
      themeIcon.textContent = "🌙";
    }
  },
};

// 请求通知权限
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

// 页面加载完成后初始化应用
document.addEventListener("DOMContentLoaded", () => {
  WaterReminderApp.init();
});

// 页面可见性变化时的处理
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && WaterReminderApp.state.isReminderEnabled) {
    WaterReminderApp.startReminderSystem();
  }
});
