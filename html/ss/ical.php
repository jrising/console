<?php
require_once('/home/jrising/common/base.php');
require_once(comdir("sql/dbfuncs.php"));

$dbc = dbconnect("memoir", "ignore");

$rows = dbgetarray("select id, task, UNIX_TIMESTAMP(time_start), duration_hours - adjusted_hours, UNIX_TIMESTAMP(last_updated) from times");

$ical = "BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//hacksw/handcal//NONSGML v1.0//EN
";

foreach ($rows as $row) {
  if (!$row[3])
    continue;
  $ical .=
"BEGIN:VEVENT
UID:memoir-times-" . md5($row[0]) . "@existencia.org
DTSTAMP:" . gmdate('Ymd', $row[4]).'T'. gmdate('His', $row[4]) . "Z
DTSTART:" . gmdate('Ymd', $row[2]).'T'. gmdate('His', $row[2]) . "Z
DTEND:" . gmdate('Ymd', $row[2] + $row[3]*3600).'T'. gmdate('His', $row[2] + $row[3]*3600) . "Z
SUMMARY:" . $row[1] . "
END:VEVENT
";
}

$ical .= "
END:VCALENDAR";

//set correct content-type-header
header('Content-type: text/calendar; charset=utf-8');
header('Content-Disposition: inline; filename=calendar.ics');
echo $ical;
