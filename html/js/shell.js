var ShellProcess = {
    init: function(terminal) {
        var self = this;
        if (terminal.user) {
            this.startup(terminal);
        } else {
            this.getlogin(terminal, function(terminal, username, password) {
                if (!username)
                  return self.newregister(terminal);

                $.ajax({
                    url: "ss/login.php",
                    data: {
                        username: username,
                        password: password
                    },
                    success: self.handlelogin(terminal, username, function() { self.init(terminal); })
                }).fail(function() {
                    terminal.print("Failed to connect to serve.  Consider blank for guest.");
                    self.init(terminal);
                });
            });
        }
    },

    getshown: function(terminal, prompt, consumer) {
        terminal.setPrompt(prompt);
        terminal.inputConsumer = function(terminal, content) {
          terminal.inputConsumer = null;
          consumer(terminal, content);
        };
    },

    gethidden: function(terminal, prompt, consumer) {
        terminal.printPart($('<span>' + prompt + '</span>'));
        $('#inputline').toggle(false);
        terminal.inputConsumer = function(terminal, content) {
            terminal.printPart($('<br />'));
            $('#inputline').toggle(true);
            terminal.inputConsumer = null;
            consumer(terminal, content);
        };
    },

    getlogin: function(terminal, consumer) {
        var self = this;
        this.getshown(terminal, "login: ", function(terminal, username) {
            terminal.print('login: ' + (username || ''));
            if (!username)
                return consumer(terminal, null, null);
            self.gethidden(terminal, "password: ", function(terminal, password) {
               return consumer(terminal, username, password);
            });
        });
    },

    handlelogin: function(terminal, username, onerror) {
      var self = this;
      return function(text) {
        if (text.substr(0, 6) == "ERROR:") {
          terminal.print(text.substr(7));
          return onerror(terminal);
        }

        terminal.login(username, parseInt(text));
        self.startup(terminal);
      };
    },

    newregister: function(terminal) {
        var self = this;
        terminal.print("Enter new user registration.");
        this.getlogin(terminal, function(terminal, username, password) {
            if (!username)
              return self.startup(terminal); // login as guest

            $.ajax({
              url: "ss/login.php",
              data: {
                op: 'register',
                username: username,
                password: password
              },
              success: self.handlelogin(terminal, username, function() { self.newregister(terminal); })
            });
        });
        return;
    },

    startup: function(terminal) {
        var self = this;
        this.getlinks(terminal, function() {
            if (terminal.user) {
                terminal.setPrompt(terminal.user + '@console$ ');
                if (self.profiles[terminal.user])
                    self.profiles[terminal.user](terminal);
            } else
                terminal.setPrompt('guest@console$ ');

            Terminal.promptActive = false;
            xkcd.get(null, function(data) {
                if (data)
                    xkcd.latest = data;
            });
            Terminal.runCommand('cat welcome.txt');
        });
    },

    getlinks: function(terminal, callback) {
        $.ajax({
            url: "ss/links.php",
            data: {
                op: 'get',
                user_id: terminal.userid
            },
            success: function(result) {
                if (!result)
                    return callback(terminal);

                var pairs = result.split("\n");
                for (ii = 0; ii < pairs.length; ii++) {
                    if (!pairs[ii])
                        continue;
                    nameurl = pairs[ii].split(',');
                    Filesystem[nameurl[0]] = linkFile(nameurl[1]);
                }
                callback(terminal);
            }
        }).fail(function() {
            terminal.print("Failed to load links from server.");
            callback(terminal);
        });
    },

	commands: {
		help: function help(terminal) {
			terminal.print($('<h3>help</h3>'));
			cmd_list = $('<ul>');
			$.each(this.commands, function(name, func) {
				cmd_list.append($('<li>').text(name));
			});
			terminal.print(cmd_list);
		},
		clear: function(terminal) {
			terminal.clear();
		}
	},
	filters: [],
	fallback: null,

    config: {
		prompt:				'guest@console$ ',
    },

    profiles: {},

	lastCommand: null,
	handle: function(terminal, cmd) {
		try {
			$.each(this.filters, $.proxy(function(index, filter) {
				cmd = filter.call(this, terminal, cmd);
			}, this));
			var cmd_args = cmd.split(' ');
			var cmd_name = cmd_args.shift();
			cmd_args.unshift(terminal);
			if (this.commands.hasOwnProperty(cmd_name)) {
				this.commands[cmd_name].apply(this, cmd_args);
			} else {
				if (!(this.fallback && this.fallback(terminal, cmd))) {
					terminal.print('Unrecognized command. Type "help" for assistance.');
				}
			}
			this.lastCommand = cmd;
		} catch (e) {
			terminal.print($('<p>').addClass('error').text('An internal error occured: '+e));
			terminal.setWorking(false);
		}
	}
};

