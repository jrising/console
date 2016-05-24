import sys, os, cmd, csv, urllib, subprocess
from sandbox import Sandbox

dictionary = {}
commands = {}

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

    def do_stan(self, cmd):
        """stan help: open up the stan reference manual."""
        os.system("open ~/Downloads/stan-reference-2.1.0.pdf")

    def do_goog(self, search):
        os.system("""osascript <<EOD
tell application "Google Chrome"
    open location "http://www.google.com/search?q=%s"
end tell
EOD""" % (urllib.quote(search)))

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
        dictionary[phrase] = self.lastline
        with open('commands.csv', 'a') as fp:
            fp.write(phrase + ',' + self.lastline + '\n')

    def onecmd(self, line):
        if line in commands:
            line = commands[line]
            print line

        r = super(PersonalCmd, self).onecmd(line)
        if r:
            r = raw_input('really exit? (y/n):') == 'y'

        self.lastline = line
        return r

    def default(self, line):
        try:
            print "py: " + str(eval(line))
        except:
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
