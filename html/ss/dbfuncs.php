<?php

// DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD must all be set by the
// time dbconnect (usually through dbquery) is called

// API Constants
define('DB_ASSOC', MYSQL_ASSOC);
define('DB_NUM', MYSQL_NUM);
define('DB_BOTH', MYSQL_BOTH);

// use dbprotectvalue or dbsimple value for the function dbquery uses to escape dangerous values
$kProtectFunction = 'dbformatvalue'; // dbprotectvalue, dbsimplevalue
$kFormatOptions = "sSdDfFgGxXbceuo"; // Ours, plus standard, except %%; set to blank for no formatting
$kDebugQueries = true;

// the last attempted query (used for debugging)
$kLastQuery = "";
// database connection; set on first call to dbquery
$kDBConnection = null;

// Internal Constants
define('PERCENT_PLACEHOLDER', "#PERCENT#");

/*
 * Establish a connection to MySQL and select our database
 * There's no need to call this
 */
function dbconnect() {
	$args = func_get_args();
	if (count($args) == 1 && !defined('DB_HOST'))
		call_user_func_array('dbsetup', $args);

	// try to connect to database
	if ($dbc = @mysql_connect(DB_HOST, DB_USER, DB_PASSWORD)) {
		if (!mysql_select_db(DB_NAME)) {
			$error_str = "Error: Could not select database: " . dberror();
			trigger_error("dbconnect_internal() can't select DB: " . $error_str);

			return null;
		} else {
			$GLOBALS['kDBConnection'] = $dbc;
			return $dbc;
		}
	} else {
		trigger_error("Could not connect to the database: " . dberror());

		return null;
	}
}

/*
 * Disconnect from database
 * There's no need to call this
 */
function dbclose($dbc) {
	$GLOBALS['kDBConnection'] = null;
	return mysql_close($dbc);
}

/*
 * Perform protected SQL queries
 * This is the main function of the database query abstraction
 */
function dbquery() {
	global $kLastQuery, $kDBConnection;

    // connect now, if haven't before
    if (!$kDBConnection) {
        $kDBConnection = dbconnect();
    }

	$args = func_get_args();
	$query = call_user_func_array('dbprep', $args);

	$kLastQuery = $query;

	$query = preg_replace('/([^,\(\)\s~]*)~[^,\(\)\s]*/', '$1', $query);

	// if it was a INSERT, UPDATE, or DELETE, see how many rows were affected
    if (preg_match('/^INSERT|^UPDATE|^DELETE/i', $query)) {
		$result = mysql_query($query) or trigger_error(dberror() . "\n\nThe query was: " . $query);
		$count = mysql_affected_rows();
		if ($count > 1) {
			$fixquery = str_replace('%', '%%', $query);
			//EWarning(EC_REALS_DATABASE, "Query affected multiple rows: $fixquery => $count",
			//		 "Query affected " . $count . " rows");
		}
	} else {
        // Replace ^NINSERT, ^NUPDATE, ^NDELETE with INSERT, UPDATE, DELETE
        $query = preg_replace('/^N(INSERT|UPDATE|DELETE)/i', '$1', $query);
		$result = mysql_query($query) or trigger_error(dberror() . "\n\nThe query was: " . $query);
	}

	if (preg_match('/^INSERT/i', $query)) {
		return mysql_insert_id();
	} elseif (preg_match('/^(UPDATE|DELETE)/i', $query)) {
		return mysql_affected_rows();
	} else {
		return $result;
	}
}

/*
 * Prepare a piece of SQL for eventual querying
 */
function dbprep() {
    global $kProtectFunction, $kFormatOptions, $kDebugQueries;

	$args = func_get_args();
	$format = array_shift($args);

	// generate final query
	if (empty($args)) {
		$format = str_replace("%%", "%", $format);
		$query = $format;
    } else if (empty($kFormatOptions)) {
        $asargs = array_map($kProtectFunction, $args); // protect arguments
        $query = vsprintf($format, $asargs);
	} else {
        $format = str_replace("%%", PERCENT_PLACEHOLDER, $format);
        if ($kDebugQueries) {
            $format = dbtestquery($format, $args);
        }

        $specs = preg_match_all("/%[${kFormatOptions}]/", $format, $matches);
        $asargs = array_map($kProtectFunction, $matches[0], $args); // protect arguments
		$allspecs = array_map('prefixPercent', str_split($kFormatOptions));
		$format = vsprintf(str_replace($allspecs, "%s", $format), $asargs);
		$query = str_replace(PERCENT_PLACEHOLDER, "%", $format);
    }

	return $query;
}

/*
 * Select functions
 */

/*
 * Return a single value
 */
function dbgetvalue() {
	$output = null;

	$args = func_get_args();
	$result = call_user_func_array('dbquery', $args);
	$query = array_shift($args);

	// this only applies to SELECT queries!
	if (preg_match('/^SELECT/i', $query) && $result) {
		$row = dbfetch($result, DB_NUM);
		if (count($row) == 1) {  // use integer keys
			$output = $row[0];
		}
		dbfree($result);
	} else {
      //EWarning(EC_REALS_DATABASE, "dbgetvalue called with non-SELECT query!", "Non-select query");
	}

	return $output;
}

/*
 * Return a single row
 */
function dbgetrow() {
	$output = array();

	$args = func_get_args();
	$result = call_user_func_array('dbquery', $args);
	$query = array_shift($args);

	// this only applies to SELECT queries!
	if (preg_match('/^SELECT/i', $query) && $result) {
		$output = dbfetch($result, DB_ASSOC);

		dbfree($result);
	} else {
      //EWarning(EC_REALS_DATABASE, "dbgetrow called with non-SELECT query!", "Non-select query");
	}

	return $output;
}

