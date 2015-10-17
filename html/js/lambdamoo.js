var LambdaMOOProcess = {
    conn: null,

    init: function(terminal) {
        this.conn = new WebSocket("ws://existencia.org:8080/");
        this.conn.onopen = function(e) {
            terminal.print("Connection established!");
            window.setTimeout(function() {
                    LambdaMOOProcess.conn.send("CO guest nopass");
                    window.setInterval(function() {
                            LambdaMOOProcess.conn.send("_/_");
                        }, 1000);
                }, 500);
        };
        this.conn.onmessage = function(e) {
            terminal.print(e.data);
        };
    },

    config: {
		prompt:	'>> ',
    },

	handle: function(terminal, content) {
        this.conn.send(content);
    }
};

Terminal.processCatalog['l'] = LambdaMOOProcess;
