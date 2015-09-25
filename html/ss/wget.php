<?php

// Converted from weaver ss/wget.html
/* Get arguments:
 *   ww_url = full url to post to
 *   ww_cookie = cookie to send
 *   ww_post = ignore _POST, and use this
 *   ww_auth = basic authentication for curl
 *
 * NOTE: Later will include a flag whether or not to send back headers.
 */

// Modified from http://davidwalsh.name/execute-http-post-php-curl

// url-ify the data for the POST
if ($_GET['ww_post']) {
  $fields_string = $_GET['ww_post'];
  $fields_count = substr_count($fields_string, '&') + 1;
} else {
  $fields_string = "";
  foreach ($_POST as $key=>$value)
    $fields_string .= $key . '=' . urlencode($value) . '&';
  rtrim($fields_string, '&');
  $fields_count = count($_POST);
}

$url = $_GET['ww_url'];
if (!$url)
  $url = $_POST['ww_url'];

// url-ify the data for GET
$urlargs = "";
foreach ($_GET as $key=>$value) {
  if (strpos($key, 'ww_') === 0)
    continue;
  $urlargs .= $key . '=' . urlencode($value) . '&';
}
rtrim($urlargs, '&');
if (strlen($urlargs) > 0)
  $url .= (strpos($url, '?') ? '&' : '?') . $urlargs;

// create a new cURL resource
$ch = curl_init();

// set URL and other appropriate options
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
curl_setopt($ch, CURLOPT_POST, TRUE);
curl_setopt($ch, CURLOPT_POSTFIELDS, $fields_string);
if ($_GET['ww_cookie'])
  curl_setopt($ch, CURLOPT_HTTPHEADER, array('Cookie: ' . $_GET['ww_cookie'])); 
if ($_GET['ww_auth'])
  curl_setopt($ch, CURLOPT_USERPWD, $_GET['ww_auth']);
// grab URL and pass it to the browser
$result = curl_exec($ch);

// close cURL resource, and free up system resources
curl_close($ch);

echo $result;

?>
