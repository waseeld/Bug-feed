<template>
  <div>
    <nav class="navbar navbar-expand-lg navbar-light p-2">
      <div class="container-fluid">
        <h1 class="navbar-brand mb-0">
          <img
            src="/assets/img/icon/bug.png"
            class="me-3"
            width="50"
            height="50"
          />Bug's feed
        </h1>
        <div class="d-flex">
          <small id="version" class="mt-2 me-3 text-muted"></small>
          <a
            href="#"
            class="configuration me-3 mt-1"
            data-bs-toggle="modal"
            data-bs-target="#config_modal"
          >
            <img
              src="/assets/img/configuration.svg"
              width="25"
              height="25"
            />
          </a>
          <a href="#" class="moon">
            <img
              src="/assets/img/eclipse.svg"
              width="30"
              height="30"
            />
          </a>
        </div>
      </div>
    </nav>

    <ul
      class="
        nav nav-tabs nav-tabs-lg nav-tabs-rounded
        justify-content-center
        mt-2
      "
      role="tablist"
    >
      <li class="nav-item mx-1" role="presentation">
        <button
          class="nav-link m-2 welcome_button"
          id="welcome_tab"
          data-bs-toggle="tab"
          data-bs-target="#welcome"
          type="button"
          role="tab"
          aria-controls="welcome"
          aria-selected="true"
        >
          Welcome
        </button>
      </li>
      <li class="nav-item mx-1" role="presentation">
        <button
          class="nav-link m-2"
          id="media_tab"
          data-bs-toggle="tab"
          data-bs-target="#media"
          type="button"
          role="tab"
          aria-controls="media"
          aria-selected="true"
        >
          Media
        </button>
      </li>
      <li class="nav-item mx-1" role="presentation">
        <button
          class="nav-link m-2"
          id="vulnerabilities_tab"
          data-bs-toggle="tab"
          data-bs-target="#vulnerabilities"
          type="button"
          role="tab"
          aria-controls="vulnerabilities"
          aria-selected="true"
        >
          Vulnerabilities
        </button>
      </li>
      <li class="nav-item mx-1" role="presentation">
        <button
          class="nav-link m-2"
          id="papers_tab"
          data-bs-toggle="tab"
          data-bs-target="#papers"
          type="button"
          role="tab"
          aria-controls="papers"
          aria-selected="true"
        >
          Papers
        </button>
      </li>
      <li class="nav-item mx-1" role="presentation">
        <button class="nav-link m-2 saved_button" id="saved_button">
          Saved
        </button>
      </li>
    </ul>
    <div id="saved_splide" class="splide">
      <div class="splide__track">
        <ul class="splide__list">
          <li class="splide__slide">
            <div class="tab-content">
              <div
                class="tab-pane fade"
                id="welcome"
                role="tabpanel"
                aria-labelledby="welcome_tab"
              >
                <div class="container mt-5">
                  {% include "fragments/welcome.html" %}
                </div>
              </div>
              <div
                class="tab-pane fade"
                id="media"
                role="tabpanel"
                aria-labelledby="media_tab"
              >
                <ul
                  class="
                    nav nav-tabs nav-tabs-lg nav-tabs-rounded
                    justify-content-center
                    mt-2
                  "
                  role="tablist"
                >
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 content-media"
                      id="news_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#news"
                      type="button"
                      role="tab"
                      aria-controls="news"
                      aria-selected="true"
                    >
                      News
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 content-media"
                      id="videos_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#videos"
                      type="button"
                      role="tab"
                      aria-controls="videos"
                      aria-selected="true"
                    >
                      Videos
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 content-media"
                      id="tweets_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#tweets"
                      type="button"
                      role="tab"
                      aria-controls="tweets"
                      aria-selected="true"
                    >
                      Tweets
                    </button>
                  </li>
                </ul>
                <div class="container mt-5">
                  <div class="tab-content">
                    <div
                      class="tab-pane fade"
                      id="news"
                      role="tabpanel"
                      aria-labelledby="news_tab"
                    >
                      {% include "fragments/news.html" %}
                    </div>
                    <div
                      class="tab-pane fade"
                      id="videos"
                      role="tabpanel"
                      aria-labelledby="videos_tab"
                    >
                      {% include "fragments/videos.html" %}
                    </div>
                    <div
                      class="tab-pane fade"
                      id="tweets"
                      role="tabpanel"
                      aria-labelledby="tweets_tab"
                    >
                      {% include "fragments/tweets.html" %}
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="tab-pane fade"
                id="vulnerabilities"
                role="tabpanel"
                aria-labelledby="vulnerabilities_tab"
              >
                <ul
                  class="
                    nav nav-tabs nav-tabs-lg nav-tabs-rounded
                    justify-content-center
                    mt-2
                  "
                  role="tablist"
                >
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 content-vulnerabilities"
                      id="hackerone_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#hackerone"
                      type="button"
                      role="tab"
                      aria-controls="hackerone"
                      aria-selected="true"
                    >
                      Hackerone
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 content-vulnerabilities"
                      id="bugcrowd_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#bugcrowd"
                      type="button"
                      role="tab"
                      aria-controls="bugcrowd"
                      aria-selected="true"
                    >
                      Bugcrowd
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 content-vulnerabilities"
                      id="exploitdb_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#exploitdb"
                      type="button"
                      role="tab"
                      aria-controls="exploitdb"
                      aria-selected="true"
                    >
                      Exploit-db
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 content-vulnerabilities"
                      id="cve_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#cve"
                      type="button"
                      role="tab"
                      aria-controls="cve"
                      aria-selected="false"
                    >
                      CVE
                    </button>
                  </li>
                </ul>
                <div class="container mt-5">
                  <div class="tab-content">
                    <div
                      class="tab-pane fade"
                      id="hackerone"
                      role="tabpanel"
                      aria-labelledby="hackerone_tab"
                    >
                      {% include "fragments/hackerone.html" %}
                    </div>
                    <div
                      class="tab-pane fade"
                      id="bugcrowd"
                      role="tabpanel"
                      aria-labelledby="bugcrowd_tab"
                    >
                      {% include "fragments/bugcrowd.html" %}
                    </div>
                    <div
                      class="tab-pane fade"
                      id="exploitdb"
                      role="tabpanel"
                      aria-labelledby="exploitdb_tab"
                    >
                      {% include "fragments/exploitdb.html" %}
                    </div>
                    <div
                      class="tab-pane fade"
                      id="cve"
                      role="tabpanel"
                      aria-labelledby="cve_tab"
                    >
                      {% include "fragments/cve.html" %}
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="tab-pane fade"
                id="papers"
                role="tabpanel"
                aria-labelledby="papers_tab"
              >
                <ul
                  class="
                    nav nav-tabs nav-tabs-lg nav-tabs-rounded
                    justify-content-center
                    mt-2
                  "
                  role="tablist"
                >
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 content-papers"
                      id="exploitdbsp_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#exploitdbsp"
                      type="button"
                      role="tab"
                      aria-controls="exploitdbsp"
                      aria-selected="true"
                    >
                      Exploit-db
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 content-papers"
                      id="nist_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#nist"
                      type="button"
                      role="tab"
                      aria-controls="nist"
                      aria-selected="true"
                    >
                      NIST
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 content-papers"
                      id="oxford_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#oxford"
                      type="button"
                      role="tab"
                      aria-controls="oxford"
                      aria-selected="true"
                    >
                      Oxford
                    </button>
                  </li>
                </ul>
                <div class="container mt-5">
                  <div class="tab-content">
                    <div
                      class="tab-pane fade"
                      id="exploitdbsp"
                      role="tabpanel"
                      aria-labelledby="exploitdbsp_tab"
                    >
                      {% include "fragments/exploitdbsp.html" %}
                    </div>
                    <div
                      class="tab-pane fade"
                      id="nist"
                      role="tabpanel"
                      aria-labelledby="nist_tab"
                    >
                      {% include "fragments/nist.html" %}
                    </div>
                    <div
                      class="tab-pane fade"
                      id="oxford"
                      role="tabpanel"
                      aria-labelledby="oxford_tab"
                    >
                      {% include "fragments/oxford.html" %}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </li>
          <li class="splide__slide">
            <div class="tab-content">
              <div
                class="tab-pane fade"
                id="saved_media"
                role="tabpanel"
                aria-labelledby="saved_media_tab"
              >
                <ul
                  class="
                    nav nav-tabs nav-tabs-lg nav-tabs-rounded
                    justify-content-center
                    mt-2
                  "
                  role="tablist"
                >
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 saved-media"
                      id="saved_news_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#saved_news"
                      type="button"
                      role="tab"
                      aria-controls="saved_news"
                      aria-selected="true"
                    >
                      News
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 saved-media"
                      id="saved_videos_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#saved_videos"
                      type="button"
                      role="tab"
                      aria-controls="saved_videos"
                      aria-selected="true"
                    >
                      Videos
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 saved-media"
                      id="saved_tweets_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#saved_tweets"
                      type="button"
                      role="tab"
                      aria-controls="saved_tweets"
                      aria-selected="true"
                    >
                      Tweets
                    </button>
                  </li>
                </ul>
                <div class="tab-content">
                  <div
                    class="tab-pane fade mt-5"
                    id="saved_news"
                    role="tabpanel"
                    aria-labelledby="saved_news_tab"
                  >
                    {% include "fragments/saved/news.html" %}
                  </div>
                  <div
                    class="tab-pane fade mt-5"
                    id="saved_videos"
                    role="tabpanel"
                    aria-labelledby="saved_videos_tab"
                  >
                    {% include "fragments/saved/videos.html" %}
                  </div>
                  <div
                    class="tab-pane fade mt-5"
                    id="saved_tweets"
                    role="tabpanel"
                    aria-labelledby="saved_tweets_tab"
                  >
                    {% include "fragments/saved/tweets.html" %}
                  </div>
                </div>
              </div>
              <div
                class="tab-pane fade"
                id="saved_vulnerabilities"
                role="tabpanel"
                aria-labelledby="saved_vulnerabilities_tab"
              >
                <ul
                  class="
                    nav nav-tabs nav-tabs-lg nav-tabs-rounded
                    justify-content-center
                    mt-2
                  "
                  role="tablist"
                >
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 saved-vulnerabilities"
                      id="saved_hackerone_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#saved_hackerone"
                      type="button"
                      role="tab"
                      aria-controls="saved_hackerone"
                      aria-selected="true"
                    >
                      Hackerone
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 saved-vulnerabilities"
                      id="saved_bugcrowd_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#saved_bugcrowd"
                      type="button"
                      role="tab"
                      aria-controls="saved_bugcrowd"
                      aria-selected="false"
                    >
                      Bugcrowd
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 saved-vulnerabilities"
                      id="saved_exploitdb_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#saved_exploitdb"
                      type="button"
                      role="tab"
                      aria-controls="saved_exploitdb"
                      aria-selected="false"
                    >
                      Exploit-db
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 saved-vulnerabilities"
                      id="saved_cve_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#saved_cve"
                      type="button"
                      role="tab"
                      aria-controls="saved_cve"
                      aria-selected="false"
                    >
                      CVE
                    </button>
                  </li>
                </ul>
                <div class="tab-content">
                  <div
                    class="tab-pane fade mt-5"
                    id="saved_hackerone"
                    role="tabpanel"
                    aria-labelledby="saved_hackerone_tab"
                  >
                    {% include "fragments/saved/hackerone.html" %}
                  </div>
                  <div
                    class="tab-pane fade mt-5"
                    id="saved_bugcrowd"
                    role="tabpanel"
                    aria-labelledby="saved_bugcrowd_tab"
                  >
                    {% include "fragments/saved/bugcrowd.html" %}
                  </div>
                  <div
                    class="tab-pane fade mt-5"
                    id="saved_exploitdb"
                    role="tabpanel"
                    aria-labelledby="saved_exploitdb_tab"
                  >
                    {% include "fragments/saved/exploitdb.html" %}
                  </div>
                  <div
                    class="tab-pane fade mt-5"
                    id="saved_cve"
                    role="tabpanel"
                    aria-labelledby="saved_cve_tab"
                  >
                    {% include "fragments/saved/cve.html" %}
                  </div>
                </div>
              </div>
              <div
                class="tab-pane fade"
                id="saved_papers"
                role="tabpanel"
                aria-labelledby="saved_papers_tab"
              >
                <ul
                  class="
                    nav nav-tabs nav-tabs-lg nav-tabs-rounded
                    justify-content-center
                    mt-2
                  "
                  role="tablist"
                >
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 saved-papers"
                      id="saved_exploitdbsp_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#saved_exploitdbsp"
                      type="button"
                      role="tab"
                      aria-controls="saved_exploitdbsp"
                      aria-selected="true"
                    >
                      Exploit-db
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 saved-papers"
                      id="saved_nist_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#saved_nist"
                      type="button"
                      role="tab"
                      aria-controls="saved_nist"
                      aria-selected="false"
                    >
                      NIST
                    </button>
                  </li>
                  <li class="nav-item mx-1" role="presentation">
                    <button
                      class="nav-link subtab-button m-2 saved-papers"
                      id="saved_oxford_tab"
                      data-bs-toggle="tab"
                      data-bs-target="#saved_oxford"
                      type="button"
                      role="tab"
                      aria-controls="saved_oxford"
                      aria-selected="false"
                    >
                      Oxford
                    </button>
                  </li>
                </ul>
                <div class="tab-content">
                  <div
                    class="tab-pane fade mt-5"
                    id="saved_exploitdbsp"
                    role="tabpanel"
                    aria-labelledby="saved_exploitdbsp_tab"
                  >
                    {% include "fragments/saved/exploitdbsp.html" %}
                  </div>
                  <div
                    class="tab-pane fade mt-5"
                    id="saved_nist"
                    role="tabpanel"
                    aria-labelledby="saved_nist_tab"
                  >
                    {% include "fragments/saved/nist.html" %}
                  </div>
                  <div
                    class="tab-pane fade mt-5"
                    id="saved_oxford"
                    role="tabpanel"
                    aria-labelledby="saved_oxford_tab"
                  >
                    {% include "fragments/saved/oxford.html" %}
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Search -->
    {% include "fragments/search.html" %}

    <!-- Up -->
    <a
      class="fabrx-back-top badge badge-primary circle lg"
      style="display: none"
    >
      <svg
        data-name="Icon/Arrows/Chevron/Up"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24.091 24"
      >
        <path
          data-name="Icon Color"
          d="M-2.182,24,0,21.818-9.818,12,0,2.182-2.182,0l-12,12Z"
          transform="translate(24.091 19.091) rotate(90)"
          fill="#fff"
        ></path>
      </svg>
    </a>

    <!-- Modals -->
    {% include "fragments/modal.html" %}

    <div
      class="modal fade"
      id="init_modal"
      tabindex="-1"
      aria-labelledby="init_modal_label"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="init_modal_label">Welcome!</h5>
          </div>
          <div class="modal-body">
            <p>
              Thank you for using <strong>Bug's feed</strong>. As this is your
              first time visiting the page, the bugs need to be scrapped.
            </p>
            <p>
              Please wait
              <strong style="color: var(--blue)">5 minutes</strong> and then
              reload the page.
            </p>
          </div>
          <div class="modal-footer" id="welcome_footer">
            <span class="d-left" id="5_minutes"></span>
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// import HelloWorld from './components/HelloWorld.vue'

export default {
  name: "App",
  components: {
    // HelloWorld
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
