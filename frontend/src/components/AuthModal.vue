<template>
  <div class="auth-overlay">
    <div class="auth-card p-4 p-md-5 rounded-4 shadow-lg position-relative">
      <!-- Glow effect -->
      <div class="auth-glow"></div>

      <!-- Header Icon & Brand -->
      <div class="text-center mb-4 position-relative" style="z-index: 2;">
        <div class="auth-icon-box mx-auto mb-3">
          <svg v-if="mode === 'setup'" width="28" height="28" fill="#06b6d4" viewBox="0 0 16 16">
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
          </svg>
          <svg v-else width="28" height="28" fill="#fbbf24" viewBox="0 0 16 16">
            <path d="M11 1a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V3a3 3 0 0 1 6 0v4a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2z"/>
          </svg>
        </div>

        <span class="cyber-badge" :class="mode === 'setup' ? 'badge-tips' : 'badge-cve'">
          {{ mode === 'setup' ? 'INITIAL SYSTEM SETUP' : 'AUTHENTICATION REQUIRED' }}
        </span>

        <h3 class="auth-title mt-2 mb-1 fw-bold">
          {{ mode === 'setup' ? 'Create Admin Account' : 'Access Gateway' }}
        </h3>
        <p class="text-secondary small mb-0" style="font-family: var(--font-mono);">
          {{ mode === 'setup' 
              ? 'First-time launch detected. Configure your primary administrative credentials to secure this node.' 
              : 'Zero-trust protected node. Enter your credentials to unlock threat radar feeds.' }}
        </p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMessage" class="alert alert-danger py-2 px-3 mb-3 d-flex align-items-center gap-2 small rounded-3" style="background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.35); color: #fda4af; font-family: var(--font-mono);">
        <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
          <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z"/>
          <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="position-relative" style="z-index: 2;">
        <!-- Username -->
        <div class="mb-3">
          <label class="form-label text-muted small fw-semibold text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.5px;">
            Username
          </label>
          <div class="input-group-cyber">
            <input
              type="text"
              v-model.trim="username"
              class="form-control form-control-cyber"
              placeholder="e.g. admin"
              required
              autocomplete="username"
              :disabled="loading"
            />
          </div>
        </div>

        <!-- Password -->
        <div class="mb-3">
          <label class="form-label text-muted small fw-semibold text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.5px;">
            Password
          </label>
          <div class="input-group-cyber">
            <input
              type="password"
              v-model="password"
              class="form-control form-control-cyber"
              placeholder="••••••••••••"
              required
              autocomplete="current-password"
              :disabled="loading"
            />
          </div>
          <div v-if="mode === 'setup'" class="text-muted mt-1" style="font-size: 0.72rem; font-family: var(--font-mono);">
            * Minimum 6 characters (hashed with PBKDF2-SHA512)
          </div>
        </div>

        <!-- Confirm Password (Setup mode only) -->
        <div v-if="mode === 'setup'" class="mb-4">
          <label class="form-label text-muted small fw-semibold text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.5px;">
            Confirm Password
          </label>
          <div class="input-group-cyber">
            <input
              type="password"
              v-model="confirmPassword"
              class="form-control form-control-cyber"
              placeholder="••••••••••••"
              required
              autocomplete="new-password"
              :disabled="loading"
            />
          </div>
        </div>

        <!-- Remember Me (Login mode only) -->
        <div v-if="mode === 'login'" class="form-check mb-4">
          <input
            class="form-check-input bg-dark border-secondary"
            type="checkbox"
            v-model="rememberMe"
            id="rememberMeCheck"
          />
          <label class="form-check-label text-secondary small" for="rememberMeCheck">
            Remember authentication on this device (7 days)
          </label>
        </div>

        <!-- Submit Action Button -->
        <button
          type="submit"
          class="btn-cyber-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-bold"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm" role="status"></span>
          <span v-else>{{ mode === 'setup' ? '⚡' : '🔒' }}</span>
          <span>{{ mode === 'setup' ? 'Complete Setup & Enter Terminal' : 'Authenticate & Unlock' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AuthModal',
  props: {
    initialMode: {
      type: String,
      default: 'login' // 'setup' or 'login'
    }
  },
  emits: ['auth-success'],
  data() {
    return {
      mode: this.initialMode,
      username: '',
      password: '',
      confirmPassword: '',
      rememberMe: true,
      errorMessage: '',
      loading: false
    };
  },
  watch: {
    initialMode(newVal) {
      this.mode = newVal;
      this.errorMessage = '';
    }
  },
  methods: {
    async handleSubmit() {
      this.errorMessage = '';

      if (this.mode === 'setup') {
        if (this.password !== this.confirmPassword) {
          this.errorMessage = 'Passwords do not match.';
          return;
        }
        if (this.password.length < 6) {
          this.errorMessage = 'Password must be at least 6 characters.';
          return;
        }

        this.loading = true;
        try {
          const res = await fetch('/api/auth/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: this.username,
              password: this.password
            })
          });

          const json = await res.json();
          if (!res.ok || json.status !== 200) {
            throw new Error(json.error || 'Failed to initialize administrator account.');
          }

          this.$emit('auth-success', {
            user: json.data.user,
            token: json.data.token,
            remember: true
          });
        } catch (err) {
          this.errorMessage = err.message;
        } finally {
          this.loading = false;
        }
      } else {
        // Login mode
        this.loading = true;
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: this.username,
              password: this.password
            })
          });

          const json = await res.json();
          if (!res.ok || json.status !== 200) {
            throw new Error(json.error || 'Invalid credentials.');
          }

          this.$emit('auth-success', {
            user: json.data.user,
            token: json.data.token,
            remember: this.rememberMe
          });
        } catch (err) {
          this.errorMessage = err.message;
        } finally {
          this.loading = false;
        }
      }
    }
  }
};
</script>

<style scoped>
.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(2, 6, 23, 0.88);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.auth-card {
  width: 100%;
  max-width: 480px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%);
  border: 1px solid rgba(6, 182, 212, 0.3);
  box-shadow: 0 0 40px rgba(6, 182, 212, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.auth-glow {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%);
  pointer-events: none;
}

.auth-icon-box {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-title {
  color: var(--text-primary);
  font-size: 1.35rem;
  letter-spacing: 0.5px;
}

.form-control-cyber {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid var(--border-color) !important;
  color: var(--text-primary) !important;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.form-control-cyber:focus {
  background: rgba(255, 255, 255, 0.07) !important;
  border-color: var(--accent-cyan) !important;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.25) !important;
  outline: none;
}
</style>