Terminal.processCatalog['x'] = ShellProcess;

ShellProcess.profiles['james'] = function(terminal) {
    terminal.print("Hi, James!");
};

function pathFilename(path) {
	var match = /\/([^\/]+)$/.exec(path);
	if (match) {
		return match[1];
	}
}

function getRandomInt(min, max) {
	// via https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Math/random#Examples
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
	return items[getRandomInt(0, items.length-1)];
}

ShellProcess.commands['login'] = function(terminal, user) {
    terminal.login(user);
};

ShellProcess.commands['sudo'] = function(terminal) {
	var cmd_args = Array.prototype.slice.call(arguments);
	cmd_args.shift(); // terminal
	if (cmd_args.join(' ') == 'make me a sandwich') {
      terminal.print('Okay.');
    } else if (cmd_args.join(' ') == 'su -') {
      terminal.print('God mode activated. Remember, with great power comes great ... aw, screw it, go have fun.');
	} else {
		var cmd_name = cmd_args.shift();
		cmd_args.unshift(terminal);
		cmd_args.push('sudo');
		if (ShellProcess.commands.hasOwnProperty(cmd_name)) {
			this.sudo = true;
			this.commands[cmd_name].apply(this, cmd_args);
			delete this.sudo;
		} else if (!cmd_name) {
			terminal.print('sudo what?');
		} else {
			terminal.print('sudo: '+cmd_name+': command not found');
		}
	}
};

ShellProcess.filters.push(function (terminal, cmd) {
	if (/!!/.test(cmd)) {
		var newCommand = cmd.replace('!!', this.lastCommand);
		terminal.print(newCommand);
		return newCommand;
	} else {
		return cmd;
	}
});

ShellProcess.commands['shutdown'] = ShellProcess.commands['poweroff'] = function(terminal) {
	if (this.sudo) {
		terminal.print('Broadcast message from guest@xkcd');
		terminal.print();
		terminal.print('The system is going down for maintenance NOW!');
		return $('#screen').fadeOut();
	} else {
		terminal.print('Must be root.');
	}
};

ShellProcess.commands['logout'] =
ShellProcess.commands['exit'] =
ShellProcess.commands['quit'] = function(terminal) {
	terminal.print('Bye.');
	$('#prompt, #cursor').hide();
	terminal.promptActive = false;
};

ShellProcess.commands['restart'] = ShellProcess.commands['reboot'] = function(terminal) {
	if (this.sudo) {
		ShellProcess.commands['poweroff'](terminal).queue(function(next) {
			window.location.reload();
		});
	} else {
		terminal.print('Must be root.');
	}
};

function linkFile(url) {
	return {type:'dir', islink: true, enter:function() {
		window.location = url;
	}};
}

