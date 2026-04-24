import time, random, math
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def read_root():
    return {"message": "Trail Optimizer API is running"}

random.seed(42)

_cache = {}

def nearest_neighbor_length(d, start=0):
    n = len(d)
    if n == 0: return 0
    visited = [False] * n
    visited[start] = True
    cur = start
    total = 0
    for _ in range(n - 1):
        best, best_d = -1, float('inf')
        for j in range(n):
            if not visited[j] and d[cur][j] < best_d:
                best_d, best = d[cur][j], j
        total += best_d
        visited[best] = True
        cur = best
    total += d[cur][start]
    return total

N = 0
LABELS = []
COORDS = []
D = []
L_NN = 0

def init_graph(n: int):
    global N, LABELS, COORDS, D, L_NN, _cache
    N = n
    LABELS = [chr(65 + i) if i < 26 else f"N{i}" for i in range(n)]
    COORDS = [(random.randint(50, 850), random.randint(50, 410)) for _ in range(n)]
    D = [[0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                D[i][j] = round(math.dist(COORDS[i], COORDS[j]))
    L_NN = nearest_neighbor_length(D)
    _cache.clear()

init_graph(6)

def heuristic():
    return [[1.0 / D[i][j] if i != j else 0.0 for j in range(N)] for i in range(N)]

def build_tour(tau, eta, alpha, beta, rng):
    start = rng.randrange(N)
    tour = [start]
    visited = {start}
    for _ in range(N - 1):
        i = tour[-1]
        cands = [j for j in range(N) if j not in visited]
        ws = [(tau[i][j] ** alpha) * (eta[i][j] ** beta) for j in cands]
        tot = sum(ws)
        if tot <= 0:
            nxt = rng.choice(cands)
        else:
            r = rng.random() * tot
            cum = 0.0
            nxt = cands[-1]
            for j, w in zip(cands, ws):
                cum += w
                if cum >= r:
                    nxt = j
                    break
        tour.append(nxt)
        visited.add(nxt)
    return tour

def tour_len(t):
    return sum(D[t[i]][t[(i + 1) % N]] for i in range(N))

def ant_system(alpha=1.0, beta=2.0, rho=0.5, Q=1.0, m=10, iterations=50, seed=42):
    t0 = time.time()
    rng = random.Random(seed)
    tau0 = 1.0 / (N * L_NN)
    tau = [[tau0] * N for _ in range(N)]
    eta = heuristic()
    best_tour, best_len = None, float('inf')
    conv = []
    for it in range(iterations):
        tours, lens = [], []
        for _ in range(m):
            t = build_tour(tau, eta, alpha, beta, rng)
            L = tour_len(t)
            tours.append(t)
            lens.append(L)
            if L < best_len:
                best_len, best_tour = L, t[:]
        # evaporation on all edges
        for i in range(N):
            for j in range(N):
                tau[i][j] *= (1 - rho)
        # every ant deposits on its tour edges
        for t, L in zip(tours, lens):
            d = Q / L
            for k in range(N):
                a, b = t[k], t[(k + 1) % N]
                tau[a][b] += d
                tau[b][a] += d
        conv.append({"iteration": it + 1, "cost": round(best_len, 4)})
    return {
        "algorithm": "AS",
        "best_tour": best_tour,
        "best_cost": round(best_len, 4),
        "convergence": conv,
        "final_tau": tau,
        "time_ms": round((time.time() - t0) * 1000, 2),
    }

def max_min_ant_system(alpha=1.0, beta=2.0, rho=0.5, m=10, iterations=50, seed=42):
    t0 = time.time()
    rng = random.Random(seed)
    tau_max = 1.0 / (rho * L_NN)
    tau_min = tau_max / (2 * N)
    tau = [[tau_max] * N for _ in range(N)]
    eta = heuristic()
    best_tour, best_len = None, float('inf')
    conv = []
    for it in range(iterations):
        it_best_t, it_best_L = None, float('inf')
        for _ in range(m):
            t = build_tour(tau, eta, alpha, beta, rng)
            L = tour_len(t)
            if L < it_best_L:
                it_best_L, it_best_t = L, t[:]
        if it_best_L < best_len:
            best_len, best_tour = it_best_L, it_best_t[:]
        for i in range(N):
            for j in range(N):
                tau[i][j] *= (1 - rho)
        # only the best-so-far ant deposits
        d = 1.0 / best_len
        for k in range(N):
            a, b = best_tour[k], best_tour[(k + 1) % N]
            tau[a][b] += d
            tau[b][a] += d
        # recompute bounds from L_best and clamp
        tau_max = 1.0 / (rho * best_len)
        tau_min = tau_max / (2 * N)
        for i in range(N):
            for j in range(N):
                if i != j:
                    tau[i][j] = max(tau_min, min(tau_max, tau[i][j]))
        conv.append({"iteration": it + 1, "cost": round(best_len, 4)})
    return {
        "algorithm": "MMAS",
        "best_tour": best_tour,
        "best_cost": round(best_len, 4),
        "convergence": conv,
        "final_tau": tau,
        "time_ms": round((time.time() - t0) * 1000, 2),
        "tau_min": round(tau_min, 6),
        "tau_max": round(tau_max, 6),
    }

def cached_as():
    if "as" not in _cache:
        _cache["as"] = ant_system()
    return _cache["as"]

def cached_mmas():
    if "mmas" not in _cache:
        _cache["mmas"] = max_min_ant_system()
    return _cache["mmas"]

class ASReq(BaseModel):
    alpha: float = 1.0
    beta: float = 2.0
    rho: float = 0.5
    Q: float = 1.0
    m: int = 10
    iterations: int = 50
    seed: int = 42

class MMASReq(BaseModel):
    alpha: float = 1.0
    beta: float = 2.0
    rho: float = 0.5
    m: int = 10
    iterations: int = 50
    seed: int = 42

@app.post("/run-as")
def run_as(req: ASReq):
    return ant_system(req.alpha, req.beta, req.rho, req.Q, req.m, req.iterations, req.seed)

@app.post("/run-mmas")
def run_mmas(req: MMASReq):
    return max_min_ant_system(req.alpha, req.beta, req.rho, req.m, req.iterations, req.seed)

class GenerateReq(BaseModel):
    size: int

@app.post("/generate-graph")
def generate_graph(req: GenerateReq):
    n = max(3, min(req.size, 50))
    init_graph(n)
    return {"status": "ok", "n": N}

@app.get("/graph")
def graph():
    nodes = [{"id": i, "label": LABELS[i], "x": COORDS[i][0], "y": COORDS[i][1]} for i in range(N)]
    edges = []
    for i in range(N):
        for j in range(i + 1, N):
            edges.append({"source": i, "target": j, "weight": D[i][j]})
    return {"nodes": nodes, "edges": edges}

@app.get("/matrix/{mtype}")
def matrix(mtype: str):
    if mtype == "distance":
        return {"labels": LABELS, "matrix": D}
    if mtype == "heuristic":
        return {"labels": LABELS, "matrix": [[round(v, 4) for v in row] for row in heuristic()]}
    if mtype == "initial":
        tau0 = 1.0 / (N * L_NN)
        M = [[round(tau0, 4) if i != j else 0.0 for j in range(N)] for i in range(N)]
        return {"labels": LABELS, "matrix": M}
    if mtype == "pheromone-as":
        r = cached_as()
        return {"labels": LABELS, "matrix": [[round(v, 4) for v in row] for row in r["final_tau"]]}
    if mtype == "pheromone-mmas":
        r = cached_mmas()
        return {"labels": LABELS, "matrix": [[round(v, 4) for v in row] for row in r["final_tau"]]}
    return {"labels": LABELS, "matrix": [[0] * N for _ in range(N)]}

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
