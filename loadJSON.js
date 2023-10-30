d3.json("bootstrapComponentsHierarchy.json").then((data) => {
  // Define the dimensions of your visualization
  const width = 1000;
  const height = 600;

  // Create an SVG container
  const svg = d3
    .select("#tree-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Create a hierarchical layout
  const root = d3.hierarchy(data);
  const treeLayout = d3.tree().size([width, height - 200]);
  treeLayout(root);

  // Draw links (lines connecting nodes)
  svg
    .selectAll(".link")
    .data(root.links())
    .enter()
    .append("line")
    .classed("link", true)
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);

  // Draw nodes
  const nodes = svg
    .selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

  nodes.append("circle").attr("r", 4);

  nodes
    .append("text")
    .attr("dy", -10)
    .attr("text-anchor", "middle")
    .text((d) => path.basename(d.data.name)); // Display only the file or directory name
});
