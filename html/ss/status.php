<?php
require_once('/home/jrising/common/base.php');
require_once(comdir("sql/dbfuncs.php"));

$args = array_merge($_POST, $_GET);

if ($args['pass'] != 'qhww0c') {
   echo "Password failure.";
   exit(0);
}

$dbc = dbconnect("memoir", "ignore");

if ($args['op'] == 'register') {
  $process_id = dbquery("insert into processes (server, name) values (%s, %s)", $args['server'], $args['name']);
  echo $process_id;
} else if ($args['op'] == 'update') {
  dbquery("update processes set message = %s, type = %s where id == %d", $args['message'], $args['type'], $args['id']);
  if ($args['type'] == 'done')
    dbquery("delete from processes where process_id = %d", $args['id']);
} else if ($args['op'] == 'notify') {
  dbquery("insert into process_logs (process_id, message, type) values (%d, %s, %s)", $args['id'], $args['message'], $args['type']);
}
