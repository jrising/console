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
