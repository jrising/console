import os
from gui_server import GUILocalServer

class XLocalServer(GUILocalServer):
    def __init__(self):
        super(XLocalServer, self).__init__()

    def open_terminal(self, command):
        if command == "":
            os.system("xterm &")
        else:
            os.system("xterm -hold -e '" + command + "' &")

    def list_applications(self):
        raise NotImplementedError

    def open_thing(self, thing):
        raise NotImplementedError

    def open_url(self, url):
        raise NotImplementedError
