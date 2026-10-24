// State Management
let currentUser = null;
let token = localStorage.getItem("bmt_token") || null;
let movies = [];
let selectedMovie = null;
let seats = [];
let selectedSeatId = null;

// Initialize on Load
document.addEventListener("DOMContentLoaded", async () => {
  if (token) {
    await fetchCurrentUser();
  }
  renderAuthNav();
  await loadMovies();
  await fetchSeats();
});

// --- AUTHENTICATION HELPERS ---

async function fetchCurrentUser() {
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    if (result.success && result.data) {
      currentUser = result.data;
      localStorage.setItem("bmt_user", JSON.stringify(currentUser));
    } else {
      logout();
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    logout();
  }
}

function renderAuthNav() {
  const navAuth = document.getElementById("nav-auth-section");
  const statusText = document.getElementById("user-status-text");

  if (currentUser) {
    navAuth.innerHTML = `
      <button onclick="openBookingsModal()" class="text-xs sm:text-sm font-semibold text-slate-700 hover:text-brand-600 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-brand-200 transition">
        🎟️ My Bookings
      </button>
      <div class="flex items-center gap-2 pl-2 border-l border-slate-200">
        <span class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-extrabold flex items-center justify-center text-xs">
          ${currentUser.name.charAt(0).toUpperCase()}
        </span>
        <span class="text-sm font-bold text-slate-800 hidden sm:inline">${currentUser.name}</span>
        <button onclick="logout()" title="Logout" class="text-slate-400 hover:text-rose-500 text-xs ml-1">
          (Logout)
        </button>
      </div>
    `;
    statusText.innerHTML = `Signed in as <strong class="text-slate-900">${currentUser.name}</strong> (${currentUser.email})`;
  } else {
    navAuth.innerHTML = `
      <button onclick="openAuthModal('login')" class="text-sm font-semibold text-slate-700 hover:text-brand-600 px-3 py-2 transition">
        Sign In
      </button>
      <button onclick="openAuthModal('register')" class="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl shadow-sm hover:shadow transition">
        Register
      </button>
    `;
    statusText.innerText = "You are currently browsing as a guest. Please log in to book seats.";
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("bmt_token");
  localStorage.removeItem("bmt_user");
  renderAuthNav();
}

// --- MODAL CONTROLS ---

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
  const tabs = ["login", "register", "forgot"];
  tabs.forEach((t) => {
    const btn = document.getElementById(`tab-${t}-btn`);
    const form = document.getElementById(`form-${t}`);
    if (t === tab) {
      btn.className = "flex-1 pb-3 font-bold text-sm text-brand-600 border-b-2 border-brand-600 transition";
      form.classList.remove("hidden");
    } else {
      btn.className = "flex-1 pb-3 font-bold text-sm text-slate-400 hover:text-slate-600 transition";
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
  const banner = document.getElementById("auth-error-banner");
  banner.classList.add("hidden");
}

// --- FORM SUBMISSIONS ---

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

    token = result.data.token;
    currentUser = result.data.user;
    localStorage.setItem("bmt_token", token);
    localStorage.setItem("bmt_user", JSON.stringify(currentUser));

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

    token = result.data.token;
    currentUser = result.data.user;
    localStorage.setItem("bmt_token", token);
    localStorage.setItem("bmt_user", JSON.stringify(currentUser));

    closeAuthModal();
    renderAuthNav();
    updateSummary();
  } catch (err) {
    showAuthError("Network error. Please try again.");
  }
}

async function submitForgotPassword(e) {
  e.preventDefault();
  hideAuthError();
  const email = document.getElementById("forgot-email").value;

  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await res.json();

    if (!result.success) {
      return showAuthError(result.message || "Failed to process request");
    }

    alert(`Reset token generated: ${result.data.resetToken}\n(Valid for 15 minutes)`);
    switchAuthTab("login");
  } catch (err) {
    showAuthError("Network error. Please try again.");
  }
}

// --- MOVIE & SEAT LOGIC ---

async function loadMovies() {
  const container = document.getElementById("movies-container");
  try {
    const res = await fetch("/api/movies");
    const result = await res.json();
    movies = result.data || [];

    if (movies.length > 0) {
      selectedMovie = movies[0];
      container.innerHTML = movies
        .map(
          (m) => `
        <div onclick="selectMovie(${m.id})" id="movie-card-${m.id}" 
             class="cursor-pointer rounded-xl overflow-hidden border-2 transition duration-200 ${
               selectedMovie?.id === m.id ? "border-brand-600 ring-2 ring-brand-100 shadow-md" : "border-slate-200 hover:border-slate-300"
             }">
          <div class="h-32 bg-slate-100 overflow-hidden">
            <img src="${m.poster_url}" alt="${m.title}" class="w-full h-full object-cover">
          </div>
          <div class="p-2.5 bg-white">
            <h4 class="font-bold text-xs text-slate-900 truncate">${m.title}</h4>
            <p class="text-[10px] text-slate-500 font-medium">${m.language} • ${m.duration}m</p>
          </div>
        </div>
      `
        )
        .join("");
      updateSummary();
    }
  } catch (err) {
    container.innerHTML = "<p class='text-xs text-rose-500'>Failed to load movies.</p>";
  }
}

