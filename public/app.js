let currentUser = null;
let token = localStorage.getItem("bmt_token") || null;
let seats = [];
let selectedSeatId = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (token) {
    await fetchCurrentUser();
  }
  renderAuthNav();
  await fetchSeats();
});

async function fetchCurrentUser() {
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    if (result.success && result.data) {
      currentUser = result.data;
    } else {
      logout();
    }
  } catch (err) {
    logout();
  }
}

function renderAuthNav() {
  const navAuth = document.getElementById("nav-auth-section");
  const statusText = document.getElementById("user-status-text");

  if (currentUser) {
    navAuth.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-extrabold flex items-center justify-center text-xs">
          ${currentUser.name.charAt(0).toUpperCase()}
        </span>
        <span class="text-sm font-bold text-slate-800">${currentUser.name}</span>
        <button onclick="logout()" class="text-xs text-slate-400 hover:text-rose-500 ml-1">
          (Logout)
        </button>
      </div>
    `;
    statusText.innerHTML = `Signed in as <strong>${currentUser.name}</strong> (${currentUser.email})`;
  } else {
    navAuth.innerHTML = `
      <button onclick="openAuthModal('login')" class="text-sm font-semibold text-slate-700 hover:text-brand-600 px-3 py-2">
        Sign In
      </button>
      <button onclick="openAuthModal('register')" class="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl">
        Register
      </button>
    `;
    statusText.innerText = "Browsing as a guest. Please sign in to book your seat.";
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("bmt_token");
  renderAuthNav();
  updateSummary();
}

function openAuthModal(tab = "login") {
  document.getElementById("auth-modal").classList.remove("hidden");
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.add("hidden");
  hideAuthError();
}

function switchAuthTab(tab) {
  hideAuthError();
  const tabs = ["login", "register"];
  tabs.forEach((t) => {
    const btn = document.getElementById(`tab-${t}-btn`);
    const form = document.getElementById(`form-${t}`);
    if (t === tab) {
      btn.className = "flex-1 pb-3 font-bold text-sm text-brand-600 border-b-2 border-brand-600";
      form.classList.remove("hidden");
    } else {
      btn.className = "flex-1 pb-3 font-bold text-sm text-slate-400";
      form.classList.add("hidden");
    }
  });
}

function showAuthError(msg) {
  const banner = document.getElementById("auth-error-banner");
  banner.innerText = msg;
  banner.classList.remove("hidden");
}

function hideAuthError() {
  document.getElementById("auth-error-banner").classList.add("hidden");
}

async function submitLogin(e) {
  e.preventDefault();
  hideAuthError();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await res.json();

    if (!result.success) {
      return showAuthError(result.message || "Invalid credentials");
    }

    token = result.data.accessToken;
    currentUser = result.data.user;
    localStorage.setItem("bmt_token", token);

    closeAuthModal();
    renderAuthNav();
    updateSummary();
  } catch (err) {
    showAuthError("Network error. Please try again.");
  }
}

async function submitRegister(e) {
  e.preventDefault();
  hideAuthError();
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const result = await res.json();

    if (!result.success) {
      return showAuthError(result.message || "Registration failed");
    }

    alert("Registration successful! Check Mailtrap for verification, or sign in now.");
    switchAuthTab("login");
  } catch (err) {
    showAuthError("Network error. Please try again.");
  }
}

async function fetchSeats() {
  const grid = document.getElementById("seats-grid");
  try {
    const res = await fetch("/seats");
    seats = await res.json();

    grid.innerHTML = seats
      .map((seat) => {
        const isBooked = seat.isbooked === 1;
        const isSelected = selectedSeatId === seat.id;

        let seatClasses = "w-full aspect-square rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition ";
        if (isBooked) {
          seatClasses += "bg-rose-50 border border-rose-200 text-rose-400 cursor-not-allowed";
        } else if (isSelected) {
          seatClasses += "bg-brand-600 text-white shadow-md scale-105";
        } else {
          seatClasses += "bg-white border border-slate-200 text-slate-700 hover:border-brand-500 hover:text-brand-600 cursor-pointer shadow-sm";
        }

        return `
          <button onclick="handleSeatClick(${seat.id}, ${isBooked})" 
                  ${isBooked ? "disabled" : ""} 
                  class="${seatClasses}">
            ${isBooked ? "✕" : seat.id}
          </button>
        `;
      })
      .join("");
  } catch (err) {
    grid.innerHTML = "<p class='text-xs text-rose-500 col-span-5 text-center'>Failed to load seats.</p>";
  }
}

function handleSeatClick(seatId, isBooked) {
  if (isBooked) return;
  selectedSeatId = selectedSeatId === seatId ? null : seatId;
  fetchSeats();
  updateSummary();
}

function updateSummary() {
  const summarySeat = document.getElementById("summary-seat");
  const bookBtn = document.getElementById("book-btn");

  if (selectedSeatId) {
    summarySeat.innerText = `Seat #${selectedSeatId}`;
    bookBtn.disabled = false;
    bookBtn.className = "w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-md transition cursor-pointer";
    bookBtn.innerText = currentUser ? "Confirm & Book Seat" : "Sign In to Book Seat";
  } else {
    summarySeat.innerText = "None";
    bookBtn.disabled = true;
    bookBtn.className = "w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-slate-100 text-slate-400 cursor-not-allowed transition duration-200";
    bookBtn.innerText = "Select a Seat to Book";
  }
}

async function handleBookSeat() {
  if (!selectedSeatId) return;

  if (!currentUser) {
    openAuthModal("login");
    return;
  }

  const bookBtn = document.getElementById("book-btn");
  bookBtn.disabled = true;
  bookBtn.innerText = "Booking in Progress...";

  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ seatId: selectedSeatId }),
    });

    const result = await res.json();

    if (result.success) {
      alert(`🎉 Success! Seat #${selectedSeatId} has been booked!`);
      selectedSeatId = null;
      await fetchSeats();
    } else {
      alert(`⚠️ Booking failed: ${result.message}`);
      await fetchSeats();
    }
  } catch (err) {
    alert("Network error while booking. Please try again.");
  } finally {
    updateSummary();
  }
}