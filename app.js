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
    cardBalance: Number(apiUser.cardBalance || 0),
    pinEnabled: Boolean(apiUser.pinEnabled),
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
  clearDlmPinUnlock();
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

  const pinToken = getDlmPinToken();
  if (pinToken) {
    headers["X-DLM-PIN-Token"] = pinToken;
  }

  const response = await fetch(`${DLM_API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || "Demann lan echwe. Eseye ankò."
    );
    error.status = response.status;
    error.code = data.code || "";
    error.data = data;
    throw error;
  }

  return data;
}


/* =========================
   GLOBAL APP PIN SESSION
========================= */

function getDlmPinToken() {
  return sessionStorage.getItem("dlm_pin_token") || "";
}

function clearDlmPinUnlock() {
  sessionStorage.removeItem("dlm_pin_token");
  sessionStorage.removeItem("dlm_pin_unlocked");
}

/* Backward compatibility for older login/security pages. */
function clearPinUnlock() {
  clearDlmPinUnlock();
}

function isDlmPinUnlocked() {
  return Boolean(
    getDlmPinToken() &&
    sessionStorage.getItem("dlm_pin_unlocked") === "1"
  );
}

function setDlmPinUnlock(pinToken) {
  sessionStorage.setItem("dlm_pin_token", pinToken);
  sessionStorage.setItem("dlm_pin_unlocked", "1");
}

function ensureDlmPinUi() {
  if (!document.getElementById("dlmPinUiStyles")) {
    const style = document.createElement("style");
    style.id = "dlmPinUiStyles";
    style.textContent = `
      #dlmPinLock,#dlmPinSetupPrompt{font-family:Inter,Arial,sans-serif}
      #dlmPinLock{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:22px;background:rgba(3,5,10,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      #dlmPinLock.show{display:flex}
      .dlm-pin-card{width:min(390px,100%);background:#10141d;border:1px solid rgba(255,255,255,.09);border-radius:26px;padding:26px 20px;color:#fff;box-shadow:0 25px 80px rgba(0,0,0,.45)}
      .dlm-pin-logo{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;margin:0 auto 16px;background:linear-gradient(135deg,#5662ff,#7868ff);font-size:23px;font-weight:950}
      .dlm-pin-title{text-align:center;font-size:25px;font-weight:950;margin-bottom:7px}
      .dlm-pin-sub{text-align:center;color:#9299aa;font-size:13px;line-height:1.5;margin-bottom:20px}
      .dlm-pin-input{width:100%;padding:16px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:#111724;color:#fff;text-align:center;letter-spacing:.45em;font-size:24px;font-weight:900;outline:none}
      .dlm-pin-btn{width:100%;margin-top:13px;padding:16px;border:0;border-radius:17px;background:linear-gradient(135deg,#5662ff,#7868ff);color:#fff;font-size:16px;font-weight:900}
      .dlm-pin-link{width:100%;margin-top:8px;padding:10px;border:0;background:transparent;color:#adb4ff;font-weight:850}
      .dlm-pin-msg{min-height:20px;margin-top:10px;text-align:center;color:#ff8f98;font-size:12px}
      #dlmPinSetupPrompt{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483000;width:min(390px,calc(100% - 28px));display:none;background:#111620;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
      #dlmPinSetupPrompt.show{display:block}
      .dlm-setup-title{font-weight:950;font-size:17px;margin-bottom:5px}.dlm-setup-sub{color:#9299aa;font-size:12px;line-height:1.45;margin-bottom:12px}.dlm-setup-actions{display:grid;grid-template-columns:1fr auto;gap:9px}.dlm-setup-primary{border:0;border-radius:13px;background:linear-gradient(135deg,#5662ff,#7868ff);color:#fff;font-weight:900;padding:12px}.dlm-setup-later{border:1px solid rgba(255,255,255,.1);border-radius:13px;background:#171c27;color:#fff;font-weight:800;padding:12px}
      body.dlm-app-locked{overflow:hidden!important}
    `;
    document.head.appendChild(style);
  }

  if (!document.getElementById("dlmPinLock")) {
    const root = document.createElement("div");
    root.id = "dlmPinLock";
    root.innerHTML = `
      <div class="dlm-pin-card">
        <div class="dlm-pin-logo">D</div>
        <div class="dlm-pin-title">Debloke DLM Wallet</div>
        <div class="dlm-pin-sub">Antre PIN 6 chif ou pou kontinye.</div>
        <input id="dlmGlobalPinInput" class="dlm-pin-input" type="password" inputmode="numeric" maxlength="6" placeholder="••••••">
        <button id="dlmGlobalPinButton" class="dlm-pin-btn" type="button">Unlock</button>
        <button id="dlmForgotPinButton" class="dlm-pin-link" type="button">Forgot PIN?</button>
        <div id="dlmGlobalPinMsg" class="dlm-pin-msg"></div>
      </div>
    `;
    document.body.appendChild(root);

    const input = document.getElementById("dlmGlobalPinInput");
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 6);
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") unlockDlmAppWithPin();
    });

    document.getElementById("dlmGlobalPinButton")
      .addEventListener("click", unlockDlmAppWithPin);

    document.getElementById("dlmForgotPinButton")
      .addEventListener("click", requestDlmPinResetEmail);
  }

  if (!document.getElementById("dlmPinSetupPrompt")) {
    const prompt = document.createElement("div");
    prompt.id = "dlmPinSetupPrompt";
    prompt.innerHTML = `
      <div class="dlm-setup-title">Sekirize DLM Wallet ou</div>
      <div class="dlm-setup-sub">Ou poko kreye PIN. Kreye yon PIN 6 chif pou pwoteje Add Funds, Withdraw, Send ak lòt aksyon sansib yo.</div>
      <div class="dlm-setup-actions">
        <button class="dlm-setup-primary" type="button" onclick="location.href='pin-setup.html'">Create PIN</button>
        <button class="dlm-setup-later" type="button" onclick="dismissDlmPinSetupPrompt()">Later</button>
      </div>
    `;
    document.body.appendChild(prompt);
  }
}

function dismissDlmPinSetupPrompt() {
  sessionStorage.setItem("dlm_pin_setup_dismissed", "1");
  document.getElementById("dlmPinSetupPrompt")?.classList.remove("show");
}

function showDlmPinLock(message = "") {
  ensureDlmPinUi();
  document.getElementById("dlmPinSetupPrompt")?.classList.remove("show");
  document.getElementById("dlmPinLock").classList.add("show");
  document.body.classList.add("dlm-app-locked");
  const input = document.getElementById("dlmGlobalPinInput");
  const msg = document.getElementById("dlmGlobalPinMsg");
  msg.innerText = message;
  input.value = "";
  setTimeout(() => input.focus(), 80);
}

function hideDlmPinLock() {
  document.getElementById("dlmPinLock")?.classList.remove("show");
  document.body.classList.remove("dlm-app-locked");
}

async function unlockDlmAppWithPin() {
  const input = document.getElementById("dlmGlobalPinInput");
  const button = document.getElementById("dlmGlobalPinButton");
  const msg = document.getElementById("dlmGlobalPinMsg");
  const pin = String(input?.value || "").trim();

  if (!/^\d{6}$/.test(pin)) {
    msg.innerText = "Antre PIN 6 chif ou.";
    return;
  }

  button.disabled = true;
  button.innerText = "Checking...";
  msg.innerText = "";

  try {
    const data = await dlmApi("/pin/verify", {
      method: "POST",
      body: JSON.stringify({ pin })
    });

    if (!data.pinToken) {
      throw new Error("PIN session pa disponib. Refresh app la epi eseye ankò.");
    }

    setDlmPinUnlock(data.pinToken);
    hideDlmPinLock();
  } catch (error) {
    clearDlmPinUnlock();
    msg.innerText = error.message || "PIN pa kòrèk.";
    input.value = "";
    input.focus();
  } finally {
    button.disabled = false;
    button.innerText = "Unlock";
  }
}

async function requestDlmPinResetEmail() {
  const msg = document.getElementById("dlmGlobalPinMsg");
  const button = document.getElementById("dlmForgotPinButton");

  button.disabled = true;
  button.innerText = "Sending...";
  msg.style.color = "#adb4ff";
  msg.innerText = "";

  try {
    const data = await dlmApi("/pin/forgot", {
      method: "POST",
      body: JSON.stringify({})
    });
    msg.style.color = "#5ee48b";
    msg.innerText = data.message || "Tcheke imel ou pou reset PIN lan.";
  } catch (error) {
    msg.style.color = "#ff8f98";
    if (
      String(error.message || "").toLowerCase().includes("email sekirite")
    ) {
      msg.innerText =
        "Reset PIN pa email poko aktive. Admin dwe configure sèvis email sekirite a sou server la.";
    } else {
      msg.innerText =
        error.message || "Pa rive voye email reset PIN lan.";
    }
  } finally {
    button.disabled = false;
    button.innerText = "Forgot PIN?";
  }
}

async function initDlmGlobalPinLock() {
  const token = getDlmToken();
  let user = getDlmUser();

  if (!token || !user) return;

  ensureDlmPinUi();

  try {
    const data = await dlmApi("/me");
    user = saveDlmSession({ token, user: data.user });
  } catch (error) {}

  if (user?.pinEnabled) {
    document.getElementById("dlmPinSetupPrompt")?.classList.remove("show");

    if (!isDlmPinUnlocked()) {
      showDlmPinLock();
    }
  } else {
    clearDlmPinUnlock();
    hideDlmPinLock();

    const currentPath =
      window.location.pathname.toLowerCase();

    const onPinSetupPage =
      currentPath.endsWith("/pin-setup.html");

    if (
      !onPinSetupPage &&
      sessionStorage.getItem("dlm_pin_setup_dismissed") !== "1"
    ) {
      document.getElementById("dlmPinSetupPrompt")?.classList.add("show");
    }
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (getDlmUser()?.pinEnabled) {
      clearDlmPinUnlock();
    }
    return;
  }

  const path = location.pathname.toLowerCase();
  const publicPage =
    path.endsWith("/login.html") ||
    path.endsWith("/register.html") ||
    path.endsWith("/reset-password.html") ||
    path.endsWith("/reset-pin.html") ||
    path === "/";

  if (!publicPage && getDlmUser()?.pinEnabled && !isDlmPinUnlocked()) {
    showDlmPinLock();
  }
});


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

function requireDlmCustomer() {
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
  clearDlmPinUnlock();
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

      await initDlmGlobalPinLock();

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
            `${Number(
              refreshedUser.balance || 0
            ).toFixed(2)} USD`;
        }

        if (totalBalance) {
          totalBalance.innerText =
            `${Number(
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
