// ph_animator.js (Updated with auto-scaling + better barcode)

const WIDTH = 500;
const HEIGHT = 500;
let points = [];
let radius = 0.0;
let currentData = "circle";
let barcodeData = [];

// Disjoint Set (Union-Find)
function DisjointSet(n) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (i, j) => { parent[find(i)] = find(j); };
  return { find, union, parent };
}

// Load Data
function loadData(dataset = "circle") {
  const fileMap = {
    circle: "./data/circle_points.json",
    clusters: "./data/two_clusters.json"
  };
  d3.json(fileMap[dataset]).then(data => {
    // Auto scaling to fit SVG
    const xExtent = d3.extent(data, d => d[0]);
    const yExtent = d3.extent(data, d => d[1]);
    const xScale = d3.scaleLinear().domain(xExtent).range([50, WIDTH - 50]);
    const yScale = d3.scaleLinear().domain(yExtent).range([HEIGHT - 50, 50]);

    points = data.map(([x, y], i) => ({ id: i, x: xScale(x), y: yScale(y) }));
    computeBarcode();
    draw(radius);
  });
}

function draw(r) {
  d3.select("#pointcloud").selectAll("*").remove();
  const svg = d3.select("#pointcloud");

  // Edges
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (d < r * 200) {
        svg.append("line")
          .attr("x1", points[i].x)
          .attr("y1", points[i].y)
          .attr("x2", points[j].x)
          .attr("y2", points[j].y)
          .attr("stroke", "#00ffff")
          .attr("stroke-width", 1.2);
      }
    }
  }

  svg.selectAll(".ball")
    .data(points)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", r * 100)
    .attr("fill", "#00ffff")
    .attr("fill-opacity", 0.1);

  svg.selectAll(".dot")
    .data(points)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 5)
    .attr("fill", "white");

  drawBarcode(r);
}

function computeBarcode() {
  const edges = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) / 200;
      edges.push({ i, j, dist });
    }
  }
  edges.sort((a, b) => a.dist - b.dist);

  const ds = DisjointSet(points.length);
  const birth = new Map();
  for (let i = 0; i < points.length; i++) birth.set(i, 0);
  barcodeData = [];

  for (const { i, j, dist } of edges) {
    const a = ds.find(i);
    const b = ds.find(j);
    if (a !== b) {
      barcodeData.push({ birth: birth.get(a), death: dist });
      ds.union(a, b);
    }
  }

  const remaining = new Set(ds.parent.map(ds.find));
  for (const rep of remaining) {
    barcodeData.push({ birth: birth.get(rep), death: 1.0 });
  }
}

function drawBarcode(currentR) {
  const svg = d3.select("#barcode");
  svg.selectAll("*").remove();

  const margin = { top: 20, right: 10, bottom: 20, left: 40 };
  const width = 400 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
  const y = d3.scaleBand().domain(d3.range(barcodeData.length)).range([0, height]).padding(0.3);

  const color = d3.scaleSequential(d3.interpolateCool).domain([0, barcodeData.length]);

  g.selectAll("line")
    .data(barcodeData)
    .enter()
    .append("line")
    .attr("x1", d => x(d.birth))
    .attr("x2", d => x(Math.min(d.death, currentR)))
    .attr("y1", (_, i) => y(i) + (Math.random() * 2 - 1) * 2) // jitter
    .attr("y2", (_, i) => y(i) + (Math.random() * 2 - 1) * 2)
    .attr("stroke", (_, i) => color(i))
    .attr("stroke-width", 4)
    .append("title")
    .text(d => `Birth: ${d.birth.toFixed(2)}, Death: ${d.death.toFixed(2)}`);
}

d3.select("#radius").on("input", function () {
  radius = +this.value;
  d3.select("#radius-label").text(radius.toFixed(2));
  draw(radius);
});

d3.select("#circleBtn").on("click", () => {
  currentData = "circle";
  loadData(currentData);
});
d3.select("#clustersBtn").on("click", () => {
  currentData = "clusters";
  loadData(currentData);
});


loadData(currentData);
