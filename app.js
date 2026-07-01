// App file: page events, auth flow, form reading, PDF download aur UI actions handle karta hai.
const ResumeApp = (() => {
  const { $, $$, splitTags, splitLines, showToast } = ResumeUtils;
  const { fields, tagFields, listFields, state, sample } = ResumeData;

  // Form ke current values collect karke ek single data object banata hai.
  function getFormData() {
    const data = {};
    fields.forEach((id) => {
      data[id] = $(`#${id}`).value.trim();
    });
    tagFields.forEach((id) => {
      data[id] = splitTags($(`#${id}`).value);
    });
    listFields.forEach((id) => {
      data[id] = splitLines($(`#${id}`).value);
    });
    return data;
  }

  // Latest form data renderer ko bhejta hai, jisse live preview refresh hota hai.
  function renderResume() {
    ResumeRenderer.render(getFormData());
  }

  // Personal/Education/Work/Skills tabs me selected section open karta hai.
  function openSection(id) {
    $$(".form-section").forEach((section) => section.classList.toggle("active", section.id === id));
    $$(".tab-btn").forEach((button) => button.classList.toggle("active", button.dataset.target === id));
    // Generate button sirf Skills (extras) section me dikhao
    const generateBtn = $("#generateBtn");
    if (generateBtn) generateBtn.classList.toggle("hidden", id !== "extras");
  }

  // Generate/PDF se pehle required fields check karta hai aur error highlight karta hai.
  function validateRequired() {
    const name = $("#name");
    const email = $("#email");
    [name, email].forEach((input) => input.classList.remove("invalid"));
    if (!name.value.trim() || !email.value.trim()) {
      if (!name.value.trim()) name.classList.add("invalid");
      if (!email.value.trim()) email.classList.add("invalid");
      showToast("Name and Email fill karo, phir generate/download hoga.");
      openSection("personal");
      return false;
    }
    return true;
  }

  // Sample button ke liye demo data form me fill karta hai.
  function fillSample() {
    Object.entries(sample).forEach(([id, value]) => {
      const input = $(`#${id}`);
      if (input) input.value = value;
    });
    state.photo = "";
    $("#photoPreview").style.display = "none";
    $("#photoText").textContent = "Upload photo";
    renderResume();
    showToast("Sample details added. Presentation ke liye ready demo data hai.");
  }

  // Signup aur Login mode ke labels/fields switch karta hai.
  function setAuthMode(mode) {
    state.authMode = mode;
    const isSignup = mode === "signup";
    $("#authTitle").textContent = isSignup ? "Create account" : "Welcome back";
    $("#authSubmit").textContent = isSignup ? "Sign Up" : "Login";
    $("#authSwitchText").textContent = isSignup ? "Already have an account?" : "New here?";
    $("#authSwitchBtn").textContent = isSignup ? "Login" : "Sign Up";
    $$(".signup-only").forEach((item) => item.classList.toggle("hidden", !isSignup));
  }

  // Auth screen hide karke templates page show karta hai.
  function showApp(userName) {
    $("#landingView").classList.add("hidden");
    $("#authView").classList.add("hidden");
    $("#templateView").classList.remove("hidden");
    $("#appView").classList.add("hidden");
    if (userName && !$("#name").value.trim()) $("#name").value = userName;
  }

  // Template select hone par resume builder show karta hai.
  function selectTemplate(template) {
    state.template = template;
    $$(".template-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.template === template));
    $("#templateView").classList.add("hidden");
    $("#appView").classList.remove("hidden");
    renderResume();
  }

  // Session clear aur landing view redirection handles karta hai.
  function handleLogout() {
    sessionStorage.removeItem("resume_studio_user");
    sessionStorage.removeItem("resume_studio_token");
    $("#appView").classList.add("hidden");
    $("#templateView").classList.add("hidden");
    $("#authView").classList.add("hidden");
    $("#landingView").classList.remove("hidden");
    showToast("Logged out.");
  }

  // 🌐 Production backend URL (Render.com deployed)
  const API_URL = "https://resume-builder-kofl.onrender.com/api/auth";

  // Signup/Login form submit handle karta hai using backend API
  async function handleAuth(event) {
    event.preventDefault();
    const name = $("#authName").value.trim();
    const email = $("#authEmail").value.trim().toLowerCase();
    const password = $("#authPassword").value.trim();
    if (state.authMode === "signup" && !name) return showToast("Name is required for signup.");
    if (!email || !email.includes("@")) return showToast("Valid email enter karo.");
    if (password.length < 6) return showToast("Password minimum 6 characters ka rakho.");

    const endpoint = state.authMode === "signup" ? "/signup" : "/login";
    const bodyData = state.authMode === "signup" ? { name, email, password } : { email, password };

    try {
      const submitBtn = $("#authSubmit");
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = state.authMode === "signup" ? "Signing Up..." : "Logging In...";

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;

      if (!response.ok) {
        return showToast(data.message || "Something went wrong.");
      }

      sessionStorage.setItem("resume_studio_token", data.token);
      sessionStorage.setItem("resume_studio_user", JSON.stringify({ name: data.user.name, email: data.user.email }));

      showApp(data.user.name);
      showToast(state.authMode === "signup" ? "Account created successfully!" : "Login successful.");

    } catch (error) {
      console.error("Auth error:", error);
      showToast("Cannot connect to backend. Make sure server is running on port 5000.");
      
      const submitBtn = $("#authSubmit");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = state.authMode === "signup" ? "Sign Up" : "Login";
      }
    }
  }

  // Saare buttons, inputs, tabs, template picker aur photo upload ke events connect karta hai.
  function bindEvents() {
    // Navigation events
    $("#navSignIn").addEventListener("click", () => {
      $("#landingView").classList.add("hidden");
      $("#authView").classList.remove("hidden");
      setAuthMode("login");
    });
    
    $("#navSignUp").addEventListener("click", () => {
      $("#landingView").classList.add("hidden");
      $("#authView").classList.remove("hidden");
      setAuthMode("signup");
    });

    $("#heroBrowse").addEventListener("click", () => {
      const session = sessionStorage.getItem("resume_studio_user");
      if (session) {
        $("#landingView").classList.add("hidden");
        $("#templateView").classList.remove("hidden");
      } else {
        $("#landingView").classList.add("hidden");
        $("#authView").classList.remove("hidden");
        setAuthMode("login");
      }
    });

    $("#heroGetStarted").addEventListener("click", () => {
      $("#landingView").classList.add("hidden");
      $("#authView").classList.remove("hidden");
      setAuthMode("signup");
    });

    $("#ctaStart").addEventListener("click", () => {
      $("#landingView").classList.add("hidden");
      $("#authView").classList.remove("hidden");
      setAuthMode("signup");
    });

    $("#authBack").addEventListener("click", () => {
      $("#authView").classList.add("hidden");
      $("#landingView").classList.remove("hidden");
    });

    // Logout events
    $("#logoutBtn").addEventListener("click", handleLogout);
    $("#templateLogoutBtn").addEventListener("click", handleLogout);

    // Template selection inside grid
    $$(".templateSelectBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectTemplate(btn.dataset.template);
      });
    });

    // Back to templates from builder
    $("#backTemplatesBtn").addEventListener("click", () => {
      $("#appView").classList.add("hidden");
      $("#templateView").classList.remove("hidden");
    });

    // Original form events
    $("#authForm").addEventListener("submit", handleAuth);
    $("#togglePassword").addEventListener("click", togglePasswordVisibility);
    $("#authSwitchBtn").addEventListener("click", () => setAuthMode(state.authMode === "signup" ? "login" : "signup"));

    $$("[data-field], [data-tags], [data-list]").forEach((input) => input.addEventListener("input", renderResume));
    $$(".tab-btn").forEach((button) => button.addEventListener("click", () => openSection(button.dataset.target)));
    
    // Existing template-picker inside builder
    $$(".template-btn").forEach((button) => {
      button.addEventListener("click", () => {
        state.template = button.dataset.template;
        $$(".template-btn").forEach((btn) => btn.classList.toggle("active", btn === button));
        renderResume();
      });
    });

    $("#photo").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        state.photo = reader.result;
        $("#photoPreview").src = reader.result;
        $("#photoPreview").style.display = "block";
        $("#photoText").textContent = "Photo selected";
        renderResume();
      };
      reader.readAsDataURL(file);
    });

    $("#generateBtn").addEventListener("click", () => {
      renderResume();
      if (!validateRequired()) return;
      $(".preview-panel").scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Resume preview ready. Template choose karke PDF download karo.");
    });

    $("#downloadBtn").addEventListener("click", () => {
      renderResume();
      if (!validateRequired()) return;
      showToast("PDF dialog open ho raha hai. Destination me Save as PDF choose karo.");
      setTimeout(() => window.print(), 250);
    });

    $("#sampleBtn").addEventListener("click", fillSample);

    // Next buttons – section navigate karta hai next tab pe
    $$(".next-btn").forEach((btn) => {
      btn.addEventListener("click", () => openSection(btn.dataset.next));
    });

    // Ripple effect – saare .ripple elements pe click pe wave banata hai
    initRipple();
  }

  // Click pe ripple wave animation create karta hai
  function createRipple(event) {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = (event.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (event.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
    const wave = document.createElement("span");
    wave.className = "ripple-wave";
    wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    el.appendChild(wave);
    wave.addEventListener("animationend", () => wave.remove());
  }

  // Page ke saare .ripple class elements pe ripple event lagata hai
  function initRipple() {
    document.querySelectorAll(".ripple").forEach((el) => {
      el.addEventListener("click", createRipple);
    });
  }

  // Password input ko show/hide karta hai, jisse user typing verify kar sake.
  function togglePasswordVisibility() {
    const input = $("#authPassword");
    const button = $("#togglePassword");
    const shouldShow = input.type === "password";
    input.type = shouldShow ? "text" : "password";
    button.textContent = shouldShow ? "Hide" : "Show";
    button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
  }

  // Page load par app start karta hai, session restore karta hai and first preview render karta hai.
  function init() {
    bindEvents();
    setAuthMode("signup");
    // Generate button initially hidden (default tab = personal, show only on Skills tab)
    const generateBtn = $("#generateBtn");
    if (generateBtn) generateBtn.classList.add("hidden");
    
    const session = JSON.parse(sessionStorage.getItem("resume_studio_user") || "null");
    if (session) {
      showApp(session.name);
    } else {
      $("#landingView").classList.remove("hidden");
      $("#authView").classList.add("hidden");
      $("#templateView").classList.add("hidden");
      $("#appView").classList.add("hidden");
    }
    renderResume();
  }

  // App ka public start method expose karta hai.
  return { init };
})();

// Browser page load hote hi resume app initialize hoti hai.
ResumeApp.init();
