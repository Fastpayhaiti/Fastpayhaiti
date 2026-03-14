const FastPayDB = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (e) {
      return fallback;
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(key);
  }
};

const FastPayV2 = {
  init() {
    if (!FastPayDB.get("fp_users", null)) FastPayDB.set("fp_users", []);
    if (!FastPayDB.get("fp_cards", null)) FastPayDB.set("fp_cards", []);
    if (!FastPayDB.get("fp_transactions", null)) FastPayDB.set("fp_transactions", []);
    if (!FastPayDB.get("fp_notifications", null)) FastPayDB.set("fp_notifications", []);
  },

  generateId(prefix = "FP") {
    return prefix + "-" + Math.floor(Math.random() * 900000 + 100000);
  },

  getUsers() {
    return FastPayDB.get("fp_users", []);
  },

  saveUsers(users) {
    FastPayDB.set("fp_users", users);
  },

  registerUser(userData) {
    const users = this.getUsers();

    const exists = users.find(
      u => u.email.toLowerCase() === userData.email.toLowerCase()
    );

    if (exists) {
      return { success: false, message: "Email sa deja egziste." };
    }

    const newUser = {
      id: this.generateId("USR"),
      fullname: userData.fullname,
      email: userData.email,
      password: userData.password,
      phone: userData.phone || "",
      balance: 0,
      createdAt: new Date().toLocaleString(),
      status: "active"
    };

    users.unshift(newUser);
    this.saveUsers(users);

    this.addNotification({
      userId: newUser.id,
      title: "Kont kreye",
      text: "Kont FastPay ou a kreye avèk siksè.",
      type: "success"
    });

    return { success: true, user: newUser };
  },

  loginUser(email, password) {
    const users = this.getUsers();

    const user = users.find(
      u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );

    if (!user) {
      return { success: false, message: "Email oswa modpas pa bon." };
    }

    FastPayDB.set("fp_session", {
      userId: user.id,
      loggedIn: true,
      loginAt: new Date().toLocaleString()
    });

    return { success: true, user };
  },

  logoutUser() {
    FastPayDB.remove("fp_session");
  },

  getSession() {
    return FastPayDB.get("fp_session", null);
  },

  getCurrentUser() {
    const session = this.getSession();
    if (!session || !session.loggedIn) return null;

    const users = this.getUsers();
    return users.find(u => u.id === session.userId) || null;
  },

  updateUser(userId, updates) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) return null;

    users[index] = { ...users[index], ...updates };
    this.saveUsers(users);
    return users[index];
  },

  addBalance(userId, amount) {
    const user = this.getCurrentUserById(userId);
    if (!user) return null;

    const newBalance = parseInt(user.balance || 0) + parseInt(amount || 0);
    return this.updateUser(userId, { balance: newBalance });
  },

  subtractBalance(userId, amount) {
    const user = this.getCurrentUserById(userId);
    if (!user) return { success: false, message: "User pa jwenn." };

    const current = parseInt(user.balance || 0);
    const value = parseInt(amount || 0);

    if (current < value) {
      return { success: false, message: "Balans pa ase." };
    }

    const updated = this.updateUser(userId, { balance: current - value });
    return { success: true, user: updated };
  },

  getCurrentUserById(userId) {
    const users = this.getUsers();
    return users.find(u => u.id === userId) || null;
  },

  addTransaction(tx) {
    const transactions = FastPayDB.get("fp_transactions", []);
    const payload = {
      id: this.generateId("TX"),
      userId: tx.userId,
      service: tx.service || "Transaction",
      amount: tx.amount || "0",
      type: tx.type || "general",
      status: tx.status || "completed",
      meta: tx.meta || {},
      date: new Date().toLocaleString()
    };

    transactions.unshift(payload);
    FastPayDB.set("fp_transactions", transactions);
    return payload;
  },

  getUserTransactions(userId) {
    const transactions = FastPayDB.get("fp_transactions", []);
    return transactions.filter(t => t.userId === userId);
  },

  addNotification(data) {
    const notifications = FastPayDB.get("fp_notifications", []);
    const payload = {
      id: this.generateId("NTF"),
      userId: data.userId,
      title: data.title || "Nouvo alèt",
      text: data.text || "",
      type: data.type || "info",
      read: false,
      date: new Date().toLocaleString()
    };

    notifications.unshift(payload);
    FastPayDB.set("fp_notifications", notifications);
    return payload;
  },

  getUserNotifications(userId) {
    const notifications = FastPayDB.get("fp_notifications", []);
    return notifications.filter(n => n.userId === userId);
  },

  getUnreadCount(userId) {
    return this.getUserNotifications(userId).filter(n => !n.read).length;
  },

  markAllNotificationsRead(userId) {
    const notifications = FastPayDB.get("fp_notifications", []);
    const updated = notifications.map(n => {
      if (n.userId === userId) {
        return { ...n, read: true };
      }
      return n;
    });
    FastPayDB.set("fp_notifications", updated);
  },

  createCardRequest(data) {
    const requests = FastPayDB.get("fp_card_requests_v2", []);
    const payload = {
      id: this.generateId("CRDREQ"),
      userId: data.userId,
      fullname: data.fullname,
      email: data.email,
      network: data.network || "Visa",
      cardType: data.cardType || "Virtual",
      currency: data.currency || "USD",
      paymentMethod: data.paymentMethod || "Wallet",
      amount: data.amount || "1500 HTG",
      status: "pending",
      date: new Date().toLocaleString()
    };

    requests.unshift(payload);
    FastPayDB.set("fp_card_requests_v2", requests);

    this.addNotification({
      userId: data.userId,
      title: "Card request",
      text: "Demann kat ou a anrejistre.",
      type: "info"
    });

    return payload;
  },

  getCardRequests() {
    return FastPayDB.get("fp_card_requests_v2", []);
  }
};

FastPayV2.init();
