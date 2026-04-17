<div id="ileopard-chat-window">
  <div class="ileopard-chat-header">
    <div class="ileopard-chat-header-info">
      <img class="ileopard-chat-header-avatar" src="{$ileopardchat_avatar}" alt="" />
      <div class="ileopard-chat-header-text">
        <span class="ileopard-chat-header-name">{l s='Ania' mod='ileopardchat'}</span>
        <span class="ileopard-chat-header-status">{l s='Wirtualna asystentka' mod='ileopardchat'}</span>
      </div>
    </div>
    <button id="ileopard-chat-close" aria-label="{l s='Close chat' mod='ileopardchat'}">&times;</button>
  </div>
  <div id="ileopard-chat-messages" class="ileopard-chat-messages">
    <div class="ileopard-chat-msg ileopard-chat-msg--bot">{l s='Cześć, w czym mogę Ci pomóc?' mod='ileopardchat'}</div>
  </div>
  <form id="ileopard-chat-form" class="ileopard-chat-form">
    <input id="ileopard-chat-input" type="text" placeholder="{l s='Napisz wiadomość...' mod='ileopardchat'}" autocomplete="off" />
    <button type="submit">{l s='Wyślij' mod='ileopardchat'}</button>
  </form>
</div>
