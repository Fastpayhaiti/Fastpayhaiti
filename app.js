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
