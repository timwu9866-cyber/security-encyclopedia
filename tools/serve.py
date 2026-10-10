# 本地静态服务:带 Cache-Control: no-cache,避免浏览器/隧道缓存旧文件。用法: python3 tools/serve.py [端口]
import sys, os, http.server, functools
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate'); self.send_header('Pragma', 'no-cache'); self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer.allow_reuse_address = True
http.server.ThreadingHTTPServer(('0.0.0.0', port), functools.partial(H, directory=root)).serve_forever()
