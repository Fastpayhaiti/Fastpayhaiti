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

  /*
    Nou kenbe fastpay_user tou,
    paske kèk ansyen paj dashboard yo sèvi ak non sa.
  */
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
   REGISTER
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

/* =========================
   LOGIN
========================= */

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
   SERVICE BALANCE SYNC
========================= */

async function syncDlmServiceBalance(elementId = "serviceBalance") {
  const element = document.getElementById(elementId);

  if (!element) {
    return null;
  }

  let user = getDlmUser();

  if (user) {
    element.innerText =
      `$${Number(user.balance || 0).toFixed(2)} USD`;
  }

  try {
    const fresh = await refreshDlmUser();

    if (fresh) {
      user = fresh;
      element.innerText =
        `$${Number(fresh.balance || 0).toFixed(2)} USD`;
    }
  } catch (error) {}

  return user;
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
      <a
        href="./dashboard.html"
        class="${active === "home" ? "active" : ""}"
      >
        🏠
        <span>Home</span>
      </a>

      <a
        href="./statement.html"
        class="${active === "transactions" ? "active" : ""}"
      >
        🔄
        <span>Transactions</span>
      </a>

      <a
        href="./services.html"
        class="${active === "services" ? "active" : ""}"
      >
        ₿
        <span>Services</span>
      </a>

      <a
        href="./card-dashboard.html"
        class="${active === "cards" ? "active" : ""}"
      >
        💳
        <span>Cards</span>
      </a>

      <a
        href="./wallet.html"
        class="${active === "wallet" ? "active" : ""}"
      >
        👛
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

function loadMenu() {
  const menuRoot = document.getElementById("menu-root");

  if (!menuRoot) {
    return;
  }

  menuRoot.innerHTML = `
    <div
      class="menu-overlay"
      id="menuOverlay"
      onclick="closeMenu()"
    ></div>

    <div class="side-menu" id="sideMenu">
      <div class="menu-header">
        <div class="menu-title">
          DLM Wallet
        </div>

        <button
          class="close-btn"
          onclick="closeMenu()"
        >
          ✖
        </button>
      </div>

      <a class="menu-link" href="./dashboard.html">
        🏠 Dashboard
      </a>

      <a class="menu-link" href="./topup.html">
        📱 Topup
      </a>

      <a class="menu-link" href="./giftcards.html">
        🎁 Giftcards
      </a>

      <a class="menu-link" href="./netflix.html">
        🎬 Netflix
      </a>

      <a class="menu-link" href="./primevideo.html">
        📺 Prime Video
      </a>

      <a class="menu-link" href="./freefire.html">
        🔥 Free Fire
      </a>

      <a class="menu-link" href="./deposit.html">
        💰 Deposit
      </a>

      <a class="menu-link" href="./withdraw.html">
        💸 Withdraw
      </a>

      <a class="menu-link" href="./transfer.html">
        🔁 Transfer
      </a>

      <a class="menu-link" href="./statement.html">
        📄 Transactions
      </a>

      <a class="menu-link" href="./wallet.html">
        👛 Wallet
      </a>

      <a
        class="menu-link logout"
        href="#"
        onclick="logoutDlmUser()"
      >
        🚪 Logout
      </a>
    </div>
  `;
}

/* =========================
   LOAD USER ON DASHBOARD
========================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    const path =
      window.location.pathname.toLowerCase();

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

      const refreshedUser =
        await refreshDlmUser();

      if (refreshedUser) {
        const welcomeName =
          document.getElementById("welcomeName");

        const profileLetter =
          document.getElementById("profileLetter");

        const avatar =
          document.getElementById("avatar");

        const menuUserName =
          document.getElementById("menuUserName");

        const menuUserMail =
          document.getElementById("menuUserMail");

        const balanceAmount =
          document.getElementById("balanceAmount");

        const totalBalance =
          document.getElementById("totalBalance");

        const balanceSub =
          document.getElementById("balanceSub");

        const frontHolder =
          document.getElementById("frontHolder");

        if (welcomeName) {
          welcomeName.innerText =
            `${refreshedUser.fullname}! 👋`;
        }

        if (profileLetter) {
          profileLetter.innerText =
            refreshedUser.fullname
              .charAt(0)
              .toUpperCase();
        }

        if (avatar) {
          avatar.innerText =
            refreshedUser.fullname
              .charAt(0)
              .toUpperCase();
        }

        if (menuUserName) {
          menuUserName.innerText =
            refreshedUser.fullname;
        }

        if (menuUserMail) {
          menuUserMail.innerText =
            refreshedUser.email;
        }

        if (balanceAmount) {
          balanceAmount.innerText =
            `$${Number(
              refreshedUser.balance || 0
            ).toFixed(2)} USD`;
        }

        if (totalBalance) {
          totalBalance.innerText =
            `$${Number(
              refreshedUser.balance || 0
            ).toFixed(2)} USD`;
        }

        if (balanceSub) {
          balanceSub.innerText =
            refreshedUser.email ||
            "DLM Wallet";
        }

        if (frontHolder) {
          frontHolder.innerText =
            refreshedUser.fullname.toUpperCase();
        }

        /*
          Kache lyen admin lan pou kliyan.
        */
        document
          .querySelectorAll(
            'a[href="admin.html"]'
          )
          .forEach((link) => {
            link.style.display =
              refreshedUser.role === "admin"
                ? ""
                : "none";
          });
      }
    }

    /*
      Fè tout bouton logout mache.
    */
    document
      .querySelectorAll("a.logout")
      .forEach((link) => {
        link.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            logoutDlmUser();
          }
        );
      });
  }
);
