<?php
require_once('/home/jrising/common/base.php');
require_once(comdir("sql/dbfuncs.php"));

$args = array_merge($_POST, $_GET);

if ($args['pass'] != 'qhww0c') {
   echo "Password failure.";
   exit(0);
}

$dbc = dbconnect("memoir", "ignore");

if ($args['start']) {
  if (!strpos($args['start'], ' '))
    $args['start'] = date('Y-m-d ') . $args['start'];
 }

if ($args['op'] == 'a') {
  // Check what's active
  $row = dbgetrow("select task, time_start, adjusted_hours from times where time_start is not null and duration_hours is null");
  if ($row) {
    if ($row[2] > 0)
      echo "Active: " . $row[0] . ": " . $row[1] . " (-" . $row[2] . ") -";
    else
      echo "Active: " . $row[0] . ": " . $row[1] . " -";
  } else {
    echo "None active.";
  }
} else if ($args['op'] == 'd') {
  // How much time have we spent on what in the last 24 hours?
  $row = dbgetarray("select task, time_start, duration_hours - adjusted_hours from times where time_start is not null and to_days(time_start) == to_days(now)");
  print_r($row);
} else if ($args['op'] == '/') { 
  // start, stop, or swap
  if ($args['start'])
    dbquery("update times set duration_hours = timestampdiff(minute, time_start, %s) / 60 where time_start is not null and duration_hours is null", $args['start']);
  else
    dbquery("update times set duration_hours = timestampdiff(minute, time_start, now()) / 60 where time_start is not null and duration_hours is null");
  $had_active = mysql_affected_rows();
  if ($args['task']) {
    if ($args['start'])
      dbquery("insert into times (task, time_start) values (%s, %s)", $args['task'], $args['start']);
    else
      dbquery("insert into times (task, time_start) values (%s, now())", $args['task']);
      
    if ($had_active > 0)
      echo "Task swapped.";
    else
      echo "Task started.";
  } else
    echo "Task ended.";
 } else if ($args['op'] == '-') {
  // always duration; may have task and start
  dbquery("update times set adjusted_hours = adjusted_hours + %f where time_start is not null and duration_hours is null", $args['dur']);
  $had_active = mysql_affected_rows();
  if ($args['task']) {
    if ($args['start']) {
      dbquery("insert into times (task, time_start, duration_hours) values (%s, %s, %f)", $args['task'], $args['start'], $args['dur']);
      if ($had_active)
        echo "Added timed task within active task.";
      else
        echo "Added timed task.";
    } else {
      dbquery("insert into times (task, duration_hours) values (%s, %f)", $args['task'], $args['dur']);
      if ($had_active)
        echo "Added interval within active task.";
      else
        echo "Added interval.";
    }
  } else {
    if ($had_active)
      echo "Added break.";
    else
      echo "Nothing to break from.";
  }
 }
