<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

class IleopardChat extends Module
{
    public function __construct()
    {
        $this->name = 'ileopardchat';
        $this->tab = 'front_office_features';
        $this->version = '1.11.3';
        $this->author = 'Ileopard';
        $this->need_instance = 0;
        $this->bootstrap = true;

        parent::__construct();

        $this->displayName = $this->l('Ileopard Chat');
        $this->description = $this->l('AI chatbot widget for customer support.');
    }

    public function install()
    {
        return parent::install()
            && $this->registerHook('displayFooter');
    }

    public function uninstall()
    {
        Configuration::deleteByName('ILEOPARD_CHAT_ENABLED');
        Configuration::deleteByName('ILEOPARD_CHAT_BOTTOM');
        Configuration::deleteByName('ILEOPARD_CHAT_RIGHT');
        Configuration::deleteByName('ILEOPARD_SERVICES_API_URL');
        Configuration::deleteByName('ILEOPARD_SERVICES_API_SECRET');
        return parent::uninstall();
    }

    public function getContent()
    {
        $output = '';

        if (Tools::isSubmit('submitIleopardChat')) {
            Configuration::updateValue('ILEOPARD_CHAT_ENABLED', (int) Tools::getValue('ILEOPARD_CHAT_ENABLED'));
            Configuration::updateValue('ILEOPARD_CHAT_BOTTOM', (int) Tools::getValue('ILEOPARD_CHAT_BOTTOM'));
            Configuration::updateValue('ILEOPARD_CHAT_RIGHT', (int) Tools::getValue('ILEOPARD_CHAT_RIGHT'));
            Configuration::updateValue('ILEOPARD_SERVICES_API_URL', Tools::getValue('ILEOPARD_SERVICES_API_URL'));
            Configuration::updateValue('ILEOPARD_SERVICES_API_SECRET', Tools::getValue('ILEOPARD_SERVICES_API_SECRET'));
            $output .= $this->displayConfirmation($this->l('Settings updated.'));
        }

        return $output . $this->renderForm();
    }

    protected function renderForm()
    {
        $form = [
            'form' => [
                'legend' => [
                    'title' => $this->l('Settings'),
                    'icon' => 'icon-cogs',
                ],
                'input' => [
                    [
                        'type' => 'switch',
                        'label' => $this->l('Enable chat for all visitors'),
                        'name' => 'ILEOPARD_CHAT_ENABLED',
                        'desc' => $this->l('When disabled, the chat bubble is hidden on shop pages. The assistant page is always available.'),
                        'values' => [
                            ['id' => 'active_on', 'value' => 1, 'label' => $this->l('Yes')],
                            ['id' => 'active_off', 'value' => 0, 'label' => $this->l('No')],
                        ],
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('Bottom offset (px)'),
                        'name' => 'ILEOPARD_CHAT_BOTTOM',
                        'desc' => $this->l('Distance from bottom edge in pixels'),
                        'class' => 'fixed-width-sm',
                        'suffix' => 'px',
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('Right offset (px)'),
                        'name' => 'ILEOPARD_CHAT_RIGHT',
                        'desc' => $this->l('Distance from right edge in pixels'),
                        'class' => 'fixed-width-sm',
                        'suffix' => 'px',
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('API URL'),
                        'name' => 'ILEOPARD_SERVICES_API_URL',
                        'desc' => $this->l('e.g. https://services.ileopard.pl/api/chat'),
                        'required' => true,
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('API Secret'),
                        'name' => 'ILEOPARD_SERVICES_API_SECRET',
                        'required' => true,
                    ],
                ],
                'submit' => [
                    'title' => $this->l('Save'),
                ],
            ],
        ];

        $helper = new HelperForm();
        $helper->module = $this;
        $helper->name_controller = $this->name;
        $helper->token = Tools::getAdminTokenLite('AdminModules');
        $helper->currentIndex = AdminController::$currentIndex . '&configure=' . $this->name;
        $helper->submit_action = 'submitIleopardChat';
        $helper->default_form_language = (int) Configuration::get('PS_LANG_DEFAULT');
        $helper->fields_value = [
            'ILEOPARD_CHAT_ENABLED' => Configuration::get('ILEOPARD_CHAT_ENABLED'),
            'ILEOPARD_CHAT_BOTTOM' => Configuration::get('ILEOPARD_CHAT_BOTTOM') ?: 80,
            'ILEOPARD_CHAT_RIGHT' => Configuration::get('ILEOPARD_CHAT_RIGHT') ?: 20,
            'ILEOPARD_SERVICES_API_URL' => Configuration::get('ILEOPARD_SERVICES_API_URL'),
            'ILEOPARD_SERVICES_API_SECRET' => Configuration::get('ILEOPARD_SERVICES_API_SECRET'),
        ];

        return $helper->generateForm([$form]);
    }

    public function getChatTemplateVars()
    {
        return [
            'ileopardchat_css' => $this->_path . 'views/css/widget.css?v=' . $this->version,
            'ileopardchat_js' => $this->_path . 'views/js/widget.js?v=' . $this->version,
            'ileopardchat_api_url' => $this->context->link->getModuleLink('ileopardchat', 'chat'),
            'ileopardchat_avatar' => $this->_path . 'views/css/assistent_2.jpg',
            'ileopardchat_chat_window_tpl' => $this->getLocalPath() . 'views/templates/partials/chat_window.tpl',
            'ileopardchat_enabled' => (bool) Configuration::get('ILEOPARD_CHAT_ENABLED'),
            'ileopardchat_bottom' => (int) (Configuration::get('ILEOPARD_CHAT_BOTTOM') ?: 80),
            'ileopardchat_right' => (int) (Configuration::get('ILEOPARD_CHAT_RIGHT') ?: 20),
        ];
    }

    public function hookDisplayFooter($params)
    {
        $this->context->smarty->assign($this->getChatTemplateVars());

        return $this->display(__FILE__, 'views/templates/widget.tpl');
    }
}
