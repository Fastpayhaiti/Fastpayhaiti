const DLM_API_BASE = "https://fastpayhaiti.onrender.com";

/* =========================
   SESSION
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
  } catch {
    return null;
  }
}

function saveDlmSession(data) {
  const apiUser = data.user || {};

  const user = {
    id: apiUser.id || apiUser._id || "",
    fullname:
      apiUser.fullname ||
      apiUser.name ||
      "DLM User",
    name:
      apiUser.name ||
      apiUser.fullname ||
      "DLM User",
    email: apiUser.email || "",
    phone: apiUser.phone || "",
    balance: Number(apiUser.balance || 0),
    role: apiUser.role || "customer",
    status: apiUser.status || "Active",
    pinEnabled: Boolean(apiUser.pinEnabled)
  };

  if (data.token) {
    localStorage.setItem("dlm_token", data.token);
  }

  localStorage.setItem(
    "dlm_user",
    JSON.stringify(user)
  );

  localStorage.setItem(
    "fastpay_user",
    JSON.stringify(user)
  );

  return user;
}

function clearDlmSession() {
  localStorage.removeItem("dlm_token");
  localStorage.removeItem("dlm_user");
  localStorage.removeItem("fastpay_user");
}

/* =========================
   API
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

  const pinToken =
    sessionStorage.getItem("dlm_pin_token") || "";

  if (pinToken) {
    headers["X-DLM-PIN-Token"] = pinToken;
  }

  const response = await fetch(
    `${DLM_API_BASE}${path}`,
    {
      ...options,
      headers
    }
  );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      "Demann lan echwe."
    );
  }

  return data;
}

/* =========================
   AUTH
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
  const data = await dlmApi(
    "/login",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    }
  );

  const user = saveDlmSession(data);

  return {
    ...data,
    user
  };
}

async function refreshDlmUser() {
  if (!getDlmToken()) {
    return getDlmUser();
  }

  try {
    const data =
      await dlmApi("/me");

    return saveDlmSession({
      token: getDlmToken(),
      user: data.user
    });
  } catch {
    return getDlmUser();
  }
}

function requireDlmLogin() {
  const user = getDlmUser();
  const token = getDlmToken();

  if (!user || !token) {
    window.location.replace(
      "login.html"
    );
    return null;
  }

  return user;
}

function requireLogin() {
  return requireDlmLogin();
}

function requireDlmAdmin() {
  const user =
    requireDlmLogin();

  if (
    user &&
    user.role !== "admin"
  ) {
    window.location.replace(
      "dashboard.html"
    );
    return null;
  }

  return user;
}

function logoutDlmUser() {
  clearDlmSession();
  window.location.replace(
    "login.html"
  );
}

/* =========================
   STABLE BOTTOM NAV
   Android / Chrome visual viewport
========================= */

function syncStableBottomNav() {
  const nav =
    document.querySelector(
      ".bottom-nav"
    );

  if (!nav) return;

  let offset = 0;

  if (window.visualViewport) {
    const vv =
      window.visualViewport;

    /*
      Compensates for mobile browser bars
      and visual viewport movement.
    */
    const layoutHeight =
      document.documentElement
        .clientHeight;

    offset =
      Math.max(
        0,
        layoutHeight -
        vv.height -
        vv.offsetTop
      );
  }

  document.documentElement
    .style
    .setProperty(
      "--dlm-vv-bottom",
      `${offset}px`
    );
}

function installStableBottomNav() {
  syncStableBottomNav();

  if (window.visualViewport) {
    window.visualViewport
      .addEventListener(
        "resize",
        syncStableBottomNav
      );

    window.visualViewport
      .addEventListener(
        "scroll",
        syncStableBottomNav
      );
  }

  window.addEventListener(
    "resize",
    syncStableBottomNav
  );

  window.addEventListener(
    "orientationchange",
    () => {
      setTimeout(
        syncStableBottomNav,
        80
      );
    }
  );

  /*
    Keep it synced while ordinary
    page content scrolls.
  */
  window.addEventListener(
    "scroll",
    syncStableBottomNav,
    { passive: true }
  );
}

/* =========================
   GENERIC USER UI
========================= */

