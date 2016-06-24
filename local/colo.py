import sys, os, cmd, csv, urllib, subprocess, psutil
from sandbox import Sandbox

if sys.platform in ['linux', 'linux2']:
    import x_server
    local_server = x_server.XLocalServer()
elif sys.platform == 'darwin':
    import macos_server
    local_server = macos_server.MacOSLocalServer()
else:
    import gui_server
    local_server = gui_server.GUILocalServer()

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
            liveprocs.add(local_server.get_process(pid))

    def do_shell(self, command):
        """Responds to !<command> by executing shell."""
        os.system(command)

    def do_term(self, command):
        """Open a new terminal."""
        if command in dictionary:
            command = "cd " + dictionary[command]

        local_server.open_terminal(command)

    def do_ssh(self, where):
        """Ssh to a known location."""
        if where in dictionary:
            local_server.open_terminal("ssh " + dictionary[where])
        else:
            print "Unrecognized: ssh: " + where

    def do_open(self, thing):
        """Open an application or a file, as with the Finder."""
        local_server.open_thing(thing)

    def complete_open(self, text, line, begidx, endidx):
        apps = []
        for app in local_server.list_applications():
            if app[:len(text)].lower() == text.lower():
                apps.append(app)

        return apps

    def do_stan(self, cmd):
        """stan help: open up the stan reference manual."""
        os.system("open ~/Downloads/stan-reference-2.1.0.pdf")

    def do_goog(self, search):
        local_server.open_url("http://www.google.com/search?q=" + urllib.quote(search))

    def do_get(self, link):
        if link in dictionary:
            link = dictionary[link]
        local_server.open_url(link)

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
        if line == 'exit':
            exit()

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
