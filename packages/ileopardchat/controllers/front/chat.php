<?php

class IleopardchatChatModuleFrontController extends ModuleFrontController
{
    public $ajax = true;

    public function postProcess()
    {
        header('Content-Type: application/json');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            die(json_encode(['error' => 'Method not allowed']));
        }

        $apiUrl = Configuration::get('ILEOPARD_SERVICES_API_URL');
        $apiSecret = Configuration::get('ILEOPARD_SERVICES_API_SECRET');

        if (!$apiUrl || !$apiSecret) {
            http_response_code(500);
            die(json_encode(['error' => 'Module not configured']));
        }

        $raw = file_get_contents('php://input');
        if (!$raw) {
            http_response_code(400);
            die(json_encode(['error' => 'Empty request body']));
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            http_response_code(400);
            die(json_encode(['error' => 'Invalid JSON']));
        }

        if (empty($data['message']) || !is_string($data['message'])) {
            http_response_code(400);
            die(json_encode(['error' => 'Missing message']));
        }

        $allowed = ['message', 'uid', 'thread_id'];
        $filtered = array_intersect_key($data, array_flip($allowed));

        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($filtered),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-api-key: ' . $apiSecret,
            ],
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            http_response_code(502);
            die(json_encode(['error' => 'Failed to reach API']));
        }

        http_response_code($httpCode);
        die($response);
    }
}
