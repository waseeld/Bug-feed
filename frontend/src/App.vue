<template>
  <div id="bugfeed-app" :class="theme">
    <!-- Main Top Navbar -->
    <header class="app-navbar sticky-top">
      <div class="container d-flex align-items-center justify-content-between flex-wrap gap-3">
        <!-- Brand & Live Indicator -->
        <div class="d-flex align-items-center gap-3">
          <a class="d-flex align-items-center gap-2 text-decoration-none" href="#" @click.prevent="activeTab = 'welcome'">
            <div class="brand-icon-box">
              <img
                src="/assets/img/icon/bug.png"
                width="32"
                height="32"
                alt="Bug Feed"
              />
            </div>
            <div class="d-flex flex-column">
              <span class="brand-title">BUG FEED</span>
              <span class="brand-subtitle">CYBER INTELLIGENCE</span>
            </div>
          </a>
          <span class="brand-badge d-none d-sm-inline-flex">LIVE INTEL</span>
        </div>

        <!-- Central Search Bar -->
        <div class="search-wrapper flex-grow-1 mx-md-4 my-2 my-md-0" style="max-width: 500px;">
          <svg class="search-icon-pos" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <input
            type="text"
            class="form-control search-input"
            placeholder="Search CVE, bug title, target program..."
            v-model="searchQuery"
          />
          <button
            v-if="searchQuery"
            class="clear-btn"
            type="button"
            @click="searchQuery = ''"
          >
            &times;
          </button>
        </div>

        <!-- Right Controls: Bookmarks & Dark/Light Toggle -->
        <div class="d-flex align-items-center gap-2">
          <button
            class="btn-cyber-outline d-flex align-items-center gap-2"
            :class="{ 'active': activeTab === 'saved' }"
            @click="activeTab = 'saved'"
            title="View saved bookmarks"
          >
            <svg width="14" height="14" fill="#fbbf24" viewBox="0 0 16 16">
              <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
            </svg>
            <span class="d-none d-sm-inline">Saved</span>
            <span class="badge rounded-pill" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-family: var(--font-mono); font-size: 0.72rem;">
              {{ savedItems.length }}
            </span>
          </button>

          <button
            class="btn-action-icon"
            @click="toggleTheme"
            :title="theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
          >
            <svg v-if="theme === 'dark'" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
            </svg>
            <svg v-else width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
            </svg>
          </button>

          <!-- Authenticated User Badge & Logout -->
          <div v-if="currentUser" class="d-flex align-items-center gap-2 border-start ps-2 ms-1" style="border-color: var(--border-color) !important;">
            <span class="cyber-badge badge-cve d-none d-sm-inline-flex align-items-center gap-1" style="font-size: 0.76rem;">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
              </svg>
              <span>{{ currentUser.username }}</span>
            </span>
            <button
              class="btn-action-icon"
              @click="logout"
              title="Logout from terminal"
              style="color: #f43f5e;"
            >
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Navigation Pills Bar -->
    <div class="container mt-4 mb-2">
      <div class="d-flex justify-content-center overflow-auto pb-1">
        <nav class="nav-cyber-tabs">
          <button
            class="cyber-tab-btn"
            :class="{ active: activeTab === 'welcome' }"
            @click="activeTab = 'welcome'"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
              <path d="M12 6a6 6 0 1 0 6 6"/>
              <line x1="12" y1="12" x2="19.07" y2="4.93"/>
            </svg>
            <span>Threat Radar</span>
          </button>
          <button
            class="cyber-tab-btn"
            :class="{ active: activeTab === 'disclosures' }"
            @click="activeTab = 'disclosures'"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
            </svg>
            <span>Disclosures</span>
          </button>
          <button
            class="cyber-tab-btn"
            :class="{ active: activeTab === 'cve' }"
            @click="activeTab = 'cve'"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.355.522a.5.5 0 0 1 .623.333l.291.956A4.979 4.979 0 0 1 8 1c1.007 0 1.946.298 2.731.811l.29-.956a.5.5 0 1 1 .957.29l-.415 1.362A5.002 5.002 0 0 1 13 6v.5a.5.5 0 0 1-1 0V6a4 4 0 0 0-3.5-3.969v1.442a.5.5 0 0 1-1 0V2.031A4 4 0 0 0 4 6v.5a.5.5 0 0 1-1 0V6c0-1.546.7-2.929 1.769-3.844l-.414-1.362a.5.5 0 0 1 .333-.623zM2.5 9a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm1 3a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5zm-2-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5zm12 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
            </svg>
            <span>CVEs &amp; PoCs</span>
          </button>
          <button
            class="cyber-tab-btn"
            :class="{ active: activeTab === 'news' }"
            @click="activeTab = 'news'"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 2.5A1.5 1.5 0 0 1 1.5 1h11A1.5 1.5 0 0 1 14 2.5v10.528c0 .3-.05.654-.238.972h.738a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 1 1 0v9a1.5 1.5 0 0 1-1.5 1.5H1.497A1.497 1.497 0 0 1 0 13.5v-11zM12 14c.37 0 .654-.211.85-.497A.993.993 0 0 0 13 13V2.5a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5v11c0 .278.111.525.295.707.18.178.43.293.705.293h10z"/>
            </svg>
            <span>Threat News</span>
          </button>
          <button
            class="cyber-tab-btn"
            :class="{ active: activeTab === 'tips' }"
            @click="activeTab = 'tips'"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
            </svg>
            <span>Community Intel</span>
          </button>
          <button
            class="cyber-tab-btn"
            :class="{ active: activeTab === 'saved' }"
            @click="activeTab = 'saved'"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
            </svg>
            <span>Saved Vault</span>
            <span v-if="savedItems.length" class="badge rounded-pill ms-1" style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; font-family: var(--font-mono); font-size: 0.72rem;">{{ savedItems.length }}</span>
          </button>
        </nav>
      </div>
    </div>

    <!-- Active View Area -->
    <main class="container my-4" style="min-height: 72vh;">
      <Welcome
        v-if="activeTab === 'welcome'"
        :saved-count="savedItems.length"
        @switch-tab="activeTab = $event"
      />

      <HackeroneFeed
        v-show="activeTab === 'disclosures'"
        :search-query="searchQuery"
        :saved-ids="savedIds"
        @toggle-save="handleToggleSave"
      />

      <CveFeed
        v-show="activeTab === 'cve'"
        :search-query="searchQuery"
        :saved-ids="savedIds"
        @toggle-save="handleToggleSave"
      />

      <NewsFeed
        v-show="activeTab === 'news'"
        :search-query="searchQuery"
        :saved-ids="savedIds"
        @toggle-save="handleToggleSave"
      />

      <TweetsFeed
        v-show="activeTab === 'tips'"
        :search-query="searchQuery"
        :saved-ids="savedIds"
        @toggle-save="handleToggleSave"
      />

      <SavedFeed
        v-if="activeTab === 'saved'"
        :saved-items="savedItems"
        :search-query="searchQuery"
        @toggle-save="handleToggleSave"
        @clear-all="clearAllSaved"
      />

      <!-- Mandatory Authentication & First-Time Setup Wizard Modal -->
      <AuthModal
        v-if="authModalVisible"
        :initial-mode="authMode"
        @auth-success="handleAuthSuccess"
      />
    </main>

    <!-- Sleek Minimal Footer -->
    <footer class="text-center py-4 border-top mt-5" style="border-color: var(--border-color) !important; color: var(--text-muted); font-size: 0.82rem; font-family: var(--font-mono);">
      <div class="container">
        BUG-FEED &bull; SECURITY THREAT INTELLIGENCE &amp; RESEARCH RADAR
      </div>
    </footer>
  </div>
