"""Loopback-only static app server with byte-range support for audio seeking."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            body = json.dumps({'app': 'afterlight'}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def send_head(self):
        self.byte_range = None
        path = Path(self.translate_path(self.path))
        header = self.headers.get('Range')
        if header and path.is_file():
            match = re.fullmatch(r'bytes=(\d+)-(\d*)', header)
            if match:
                size = path.stat().st_size
                start = int(match[1])
                end = min(int(match[2]) if match[2] else size - 1, size - 1)
                if start > end or start >= size:
                    self.send_response(416)
                    self.send_header('Content-Range', f'bytes */{size}')
                    self.send_header('Content-Length', '0')
                    self.end_headers()
                    return None
                stream = path.open('rb')
                stream.seek(start)
                self.byte_range = end - start + 1
                self.send_response(206)
                self.send_header('Content-Type', self.guess_type(str(path)))
                self.send_header('Content-Length', str(self.byte_range))
                self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
                self.send_header('Accept-Ranges', 'bytes')
                self.end_headers()
                return stream
        return super().send_head()

    def copyfile(self, source, outputfile):
        if self.byte_range is None:
            return super().copyfile(source, outputfile)
        remaining = self.byte_range
        while remaining:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8770)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(Path(__file__).parent)))
    print(f'Afterlight: http://127.0.0.1:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
