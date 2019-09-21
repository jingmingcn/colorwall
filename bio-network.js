
$(function(){
	var columns = null;
	var nodes = [], edges = [];
	var nodesMap = d3.map();
	var edgesMap = d3.map();
	var data;

	var margin = {top: -5, right: -5, bottom: -5, left: -5};
	var window_width = $(window).width(),
		window_height = $(window).height();

	var force  = d3.layout.forceInABox()
				.size([window_width, window_height])
				.treemapSize([window_width, window_height])
				.enableGrouping(true)
				.linkDistance(150)
				.gravityOverall(0.001)
				.linkStrengthInsideCluster(0.3)
				.linkStrengthInterCluster(0.05)
				.gravityToFoci(0.35)
				.charge(-200);

	d3.csv('TCGA_GBM_GENEDATA_01_20190711.csv',function(error,rawdata){
		if(error) throw error;

		if(columns==null){
			columns=Object.keys(rawdata[0]);
			columns=columns.slice(1); //Optional - to remove columns you dont need
			columns.forEach(function(field){
				nodesMap.set(field,{id:field,name:field,value:0});
			});
		}
		console.log(columns.length);
		console.log(rawdata.length);

		console.time("rawdata loop")
		rawdata.forEach(function(d){
			columns.forEach(function(k1){
				columns.forEach(function(k2){
					if(k1!=k2 & d[k1]===1 & d[k2]===1){
						node1 = nodesMap.get(k1);
						node2 = nodesMap.get(k2);
						node1.value += 1;
						node2.value += 1;
						var key = k1<k2 ? k1 + "|" + k2 : k2 + "|" + k1;
						console.log(key);
						if(!edgesMap.has(key)){
							edgesMap.set(key,0);
						}
						edgesMap.set(key,edgesMap.get(key)++);
					}
				});
			});
		});
		console.timeEnd("rawdata loop");

		console.log(edgesMap.length);

		nodesMap.entries().map(function(d){
			if(nodes.indexOf(d.key)==-1){
				nodes.push(d);
			}
		});

		edges = edgesMap.entries().filter(function(element,index,array){
			return element.value >= 500;
		})
		.map(function(d){
			var t1,t2;
	        t1 = d.key.split("|")[0];
			t2 = d.key.split("|")[1];
			node1 = nodesMap.get(t1);
			node2 = nodesMap.get(t2);
			return {
	            source:node1.value<node2.value?node1:node2,
	            target:node1.value<node2.value?node2:node1,
	            value:d.value
	        };
		});

		data =  {"nodes":nodes, "links":edges};
		netClustering.cluster(data.nodes, data.links);

		console.log(data.nodes);

		svg = d3.select("body")
			.append("svg").attr("class","svg_main")
			.attr("width",window_width)
			.attr("height",window_height)
			.append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.right + ")")
		    .call(zoom);

		container = svg.append("g").attr("id","container");

		//links = container.selectAll(".link").data(data.links).enter().insert("path").attr("class","link");
		nodes = container.selectAll(".node").data(data.nodes).enter().append("circle","svg").attr("class","node")
			.attr("r",function(d){
				return 10;
			})
			.style('stroke-width',1)
			.style('fill',function(d){
				return "#fff";
			});

		force.stop();
		force
		    .nodes(data.nodes)
		    .links(data.links)
		    .enableGrouping(true)
		    .on("tick", ticked)
		    .on("end",end)
			.start();
		
		
	});

	var zoom = d3.behavior.zoom()
		.scaleExtent([0.1, 10])
		.on("zoom", function() {
			container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		});

	var ticked = function(e){

			force.onTick(e);

			nodes.attr("cx", function(d) { return d.x ;})
				.attr("cy", function(d) { return d.y ;});
			

	};

	var end = function(e){

	};
});