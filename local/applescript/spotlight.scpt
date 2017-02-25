on run argv
    tell application "System Events"
        keystroke " " using {option down, command down}
        delay 1
        keystroke argv
    end tell
end run
