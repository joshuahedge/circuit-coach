"""Static file server that sends Cache-Control: no-store.

Usage: python tests/serve.py PORT DIRECTORY [RESULTS_FILE] [HOST]

The test page reports its results by POSTing the text to /__results. With a RESULTS_FILE the server
writes it there (temporary file then rename, so a reader never sees half a file). Without one the POST
is accepted and dropped. HOST defaults to 127.0.0.1; pass 0.0.0.0 to reach the server from a phone on the LAN.
"""
import functools
import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    results_file = None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        path = self.path.partition('?')[0]
        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length)
        if path == '/__results':
            if self.results_file:
                tmp = self.results_file + '.tmp'
                with open(tmp, 'wb') as f:
                    f.write(body)
                os.replace(tmp, self.results_file)
            self.send_response(204)
            self.end_headers()
            return
        self.send_error(404)


class Server(http.server.ThreadingHTTPServer):
    # Off so a port clash fails to bind on Windows instead of sharing a dying server's port.
    allow_reuse_address = False
    request_queue_size = 64


if __name__ == '__main__':
    port, directory = int(sys.argv[1]), sys.argv[2]
    Handler.results_file = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
    host = sys.argv[4] if len(sys.argv) > 4 else '127.0.0.1'
    handler = functools.partial(Handler, directory=directory)
    Server((host, port), handler).serve_forever()