function updateCommonUserUI(user) {
  if (!user) return;

  const fullName =
    user.fullname ||
    user.name ||
    "DLM User";

  const initial =
    fullName
      .charAt(0)
      .toUpperCase();

  const usdBalance =
    `$${Number(
      user.balance || 0
    ).toFixed(2)} USD`;

  const map = [
    ["welcomeName", fullName],
    ["topProfileName", fullName],
    ["menuUserName", fullName],
    ["menuUserMail", user.email],
    ["balanceAmount", usdBalance],
    ["totalBalance", usdBalance],
    ["serviceBalance", usdBalance],
    ["balanceSub", user.email || "DLM Wallet"],
    ["profileLetter", initial],
    ["avatar", initial]
  ];

  for (
    const [id, value]
    of map
  ) {
    const element =
      document.getElementById(id);

    if (element) {
      element.innerText =
        value || "";
    }
  }

  document
    .querySelectorAll(
      'a[href="admin.html"]'
    )
    .forEach(link => {
      link.style.display =
        user.role === "admin"
          ? ""
          : "none";
    });
}

/* =========================
   DOM READY
========================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    installStableBottomNav();

    const path =
      window
        .location
        .pathname
        .toLowerCase();

    const publicPage =
      path.endsWith(
        "/login.html"
      ) ||
      path.endsWith(
        "/register.html"
      ) ||
      path.endsWith(
        "/index.html"
      ) ||
      path === "/";

    if (!publicPage) {
      const user =
        requireDlmLogin();

      if (!user) return;

      updateCommonUserUI(
        user
      );

      const refreshed =
        await refreshDlmUser();

      if (refreshed) {
        updateCommonUserUI(
          refreshed
        );
      }
    }

    document
      .querySelectorAll(
        "a.logout"
      )
      .forEach(link => {
        link.addEventListener(
          "click",
          event => {
            event.preventDefault();
            logoutDlmUser();
          }
        );
      });
  }
);


/* =========================
   GLOBAL PIN APP-LOCK
========================= */

const DLM_PIN_EXEMPT_PAGES = new Set([
  "/login.html",
  "/register.html",
  "/forgot-password.html",
  "/reset-password.html",
  "/pin-reset.html",
  "/change-password.html"
]);

function currentPageName() {
  const path =
    window.location.pathname
      .toLowerCase();

  const slash =
    path.lastIndexOf("/");

  return path.slice(slash) || "/";
}

function isPinExemptPage() {
  const page = currentPageName();

  return (
    page === "/" ||
    page === "/index.html" ||
    DLM_PIN_EXEMPT_PAGES.has(page)
  );
}

function clearPinUnlock() {
  sessionStorage.removeItem(
    "dlm_pin_token"
  );

  sessionStorage.removeItem(
    "dlm_pin_unlocked"
  );
}

