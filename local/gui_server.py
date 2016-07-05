try:
    from computer.local_server import LocalServer, LocalProcess
    from computer.linux_server import RemoteLinuxProcess
except:
    print "computer module not found!  Suggest installing from http://github.com/jrising/computer"

    class LocalServer(object):
        def __init__(self, utup, cpus, roots):
            pass

    class RemoteLinuxProcess(object):
        def __init__(self, server, pid, logfile):
            raise RuntimeError("computer module required.")
        
class GUILocalServer(LocalServer):
    """Subclasses of GUILocalServer know how to perform GUI operations."""
    
    def __init__(self):
        super(GUILocalServer, self).__init__('localhost', 1, {})

    def run_command(self, command):
        os.system(command)

    def get_process(self, pid):
        return RemoteLinuxProcess(self, int(pid), None)
        
    def open_terminal(self, command):
        raise NotImplementedError

    def list_applications(self):
        raise NotImplementedError

    def open_thing(self, thing):
        raise NotImplementedError

    def open_url(self, url):
        raise NotImplementedError
        
