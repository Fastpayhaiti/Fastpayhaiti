function nav(active = "") {
  return `
    <div class="bottom-nav">
      <a href="./dashboard.html" class="${active === "home" ? "active" : ""}">🏠<span>Home</span></a>
      <a href="./transactions.html" class="${active === "transactions" ? "active" : ""}">🔄<span>Transactions</span></a>
      <a href="./services.html" class="${active === "services" ? "active" : ""}">₿<span>Services</span></a>
      <a href="./cards.html" class="${active === "cards" ? "active" : ""}">💳<span>Cards</span></a>
      <a href="./wallet.html" class="${active === "wallet" ? "active" : ""}">👛<span>Wallet</span></a>
    </div>
  `;
}

function loadPageNav(active = "") {
  const navRoot = document.getElementById("nav-root");
  if (navRoot) navRoot.innerHTML = nav(active);
}
