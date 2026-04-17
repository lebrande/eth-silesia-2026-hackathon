<?php

class IleopardchatAssistantModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        $vars = $this->module->getChatTemplateVars();
        $vars['ileopardchat_shop_url'] = $this->context->shop->getBaseURL(true);
        $vars['ileopardchat_shop_name'] = $this->context->shop->name;
        $vars['ileopardchat_shop_logo'] = $this->context->shop->getBaseURL(true) . 'img/' . Configuration::get('PS_LOGO');
        $vars['ileopardchat_lang'] = $this->context->language->iso_code;

        $this->context->smarty->assign($vars);
        $this->context->smarty->display(
            $this->module->getLocalPath() . 'views/templates/assistant.tpl'
        );
        exit;
    }
}
