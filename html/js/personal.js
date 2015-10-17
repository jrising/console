ShellProcess.commands['arch'] = function(terminal) {
    var sources = ['laptop', 'backups', 'pics', 'cards', 'projects', 'existencia', 'blogs', 'contacts', 'email', 'folders'];
    var index = Math.floor(Math.random() * sources.length);
    terminal.print("Revisit something in " + sources[index] + '.');
};

ShellProcess.commands['ts'] = function(terminal) {
  var args = Array.prototype.slice.call(arguments);

  urlargs = {
      pass: terminal.supass,
      op: args[1]
  };
  for (var ii = 2; ii < args.length; ii++) {
      if (args[ii].match(/\d/) && args[ii].match(/^\d*\.?\d*$/)) {
          urlargs['dur'] = args[ii];
          terminal.print("Duration: " + args[ii]);
      }
      else if (args[ii].match(/^\d\d:\d\d$/)) {
          urlargs['start'] = args[ii];
          terminal.print("Start: " + args[ii]);
      }
      else
          urlargs['task'] = args[ii];
  }

  $.post("time.php", urlargs, function(result) {
      terminal.print(result);
    });
};

ShellProcess.commands['post'] = function(terminal) {
  var args = Array.prototype.slice.call(arguments);
  args.shift(); // terminal
  category = args.shift();
  if (args.length > 0)
    doPost(terminal, category, args.join(' '));
  else {
      gettext(terminal, 'post> ', function(allcontent) {
        doPost(terminal, category, allcontent);
          });
  }
};

function doPost(terminal, category, content) {
  terminal.setWorking(true);
  $.post("post.php", {
      category: category,
      content: content,
      pass: terminal.supass
    }, function(result) {
      terminal.print(result);
      terminal.setWorking(false);
    });
}

// Entertain me!
ShellProcess.commands['ent'] = function(terminal) {
    terminal.setWorking(true);
    $.get("entertain.php", {
        pass: terminal.supass
    }, function(result) {
      terminal.print(result);
      terminal.setWorking(false);
    });
};
