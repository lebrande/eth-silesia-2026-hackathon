document.addEventListener("DOMContentLoaded", function () {
  var root = document.getElementById("ileopard-chat-root");
  var standalone = root.dataset.mode === "standalone";

  if (!standalone) {
    if (root.dataset.enabled !== "1") return;
    root.style.display = "block";
  }

  var bubble = document.getElementById("ileopard-chat-bubble");
  var bubbleExpanded = document.getElementById("ileopard-chat-bubble-expanded");
  var chatWindow = document.getElementById("ileopard-chat-window");
  var form = document.getElementById("ileopard-chat-form");
  var input = document.getElementById("ileopard-chat-input");
  var messagesEl = document.getElementById("ileopard-chat-messages");
  var apiUrl = root.dataset.apiUrl;

  var STORAGE_KEY_UID = "ileopard_uid";
  var STORAGE_KEY_THREAD = "ileopard_thread";
  var STORAGE_KEY_HISTORY = "ileopard_history";
  var STORAGE_KEY_HISTORY_TS = "ileopard_history_ts";
  var SESSION_TIMEOUT_MS = 48 * 60 * 60 * 1000; // 48h — must match SESSION_TIMEOUT_MS in chat.constants.ts

  function getStored(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setStored(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  if (standalone) {
    chatWindow.classList.add("ileopard-chat--open");
    input.focus();
  } else {
    var closeBtn = document.getElementById("ileopard-chat-close");

    function setChatOpen(open) {
      if (open) {
        chatWindow.classList.add("ileopard-chat--open");
        bubble.classList.add("ileopard-chat--hidden");
        bubbleExpanded.classList.add("ileopard-chat--hidden");
        document.body.classList.add("ileopard-chat-body-lock");
        input.focus();
      } else {
        chatWindow.classList.remove("ileopard-chat--open");
        bubble.classList.remove("ileopard-chat--hidden");
        bubbleExpanded.classList.remove("ileopard-chat--hidden");
        document.body.classList.remove("ileopard-chat-body-lock");
      }
    }

    function onBubbleClick() {
      setChatOpen(!chatWindow.classList.contains("ileopard-chat--open"));
    }

    bubble.addEventListener("click", onBubbleClick);
    bubbleExpanded.addEventListener("click", onBubbleClick);

    closeBtn.addEventListener("click", function () {
      setChatOpen(false);
    });
  }

  // Mobile: adjust chat position when virtual keyboard opens/closes
  if (window.visualViewport) {
    function onViewportChange() {
      chatWindow.style.height = window.visualViewport.height + "px";
      chatWindow.style.top = window.visualViewport.offsetTop + "px";
    }
    window.visualViewport.addEventListener("resize", onViewportChange);
    window.visualViewport.addEventListener("scroll", onViewportChange);
  }

  function linkify(text) {
    var escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(
      /(https?:\/\/[^\s)]+)/g,
      '<a href="$1" target="_blank" rel="noopener">$1</a>',
    );
  }

  // --- Component system ---

  var COMPONENT_REGEX = /\{\{(\w+)((?:\s+\w+="[^"]*")*)\}\}/g;
  var PARAM_REGEX = /(\w+)="([^"]*)"/g;

  function parseParams(raw) {
    var params = {};
    var m;
    while ((m = PARAM_REGEX.exec(raw)) !== null) {
      params[m[1]] = m[2];
    }
    return params;
  }

  var componentRenderers = {
    whatsapp: function (params) {
      var url = params.url || "#";
      return (
        '<a class="ileopard-chat-component ileopard-chat-component--whatsapp" href="' +
        url +
        '" target="_blank" rel="noopener">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">' +
        '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>' +
        '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 0 0 .611.611l4.458-1.495A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.94 9.94 0 0 1-5.39-1.586l-.376-.248-2.97.995.995-2.97-.248-.376A9.94 9.94 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>' +
        "</svg>" +
        "<span>WhatsApp</span>" +
        '<span class="ileopard-chat-component-arrow">\u203A</span>' +
        "</a>"
      );
    },
  };

  function renderMessageContent(text) {
    var parts = [];
    var lastIndex = 0;
    var match;

    COMPONENT_REGEX.lastIndex = 0;
    while ((match = COMPONENT_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }
      parts.push({
        type: "component",
        component: match[1],
        params: parseParams(match[2]),
      });
      lastIndex = COMPONENT_REGEX.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    var html = "";
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part.type === "text") {
        var trimmed = part.content.replace(/^\n+|\n+$/g, "");
        if (trimmed) {
          html +=
            '<div class="ileopard-chat-text">' +
            linkify(trimmed).replace(/\n/g, "<br>") +
            "</div>";
        }
      } else if (
        part.type === "component" &&
        componentRenderers[part.component]
      ) {
        html += componentRenderers[part.component](part.params);
      }
    }

    return html;
  }

  function addMessage(text, sender) {
    var div = document.createElement("div");
    div.className = "ileopard-chat-msg ileopard-chat-msg--" + sender;
    div.innerHTML = renderMessageContent(text);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Welcome message from TPL — keep a reference to always prepend it
  var welcomeMsg = messagesEl.querySelector(".ileopard-chat-msg--bot");

  function renderHistory(history) {
    messagesEl.innerHTML = "";

    if (welcomeMsg) messagesEl.appendChild(welcomeMsg);

    if (!history || history.length === 0) return;

    for (var i = 0; i < history.length; i++) {
      var msg = history[i];
      var sender = msg.role === "user" ? "user" : "bot";
      addMessage(msg.content, sender);
    }
  }

  function saveHistory(history) {
    setStored(STORAGE_KEY_HISTORY, JSON.stringify(history));
    setStored(STORAGE_KEY_HISTORY_TS, String(Date.now()));
  }

  function restoreCachedHistory() {
    var ts = getStored(STORAGE_KEY_HISTORY_TS);
    if (!ts || Date.now() - Number(ts) > SESSION_TIMEOUT_MS) return;

    var raw = getStored(STORAGE_KEY_HISTORY);
    if (!raw) return;

    try {
      var history = JSON.parse(raw);
      if (history && history.length > 0) renderHistory(history);
    } catch (e) {}
  }

  restoreCachedHistory();

  var sending = false;
  var submitBtn = form.querySelector("button[type='submit']");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;

    var message = input.value.trim();
    if (!message) return;

    addMessage(message, "user");
    input.value = "";
    sending = true;
    submitBtn.disabled = true;

    var typing = document.createElement("div");
    typing.className =
      "ileopard-chat-msg ileopard-chat-msg--bot ileopard-chat-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    var body = { message: message };
    var uid = getStored(STORAGE_KEY_UID);
    var threadId = getStored(STORAGE_KEY_THREAD);
    if (uid) body.uid = uid;
    if (threadId) body.thread_id = threadId;

    var ERROR_MSG =
      "Przepraszamy, wystąpił błąd. Spróbuj ponownie lub skontaktuj się z nami telefonicznie lub mailowo.";

    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          console.error("[IleopardChat] API error:", result.data);
          addMessage(ERROR_MSG, "bot");
          return;
        }
        var data = result.data;
        if (data.uid) setStored(STORAGE_KEY_UID, data.uid);
        if (data.thread_id) setStored(STORAGE_KEY_THREAD, data.thread_id);
        if (data.history) {
          renderHistory(data.history);
          saveHistory(data.history);
        }
      })
      .catch(function (err) {
        console.error("[IleopardChat] Network error:", err);
        addMessage(ERROR_MSG, "bot");
      })
      .finally(function () {
        typing.remove();
        sending = false;
        submitBtn.disabled = false;
        input.focus();
      });
  });
});