function createPinOverlay() {
  if (
    document.getElementById(
      "dlmPinLock"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "dlm-pin-lock-style";

  style.textContent = `
    #dlmPinLock{
      position:fixed;
      inset:0;
      z-index:2147483640;
      display:none;
      align-items:center;
      justify-content:center;
      padding:22px;
      background:rgba(3,5,9,.94);
      backdrop-filter:blur(18px);
      -webkit-backdrop-filter:blur(18px);
    }

    #dlmPinLock.show{
      display:flex;
    }

    .dlm-pin-box{
      width:100%;
      max-width:390px;
      padding:26px 20px 20px;
      border-radius:28px;
      background:#0e121b;
      border:1px solid rgba(255,255,255,.09);
      box-shadow:0 24px 70px rgba(0,0,0,.45);
      text-align:center;
    }

    .dlm-pin-logo{
      width:58px;
      height:58px;
      margin:0 auto 15px;
      border-radius:19px;
      display:flex;
      align-items:center;
      justify-content:center;
      background:linear-gradient(135deg,#5662ff,#7868ff);
      font-weight:950;
      font-size:22px;
    }

    .dlm-pin-title{
      font-size:25px;
      font-weight:950;
      color:#fff;
      margin-bottom:6px;
    }

    .dlm-pin-sub{
      color:#9199ab;
      font-size:12px;
      line-height:1.5;
      margin-bottom:19px;
    }

    .dlm-pin-input{
      width:100%;
      height:58px;
      border-radius:17px;
      border:1px solid rgba(255,255,255,.10);
      outline:0;
      text-align:center;
      letter-spacing:12px;
      font-size:26px;
      font-weight:900;
      background:#121827;
      color:#fff;
      padding-left:12px;
    }

    .dlm-pin-input:focus{
      border-color:#6671ff;
    }

    .dlm-pin-error{
      min-height:19px;
      margin:10px 0;
      font-size:12px;
      color:#ff8e98;
    }

    .dlm-pin-btn{
      width:100%;
      border:0;
      border-radius:17px;
      padding:16px;
      background:linear-gradient(135deg,#5662ff,#7868ff);
      color:#fff;
      font-size:15px;
      font-weight:900;
    }

    .dlm-pin-links{
      display:flex;
      justify-content:center;
      gap:16px;
      margin-top:16px;
    }

    .dlm-pin-links a{
      color:#aab0ff;
      text-decoration:none;
      font-size:12px;
      font-weight:800;
    }
  `;

  document.head.appendChild(style);

  const lock =
    document.createElement("div");

  lock.id = "dlmPinLock";

  lock.innerHTML = `
    <div class="dlm-pin-box">
      <div class="dlm-pin-logo">D</div>
      <div class="dlm-pin-title">
        DLM Wallet locked
      </div>

      <div class="dlm-pin-sub">
        Antre PIN 6 chif ou pou kontinye.
      </div>

      <input
        id="dlmPinInput"
        class="dlm-pin-input"
        type="password"
        inputmode="numeric"
        pattern="[0-9]*"
        autocomplete="off"
        maxlength="6"
        aria-label="Security PIN"
      >

      <div
        id="dlmPinError"
        class="dlm-pin-error"
      ></div>

      <button
        id="dlmPinUnlockBtn"
        class="dlm-pin-btn"
        type="button"
      >
        Unlock
      </button>

      <div class="dlm-pin-links">
        <a href="pin-reset.html">
          Forgot PIN?
        </a>

        <a href="#"
           onclick="logoutDlmUser();return false;">
          Logout
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(lock);

  const input =
    document.getElementById(
      "dlmPinInput"
    );

  const button =
    document.getElementById(
      "dlmPinUnlockBtn"
    );

  async function unlock() {
    const pin =
      input.value.trim();

    const error =
      document.getElementById(
        "dlmPinError"
      );

    if (!/^\d{6}$/.test(pin)) {
      error.innerText =
        "Antre 6 chif.";
      return;
    }

    button.disabled = true;
    button.innerText =
      "Checking...";

    error.innerText = "";

    try {
      const data =
        await dlmApi(
          "/pin/verify",
          {
            method: "POST",
            body: JSON.stringify({
              pin
            })
          }
        );

      sessionStorage.setItem(
        "dlm_pin_token",
        data.pinToken
      );

      sessionStorage.setItem(
        "dlm_pin_unlocked",
        "1"
      );

      input.value = "";

      lock.classList.remove(
        "show"
      );
    } catch (e) {
      error.innerText =
        e.message;
      input.value = "";
      input.focus();
    } finally {
      button.disabled = false;
      button.innerText =
        "Unlock";
    }
  }

  button.addEventListener(
    "click",
    unlock
  );

  input.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter"
      ) {
        unlock();
      }
    }
  );
}

function showPinLock() {
  createPinOverlay();

  const lock =
    document.getElementById(
      "dlmPinLock"
    );

  const input =
    document.getElementById(
      "dlmPinInput"
    );

  lock.classList.add("show");

  setTimeout(
    () => input?.focus(),
    60
  );
}

async function initializePinGate() {
  if (
    isPinExemptPage() ||
    !getDlmToken()
  ) {
    return;
  }

  try {
    const status =
      await dlmApi(
        "/pin/status"
      );

    if (!status.pinEnabled) {
      return;
    }

    const unlocked =
      sessionStorage.getItem(
        "dlm_pin_unlocked"
      );

    const pinToken =
      sessionStorage.getItem(
        "dlm_pin_token"
      );

    if (
      unlocked !== "1" ||
      !pinToken
    ) {
      showPinLock();
    }
  } catch {
    // Authentication redirect is handled elsewhere.
  }
}

/*
  Internal navigation grace:
  don't re-lock merely because the user
  taps another page inside DLM Wallet.
*/
document.addEventListener(
  "click",
  event => {
    const link =
      event.target.closest("a");

    if (!link) return;

    try {
      const url =
        new URL(
          link.href,
          window.location.href
        );

      if (
        url.origin ===
        window.location.origin
      ) {
        sessionStorage.setItem(
          "dlm_internal_nav_until",
          String(Date.now() + 2500)
        );
      }
    } catch {}
  },
  true
);

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState !==
      "hidden"
    ) {
      if (
        document.visibilityState ===
        "visible" &&
        !isPinExemptPage() &&
        getDlmToken()
      ) {
        initializePinGate();
      }

      return;
    }

    const grace =
      Number(
        sessionStorage.getItem(
          "dlm_internal_nav_until"
        ) || 0
      );

    if (Date.now() < grace) {
      return;
    }

    clearPinUnlock();
  }
);

window.addEventListener(
  "pageshow",
  () => {
    if (
      !isPinExemptPage()
    ) {
      initializePinGate();
    }
  }
);

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initializePinGate();
  }
);