Filesystem = {
	'welcome.txt': {type:'file', read:function(terminal) {
		terminal.print($('<h4>').text('Welcome to the shell console, based on XKCD\'s April Fools interface.'));
		terminal.print('To navigate the comics, enter "next", "prev", "first", "last", "display", or "random".');
		terminal.print('Use "ls", "cat", and "cd" to navigate the filesystem.');
	}},
	'license.txt': {type:'file', read:function(terminal) {
		terminal.print($('<p>').html('Client-side logic for Wordpress CLI theme :: <a href="http://thrind.xamai.ca/">R. McFarland, 2006, 2007, 2008</a>'));
		terminal.print($('<p>').html('jQuery rewrite and overhaul :: <a href="http://www.chromakode.com/">Chromakode, 2010</a>'));
        terminal.print($('<p>').html('Console additions :: <a href="http://jamesrising.net/">J. Rising, 2013</a>'));
		terminal.print();
		$.each([
			'This program is free software; you can redistribute it and/or',
			'modify it under the terms of the GNU General Public License',
			'as published by the Free Software Foundation; either version 2',
			'of the License, or (at your option) any later version.',
			'',
			'This program is distributed in the hope that it will be useful,',
			'but WITHOUT ANY WARRANTY; without even the implied warranty of',
			'MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the',
			'GNU General Public License for more details.',
			'',
			'You should have received a copy of the GNU General Public License',
			'along with this program; if not, write to the Free Software',
			'Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.'
		], function(num, line) {
			terminal.print(line);
		});
	}}
};
ShellProcess.pwd = Filesystem;

ShellProcess.commands['cd'] = function(terminal, path) {
	if (path in this.pwd) {
		if (this.pwd[path].type == 'dir') {
			this.pwd[path].enter(terminal);
		} else if (this.pwd[path].type == 'file') {
			terminal.print('cd: '+path+': Not a directory');
		}
	} else {
		terminal.print('cd: '+path+': No such file or directory');
	}
};

ShellProcess.commands['dir'] =
ShellProcess.commands['ls'] = function(terminal, path) {
	var name_list = $('<ul>');
	$.each(this.pwd, function(name, obj) {
		if (obj.type == 'dir') {
			name += '/';
		}
		name_list.append($('<li>').text(name));
	});
	terminal.print(name_list);
};

ShellProcess.commands['cat'] = function(terminal, path) {
	if (path in this.pwd) {
		if (this.pwd[path].type == 'file') {
			this.pwd[path].read(terminal);
		} else if (this.pwd[path].type == 'dir') {
			terminal.print('cat: '+path+': Is a directory');
		}
	} else if (pathFilename(path) == 'alt.txt') {
		terminal.setWorking(true);
		num = Number(path.match(/^\d+/));
		xkcd.get(num, function(data) {
			terminal.print(data.alt);
			terminal.setWorking(false);
		}, function() {
			terminal.print($('<p>').addClass('error').text('cat: "'+path+'": No such file or directory.'));
			terminal.setWorking(false);
		});
	} else {
		terminal.print('You\'re a kitty!');
	}
};

ShellProcess.commands['rm'] = function(terminal, flags, path) {
	if (flags && flags[0] != '-') {
		path = flags;
	}
	if (!path) {
		terminal.print('rm: missing operand');
	} else if (path in this.pwd) {
		if (this.pwd[path].type == 'file') {
			delete this.pwd[path];
		} else if (this.pwd[path].type == 'dir') {
            if (this.pwd[path].islink) {
                $.ajax({
                    url: "ss/links.php",
                    data: {
                        op: 'delete',
                        user_id: terminal.userid,
                        name: path
                    },
                    success: function(result) {
                        terminal.print(result);
                    }
                });
				delete this.pwd[path];
            } else {
			    if (/r/.test(flags)) {
				    delete this.pwd[path];
			    } else {
				    terminal.print('rm: cannot remove '+path+': Is a directory');
			    }
            }
		}
	} else if (flags == '-rf' && path == '/') {
		if (this.sudo) {
			ShellProcess.commands = {};
		} else {
			terminal.print('rm: cannot remove /: Permission denied');
		}
	}
};

ShellProcess.commands['ln'] = function(terminal, url, name) {
    $.ajax({
        url: "ss/links.php",
        data: {
            op: 'post',
            user_id: terminal.userid,
            name: name,
            url: url
        },
        success: function(result) {
            terminal.print(result);
            Filesystem[name] = linkFile(url);
        }
    });
};


