    function toggleSidebar() {
      document.getElementById("sidebar").classList.toggle("collapsed");
    }

    function toggleMobileSidebar() {
      document.getElementById("sidebar").classList.toggle("active");
      document.getElementById("overlay").classList.toggle("show");
    }

    function closeMobileSidebar() {
      document.getElementById("sidebar").classList.remove("active");
      document.getElementById("overlay").classList.remove("show");
    }

    function toggleDropdown() {
      document.getElementById("dropdown").classList.toggle("show");
    }

    function toggleTheme() {
      const body = document.body;
      const icon = document.getElementById("theme-icon");
      const label = document.querySelector(".switch-label");
      const isDark = body.getAttribute("data-theme") === "dark";
      body.setAttribute("data-theme", isDark ? "light" : "dark");
      icon.textContent = isDark ? "🌙" : "☀️";
      label.textContent = isDark ? "Modo oscuro" : "Modo claro";
    }

    function logout() {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "login.html";
    }

    window.onclick = function (e) {
      if (!e.target.closest('.profile-section')) {
        const dropdown = document.getElementById("dropdown");
        if (dropdown && dropdown.classList.contains("show")) {
          dropdown.classList.remove("show");
        }
      }
    }
