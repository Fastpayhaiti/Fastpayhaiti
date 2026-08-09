const DLM_API_BASE = "https://fastpayhaiti.onrender.com";

/* =========================
   SESSION / USER
========================= */

function getDlmToken() {
  return localStorage.getItem("dlm_token") || "";
}

function getDlmUser() {
  try {
    return JSON.parse(
      localStorage.getItem("dlm_user") ||
      localStorage.getItem("fastpay_user") ||
      "null"
    );
  } catch (error) {
    return null;
  }
}

function saveDlmSession(data) {
  const apiUser = data.user || {};

  const user = {
    id: apiUser.id || apiUser._id || "",
    fullname: apiUser.fullname || apiUser.name || "DLM User",
    name: apiUser.name || apiUser.fullname || "DLM User",
    email: apiUser.email || "",
    phone: apiUser.phone || "",
    balance: Number(apiUser.balance || 0),
    role: apiUser.role || "customer",
    status: apiUser.status || "Active"
  };

  if (data.token) {
    localStorage.setItem("dlm_token", data.token);
  }

  localStorage.setItem("dlm_user", JSON.stringify(user));
  localStorage.setItem("fastpay_user", JSON.stringify(user));

  return user;
}

function clearDlmSession() {
  localStorage.removeItem("dlm_token");
  localStorage.removeItem("dlm_user");
  localStorage.removeItem("fastpay_user");
}

/* =========================
   API REQUESTS
========================= */

async function dlmApi(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getDlmToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${DLM_API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Demann lan echwe. Eseye ankò."
    );
  }

  return data;
}

/* =========================
   REGISTER / LOGIN
========================= */

async function registerDlmUser(payload) {
  return dlmApi("/register", {
    method: "POST",
    body: JSON.stringify({
      name: payload.fullname,
      fullname: payload.fullname,
      phone: payload.phone,
      email: payload.email,
      password: payload.password
    })
  });
}

async function loginDlmUser(email, password) {
  const data = await dlmApi("/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password
    })
  });

  const user = saveDlmSession(data);

  return {
    ...data,
    user
  };
}

/* =========================
   REFRESH USER DATA
========================= */

async function refreshDlmUser() {
  if (!getDlmToken()) {
    return getDlmUser();
  }

  try {
    const data = await dlmApi("/me");

    return saveDlmSession({
      token: getDlmToken(),
      user: data.user
    });
  } catch (error) {
    return getDlmUser();
  }
}

/* =========================
   PROTECT PAGES
========================= */

function requireDlmLogin() {
  const user = getDlmUser();
  const token = getDlmToken();

  if (!user || !token) {
    window.location.replace("login.html");
    return null;
  }

  return user;
}

function requireLogin() {
  return requireDlmLogin();
}

function requireDlmAdmin() {
  const user = requireDlmLogin();

  if (user && user.role !== "admin") {
    window.location.replace("dashboard.html");
    return null;
  }

  return user;
}

/* =========================
   LOGOUT
========================= */

function logoutDlmUser() {
  clearDlmSession();
  window.location.replace("login.html");
}

/* =========================
   BOTTOM NAV
========================= */

function nav(active = "") {
  return `
    <div class="bottom-nav">
      <a href="./dashboard.html" class="nav-item ${active === "home" ? "active" : ""}">
        <i class="fa-solid fa-house"></i>
        <span>Home</span>
      </a>

      <a href="./statement.html" class="nav-item ${active === "transactions" ? "active" : ""}">
        <i class="fa-solid fa-arrow-rotate-left"></i>
        <span>Transactions</span>
      </a>

      <a href="./services.html" class="nav-item ${active === "services" ? "active" : ""}">
        <i class="fa-brands fa-bitcoin"></i>
        <span>Services</span>
      </a>

      <a href="./card-dashboard.html" class="nav-item ${active === "cards" ? "active" : ""}">
        <i class="fa-regular fa-credit-card"></i>
        <span>Cards</span>
      </a>

      <a href="./wallet.html" class="nav-item ${active === "wallet" ? "active" : ""}">
        <i class="fa-solid fa-wallet"></i>
        <span>Wallet</span>
      </a>
    </div>
  `;
}

function loadPageNav(active = "") {
  const navRoot = document.getElementById("nav-root");

  if (navRoot) {
    navRoot.innerHTML = nav(active);
  }
}

/* =========================
   SIDE MENU
========================= */

function openMenu() {
  const menu = document.getElementById("sideMenu");
  const overlay =
    document.getElementById("menuOverlay") ||
    document.getElementById("overlay");

  if (menu) {
    menu.classList.add("open");
    menu.classList.add("active");
  }

  if (overlay) {
    overlay.classList.add("show");
    overlay.classList.add("active");
  }
}