ShellProcess.commands['su'] = function(terminal, path) {
    if (path && path[0] == '-') {
        this.gethidden(terminal, 'Password: ', function(terminal, pass) {
            terminal.supass = pass;
            terminal.setPrompt('root@console$ ');
            terminal.inputConsumer = null;
            $('#inputline').toggle(true);
        });
    }
};

ShellProcess.commands['reddit'] = function(terminal, num) {
	num = Number(num);
	if (num) {
		url = 'http://xkcd.com/'+num+'/';
	} else {
		var url = window.location;
	}
	terminal.print($('<iframe src="http://www.reddit.com/static/button/button1.html?width=140&url='+encodeURIComponent(url)+'&newwindow=1" height="22" width="140" scrolling="no" frameborder="0"></iframe>'));
};

ShellProcess.commands['wget'] = ShellProcess.commands['curl'] = function(terminal, dest) {
	if (dest) {
		terminal.setWorking(true);
		var browser = $('<div>')
			.addClass('browser')
			.append($('<iframe>')
					.attr('src', dest).width("100%").height(400)
					.one('load', function() {
						terminal.setWorking(false);
					}));
		terminal.print(browser);
		return browser;
	} else {
		terminal.print("Please specify a URL.");
	}
};

ShellProcess.commands['write'] =
ShellProcess.commands['irc'] = function(terminal, nick) {
	if (nick) {
		$('.irc').slideUp('fast', function() {
			$(this).remove();
		});
		var url = "http://widget.mibbit.com/?server=irc.foonetic.net&channel=%23xkcd";
		if (nick) {
			url += "&nick=" + encodeURIComponent(nick);
		}
		ShellProcess.commands['curl'](terminal, url).addClass('irc');
	} else {
		terminal.print('usage: irc <nick>');
	}
};

ShellProcess.commands['apt-get'] = function(terminal, subcmd) {
	if (!this.sudo && (subcmd in {'update':true, 'upgrade':true, 'dist-upgrade':true})) {
		terminal.print('E: Unable to lock the administration directory, are you root?');
	} else {
		if (subcmd == 'update') {
			terminal.print('Reading package lists... Done');
		} else if (subcmd == 'upgrade') {
			if (($.browser.name == 'msie') || ($.browser.name == 'firefox' && $.browser.versionX < 3)) {
				terminal.print($('<p>').append($('<a>').attr('href', 'http://abetterbrowser.org/').text('To complete installation, click here.')));
			} else {
				terminal.print('This looks pretty good to me.');
			}
		} else if (subcmd == 'dist-upgrade') {
			var longNames = {'win':'Windows', 'mac':'OS X', 'linux':'Linux'};
			var name = $.os.name;
			if (name in longNames) {
				name = longNames[name];
			} else {
				name = 'something fancy';
			}
			terminal.print('You are already running '+name+'.');
		} else if (subcmd == 'moo') {
			terminal.print('        (__)');
			terminal.print('        (oo)');
			terminal.print('  /------\\/ ');
			terminal.print(' / |    ||  ');
			terminal.print('*  /\\---/\\  ');
			terminal.print('   ~~   ~~  ');
			terminal.print('...."Have you mooed today?"...');
		} else if (!subcmd) {
			terminal.print('This APT has Super Cow Powers.');
		} else {
			terminal.print('E: Invalid operation '+subcmd);
		}
	}
};

function oneLiner(terminal, msg, msgmap) {
	if (msgmap.hasOwnProperty(msg)) {
		terminal.print(msgmap[msg]);
		return true;
	} else {
		return false;
	}
}

ShellProcess.commands['man'] = function(terminal, what) {
	pages = {
		'last': 'Man, last night was AWESOME.',
		'help': 'Man, help me out here.',
		'next': 'Request confirmed; you will be reincarnated as a man next.',
		'cat':  'You are now riding a half-man half-cat.'
	};
	if (!oneLiner(terminal, what, pages)) {
		terminal.print('Oh, I\'m sure you can figure it out.');
	}
};

ShellProcess.commands['locate'] = function(terminal, what) {
	keywords = {
		'ninja': 'Ninja can not be found!',
		'keys': 'Have you checked your coat pocket?',
		'joke': 'Joke found on user.',
		'problem': 'Problem exists between keyboard and chair.',
		'raptor': 'BEHIND YOU!!!'
	};
	if (!oneLiner(terminal, what, keywords)) {
		terminal.print('Locate what?');
	}
};

