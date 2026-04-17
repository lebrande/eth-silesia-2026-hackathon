<!DOCTYPE html>
<html lang="{$ileopardchat_lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>{l s='Asystent' mod='ileopardchat'} - {$ileopardchat_shop_name}</title>
    <link rel="stylesheet" href="{$ileopardchat_css}" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(160deg, #f5f1fa 0%, #e8e0f0 40%, #ddd5ea 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 16px;
      }

      .ileopard-assistant-logo {
        display: block;
        width: 340px;
        max-width: 100%;
        height: auto;
        margin-bottom: 24px;
      }

      .ileopard-assistant-shop-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #8a71b2;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        padding: 8px 16px;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        margin-top: 48px;
        margin-bottom: 32px;
        transition: box-shadow 0.2s, transform 0.2s;
      }

      .ileopard-assistant-shop-link:hover {
        box-shadow: 0 4px 16px rgba(138, 113, 178, 0.25);
        transform: translateY(-1px);
      }

      #ileopard-chat-root {
        width: 100%;
        max-width: 420px;
      }

      /* Override widget styles for standalone mode */
      [data-mode="standalone"] #ileopard-chat-window {
        position: static;
        display: flex;
        width: 100%;
        height: 70vh;
        max-height: 600px;
      }

      [data-mode="standalone"] #ileopard-chat-close {
        display: none;
      }

      @media (max-width: 640px) {
        body {
          padding: 12px;
          justify-content: flex-start;
          padding-top: 24px;
        }

        .ileopard-assistant-header {
          margin-bottom: 12px;
        }

        #ileopard-chat-root {
          max-width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        [data-mode="standalone"] #ileopard-chat-window {
          flex: 1;
          height: auto;
          max-height: none;
          border-radius: 12px;
        }
      }
    </style>
</head>
<body>
    <a href="{$ileopardchat_shop_url}">
      <img class="ileopard-assistant-logo" src="{$ileopardchat_shop_logo}" alt="{$ileopardchat_shop_name}" />
    </a>

    <div id="ileopard-chat-root" data-api-url="{$ileopardchat_api_url}" data-mode="standalone">
      {include file=$ileopardchat_chat_window_tpl}
    </div>

    <a href="{$ileopardchat_shop_url}" class="ileopard-assistant-shop-link">
      {l s='Przejdź do sklepu' mod='ileopardchat'} &rarr;
    </a>

    <script src="{$ileopardchat_js}" defer></script>
</body>
</html>