function closeMenu() {
  const menu = document.getElementById("sideMenu");
  const overlay =
    document.getElementById("menuOverlay") ||
    document.getElementById("overlay");

  if (menu) {
    menu.classList.remove("open");
    menu.classList.remove("active");
  }

  if (overlay) {
    overlay.classList.remove("show");
    overlay.classList.remove("active");
  }
}

/* =========================
   GLOBAL FIXED BOTTOM NAV
========================= */

function installStableBottomNav() {
  if (document.getElementById("dlm-fixed-bottom-nav-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "dlm-fixed-bottom-nav-style";
  style.textContent = `
    html, body {
      min-height: 100%;
      overscroll-behavior-y: none;
    }

    body {
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)) !important;
    }

    .app,
    .container,
    main {
      padding-bottom: calc(110px + env(safe-area-inset-bottom, 0px)) !important;
    }

    .bottom-nav {
      position: fixed !important;
      left: 50% !important;
      right: auto !important;
      bottom: 0 !important;
      transform: translate3d(-50%, 0, 0) !important;
      width: min(100%, 430px) !important;
      max-width: 430px !important;
      min-height: 78px !important;
      display: grid !important;
      grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
      align-items: center !important;
      padding: 10px 8px calc(10px + env(safe-area-inset-bottom, 0px)) !important;
      margin: 0 !important;
      background: rgba(4, 6, 10, 0.98) !important;
      border-top: 1px solid rgba(255,255,255,0.10) !important;
      box-shadow: 0 -10px 30px rgba(0,0,0,0.35) !important;
      z-index: 2147483000 !important;
      isolation: isolate !important;
      will-change: transform !important;
      backface-visibility: hidden !important;
      -webkit-backface-visibility: hidden !important;
    }

    .bottom-nav .nav-item {
      min-width: 0 !important;
      min-height: 56px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 4px 2px !important;
      color: #8b93a7 !important;
      text-decoration: none !important;
      text-align: center !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      line-height: 1.1 !important;
      -webkit-tap-highlight-color: transparent !important;
    }

    .bottom-nav .nav-item i {
      font-size: 22px !important;
      line-height: 1 !important;
    }

    .bottom-nav .nav-item.active {
      color: #3b4cff !important;
    }

    @media (min-width: 431px) {
      .bottom-nav {
        border-left: 1px solid rgba(255,255,255,0.08) !important;
        border-right: 1px solid rgba(255,255,255,0.08) !important;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================
   LOAD USER / NAV FIX
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  installStableBottomNav();

  const path = window.location.pathname.toLowerCase();

  const isPublicPage =
    path.endsWith("/login.html") ||
    path.endsWith("/register.html") ||
    path.endsWith("/index.html") ||
    path === "/";

  if (!isPublicPage) {
    const user = requireDlmLogin();

    if (!user) {
      return;
    }

    const refreshedUser = await refreshDlmUser();

    if (refreshedUser) {
      const welcomeName = document.getElementById("welcomeName");
      const profileLetter = document.getElementById("profileLetter");
      const avatar = document.getElementById("avatar");
      const menuUserName = document.getElementById("menuUserName");
      const menuUserMail = document.getElementById("menuUserMail");
      const balanceAmount = document.getElementById("balanceAmount");
      const totalBalance = document.getElementById("totalBalance");
      const serviceBalance = document.getElementById("serviceBalance");
      const balanceSub = document.getElementById("balanceSub");
      const frontHolder = document.getElementById("frontHolder");

      if (welcomeName) {
        welcomeName.innerText = `${refreshedUser.fullname}! 👋`;
      }

      if (profileLetter) {
        profileLetter.innerText =
          refreshedUser.fullname.charAt(0).toUpperCase();
      }

      if (avatar) {
        avatar.innerText =
          refreshedUser.fullname.charAt(0).toUpperCase();
      }

      if (menuUserName) {
        menuUserName.innerText = refreshedUser.fullname;
      }

      if (menuUserMail) {
        menuUserMail.innerText = refreshedUser.email;
      }

      const usdBalance =
        `$${Number(refreshedUser.balance || 0).toFixed(2)} USD`;

      if (balanceAmount) {
        balanceAmount.innerText = usdBalance;
      }

      if (totalBalance) {
        totalBalance.innerText = usdBalance;
      }

      if (serviceBalance) {
        serviceBalance.innerText = usdBalance;
      }

      if (balanceSub) {
        balanceSub.innerText =
          refreshedUser.email || "DLM Wallet";
      }

      if (frontHolder) {
        frontHolder.innerText =
          refreshedUser.fullname.toUpperCase();
      }

      document
        .querySelectorAll('a[href="admin.html"]')
        .forEach((link) => {
          link.style.display =
            refreshedUser.role === "admin" ? "" : "none";
        });
    }
  }

  document
    .querySelectorAll("a.logout")
    .forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        logoutDlmUser();
      });
    });
});

/* Re-apply after mobile browser viewport changes. */
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", installStableBottomNav);
  window.visualViewport.addEventListener("scroll", installStableBottomNav);
}
