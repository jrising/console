import sys, os, cmd, csv, urllib, subprocess, psutil
from sandbox import Sandbox

try:
    from computer.local_server import LocalServer, LocalProcess
    from computer.linux_server import RemoteLinuxProcess

    local_server = LocalServer('localhost', 1, {})
    local_command = local_server.run_command

    has_computer = True
except:
    print "computer module not found!  Suggest installing from http://github.com/jrising/computer"
    local_command = os.system
    has_computer = False

dictionary = {}
commands = {}
reminders = {}
liveprocs = set()

ignoreapps = ['/System/', '/usr/', '/Library/', '/Applications/Google Chrome.app/',
              '/Applications/Preview.app/', '/Applications/Dropbox.app/', '-bash',
              '/Applications/VMware Fusion.app/', '/Applications/Utilities/Terminal.app/',
              '/bin/bash ./co', '/Users/jrising/Library/Application Support/']

fallbacks = {'ar': "mono /Users/jrising/projects/debased/ActionReaction/tool/Single/Single/bin/Release/Single.exe"}

with open('dictionary.csv', 'r') as fp:
    reader = csv.reader(fp)
    header = reader.next()
    for row in reader:
        dictionary[row[0]] = row[1]

with open('commands.csv', 'r') as fp:
    reader = csv.reader(fp)
    header = reader.next()
    for row in reader:
        commands[row[0]] = row[1]

with open('reminders.csv', 'r') as fp:
    reader = csv.reader(fp)
    header = reader.next()
    for row in reader:
        reminders[row[0]] = row[1]