</template>

<script>
import Welcome from './components/fragments/welcome.vue';
import HackeroneFeed from './components/fragments/HackeroneFeed.vue';
import CveFeed from './components/fragments/CveFeed.vue';
import NewsFeed from './components/fragments/NewsFeed.vue';
import TweetsFeed from './components/fragments/TweetsFeed.vue';
import SavedFeed from './components/fragments/SavedFeed.vue';
import AuthModal from './components/AuthModal.vue';

export default {
  name: 'App',
  components: {
    Welcome,
    HackeroneFeed,
    CveFeed,
    NewsFeed,
    TweetsFeed,
    SavedFeed,
    AuthModal
  },
  data() {
    return {
      activeTab: 'welcome',
      searchQuery: '',
      theme: 'dark',
      savedItems: [],
      authModalVisible: true,
      authMode: 'login',
      currentUser: null
    };
  },
  computed: {
    savedIds() {
      return this.savedItems.map(item => item.id);
    }
  },
  watch: {
    activeTab: {
      immediate: true,
      handler(tab) {
        const titleMap = {
          welcome: 'Threat Radar | Bug Feed',
          disclosures: 'Bounty Disclosures | Bug Feed',
          cve: 'CVEs & PoCs | Bug Feed',
          news: 'Threat News | Bug Feed',
          tips: 'Community Intel | Bug Feed',
          saved: 'Saved Vault | Bug Feed'
        };
        document.title = titleMap[tab] || 'Bug Feed | Cyber Threat Intelligence';
      }
    }
  },
  created() {
    this.loadSaved();
    this.loadTheme();
    this.checkAuthStatus();
    window.addEventListener('bugfeed-unauthorized', this.handleUnauthorized);
  },
  beforeUnmount() {
    window.removeEventListener('bugfeed-unauthorized', this.handleUnauthorized);
  },
  methods: {
    async checkAuthStatus() {
      try {
        const token = localStorage.getItem('bugfeed_token') || sessionStorage.getItem('bugfeed_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch('/api/auth/status', { headers });
        const json = await res.json();

        if (!json.initialized) {
          // System not initialized: First-time setup wizard
          this.authMode = 'setup';
          this.authModalVisible = true;
          this.currentUser = null;
        } else if (!json.authenticated) {
          // System initialized but user unauthenticated
          this.authMode = 'login';
          this.authModalVisible = true;
          this.currentUser = null;
          localStorage.removeItem('bugfeed_token');
          sessionStorage.removeItem('bugfeed_token');
        } else {
          // Authenticated!
          this.authModalVisible = false;
          this.currentUser = json.user;
        }
      } catch (err) {
        console.error('[App] Failed to check auth status:', err);
      }
    },
    handleAuthSuccess({ user, token, remember }) {
      if (remember) {
        localStorage.setItem('bugfeed_token', token);
      } else {
        sessionStorage.setItem('bugfeed_token', token);
      }
      this.currentUser = user;
      this.authModalVisible = false;
    },
    handleUnauthorized() {
      this.currentUser = null;
      this.authMode = 'login';
      this.authModalVisible = true;
    },
    async logout() {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
      localStorage.removeItem('bugfeed_token');
      sessionStorage.removeItem('bugfeed_token');
      this.currentUser = null;
      this.authMode = 'login';
      this.authModalVisible = true;
    },
    loadSaved() {
      try {
        const data = localStorage.getItem('bugfeed_saved');
        if (data) {
          this.savedItems = JSON.parse(data);
        }
      } catch (e) {
        console.error('Error loading bookmarks from localStorage', e);
      }
    },
    saveToStorage() {
      try {
        localStorage.setItem('bugfeed_saved', JSON.stringify(this.savedItems));
      } catch (e) {
        console.error('Error saving bookmarks to localStorage', e);
      }
    },
    handleToggleSave(item) {
      const idx = this.savedItems.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        this.savedItems.splice(idx, 1);
      } else {
        this.savedItems.unshift(item);
      }
      this.saveToStorage();
    },
    clearAllSaved() {
      if (confirm('Clear all offline bookmarks?')) {
        this.savedItems = [];
        this.saveToStorage();
      }
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme();
    },
    loadTheme() {
      const saved = localStorage.getItem('bugfeed_theme');
      if (saved === 'light' || saved === 'dark') {
        this.theme = saved;
      }
      this.applyTheme();
    },
    applyTheme() {
      localStorage.setItem('bugfeed_theme', this.theme);
      if (typeof document !== 'undefined') {
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(this.theme);
      }
    }
  }
};
</script>

<style scoped>
.brand-icon-box {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.25);
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.15);
}
.brand-title {
  font-family: var(--font-mono);
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: 0.5px;
  color: var(--text-primary);
  line-height: 1.1;
}
.brand-subtitle {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 1.5px;
  color: var(--accent-cyan);
  font-weight: 600;
}
.clear-btn {
  position: absolute;
  right: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  line-height: 1;
}
.clear-btn:hover {
  color: var(--text-primary);
}
</style>
