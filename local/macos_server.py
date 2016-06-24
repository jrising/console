import os
from gui_server import GUILocalServer

class MacOSLocalServer(GUILocalServer):
    def __init__(self):
        super(MacOSLocalServer, self).__init__()

    def open_terminal(self, command):
        os.system("""osascript <<EOD
tell application "Terminal"
    do script "%s"
    activate
end tell
EOD""" % (command))

    def list_applications(self):
        for app in os.listdir("/Applications"):
            yield app

    def open_thing(self, thing):
        if thing[0] != '/':
            thing = "/Applications/" + thing
        os.system("open " + thing)

    def open_url(self, url):
        os.system("""osascript <<EOD
tell application "Google Chrome"
    open location "%s"
end tell
EOD""" % (url)

