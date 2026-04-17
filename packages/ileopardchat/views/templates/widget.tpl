<link rel="stylesheet" href="{$ileopardchat_css}" />
<script src="{$ileopardchat_js}" defer></script>

<div id="ileopard-chat-root" data-api-url="{$ileopardchat_api_url}" data-enabled="{if $ileopardchat_enabled}1{else}0{/if}" style="display:none;--chat-bottom:{$ileopardchat_bottom}px;--chat-right:{$ileopardchat_right}px">
  <button id="ileopard-chat-bubble" aria-label="{l s='Open chat' mod='ileopardchat'}">
    <img class="ileopard-chat-avatar" src="{$ileopardchat_avatar}" alt="" />
    <span class="ileopard-chat-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/></svg></span>
  </button>

  <button id="ileopard-chat-bubble-expanded" aria-label="{l s='Open chat' mod='ileopardchat'}">
    <div class="ileopard-bubble-expanded-card">
      <img class="ileopard-bubble-expanded-avatar" src="{$ileopardchat_avatar}" alt="" />
      <div class="ileopard-bubble-expanded-text">
        <span class="ileopard-bubble-expanded-heading">{l s='Masz pytanie? Napisz do nas!' mod='ileopardchat'}</span>
        <span class="ileopard-bubble-expanded-status"><span class="ileopard-bubble-expanded-dot"></span> {l s='Konsultant online' mod='ileopardchat'}</span>
      </div>
    </div>
    <div class="ileopard-bubble-expanded-cta">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/></svg>
      {l s='Czat' mod='ileopardchat'}
    </div>
  </button>

  {include file=$ileopardchat_chat_window_tpl}
</div>
