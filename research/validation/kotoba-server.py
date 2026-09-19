"""Local validation bridge. Not a production server."""

import argparse, json, sys, time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import torch

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--model-dir", type=Path, required=True)
parser.add_argument("--port", type=int, default=8086)
args = parser.parse_args()
sys.path.insert(0, str(args.model_dir.resolve()))
from typed_decisions.open_jev import OpenJev

MODEL = "com-kotobalabs/open-jev-deberta-v3-large"
torch.set_num_threads(8)
started = time.perf_counter()
model = OpenJev.from_pretrained(str(args.model_dir.resolve()), device="cpu")
print(
    json.dumps({"ready": True, "loadSeconds": time.perf_counter() - started}),
    flush=True,
)


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            if self.path != "/v1/systemone":
                self.send_error(404)
                return
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 65536:
                raise ValueError("Request must be 1..65536 bytes")
            request = json.loads(self.rfile.read(length))
            if request["model"] != MODEL:
                raise ValueError("Unknown model")
            state = (
                request["state"]
                if isinstance(request["state"], str)
                else json.dumps(request["state"], ensure_ascii=False)
            )
            if (
                len(model.tok(state, add_special_tokens=False)["input_ids"])
                > model.config["max_state_tokens"]
            ):
                raise ValueError("State exceeds 256 tokens; refusing silent truncation")
            questions = []
            mappings = []
            for name, q in request["questions"].items():
                kind = q["type"]
                opts = None
                keys = None
                if kind == "noul" and q.get("criteria"):
                    keys = ["false", "true"]
                    opts = [q["criteria"][k] for k in keys]
                elif kind == "choice":
                    keys = list(q["criteria"])
                    opts = [f"{k}: {q['criteria'][k]}" for k in keys]
                elif kind == "score":
                    keys = [str(i) for i in range(len(q["criteria"]))]
                    opts = q["criteria"]
                if opts is not None and len(set(opts)) != len(opts):
                    raise ValueError("Distinct descriptions required by this bridge")
                questions.append(
                    {
                        "type": "choice" if kind == "noul" and opts else kind,
                        "instructions": q["instructions"],
                        **({"options": opts} if opts else {}),
                    }
                )
                mappings.append((name, kind, keys, opts))
            started = time.perf_counter()
            raw = model.decide(state, questions)
            answers = {}
            for (name, kind, keys, opts), value in zip(mappings, raw):
                if kind == "noul":
                    answer = {
                        "type": kind,
                        "noul": value["probabilities"][opts[1]]
                        if opts
                        else value["noul"],
                    }
                else:
                    answer = {
                        "type": kind,
                        kind: keys[opts.index(value["choice"])]
                        if kind == "choice"
                        else value["score"],
                        "probabilities": dict(
                            zip(keys, [value["probabilities"][o] for o in opts])
                        ),
                        "confidence": value["confidence"],
                    }
                answers[name] = answer
            body = {"model": MODEL, "answers": answers}
            status = 200
            print(
                json.dumps(
                    {
                        "questions": len(questions),
                        "inferenceMs": round((time.perf_counter() - started) * 1000),
                    }
                ),
                flush=True,
            )
        except ValueError as e:
            status = 400
            body = {"error": str(e)}
        except Exception as e:
            status = 500
            body = {"error": str(e)}
            print(repr(e), flush=True)
        encoded = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(encoded)


server = HTTPServer(("127.0.0.1", args.port), Handler)
server.timeout = 30
server.serve_forever()
