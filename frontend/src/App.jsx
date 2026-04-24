import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import './App.css';

const API = import.meta.env.VITE_API_URL;

async function apiFetch(endpoint, options = {}) {
  try {
    const response = await fetch(`${API}${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error);
    // Standardize error message for UI
    throw new Error("Failed to connect to backend. Please try again.");
  }
}

function Section({ title, subtitle, children, id }) {
  return (
    <div className="card" id={id}>
      <div className="card-header" style={{ cursor: 'default' }}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#000', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: '#a3a3a3', marginBottom: 4 }}>iter: {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: "'JetBrains Mono', monospace" }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </div>
      ))}
    </div>
  );
}

function TheorySection() {
  return (
    <>
      <Section title="Ant Colony Optimization" subtitle="Biological inspiration and core mechanism">
        <div className="theory-grid">
          <div className="theory-item full-width">
            <h4>Biological foraging analogy</h4>
            <p>
              Real ants find the shortest path between nest and food by depositing pheromone as they walk.
              Paths with more pheromone attract more ants, which in turn deposit more pheromone — a positive-feedback
              loop that concentrates traffic on the shortest route. Evaporation ensures suboptimal trails fade.
              ACO lifts this behaviour into an algorithm for combinatorial problems such as the Travelling Salesman Problem.
            </p>
          </div>
          <div className="theory-item">
            <h4>Real ants</h4>
            <p>Initial paths are random. Food-bearing routes get marked with pheromone. Shorter routes receive reinforcement faster because ants complete round-trips quicker, which biases future ants toward them.</p>
          </div>
          <div className="theory-item">
            <h4>Artificial ants</h4>
            <p>Each ant constructs a complete tour using a probabilistic rule. After each iteration pheromones evaporate and new deposits accumulate in proportion to tour quality (shorter = more pheromone).</p>
          </div>
        </div>
      </Section>

      <Section title="Ant System (AS)" subtitle="Dorigo 1992 — every ant deposits pheromone each iteration">
        <div className="theory-grid">
          <div className="theory-item full-width">
            <h4>Pheromone update</h4>
            <p>All m ants that built a tour during the iteration contribute to the update. Evaporation is applied first, then every ant's contribution is accumulated.</p>
            <div className="formula">τ_ij  =  Σ_{"{k=1..m}"} Δτ_ij^k                              (without evaporation)</div>
            <div className="formula">τ_ij  =  (1 − ρ) · τ_ij  +  Σ_{"{k=1..m}"} Δτ_ij^k          (with evaporation)</div>
            <div className="formula">
              Δτ_ij^k  =  Q / L_k    if ant k used edge (i, j) in its tour<br />
              Δτ_ij^k  =  0          otherwise
            </div>
            <p style={{ marginTop: 12 }}>
              Q is a constant (typically 1), L_k is the length of ant k's tour, ρ ∈ (0, 1] is the evaporation rate.
            </p>
          </div>
          <div className="theory-item full-width">
            <h4>Edge selection probability</h4>
            <p>Ant k, currently at city i, picks next city j from the unvisited set using:</p>
            <div className="formula">P_ij  =  (τ_ij^α · η_ij^β) / Σ_{"{u ∈ allowed}"} (τ_iu^α · η_iu^β)</div>
            <div className="formula">η_ij  =  1 / L_ij          (heuristic visibility — reciprocal of edge length)</div>
            <p style={{ marginTop: 12 }}>
              α controls the weight of pheromone, β the weight of heuristic information.
              α = 0 yields a pure greedy nearest-neighbour search; β = 0 makes the algorithm pheromone-only.
            </p>
          </div>
          <div className="theory-item full-width">
            <h4>Algorithm</h4>
            <div className="algorithm">
              <p><strong>initialize</strong>  τ_ij = τ_0  for all edges (i, j)</p>
              <p><strong>for</strong> each iteration:</p>
              <p className="indent1"><strong>for</strong> k = 1 ... m:</p>
              <p className="indent2">place ant k on a random city</p>
              <p className="indent2">construct tour T_k  using P_ij</p>
              <p className="indent2">compute length L_k</p>
              <p className="indent1"><strong>for</strong> each edge (i, j):  τ_ij ← (1 − ρ) · τ_ij</p>
              <p className="indent1"><strong>for</strong> k = 1 ... m:</p>
              <p className="indent2"><strong>for</strong> each edge (i, j) ∈ T_k:  τ_ij ← τ_ij + Q / L_k</p>
              <p><strong>return</strong> best tour found</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Max-Min Ant System (MMAS)" subtitle="Stützle and Hoos 2000 — only the best ant deposits, τ is bounded">
        <div className="theory-grid">
          <div className="theory-item full-width">
            <h4>Pheromone update — best-ant-only, clamped</h4>
            <div className="formula">τ_ij  ←  [ (1 − ρ) · τ_ij  +  Δτ_ij^best ]_{"{τ_min}"}^{"{τ_max}"}</div>
            <div className="formula">
              Δτ_ij^best  =  1 / L_best    if (i, j) belongs to the best tour<br />
              Δτ_ij^best  =  0             otherwise
            </div>
            <p style={{ marginTop: 12 }}>
              The operator [ x ]_{"{a}"}^{"{b}"} clamps x to the interval [a, b]. Clamping prevents any single edge from dominating and preserves exploration.
            </p>
          </div>
          <div className="theory-item full-width">
            <h4>Pheromone bounds</h4>
            <div className="formula">τ_max  =  1 / (ρ · L_best)</div>
            <div className="formula">τ_min  =  τ_max / (2n)</div>
            <p style={{ marginTop: 12 }}>
              Bounds are updated each iteration from the current best-so-far tour length. Initial pheromone is set to τ_max on every edge to encourage wide exploration during early iterations.
            </p>
          </div>
          <div className="theory-item full-width">
            <h4>Algorithm</h4>
            <div className="algorithm">
              <p><strong>initialize</strong>  τ_ij = τ_max  for all edges</p>
              <p><strong>for</strong> each iteration:</p>
              <p className="indent1"><strong>for</strong> k = 1 ... m:</p>
              <p className="indent2">construct tour T_k, compute L_k</p>
              <p className="indent1">(T_best, L_best) ← best over all iterations so far</p>
              <p className="indent1"><strong>for</strong> each edge (i, j):  τ_ij ← (1 − ρ) · τ_ij</p>
              <p className="indent1"><strong>for</strong> each edge (i, j) ∈ T_best:  τ_ij ← τ_ij + 1 / L_best</p>
              <p className="indent1">τ_max ← 1 / (ρ · L_best);   τ_min ← τ_max / (2n)</p>
              <p className="indent1"><strong>clamp</strong>  τ_ij to [τ_min, τ_max]</p>
              <p><strong>return</strong> best tour found</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="AS vs MMAS" subtitle="Quick comparison">
        <table className="theory-table">
          <thead>
            <tr>
              <th>Aspect</th>
              <th>Ant System (AS)</th>
              <th>Max-Min Ant System (MMAS)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Pheromone deposit</td><td>All m ants deposit</td><td>Only best-so-far ant deposits</td></tr>
            <tr><td>Initial pheromone</td><td>τ_0 = 1 / (n · L_nn)</td><td>τ_max  (explicitly maximum)</td></tr>
            <tr><td>Pheromone bounds</td><td>None</td><td>τ ∈ [τ_min, τ_max]</td></tr>
            <tr><td>Exploration vs exploitation</td><td>Exploitative, fast convergence</td><td>Balanced, resists stagnation</td></tr>
            <tr><td>Risk</td><td>Premature convergence to local optima</td><td>Slower early progress</td></tr>
            <tr><td>Time complexity</td><td>O(iter · m · n²)</td><td>O(iter · m · n²)</td></tr>
          </tbody>
        </table>
      </Section>
    </>
  );
}



function NetworkSection() {
  const [graph, setGraph] = useState(null);
  const [size, setSize] = useState(6);
  const [generating, setGenerating] = useState(false);

  const fetchGraph = () => {
    apiFetch('/graph').then(setGraph).catch(err => {
      console.error("Failed to load graph", err);
    });
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await apiFetch('/generate-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size })
      });
      fetchGraph();
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
    setGenerating(false);
  };

  if (!graph) {
    return (
      <Section title="TSP Network" subtitle="Loading graph from backend...">
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Failed to load data from backend</div>
      </Section>
    );
  }
  return (
    <Section title="TSP Network" subtitle={`Complete graph on ${graph.nodes.length} cities. Edge labels show distances L_ij.`}>
      <div className="controls-row" style={{ marginBottom: 20, alignItems: 'center' }}>
        <div className="control-group" style={{ flex: 'none', width: '220px', marginBottom: 0 }}>
          <label style={{ marginBottom: 8 }}>Graph Size (Nodes) <strong>{size}</strong></label>
          <input type="range" min="3" max="20" step="1" value={size} onChange={e => setSize(+e.target.value)} />
        </div>
        <button className="btn-sm" onClick={handleGenerate} disabled={generating} style={{ height: '36px' }}>
          {generating ? <span className="spinner spinner-light" style={{ width: 14, height: 14, display: 'inline-block' }} /> : 'Generate New Graph'}
        </button>
      </div>
      <div className="graph-legend">
        <div className="legend-item"><span className="legend-dot" style={{ background: '#ffffff' }} /> City</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: 'rgba(255,255,255,0.25)' }} /> Edge (distance labelled)</div>
      </div>
      <svg viewBox="0 0 900 460" width="100%" className="graph-canvas">
        {graph.edges.map((e, i) => {
          const srcNode = graph.nodes[e.source];
          const tgtNode = graph.nodes[e.target];
          return (
            <g key={i} className="edge-group">
              <line x1={srcNode.x} y1={srcNode.y} x2={tgtNode.x} y2={tgtNode.y} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
              <text x={(srcNode.x + tgtNode.x) / 2} y={(srcNode.y + tgtNode.y) / 2 - 3} fontSize="11" fill="#6b7280" textAnchor="middle">{e.weight}</text>
            </g>
          );
        })}
        {graph.nodes.map((n) => {
          return (
            <g key={n.id} className="node-group" style={{ animationDelay: `${n.id * 30}ms` }}>
              <circle cx={n.x} cy={n.y} r={22} fill="#ffffff" stroke="#ffffff" strokeWidth="2" />
              <text x={n.x} y={n.y} fontSize="14" fill="#000" textAnchor="middle" dominantBaseline="middle" fontWeight="700">{n.label}</text>
              <text x={n.x} y={n.y + 38} fontSize="11" fill="#a3a3a3" textAnchor="middle">id: {n.id}</text>
            </g>
          );
        })}
      </svg>
    </Section>
  );
}

function MatricesSection() {
  const [active, setActive] = useState('distance');
  const [data, setData] = useState(null);

  const types = [
    { id: 'distance',       label: 'Distance L_ij' },
    { id: 'heuristic',      label: 'Heuristic η_ij' },
    { id: 'initial',        label: 'Initial τ₀' },
    { id: 'pheromone-as',   label: 'Final τ (AS)' },
    { id: 'pheromone-mmas', label: 'Final τ (MMAS)' },
  ];

  useEffect(() => {
    setData(null);
    apiFetch(`/matrix/${active}`).then(setData).catch(err => {
      console.error(`Failed to load matrix: ${active}`, err);
    });
  }, [active]);

  let stats = { dims: '—', density: '—', trace: '—', max: '—' };
  if (data) {
    const M = data.matrix;
    const n = M.length;
    let nz = 0, mx = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (M[i][j] !== 0) nz++;
      if (Math.abs(M[i][j]) > mx) mx = Math.abs(M[i][j]);
    }
    const trace = M.reduce((s, row, i) => s + row[i], 0);
    stats = {
      dims: `${n} × ${n}`,
      density: `${(100 * nz / (n * n)).toFixed(1)}%`,
      trace: trace.toFixed(3),
      max: mx.toFixed(3),
    };
  }

  const fmt = (v) => {
    if (typeof v !== 'number') return v;
    if (Number.isInteger(v)) return v;
    return v.toFixed(4);
  };

  return (
    <Section title="Matrix Views" subtitle="Distance, heuristic, and learned pheromone matrices">
      <div className="pill-tabs">
        {types.map(t => (
          <button key={t.id} className={`pill-tab ${active === t.id ? 'active' : ''}`}
            onClick={() => setActive(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="results-grid">
        <div className="result-card"><div className="label">Dimensions</div><div className="value">{stats.dims}</div></div>
        <div className="result-card"><div className="label">Non-zero density</div><div className="value">{stats.density}</div></div>
        <div className="result-card"><div className="label">Trace</div><div className="value">{stats.trace}</div></div>
        <div className="result-card"><div className="label">Max |v|</div><div className="value">{stats.max}</div></div>
      </div>
      {data ? (
        <div className="matrix-wrapper">
          <table className="matrix-table">
            <thead>
              <tr>
                <th></th>
                {data.labels.map(l => <th key={l}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((row, i) => (
                <tr key={i}>
                  <td>{data.labels[i]}</td>
                  {row.map((v, j) => (
                    <td key={j} className={v !== 0 ? 'nonzero' : ''}>{fmt(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading matrix...</div>}
    </Section>
  );
}

function SimulationSection() {
  const [algo, setAlgo] = useState('as');
  const [alpha, setAlpha] = useState(1.0);
  const [beta, setBeta] = useState(2.0);
  const [rho, setRho] = useState(0.5);
  const [Q, setQ] = useState(1.0);
  const [m, setM] = useState(10);
  const [iters, setIters] = useState(50);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState(['A', 'B', 'C', 'D', 'E', 'F']);

  useEffect(() => {
    apiFetch('/graph').then(g => setLabels(g.nodes.map(n => n.label))).catch(() => {});
  }, []);

  const run = async () => {
    setLoading(true);
    try {
      const endpoint = algo === 'as' ? '/run-as' : '/run-mmas';
      const body = algo === 'as'
        ? { alpha, beta, rho, Q, m, iterations: iters, seed: 42 }
        : { alpha, beta, rho, m, iterations: iters, seed: 42 };
      
      const data = await apiFetch(endpoint, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setResult(data);
    } catch (e) { 
      console.error("Simulation failed", e);
      alert(e.message);
    }
    setLoading(false);
  };

  const tourStr = result
    ? [...result.best_tour, result.best_tour[0]].map(i => labels[i]).join(' → ')
    : '';

  return (
    <Section title="Simulation" subtitle="Run a single algorithm with chosen hyperparameters">
      <div className="pill-tabs">
        <button className={`pill-tab ${algo === 'as' ? 'active' : ''}`} onClick={() => setAlgo('as')}>Ant System</button>
        <button className={`pill-tab ${algo === 'mmas' ? 'active' : ''}`} onClick={() => setAlgo('mmas')}>Max-Min AS</button>
      </div>

      <div className="controls-row">
        <div className="control-group">
          <label>α (pheromone weight) <strong>{alpha.toFixed(2)}</strong></label>
          <input type="range" min="0.1" max="5" step="0.1" value={alpha} onChange={e => setAlpha(+e.target.value)} />
          <div className="range-labels"><span>0.1</span><span>5.0</span></div>
        </div>
        <div className="control-group">
          <label>β (heuristic weight) <strong>{beta.toFixed(2)}</strong></label>
          <input type="range" min="0.1" max="5" step="0.1" value={beta} onChange={e => setBeta(+e.target.value)} />
          <div className="range-labels"><span>0.1</span><span>5.0</span></div>
        </div>
        <div className="control-group">
          <label>ρ (evaporation) <strong>{rho.toFixed(2)}</strong></label>
          <input type="range" min="0.05" max="0.95" step="0.05" value={rho} onChange={e => setRho(+e.target.value)} />
          <div className="range-labels"><span>0.05</span><span>0.95</span></div>
        </div>
      </div>

      <div className="controls-row">
        {algo === 'as' && (
          <div className="control-group">
            <label>Q (deposit constant) <strong>{Q.toFixed(2)}</strong></label>
            <input type="range" min="0.1" max="5" step="0.1" value={Q} onChange={e => setQ(+e.target.value)} />
            <div className="range-labels"><span>0.1</span><span>5.0</span></div>
          </div>
        )}
        <div className="control-group">
          <label>m (ants) <strong>{m}</strong></label>
          <input type="range" min="1" max="30" step="1" value={m} onChange={e => setM(+e.target.value)} />
          <div className="range-labels"><span>1</span><span>30</span></div>
        </div>
        <div className="control-group">
          <label>iterations <strong>{iters}</strong></label>
          <input type="range" min="10" max="300" step="10" value={iters} onChange={e => setIters(+e.target.value)} />
          <div className="range-labels"><span>10</span><span>300</span></div>
        </div>
      </div>

      <button className="btn-primary" onClick={run} disabled={loading}>
        {loading ? <span className="spinner" /> : null}
        {loading ? 'Running...' : `Run ${algo === 'as' ? 'Ant System' : 'Max-Min AS'}`}
      </button>

      {result && (
        <>
          <div className="results-grid" style={{ marginTop: 28 }}>
            <div className="result-card"><div className="label">Best cost</div><div className="value">{result.best_cost}</div></div>
            <div className="result-card"><div className="label">Iterations</div><div className="value">{result.convergence.length}</div></div>
            <div className="result-card"><div className="label">Time</div><div className="value">{result.time_ms}</div><div className="unit">ms</div></div>
            {result.tau_max !== undefined && (
              <>
                <div className="result-card"><div className="label">τ_max</div><div className="value">{result.tau_max}</div></div>
                <div className="result-card"><div className="label">τ_min</div><div className="value">{result.tau_min}</div></div>
              </>
            )}
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Best tour</div>
            <div className="formula">{tourStr}</div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={result.convergence}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="iteration" stroke="#64748b" minTickGap={25} tickMargin={10} />
                <YAxis stroke="#64748b" tickMargin={10} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="cost" name="best cost" stroke="#ffffff" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Section>
  );
}

function CompareSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState(['A', 'B', 'C', 'D', 'E', 'F']);

  useEffect(() => {
    apiFetch('/graph').then(g => setLabels(g.nodes.map(n => n.label))).catch(() => {});
  }, []);

  const run = async () => {
    setLoading(true);
    const params = { alpha: 1, beta: 2, rho: 0.5, m: 10, iterations: 100, seed: 42 };
    try {
      const [as_, mmas_] = await Promise.all([
        apiFetch('/run-as', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ ...params, Q: 1.0 }) 
        }),
        apiFetch('/run-mmas', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(params) 
        }),
      ]);
      setData({ as: as_, mmas: mmas_ });
    } catch (e) { 
      console.error("Comparison failed", e);
    }
    setLoading(false);
  };

  useEffect(() => { run(); }, []);

  const merged = data
    ? data.as.convergence.map((p, i) => ({
        iteration: p.iteration,
        AS: p.cost,
        MMAS: data.mmas.convergence[i] ? data.mmas.convergence[i].cost : null,
      }))
    : [];

  const tourStr = (t) => [...t, t[0]].map(i => labels[i]).join(' → ');

  return (
    <Section title="AS vs MMAS" subtitle="Both algorithms on the same TSP instance, same seed, 100 iterations">
      <button className="btn-primary" onClick={run} disabled={loading}>
        {loading ? <span className="spinner" /> : null}
        {loading ? 'Running both...' : 'Re-run comparison'}
      </button>
      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 28, marginBottom: 24 }}>
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: 12, fontWeight: 600 }}>Ant System</h4>
              <div className="results-grid" style={{ marginBottom: 16 }}>
                <div className="result-card"><div className="label">Best cost</div><div className="value">{data.as.best_cost}</div></div>
                <div className="result-card"><div className="label">Time</div><div className="value">{data.as.time_ms}</div><div className="unit">ms</div></div>
              </div>
              <div className="formula">{tourStr(data.as.best_tour)}</div>
            </div>
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: 12, fontWeight: 600 }}>Max-Min AS</h4>
              <div className="results-grid" style={{ marginBottom: 16 }}>
                <div className="result-card"><div className="label">Best cost</div><div className="value">{data.mmas.best_cost}</div></div>
                <div className="result-card"><div className="label">Time</div><div className="value">{data.mmas.time_ms}</div><div className="unit">ms</div></div>
              </div>
              <div className="formula">{tourStr(data.mmas.best_tour)}</div>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={merged}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="iteration" stroke="#64748b" minTickGap={25} tickMargin={10} />
                <YAxis stroke="#64748b" tickMargin={10} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="AS" stroke="#ffffff" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="MMAS" stroke="#6b7280" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <table className="theory-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Ant System</th>
                <th>Max-Min AS</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Best cost</td>
                <td>{data.as.best_cost}</td>
                <td>{data.mmas.best_cost}</td>
                <td>{data.as.best_cost === data.mmas.best_cost ? 'tie' : (data.as.best_cost < data.mmas.best_cost ? 'AS' : 'MMAS')}</td>
              </tr>
              <tr>
                <td>Runtime</td>
                <td>{data.as.time_ms} ms</td>
                <td>{data.mmas.time_ms} ms</td>
                <td>{data.as.time_ms <= data.mmas.time_ms ? 'AS' : 'MMAS'}</td>
              </tr>
              <tr>
                <td>Time complexity</td>
                <td>O(iter · m · n²)</td>
                <td>O(iter · m · n²)</td>
                <td>tie</td>
              </tr>
              <tr>
                <td>Exploration</td>
                <td>lower</td>
                <td>higher (bounded τ)</td>
                <td>MMAS</td>
              </tr>
              <tr>
                <td>Risk of stagnation</td>
                <td>higher</td>
                <td>lower</td>
                <td>MMAS</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </Section>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <span className="footer-copy">© Viraj Choudhary</span>
      <div className="footer-links">
        <a href="https://github.com/virajchoudhary" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="https://www.linkedin.com/in/virajchoudhary" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a href="https://x.com/virajchoudhary_" target="_blank" rel="noopener noreferrer">Twitter</a>
        <a href="mailto:virajc188@gmail.com">Email</a>
      </div>
    </footer>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('theory');
  const tabs = [
    { id: 'theory',   label: 'Theory' },
    { id: 'network',  label: 'Network' },
    { id: 'matrices', label: 'Matrices' },
    { id: 'simulate', label: 'Simulate' },
    { id: 'compare',  label: 'Compare' },
  ];
  const content = {
    theory:   <TheorySection />,
    network:  <NetworkSection />,
    matrices: <MatricesSection />,
    simulate: <SimulationSection />,
    compare:  <CompareSection />,
  };

  return (
    <div className="app-layout">
      <nav className="sidebar">
        {tabs.map(t => (
          <button key={t.id} className={`sidebar-item ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </nav>
      <main className="main-content">
        <header className="app-header">
          <h1>Trail Optimizer</h1>
          <p>Ant Colony Optimization Engine for the Travelling Salesman Problem</p>
        </header>
        {content[activeTab]}
        <Footer />
      </main>
    </div>
  );
}
