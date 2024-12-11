<?php
// Define the target URL and payload
$url = "http://localhost:3000/send";
$data = [
    "number" => "628815047297", // Replace with recipient's WhatsApp number
    "message" => "JANGAN LOOPING!!!" // Replace with your message
];

// Initialize cURL
$ch = curl_init($url);

// Configure cURL options
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Accept: application/json"
]);

// Execute cURL request
$response = curl_exec($ch);

// Check for errors
if (curl_errno($ch)) {
    echo "cURL Error: " . curl_error($ch);
} else {
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($httpCode === 200) {
        echo "Message sent successfully: " . $response;
    } else {
        echo "Failed to send message. HTTP Code: $httpCode. Response: " . $response;
    }
}

// Close cURL session
curl_close($ch);
?>
