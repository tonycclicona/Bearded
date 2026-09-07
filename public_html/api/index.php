<?php
// Proxy PHP de ultra-baja latencia hacia Node.js con auto-recuperación de puertos
$possiblePortFiles = [
    __DIR__ . '/.node_port',
    __DIR__ . '/../.node_port',
    __DIR__ . '/../../.node_port',
    __DIR__ . '/../../../.node_port',
    dirname(__DIR__) . '/.node_port',
    '/home/u251936581/public_html/.node_port',
    '/tmp/bearded_node_port'
];

$detectedPort = 4000;
foreach ($possiblePortFiles as $pFile) {
    if (file_exists($pFile)) {
        $val = trim(@file_get_contents($pFile));
        if (!empty($val) && is_numeric($val)) {
            $detectedPort = intval($val);
            break;
        }
    }
}

// Lista de puertos a intentar en orden de prioridad: 4000 primero, luego el detectado, luego los respaldos
$candidatePorts = array_unique([$detectedPort, 4000, 3001, 3002, 3000, 8080]);

$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$headers = getallheaders();
$rawInput = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE']) ? file_get_contents('php://input') : null;

$reqHeaders = [];
foreach ($headers as $k => $v) {
    if (strtolower($k) !== 'host') {
        $reqHeaders[] = "{$k}: {$v}";
    }
}
$reqHeaders[] = "Host: " . $_SERVER['HTTP_HOST'];
$reqHeaders[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

$response = false;
$activePort = 4000;
$lastError = '';

foreach ($candidatePorts as $p) {
    $url = "http://127.0.0.1:{$p}" . $uri;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, 2000); // 2000ms timeout para verificación segura
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);

    if ($rawInput !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $rawInput);
    }

    $res = curl_exec($ch);
    if ($res !== false) {
        $response = $res;
        $activePort = $p;
        break;
    } else {
        $lastError = curl_error($ch);
    }
    curl_close($ch);
}

if ($response === false) {
    http_response_code(503);
    header('Content-Type: application/json');

    $debugLog = '';
    $possibleLogFiles = [
        __DIR__ . '/node_debug.log',
        __DIR__ . '/../node_debug.log',
        __DIR__ . '/../../node_debug.log',
        dirname(__DIR__) . '/node_debug.log',
        '/home/u251936581/public_html/node_debug.log',
        '/tmp/bearded_node_debug.log'
    ];
    foreach ($possibleLogFiles as $lf) {
        if (file_exists($lf)) {
            $content = @file_get_contents($lf);
            if (!empty($content)) {
                $lines = explode("\n", trim($content));
                $debugLog = implode("\n", array_slice($lines, -15));
                break;
            }
        }
    }

    $hostHeader = $_SERVER['HTTP_HOST'] ?? '';
    $uriPath = parse_url($uri, PHP_URL_PATH) ?? '';

    // Si se solicita /health o /api/health directamente
    if ($uriPath === '/health' || $uriPath === '/api/health') {
        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'proxy_standby',
            'message' => 'PHP Gateway activo. Esperando conexión a Node.js en puerto ' . $detectedPort,
            'time' => date('c'),
            'host' => $hostHeader,
            'port_files_found' => array_values(array_filter($possiblePortFiles, 'file_exists'))
        ]);
        exit;
    }

    echo json_encode([
        'error' => 'API Gateway no disponible. Verifique que Node.js esté corriendo en Hostinger.',
        'target_port' => $detectedPort,
        'tried_ports' => array_values($candidatePorts),
        'curl_error' => $lastError,
        'node_debug_log' => $debugLog ?: 'Sin registros recientes. Es probable que la aplicación Node.js esté detenida o no iniciada en el panel de Hostinger.',
        'php_detected_env' => [
            'cwd' => getcwd(),
            'script' => __FILE__,
            'port_files' => array_values(array_filter($possiblePortFiles, 'file_exists'))
        ]
    ]);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$respHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

http_response_code($httpCode);
$headerLines = explode("\r\n", $respHeaders);
foreach ($headerLines as $h) {
    if (!empty($h) && !stripos($h, 'Transfer-Encoding:') && !stripos($h, 'HTTP/')) {
        header($h);
    }
}

echo $body;
