// ===== CONFIG =====
const REPO = ""; // PA METE /Fastpayhaiti


// ===== NAVIGATION =====
function nav(active = "") {
  return `
    <div class="bottom-nav">

      <a href="${REPO}/index.html" class="${active === "home" ? "active" : ""}">
        🏠
        <span>Home</span>
      </a>

      <a href="${REPO}/transactions.html" class="${active === "transactions" ? "active" : ""}">
        🔄
        <span>Transactions</span>
      </a>

      <a href="${REPO}/services.html" class="${active === "services" ? "active" : ""}">
        ₿
        <span>Services</span>
      </a>

      <a href="${REPO}/cards.html" class="${active === "cards" ? "active" : ""}">
        💳
        <span>Cards</span>
      </a>

      <a href="${REPO}/wallet.html" class="${active === "wallet" ? "active" : ""}">
        👛
        <span>Wallet</span>
      </a>

    </div>
  `;
}


// ===== LOAD NAV =====
function loadPageNav(active) {
  const root = document.getElementById("nav-root");
  if (root) {
    root.innerHTML = nav(active);
  }
}


// ===== WALLET SYSTEM (LOCAL) =====
function getBalance() {
  return parseFloat(localStorage.getItem("balance") || "0");
}

function setBalance(amount) {
  localStorage.setItem("balance", amount.toFixed(2));
}


// ===== CHARGE WALLET =====
function chargeWallet() {
  const userId = document.getElementById("userId").value;
  const result = document.getElementById("result");

  if (!userId) {
    result.innerText = "Tanpri mete User ID";
    return;
  }

  let balance = getBalance();
  document.getElementById("balance").innerText = "$" + balance.toFixed(2);

  result.innerText = "Wallet chaje avèk siksè!";
}


// ===== ADD MONEY =====
function addMoney() {
  const amountInput = document.getElementById("amount");
  const result = document.getElementById("result");

  let amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    result.innerText = "Mete yon montan ki valid";
    return;
  }

  let balance = getBalance();
  balance += amount;

  setBalance(balance);

  document.getElementById("balance").innerText = "$" + balance.toFixed(2);
  result.innerText = "Ajout lajan reyisi ✅";

  amountInput.value = "";
}


// ===== LOAD WALLET PAGE =====
function loadWallet() {
  let balance = getBalance();
  const el = document.getElementById("balance");

  if (el) {
    el.innerText = "$" + balance.toFixed(2);
  }
}


// ===== AUTO LOAD =====
document.addEventListener("DOMContentLoaded", () => {
  loadWallet();
});