function selectMovie(id) {
  selectedMovie = movies.find((m) => m.id === id);
  movies.forEach((m) => {
    const card = document.getElementById(`movie-card-${m.id}`);
    if (m.id === id) {
      card.className = "cursor-pointer rounded-xl overflow-hidden border-2 border-brand-600 ring-2 ring-brand-100 shadow-md transition duration-200";
    } else {
      card.className = "cursor-pointer rounded-xl overflow-hidden border-2 border-slate-200 hover:border-slate-300 transition duration-200";
    }
  });
  updateSummary();
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

        let seatClasses = "w-full aspect-square rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition duration-150 cursor-pointer ";
        if (isBooked) {
          seatClasses += "bg-rose-50 border border-rose-200 text-rose-400 cursor-not-allowed";
        } else if (isSelected) {
          seatClasses += "bg-brand-600 text-white shadow-md shadow-brand-500/20 scale-105";
        } else {
          seatClasses += "bg-white border border-slate-200 text-slate-700 hover:border-brand-500 hover:text-brand-600 shadow-sm";
        }

        return `
          <button onclick="handleSeatClick(${seat.id}, ${isBooked})" 
                  ${isBooked ? "disabled" : ""} 
                  title="${isBooked ? 'Booked' : 'Available: Seat ' + seat.id}" 
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
  if (selectedSeatId === seatId) {
    selectedSeatId = null;
  } else {
    selectedSeatId = seatId;
  }
  fetchSeats();
  updateSummary();
}

function updateSummary() {
  const summaryMovie = document.getElementById("summary-movie");
  const summarySeat = document.getElementById("summary-seat");
  const summaryTotal = document.getElementById("summary-total");
  const bookBtn = document.getElementById("book-btn");

  summaryMovie.innerText = selectedMovie ? selectedMovie.title : "None";

  if (selectedSeatId) {
    summarySeat.innerText = `Seat #${selectedSeatId}`;
    summaryTotal.innerText = "₹ 250";
    bookBtn.disabled = false;
    bookBtn.className = "w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-md hover:shadow-lg transition cursor-pointer";
    bookBtn.innerText = currentUser ? "Confirm & Book Seat" : "Sign In to Book Seat";
  } else {
    summarySeat.innerText = "None";
    summaryTotal.innerText = "₹ 0";
    bookBtn.disabled = true;
    bookBtn.className = "w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-slate-200 text-slate-400 cursor-not-allowed transition duration-200";
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
      body: JSON.stringify({
        seatId: selectedSeatId,
        movieId: selectedMovie ? selectedMovie.id : 1,
      }),
    });

    const result = await res.json();

    if (result.success) {
      alert(`🎉 Success! Seat #${selectedSeatId} has been booked for ${selectedMovie?.title}!`);
      selectedSeatId = null;
      await fetchSeats();
      updateSummary();
    } else {
      alert(`⚠️ Booking failed: ${result.message}`);
      await fetchSeats();
      updateSummary();
    }
  } catch (err) {
    alert("Network error while booking. Please try again.");
  } finally {
    updateSummary();
  }
}

// --- MY BOOKINGS MODAL ---

async function openBookingsModal() {
  if (!currentUser) return;
  const modal = document.getElementById("bookings-modal");
  const list = document.getElementById("my-bookings-list");
  modal.classList.remove("hidden");
  list.innerHTML = "<p class='text-xs text-slate-400 text-center py-4'>Loading tickets...</p>";

  try {
    const res = await fetch("/api/bookings/my-bookings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    const bookings = result.data || [];

    if (bookings.length === 0) {
      list.innerHTML = `
        <div class="text-center py-8">
          <span class="text-3xl">🎟️</span>
          <p class="text-sm font-semibold text-slate-600 mt-2">No bookings yet</p>
          <p class="text-xs text-slate-400">Select an available seat to make your first booking.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = bookings
      .map(
        (b) => `
      <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="${b.movie_poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100'}" class="w-12 h-16 rounded-lg object-cover">
          <div>
            <h4 class="font-bold text-sm text-slate-900">${b.movie_title}</h4>
            <p class="text-xs text-slate-500 font-medium">Seat: <strong class="text-brand-600">Seat #${b.seat_id}</strong></p>
            <p class="text-[10px] text-slate-400 mt-0.5">${new Date(b.booked_at).toLocaleString()}</p>
          </div>
        </div>
        <span class="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
          Confirmed
        </span>
      </div>
    `
      )
      .join("");
  } catch (err) {
    list.innerHTML = "<p class='text-xs text-rose-500 text-center'>Failed to fetch bookings.</p>";
  }
}

function closeBookingsModal() {
  document.getElementById("bookings-modal").classList.add("hidden");
}
