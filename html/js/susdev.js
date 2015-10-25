SusDevTools = {
    articles_login: null
};

ShellProcess.commands['scholar'] = function(terminal) {
	var cmd_args = Array.prototype.slice.call(arguments);
	cmd_args.shift(); // terminal
    window.open('http://scholar.google.com/scholar?hl=en&q=' + encodeURIComponent(cmd_args.join(' ')), '_blank');
};

ShellProcess.commands['sda'] = function(terminal) {
    if (!SusDevTools.articles_login) {
        terminal.print("Please login with an appropriate user first.");
        return;
    }
    var login = SusDevTools.articles_login;

    var cmd_args = Array.prototype.slice.call(arguments);
    cmd_args.shift(); // terminal
    if (cmd_args[0] == 'list') {
        $.ajax({
                url: "ss/wget.php",
                data: {
                    ww_url: "http://sd.existencia.org/3rdparty/API/api.php?fn=list&username=" + login.user + "&password=" + login.pass,
                    ww_auth: 'sd:sd'
                },
                success: function(xml) {
                    terminal.print(xml);
                    /*$(xml).find('categorylist').find('cate').each(function() {
                            terminal.print($(this).find('name').text());
                            });*/
                }//,
                //    dataType: 'xml'
            });
    }
    if (cmd_args[0] == 'post') {
        var post = cmd_args.shift();
        var url = cmd_args.shift();
        var cat = cmd_args.shift();
        var tags = cmd_args.shift();
        var title = cmd_args.join(' ');

        gettext(terminal, 'description> ', function(allcontent) {
            $.ajax({
                url: "ss/wget.php",
                data: {
                    ww_url: "http://sd.existencia.org/3rdparty/API/api.php?fn=post&username=" + login.user + "&password=" + login.pass + "&url=" + escape(url) + "&category=" + cat + "&title=" + escape(title) + "&content=" + escape(allcontent) + "&tags=" + tags,
                    ww_auth: 'sd:sd'
                },
                success: function(xml) {
                    terminal.print(xml);
                    /*$(xml).find('categorylist').find('cate').each(function() {
                            terminal.print($(this).find('name').text());
                            });*/
                }//,
                //    dataType: 'xml'
            });
          });


    }
};

ShellProcess.commands['tzconv'] = function(terminal) {
    // Time is assumed to be in this timezone
	var cmd_args = Array.prototype.slice.call(arguments);
	cmd_args.shift(); // terminal

    // Parse it
    var time = moment(cmd_args[0]);
    if (!time.isValid()) {
        time = moment(moment().format("YYYY-MM-DD ") + cmd_args[0]);
        if (!time.isValid()) {
            throw "Unrecognized date.";
        }
    }

    // Convert it
    var tzname = getTimezone(cmd_args[1], terminal);
    var format = "YYYY-MM-DD HH:mm:ss Z";
    terminal.print(time.tz(tzname).format(format));
};

ShellProcess.commands['tzback'] = function(terminal) {
    // Time is assumed to be in another timezone
	var cmd_args = Array.prototype.slice.call(arguments);
	cmd_args.shift(); // terminal

    var tzname = getTimezone(cmd_args[1], terminal);

    // Parse it
    var time = moment.tz(cmd_args[0], tzname);
    if (!time.isValid()) {
        time = moment.tz(moment().format("YYYY-MM-DD ") + cmd_args[0], tzname);
        if (!time.isValid()) {
            throw "Unrecognized date.";
        }
    }

    // Get the current timezone
    var tzhere = jstz.determine().name();

    // Convert it
    var format = "YYYY-MM-DD HH:mm:ss Z";
    terminal.print(time.tz(tzhere).format(format));
};

function getTimezone(name, terminal) {
    var alltz = moment.tz.names();
    if ($.inArray(name, alltz) != -1)
        return name;

    var fuse = new Fuse(alltz);
    var best = fuse.search(name);
    if (terminal)
        terminal.print("Using " + alltz[best[0]] + ".");
    return alltz[best[0]];
}