/*
 * return an array of selected values
 */
function dbgetarray() {
	$output = array();

	$args = func_get_args();
	$result = call_user_func_array('dbquery', $args);
	$query = array_shift($args);

	// this only applies to SELECT queries!
	if (preg_match('/^SELECT/i', $query)) {
		while ($result && $row = dbfetch($result, DB_NUM)) {
			if (count($row) == 1) {  // use integer keys
				$output[] = $row[0];
			} else if (count($row) == 2) {  // use first column keys
				$output[$row[0]] = $row[1];
			} else {  // use integer keys and array values
				$output[] = $row;
			}
		}
		dbfree($result);
	} else {
      //EWarning(EC_REALS_DATABASE, "dbgetarray called with non-SELECT query!", "Non-select query");
	}

	return $output;
}

/*
 * Return a multiple-entry row result, in pieces
 *   A non-cached version of CacheCollection
 */
function dbcollection($query, $start = 0, $count = 20) {
    $resrows = array();
    $ii = 0;

    $result = dbquery($query . " limit %d, %d", $start, $count);
    while ($result && $row = dbfetch($result, DB_NUM)) {
        if (count($row) == 1) {
            // don't keep arrays
            $row = array_shift($row);
        }
        $resrows[$start + $ii] = $row;
        $ii++;
    }

    return $resrows;
}


/*
 * Wrappers on other functions
 */

// wrapper on mysql_fetch_array
function dbfetch($result, $option) {
    return mysql_fetch_array($result, $option);
}

// wrapper on mysql_num_rows
function dbrows($result) {
    return mysql_num_rows($result);
}

// wrapper on mysql_data_seek
function dbseek($result, $index) {
    return mysql_data_seek($result, $index);
}

// wrapper on mysql_free_result
function dbfree($result) {
    return mysql_free_result($result);
}

// wrapper on mysql_error
function dberror() {
    return mysql_error();
}

/*
 * Functions for escaping user input data
 */

// Escape data for SQL queries
function dbprotectvalue($value) {
	if (is_null($value)) {
		return 'NULL';
	}

	// Stripslashes
	if (get_magic_quotes_gpc())
		$value = stripslashes($value);

	// Escape if not integer
	if (!is_numeric($value))
		$value = "'" . addslashes($value) . "'";

	return $value;
}

// Escape data for SQL queries, treating floating point data as exact strings
function dbsimplevalue($value) {
    if (is_null($value)) {
        return 'NULL';
    }

	// Stripslashes
	if (get_magic_quotes_gpc())
		$value = stripslashes($value);

	if (!is_int($value))
		$value = "'" . addslashes($value) . "'";

	return $value;
}

// Smartest value handler, which uses format strings to determine use
function dbformatvalue($format, $value) {
    switch ($format) {
    case '%s':
    case '%g':
        if (is_null($value)) {
            return 'NULL';
        } else {
            return "'" . addslashes($value) . "'";
        }
    case '%S':
        if (is_null($value)) {
            return "''";
        } else {
            return "'" . addslashes($value) . "'";
        }
    case '%d':
    case '%f':
        if (is_null($value) || !is_numeric($value)) {
            return 'NULL';
        } else {
            return $value;
        }
    case '%D':
    case '%F':
        if (is_null($value) || !is_numeric($value)) {
            return 0;
        } else {
            return $value;
        }
    case '%G':
        if (is_null($value)) {
            return '0.0';
        } else {
            return "'" . $value . "'";
        }
    case '%x':
        if (is_null($value) || !is_int($value)) {
            return 'NULL';
        } else {
            return '0x' . sprintf("%X", $value);
        }
    case '%X':
        if (is_null($value) || !is_int($value)) {
            return '0x0';
        } else {
            return '0x' . sprintf("%X", $value);
        }
    default:
        return sprintf($format, "'" . addslashes($value) . "'");
    }
}

/*
 * Other Utility Functions
 */

/*
 * Error string, with basic information
 */
function dberrstr($prepend) {
  global $kLastQuery;
  return $prepend . dberror() . "<br>" . $kLastQuery;
}

/*
 * Check if we can connect to the database
 */
function dbtest() {
	if ($dbc = @mysql_connect(DB_HOST, DB_USER, DB_PASSWORD)) {
		if (!mysql_select_db(DB_NAME)) {
			$error_str = "Error: Could not select database: " . dberror();
		} else {
			dbclose($dbc);
			return true;
		}
	} else {
		$error_str = "Error: Could not connect to database: " . dberror();
	}
	return false;
}

// ----- Debugging Query Functions -----

function dbtestquery($format, $args) {
    global $kFormatOptions;

    $allspecs = array_map('prefixPercent', str_split($kFormatOptions));
    $format2 = str_replace(array_merge(array_map('singleSurround', $allspecs),
                                       array_map('doubleSurround', $allspecs)),
                           array_merge($allspecs, $allspecs), $format);
    if ($format != $format2) {
      //EWarning(EC_REALS_DATABASE, "Replaced '%_' with %_ in query!  Please use just %_! $format");
      $format = $format2;
    }

    // we don't deal with complex format specifiers
    if (preg_match("/%[^%${kFormatOptions}]/", $format)) {
      //EWarning(EC_REALS_DATABASE, "Unknown formatting specifier in query: $format");
    }

    return $format;
}

function prefixPercent($arg) {
    return '%' . $arg;
}

function singleSurround($arg) {
    return "'" . $arg . "'";
}

function doubleSurround($arg) {
    return '"' . $arg . '"';
}

?>
