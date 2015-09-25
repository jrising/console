<?php
require_once("config.php");
require_once("dbfuncs.php");

$args = array_merge($_POST, $_GET);

if ($args['op'] == 'register') {
  // Login already taken?
  if (dbgetvalue("select id from users where username = %s", $args['username'])) {
    echo "ERROR: login taken";
  } else {
    echo dbquery("insert into users (username, cryptpass) values (%s, password(%s))", $args['username'], $args['password']);
  }
} else {
  $user_id = dbgetvalue("select id from users where username = %s and cryptpass = password(%s)", $args['username'], $args['password']);
  if ($user_id)
    echo $user_id;
  else
    echo "ERROR: login failed";
}
