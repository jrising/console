<?php
require_once("config.php");
require_once("dbfuncs.php");

$args = array_merge($_POST, $_GET);

if ($args['op'] == 'get') {
   $links = dbgetarray("select name, url from links where user_id = %d", $args['user_id']);
   foreach ($links as $name => $url)
     echo $name . "," . $url . "\n";
} else if ($args['op'] == 'post') {
  dbquery("insert into links (user_id, name, url) values (%d, %s, %s) on duplicate key update url = %s", $args['user_id'], $args['name'], $args['url'], $args['url']);
  echo "DONE";
} else if ($args['op'] == 'delete') {
  dbquery("delete from links where user_id = %d and name = %s", $args['user_id'], $args['name']);
  echo "DONE";
}