Adventure = {
	rooms: {
		0:{description:'You are at a computer using unixkcd.', exits:{west:1, south:10}},
		1:{description:'Life is peaceful there.', exits:{east:0, west:2}},
		2:{description:'In the open air.', exits:{east:1, west:3}},
		3:{description:'Where the skies are blue.', exits:{east:2, west:4}},
		4:{description:'This is what we\'re gonna do.', exits:{east:3, west:5}},
		5:{description:'Sun in wintertime.', exits:{east:4, west:6}},
		6:{description:'We will do just fine.', exits:{east:5, west:7}},
		7:{description:'Where the skies are blue.', exits:{east:6, west:8}},
		8:{description:'This is what we\'re gonna do.', exits:{east:7}},
		10:{description:'A dark hallway.', exits:{north:0, south:11}, enter:function(terminal) {
				if (!Adventure.status.lamp) {
					terminal.print('You are eaten by a grue.');
					Adventure.status.alive = false;
					Adventure.goTo(terminal, 666);
				}
			}
		},
		11:{description:'Bed. This is where you sleep.', exits:{north:10}},
		666:{description:'You\'re dead!'}
	},

	status: {
		alive: true,
		lamp: false
	},

	goTo: function(terminal, id) {
		Adventure.location = Adventure.rooms[id];
		Adventure.look(terminal);
		if (Adventure.location.enter) {
			Adventure.location.enter(terminal);
		}
	}
};
Adventure.location = Adventure.rooms[0];

ShellProcess.commands['look'] = Adventure.look = function(terminal) {
	terminal.print(Adventure.location.description);
	if (Adventure.location.exits) {
		terminal.print();

		var possibleDirections = [];
		$.each(Adventure.location.exits, function(name, id) {
			possibleDirections.push(name);
		});
		terminal.print('Exits: '+possibleDirections.join(', '));
	}
};

ShellProcess.commands['go'] = Adventure.go = function(terminal, direction) {
	if (Adventure.location.exits && direction in Adventure.location.exits) {
		Adventure.goTo(terminal, Adventure.location.exits[direction]);
	} else if (!direction) {
		terminal.print('Go where?');
	} else if (direction == 'down') {
		terminal.print("On our first date?");
	} else {
		terminal.print('You cannot go '+direction+'.');
	}
};

ShellProcess.commands['light'] = function(terminal, what) {
	if (what == "lamp") {
		if (!Adventure.status.lamp) {
			terminal.print('You set your lamp ablaze.');
			Adventure.status.lamp = true;
		} else {
			terminal.print('Your lamp is already lit!');
		}
	} else {
		terminal.print('Light what?');
	}
};

ShellProcess.commands['sleep'] = function(terminal, duration) {
	duration = Number(duration);
	if (!duration) {
		duration = 5;
	}
	terminal.setWorking(true);
	terminal.print("You take a nap.");
	$('#screen').fadeOut(1000);
	window.setTimeout(function() {
		terminal.setWorking(false);
		$('#screen').fadeIn();
		terminal.print("You awake refreshed.");
	}, 1000*duration);
};

// No peeking!
ShellProcess.commands['help'] = ShellProcess.commands['halp'] = function(terminal) {
	terminal.print('That would be cheating!');
};

