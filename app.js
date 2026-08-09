const DLM_API_BASE = "https://fastpayhaiti.onrender.com";

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

function logoutDlmUser() {
  clearDlmSession();
  window.location.replace("login.html");
}

document.addEventListener("DOMContentLoaded", async () => {
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
