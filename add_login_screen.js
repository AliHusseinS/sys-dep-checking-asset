const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Insert Login Screen HTML right after <body ...>
const bodyTagMatch = html.match(/<body[^>]*>/);
if (!bodyTagMatch) {
  console.error('❌ <body> tag not found');
  process.exit(1);
}
const bodyTag = bodyTagMatch[0];
const bodyIdx = html.indexOf(bodyTag) + bodyTag.length;

const loginScreenHtml = `
  <!-- ================= واجهة تسجيل الدخول (Login Screen) ================= -->
  <div id="view-login-screen" class="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 p-4 transition-all duration-300">
    <div class="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-center text-white relative overflow-hidden">
      
      <!-- خلفية زخرفية ناعمة -->
      <div class="absolute -top-20 -right-20 w-44 h-44 bg-primary-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-20 -left-20 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <!-- الشعار الدائري الرسمي -->
      <div class="relative mx-auto w-24 h-24 rounded-full bg-white p-1.5 border-4 border-amber-400 shadow-xl flex items-center justify-center mb-4">
        <img src="logo.png" onerror="if(window.UOK_LOGO)this.src=window.UOK_LOGO" alt="شعار كلية التخطيط العمراني - جامعة الكوفة" class="w-full h-full object-contain">
      </div>

      <!-- العناوين الرسمية للمنظومة -->
      <h2 class="text-xs sm:text-sm font-semibold text-slate-300 mb-1">جامعة الكوفة — كلية التخطيط العمراني</h2>
      <h1 class="text-lg sm:text-xl font-extrabold text-white tracking-tight mb-2">منظومة تدقيق رصانة البحوث العلمية</h1>
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-amber-300 font-semibold mb-6">
        <i class="fa-solid fa-shield-halved text-[11px]"></i>
        <span>لجنة تدقيق الرصانة العلمية | تقييم الأداء</span>
      </div>

      <!-- نموذج إدخال كلمة المرور (فقط بدون اسم مستخدم) -->
      <form onsubmit="event.preventDefault(); handleSystemLogin();" class="space-y-4 text-right">
        <div>
          <label for="input-system-password" class="block text-xs font-bold text-slate-200 mb-1.5 pr-1">
            كلمة المرور :
          </label>
          <div class="relative">
            <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <i class="fa-solid fa-lock text-sm"></i>
            </span>
            <input type="password" 
                   id="input-system-password" 
                   required
                   autocomplete="current-password"
                   placeholder="أدخل كلمة المرور..." 
                   class="w-full bg-slate-900/80 border border-slate-700/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 rounded-xl pr-10 pl-11 py-3 text-sm text-white placeholder-slate-500 outline-none transition font-mono shadow-inner">
            <button type="button" 
                    onclick="toggleLoginPasswordVisibility()" 
                    title="إظهار / إخفاء كلمة المرور"
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1">
              <i id="icon-login-eye" class="fa-solid fa-eye text-sm"></i>
            </button>
          </div>
          <!-- رسالة الخطأ عند إدخال رمز خاطئ -->
          <p id="login-error-msg" class="text-xs text-rose-400 font-bold mt-2 pr-1 hidden flex items-center gap-1.5">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>كلمة المرور غير صحيحة! يرجى المحاولة مرة أخرى.</span>
          </p>
        </div>

        <button type="submit" 
                id="btn-system-login"
                class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 transition active:scale-95 cursor-pointer">
          <i class="fa-solid fa-right-to-bracket text-base"></i>
          <span>دخول إلى المنظومة</span>
        </button>
      </form>

      <p class="text-[11px] text-slate-400 mt-6 leading-relaxed">
        الوصول مقتصر على السادة أعضاء لجنة تدقيق الرصانة العلمية والمخولين فقط.
      </p>
    </div>
  </div>
`;

if (!html.includes('id="view-login-screen"')) {
  html = html.substring(0, bodyIdx) + '\n' + loginScreenHtml + html.substring(bodyIdx);
  console.log('✅ Added Login Screen overlay after <body>');
} else {
  console.log('ℹ️ Login Screen already exists');
}