ShellProcess.fallback = function(terminal, cmd) {
	oneliners = {
		'make me a sandwich': 'What? Make it yourself.',
		'make love': 'I put on my robe and wizard hat.',
		'i read the source code': '<3',
		'pwd': 'You are in a maze of twisty passages, all alike.',
		'lpr': 'PC LOAD LETTER',
		'hello joshua': 'How about a nice game of Global Thermonuclear War?',
		'xyzzy': 'Nothing happens.',
		'date': 'March 32nd',
		'hello': 'Why hello there!',
		'who': 'Doctor Who?',
		'xkcd': 'Yes?',
		'fuck': 'I have a headache.',
		'whoami': 'You are Richard Stallman.',
		'nano': 'Seriously? Why don\'t you just use Notepad.exe? Or MS Paint?',
		'top': 'It\'s up there --^',
		'moo':'moo',
		'ping': 'There is another submarine three miles ahead, bearing 225, forty fathoms down.',
		'find': 'What do you want to find? Kitten would be nice.',
		'hello':'Hello.','more':'Oh, yes! More! More!',
		'your gay': 'Keep your hands off it!',
		'hi':'Hi.','echo': 'Echo ... echo ... echo ...',
		'bash': 'You bash your head against the wall. It\'s not very effective.','ssh': 'ssh, this is a library.',
		'uname': 'Illudium Q-36 Explosive Space Modulator',
		'finger': 'Mmmmmm...',
		'kill': 'Terminator deployed to 1984.',
		'use the force luke': 'I believe you mean source.',
		'use the source luke': 'I\'m not luke, you\'re luke!',
		'serenity': 'You can\'t take the sky from me.',
		'enable time travel': 'TARDIS error: Time Lord missing.',
		'ed': 'You are not a diety.'
	};
	oneliners['emacs'] = 'You should really use vim.';
	oneliners['vi'] = oneliners['vim'] = 'You should really use emacs.';

	cmd = cmd.toLowerCase();
	if (!oneLiner(terminal, cmd, oneliners)) {
		if (cmd == "asl" || cmd == "a/s/l") {
			terminal.print(randomChoice([
				'2/AMD64/Server Rack',
				'328/M/Transylvania',
				'6/M/Battle School',
				'48/M/The White House',
				'7/F/Rapture',
				'Exactly your age/A gender you\'re attracted to/Far far away.',
				'7,831/F/Lothlórien',
				'42/M/FBI Field Office'
			]));
		} else if  (cmd == "hint") {
			terminal.print(randomChoice([
 				'We offer some really nice polos.',
 				$('<p>').html('This terminal will remain available at <a href="http://xkcd.com/unixkcd/">http://xkcd.com/unixkcd/</a>'),
 				'Use the source, Luke!',
 				'There are cheat codes.'
 			]));
		} else if (cmd == 'find kitten') {
			terminal.print($('<iframe width="800" height="600" src="http://www.robotfindskitten.net/rfk.swf"></iframe>'));
		} else if (cmd == 'buy stuff') {
			Filesystem['store'].enter();
		} else if (cmd == 'time travel') {
			xkcdDisplay(terminal, 630);
		} else if (/:\(\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;\s*:/.test(cmd)) {
			Terminal.setWorking(true);
		} else {
			$.get("/unixkcd/missing", {cmd: cmd});
			return false;
		}
	}
	return true;
};

var konamiCount = 0;
$(document).ready(function() {
	$(document).konami(function(){
		function shake(elems) {
			elems.css('position', 'relative');
			return window.setInterval(function() {
				elems.css({top:getRandomInt(-3, 3), left:getRandomInt(-3, 3)});
			}, 100);
		}

		if (konamiCount == 0) {
			$('#screen').css('text-transform', 'uppercase');
		} else if (konamiCount == 1) {
			$('#screen').css('text-shadow', 'gray 0 0 2px');
		} else if (konamiCount == 2) {
			$('#screen').css('text-shadow', 'orangered 0 0 10px');
		} else if (konamiCount == 3) {
			shake($('#screen'));
		} else if (konamiCount == 4) {
			$('#screen').css('background', 'url(/unixkcd/over9000.png) center no-repeat');
		}

		$('<div>')
			.height('100%').width('100%')
			.css({background:'white', position:'absolute', top:0, left:0})
			.appendTo($('body'))
			.show()
			.fadeOut(1000);

		if (Terminal.buffer.substring(Terminal.buffer.length-2) == 'ba') {
			Terminal.buffer = Terminal.buffer.substring(0, Terminal.buffer.length-2);
			Terminal.updateInputDisplay();
		}
		ShellProcess.sudo = true;
		konamiCount += 1;
	});
});
