<?php
require_once('/home/jrising/common/base.php');
require_once(comdir("sql/dbfuncs.php"));

if ($_POST['pass'] != 'qhww0c') {
   echo "Password failure.";
   exit(0);
}

// Try sinfest
$rss = simplexml_load_file("http://existencia.org/feeds/comics/sinfest.pl");

for ($rss->channel->item as $item) {
  $row = dbgetrow("select id from glanced where source = 'sinfest' and link = %s", $item->link);
  if (!$row) {
    dbquery("insert into glanced (source, link) values ('sinfest', %s)", $link);
    echo $item->description;
    exit();
  }
}

echo "Entertain yourself!";

?>