for script in os.listdir("applescript"):
    if script[-5:] == '.scpt':
        commands[script[:-5].replace('-', ' ')] = "!osascript < applescript/" + script

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class PersonalCmd(cmd.Cmd, object):
    def __init__(self):
        super(PersonalCmd, self).__init__()
        self.sandbox = Sandbox()

        self.lastline = None
        self.reset_prompt()

    def reset_prompt(self):
        self.prompt = bcolors.OKBLUE + os.getcwd() + '/' + bcolors.ENDC

    def do_cd(self, path):
        os.chdir(path)
        self.reset_prompt()

    def do_pr(self, pid):
        """Start tracking a process by PID"""
        if not has_computer:
            print "Failed: computer module missing."
            return

        if pid == '':
            for pid in psutil.pids():
                proc = psutil.Process(pid)
                if proc.status() == 'running':
                    try:
                        app = proc.cmdline()[0]
                        ignore = False
                        for ignoreapp in ignoreapps:
                            if app[:len(ignoreapp)] == ignoreapp:
                                ignore = True
                                break

                        if ignore:
                            continue

                        fullline = "%5d %s" % (pid, ' '.join(proc.cmdline()))
                        print fullline[:80]
                    except:
                        pass
        if pid == 'halt':
            drops = []
            for proc in liveprocs:
                if not proc.is_running():
                    drops.append(drops)
                else:
                    print proc
                    proc.halt()

            liveprocs.difference_update(drops)
        elif pid == 'resume':
            for proc in liveprocs:
                proc.resume()
        elif pid == 'st':
            for proc in liveprocs:
                print proc, proc.is_running()
        else:
            liveprocs.add(RemoteLinuxProcess(local_server, int(pid), None))

    def do_shell(self, command):
        """Responds to !<command> by executing shell."""
        os.system(command)

    def do_term(self, command):
        """Open a new terminal."""
        if command in dictionary:
            command = "cd " + dictionary[command]

        os.system("""osascript <<EOD
tell application "Terminal"
    do script "%s"
    activate
end tell
EOD""" % (command))

    def do_ssh(self, where):
        """Ssh to a known location."""
        if where in dictionary:
            os.system("""osascript <<EOD
tell application "Terminal"
    do script "ssh %s"
    activate
end tell
EOD""" % (dictionary[where]))
        else:
            print "Unrecognized: ssh: " + where

    def do_open(self, app):
        """Open an application or a file, as with the Finder."""
        if app[0] != '/':
            app = "/Applications/" + app
        os.system("open " + app)

    def complete_open(self, text, line, begidx, endidx):
        apps = []
        for app in os.listdir("/Applications"):
            if app[:len(text)].lower() == text.lower():
                apps.append(app)

        return apps

    def do_figr(self, line):
        parts = line.split(' ')
        command = "find %s -name \"%s\" -exec grep \"%s\" {} \; -print" % (parts[0], parts[1], ' '.join(parts[2:]))
        print command
        os.system(command)

    def do_stan(self, cmd):
        """stan help: open up the stan reference manual."""
        os.system("open ~/Downloads/stan-reference-2.1.0.pdf")

    def do_goog(self, search):
        os.system("""osascript <<EOD
tell application "Google Chrome"
    open location "http://www.google.com/search?q=%s"
end tell
EOD""" % (urllib.quote(search)))

    def do_get(self, link):
        if link in dictionary:
            link = dictionary[link]
        os.system("""osascript <<EOD
tell application "Google Chrome"
    open location "%s"
end tell
EOD""" % (link))

    def do_r(self, check):
        print check
        os.system("open -a R")

    def do_define(self, termdef):
        words = termdef.split()
        dictionary[words[0]] = ' '.join(words[1:])
        with open('dictionary.csv', 'a') as fp:
            fp.write(words[0] + ',' + ' '.join(words[1:]) + '\n')

    def do_add(self,s):
        """Add two numbers together."""
        l = s.split()
        if len(l)!=2:
            print "*** invalid number of arguments"
            return
        try:
            l = [int(i) for i in l]
        except ValueError:
            print "*** arguments should be numbers"
            return
        print l[0]+l[1]

    def do_save(self, phrase):
        commands[phrase] = self.lastline
        with open('commands.csv', 'a') as fp:
            fp.write(phrase + ',' + self.lastline + '\n')

    def do_remind(self, reminder):
        reminders[self.lastline] = reminder
        with open('reminders.csv', 'a') as fp:
            fp.write(self.lastline + ',' + reminder + '\n')

    def do_tell(self, line):
        if line in commands:
            print "cmd: " + commands[line]
        elif ('do_' + line.split()[0]) in dir(self):
            print "code: do_" + line.split()[0]
        else:
            try:
                eval(line)
                print "py: " + line
                return
            except:
                print "unknown: could be a fallback or shell"

    def onecmd(self, line):
        if line in reminders:
            print reminders[line]

        if line in commands:
            line = commands[line]
            print line

        try:
            r = super(PersonalCmd, self).onecmd(line)
            if r:
                r = raw_input('really exit? (y/n):') == 'y'
        except Exception as e:
            r = False
            print e

        self.lastline = line
        return r

    def default(self, line):
        if line == 'exit' or line == 'ex':
            exit()

        print "Gosh, I wish I had access to `understand`."

        try:
            print "py: " + str(eval(line))
            return
        except:
            pass

        for fallback in fallbacks:
            tokens = fallbacks[fallback].split()
            tokens.extend(line.split())
            p = subprocess.Popen(tokens, stdout=subprocess.PIPE)
            output, errors = p.communicate()
            output = output.strip()
            if output:
                print fallback + ": " + output
                return

        p = subprocess.Popen(line.split(), stdout=subprocess.PIPE)
        output, errors = p.communicate()
        print "sh: " + output

    def completedefault(self, text, line, begidx, endidx):
        results = []
        for filename in os.listdir(os.getcwd()):
            if filename[:len(text)] == text:
                if os.path.isdir(filename):
                    results.append(filename + '/')
                else:
                    results.append(filename)

        return results

repl = PersonalCmd()

# Check if there's an argument
if len(sys.argv) > 1:
    repl.onecmd(' '.join(sys.argv[1:]))
    exit()

repl.cmdloop("Welcome.")
