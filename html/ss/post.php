<?php
require_once('/home/jrising/common/base.php');
require_once(comdir("sql/dbfuncs.php"));

if ($_POST['pass'] != 'qhww0c') {
   echo "Password failure.";
   exit(0);
}

$dbc = dbconnect("memoir", "ignore");
dbquery("insert into entries (content, category) values (%s, %s)", $_POST['content'], $_POST['category']);
echo "Posted.";

?>