// 2. Add Logout button to Navbar
const navCheckResearchBtn = 'id="btn-check-research"';
const navBtnIdx = html.indexOf(navCheckResearchBtn);
if (navBtnIdx !== -1 && !html.includes('handleSystemLogout()')) {
  // Find the closing of this button
  const btnCloseIdx = html.indexOf('</button>', navBtnIdx);
  if (btnCloseIdx !== -1) {
    const logoutBtnHtml = `

          <!-- زر تسجيل الخروج وقفل المنظومة -->
          <button onclick="handleSystemLogout()" title="تسجيل الخروج وقفل المنظومة" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 hover:text-white text-xs sm:text-sm font-semibold transition active:scale-95">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            <span class="hidden md:inline">خروج</span>
          </button>`;

    const insertPos = btnCloseIdx + 9;
    html = html.substring(0, insertPos) + logoutBtnHtml + html.substring(insertPos);
    console.log('✅ Added Logout button to Navbar');
  }
}

// 3. Add JS functions for Login handling before closing script tag
const loginJsFunctions = `
    // =====================================================================
    // 8. منظومة تسجيل الدخول بالرقم السري (1122334455)
    // =====================================================================
    function checkPortalAuth() {
      const isAuth = sessionStorage.getItem('uok_auth') === 'true';
      const loginScreen = document.getElementById('view-login-screen');
      if (isAuth) {
        if (loginScreen) loginScreen.classList.add('hidden');
      } else {
        if (loginScreen) {
          loginScreen.classList.remove('hidden');
          const passInput = document.getElementById('input-system-password');
          if (passInput) setTimeout(() => passInput.focus(), 200);
        }
      }
    }

    function handleSystemLogin() {
      const passInput = document.getElementById('input-system-password');
      const errEl = document.getElementById('login-error-msg');
      if (!passInput) return;

      const entered = passInput.value.trim();
      if (entered === appState.systemPassword) {
        sessionStorage.setItem('uok_auth', 'true');
        if (errEl) errEl.classList.add('hidden');
        const loginScreen = document.getElementById('view-login-screen');
        if (loginScreen) {
          loginScreen.classList.add('opacity-0');
          setTimeout(() => {
            loginScreen.classList.add('hidden');
            loginScreen.classList.remove('opacity-0');
          }, 250);
        }
        Swal.fire({
          toast: true,
          position: 'top-start',
          icon: 'success',
          title: 'تم تسجيل الدخول بنجاح — مرحباً بكم',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        if (errEl) errEl.classList.remove('hidden');
        passInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/30');
        setTimeout(() => {
          passInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/30');
        }, 1500);
        passInput.select();
      }
    }

    function handleSystemLogout() {
      Swal.fire({
        title: 'تسجيل الخروج',
        text: 'هل أنت متأكد من رغبتك في تسجيل الخروج وقفل المنظومة؟',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، خروج',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b'
      }).then((result) => {
        if (result.isConfirmed) {
          sessionStorage.removeItem('uok_auth');
          const loginScreen = document.getElementById('view-login-screen');
          if (loginScreen) {
            loginScreen.classList.remove('hidden');
            const passInput = document.getElementById('input-system-password');
            if (passInput) {
              passInput.value = '';
              setTimeout(() => passInput.focus(), 150);
            }
          }
        }
      });
    }

    function toggleLoginPasswordVisibility() {
      const passInput = document.getElementById('input-system-password');
      const eyeIcon = document.getElementById('icon-login-eye');
      if (!passInput || !eyeIcon) return;
      if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
      } else {
        passInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
      }
    }
`;

const closeScriptTag = '</script>';
const lastScriptIdx = html.lastIndexOf(closeScriptTag);
if (lastScriptIdx !== -1 && !html.includes('function handleSystemLogin()')) {
  html = html.substring(0, lastScriptIdx) + loginJsFunctions + '\n  ' + html.substring(lastScriptIdx);
  console.log('✅ Added Login JS functions before </script>');
}

// 4. Call checkPortalAuth() inside DOMContentLoaded
const domLoadedMarker = 'document.addEventListener("DOMContentLoaded", () => {';
const domLoadedIdx = html.indexOf(domLoadedMarker);
if (domLoadedIdx !== -1 && !html.includes('checkPortalAuth();')) {
  const insertAuthCheck = domLoadedMarker + '\n      // التحقق الفوري من حالة تسجيل الدخول\n      checkPortalAuth();\n';
  html = html.replace(domLoadedMarker, insertAuthCheck);
  console.log('✅ Added checkPortalAuth() call inside DOMContentLoaded');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('🎉 Successfully saved index.html with complete Login protection system!');
