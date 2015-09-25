/***** Command Operations *****/

var JavascriptProcess = {
    init: function(terminal) {
        terminal.print("Javascript console activated.");
    },

    config: {
		prompt:	'<< ',
    },

	handle: function(terminal, cmd) {
      if (!cmd)
        return;

      if (cmd.indexOf('r ') === 0) {
        $.ajax({
          dataType: 'jsonp',
          url: chat.backendUrl + '/ajax/do_command',
          data: {text: cmd},
          success: function(ev) {
              input.disabled = false;
          },
          error: function(ev) {
              showError('Error sending message');
              input.disabled = false;
          },
        });
      }

      try {
        var js_result = eval(cmd);
      } catch (ex) {
        var js_result = ex;
      }
      try {
        js_result = Mochi.repr(js_result);
      } catch (ex) {
        js_result += " (not repr)";
      }

      terminal.print(">> " + js_result);
    }
};

Terminal.processCatalog['j'] = JavascriptProcess;
