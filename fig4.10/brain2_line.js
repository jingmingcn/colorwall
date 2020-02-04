/**
Use d3 v3 version
**/


function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  var separator = uri.indexOf('?') !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + "=" + value + '$2');
  }
  else {
    return uri + separator + key + "=" + value;
  }
}


$(function(){
	var keyword = getParameterByName('keyword');
	var year_from = getParameterByName('year_from');
	var year_to = getParameterByName('year_to');
	var threshold = getParameterByName('threshold');
	var node_r_min = getParameterByName('node_r_min');
	var node_r_max = getParameterByName('node_r_max');
	var link_distance = getParameterByName('link_distance');
	var force_charge = getParameterByName('force_charge');
	var toggle_label = getParameterByName('toggle_label');
	var author_name = getParameterByName('author_name');
	var link_filter = getParameterByName('link_filter');
	var color_sensitivity = getParameterByName('color_sensitivity');
	var toggle_treemap = getParameterByName('toggle_treemap');


	console.log(document.implementation.hasFeature("http://www.w3.org/TR/SVG2/feature#GraphicsAttribute", 2.0));

	var data,mdata;
	const url = "brain_net_2.json";
	const topKeywords = ["visualization", "data", "interactive", "volume", "analysis", "exploring", "rendering", "analytical", "information", "surface"];
	//var keyword = 'temporal,spatial';
	//var keyword = '';

	if (!keyword)		keyword 		= 	'';
	if (!year_from)		year_from 		= 	1990;
	if (!year_to)		year_to 		= 	2016;
	if (!threshold)		threshold 		= 	0;
	if (!node_r_min)	node_r_min 		= 	4;
	if (!node_r_max)	node_r_max 		= 	4;
	if (!link_distance)	link_distance	=	200;
	if (!force_charge)	force_charge	= 	-50;
	if (toggle_label === 'false'){
			toggle_label = false;
	}else{
		toggle_label = true;
	}
	if (!author_name)	author_name		=	'';
	if (!link_filter)	link_filter		=	threshold;
	if (!color_sensitivity)	color_sensitivity	= 	20;

	if (toggle_treemap === 'true'){
		toggle_treemap = true;
	}else{
		toggle_treemap = false;
	}

	console.log(toggle_label);

	var margin = {top: -5, right: -5, bottom: -5, left: -5};
	var window_width = $(window).width(),
		window_height = $(window).height();

	var	preferences = {
		'link_distance': parseInt(link_distance),
		'node_radius_min': parseInt(node_r_min),
		'node_radius_max': parseInt(node_r_max),
		'node_edge_size': 2,
		'force_charge': parseInt(force_charge),
		'toggle_label': toggle_label,
		'year_from':Number.MAX_VALUE,
		'year_to':Number.MIN_VALUE,
		'seq_min':Number.MAX_VALUE,
		'seq_max':Number.MIN_VALUE,
		'seq_size':16,
		'seq_threshold': parseInt(threshold),
		'link_filter': parseInt(link_filter),
		'width':$(window).width()- margin.left - margin.right,
		'height':$(window).height()- margin.top - margin.bottom,
		'keyword':keyword,
		'author_name':author_name,
		'topKeyword':topKeywords[0],
		'filter_year_from':year_from,
		'filter_year_to':year_to,
		'node_name':'',
		'node_value':0,
		'node_rel':0,
		'color_sensitivity': parseInt(color_sensitivity),
		'toggle_treemap': toggle_treemap
	};

	var svg,container;
	var nodes;
	var labels;
	var links;
	var circleCenters;
	var path;
	var paths;
	var area_x_scale;
	var area,area2;
	var simulation;
	var forceLink;
	var forceCenter;
	var forceManyBody;
	var templateNodes = [];
	var gravityToFoci = 0.1;
    var gravityOverall = 0.01;
	var foci = [];
	var template = "treemap";
	var nodeValueMax,nodeValueMin;

	var tooltipInstance;

	var rScale = d3.scale.log().range([4, 20]);
	var labelFontSizeScale = d3.scale.log().range([8,12]);
	var labelOpacityScale = d3.scale.log().range([0.4,.9])
	var yScale = d3.scale.linear().range([preferences['height']-20, 20]);
	var xScale = d3.scale.linear().domain(["a".charCodeAt(0), "z".charCodeAt(0)]).range([0, preferences['width']]);
	//var colScale = d3.schemeCategory20();
	var lOpacity = d3.scale.linear().range([0.1, 0.9]);

	var w = +preferences['width'],
		h = +preferences['height'];

	var force  = d3.layout.forceInABox()
					.size([w-200, (h-50)])
					
					.treemapSize([w-400, (h-50)-200])
					
				    .enableGrouping(true)
				    //.linkStrength(d=>{return d.strength})
				    //.linkDistance(preferences['link_distance'])
				    // .gravityOverall(0.001)
				    // .linkStrengthInsideCluster(0.3)
				    // .linkStrengthInterCluster(0.05)
				    .gravityToFoci(0.3)
					.charge(force_charge);
					
	var voronoi = d3.geom.voronoi()
					.x(function(d) { return d.x; })
					.y(function(d) { return d.y; });
					//.clipExtent([[0, 0], [w, h]]);

	var zoom = d3.behavior.zoom()
	    .scaleExtent([0.1, 10])
	    .on("zoom", zoomed);

	var drag = d3.behavior.drag()
	    .origin(function(d) { return d; })
	    .on("dragstart", dragstarted)
	    .on("drag", dragged)
	    .on("dragend", dragended);

    function zoomed() {
	  container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	}

	var end;
	function dragstarted(d) {
	  d3.event.sourceEvent.stopPropagation();
	  d3.select(this).classed("dragging", true);
	  if(d3.select(this).attr('class') == 'node'){
	  	d3.select(this).classed("fixed", d.fixed = true);
	  	end();
	  }
	  
	}

	function dragged(d) {
	  d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
	  if(d3.select(this).attr('class') == "node"){
	  	end();
	  }
	}

	function dragended(d) {
	  d3.select(this).classed("dragging", false);
	  console.log(d3.select(this).attr('class'))
	  if(d3.select(this).attr('class') == "node"){
	  	end();
	  }
	}

	d3.json(url,function(error,mdata){
		if(error) throw error;
		data = mdata;
	    preferences['seq_size'] = 16;

		netClustering.cluster(data.nodes, data.links);
		console.log(data.nodes[0]);
		data.links = data.links.filter(d=>{
			return data.nodes[d.source].cluster == data.nodes[d.target].cluster;
		});


		var edge_value_scale = d3.scale.linear().range([0,1]).domain([0,d3.max(data.links,function(d){return d.value;})]);
		data.links.forEach(d=>{
			//d.strength = edge_value_scale(d.value);
			//d.value = 10;
		});

		yScale.domain([0, d3.max(data.nodes, function (d) { return d.value; } )]);
		lOpacity.domain(d3.extent(data.links, function (d) { return d.value; } ));

		labelFontSizeScale.domain([d3.min(data.nodes, function (d) { return d.value; } ), d3.max(data.nodes, function (d) { return d.value; } )]);
		labelOpacityScale.domain([d3.min(data.nodes, function (d) { return d.value; } ), d3.max(data.nodes, function (d) { return d.value; } )]);

		app();
	});

	var app = function(){
		
		var edge = preferences['node_edge_size'];

		svg = d3.select("body")
			.append("svg").attr("class","svg_main")
			.attr("width",window_width)
			.attr("height",window_height-50)
			.append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.right + ")")
		    .call(zoom);

		var rect = svg.append("rect")
		    .attr("width", window_width)
		    .attr("height", window_height-50)
		    .style("fill", "none")
		    .style("pointer-events", "all");

		container = svg.append("g").attr("id","container");

		svg_bottom = d3.select("body").append("svg").attr("class","svg_bottom").attr("width",window_width).attr("height",50).attr("top",window_height-50);

		var x = d3.scale.ordinal().rangeBands([0, preferences['link_distance']-preferences['node_radius_min']*2],0.01);
		x.domain(new Array(preferences['seq_size']).fill(0).map(function(currentValue,index,array){return index;}));
		var color = d3.scale.ordinal().range(['#238b45','#444','#E44']).domain([-1,0,1]);

		var sequentialScale = d3v4.scaleSequential(d3v4.interpolateReds).domain([0,preferences['seq_max']]);
		var sequentialScaleNode = d3v4.scaleSequential(d3v4.interpolateSpectral).domain([nodeValueMax,nodeValueMin]);
		//var sequentialScaleNode = d3v4.scaleSequential(d3v4.interpolateSpectral).domain([Math.ceil(nodeValueMax/20)*20,0]);
		//var sequentialScaleNode = d3v4.scaleSequential(d3v4.interpolatePurples).domain([0,Math.ceil(nodeValueMax/20)*20]);
		//var sequentialScale = d3v4.scaleSequential(d3v4.interpolateWarm).domain([0,preferences['seq_max']]);
		svg_bottom.append("g")
			.attr("class", "legendSequential")
			.attr("transform", "translate(5,5)");
			//.attr("transform", "translate("+($(window).width()-300)+","+($(window).height()-40)+")");
		
		svg_bottom.append("g")
			.attr("class", "legendSequentialNode")
			//.attr("transform", "translate(5,5)");
			.attr("transform", "translate("+($(window).width()-680)+",5)");

		// Define the div for the tooltip
		var div = d3.select("body").append("div")	
		    .attr("class", "mytooltip")				
		    .style("opacity", 0);


		var legendSequential = d3.legend.color()
			.labelFormat(x=>Math.round(x))
			.shapeWidth(20)
			.shapeHeight(10)
		    .cells(preferences['seq_max']+1)
		    .orient("horizontal")
		    .scale(sequentialScale);

		var legendSequentialNode = d3.legend.color()
			.labelFormat(x=>Math.round(x))
			.shapeWidth(20)
			.shapeHeight(10)
		    .ascending(true)
		    .cells(nodeValueMax-nodeValueMin<preferences['color_sensitivity']?nodeValueMax-nodeValueMin:preferences['color_sensitivity'])
		    .orient("horizontal")
		    .scale(sequentialScaleNode);

		svg_bottom.select(".legendSequential")
		  .call(legendSequential);

		svg_bottom.select(".legendSequentialNode")
		  .call(legendSequentialNode);

		path = container.selectAll(".area").data(data.links).enter().append('g').attr("class","area")
			.attr("display",function(d,i){
				if(d.value>=link_filter){
					return 'inline';
				}else{
					return 'none';
				}
			})
			.each(function(d,i){
				ld = d;
				d3.select(this).selectAll('.rect0').data(d.seq[0]).enter().insert('rect').attr('class','rect0')
					.attr('x',function(d,i){return 0;})
					.attr('y',function(d,i){return 0;})
					//.attr("width", x.rangeBand())
					//.attr("height", 10)
					.attr('fill',function(d,i){return color(d);})
					.style('opacity',function(d,i){
						if(d==0){
							return 0.5;
						}else{
							return 1;
						}
					})
					//.attr('fill',function(d,i){return sequentialScale(preferences['seq_max']-d);})
					//.attr('stroke',function(d,i){return color(d/preferences['seq_max']);});
					;
				d3.select(this).selectAll('.rect1').data(d.seq[1]).enter().insert('rect').attr('class','rect1')
					.attr('x',function(d,i){return 0;})
					.attr('y',function(d,i){return 0;})
					//.attr("width", x.rangeBand())
					//.attr("height", 10)
					.attr('fill',function(d,i){return color(d);})
					.style('opacity',function(d,i){
						if(d==0){
							return 0.5;
						}else{
							return 1;
						}
					})
					//.attr('fill',function(d,i){return sequentialScale(preferences['seq_max']-d);})
					//.attr('stroke',function(d,i){return color(d/preferences['seq_max']);});
					;
			});

		

		links = container.selectAll(".link").data(data.links).enter().insert("path").attr("class","link");
		labels = container.selectAll('.label_')
			.data(data.nodes).enter().append('text').attr('class','label_')
			.text(function(d,i){return d.name;}).style('z-index',1)
			.attr('font-size',function(d){
					return labelFontSizeScale(d.value)+'px';
				})
			.attr('opacity',function(d){
					return labelOpacityScale(d.value);
				});
		nodes = container.selectAll(".node").data(data.nodes).enter().append("circle","svg").attr("class","node")
			//.attr("r",preferences['node_radius'])
			.attr("r",4)
			// .attr("r",function(d){
			// 	return rScale(d.value);
			// })
			.style('stroke-width',0)
			.style('fill',function(d){
				//return sequentialScaleNode(d.value);
			});
		
		circleCenters = container.selectAll('.circleCenter').data(data.links).enter().insert('circle').attr('class','circleCenter').attr('r',0).style('stroke-width','0px');

		force.stop();
		force
		    .nodes(data.nodes)
		    .links(data.links)
		    .on("tick", ticked)
		    .on("end",end)
		    .start();

		//var drag = force.drag().on("dragstart", dragstart);
		container.selectAll(".node").on("dblclick", dblclick).call(drag);

		//force.drawTreemap(svg);

		var gui = new dat.GUI();
		var layout_folder = gui.addFolder('Layout Preferences');
		layout_folder.add(preferences,'toggle_label').name('Toggle Label').onFinishChange(function(value){
			console.log(value);
				uri = window.location.href;
				uri = updateQueryStringParameter(uri, 'toggle_label', value.toString());
				window.history.pushState(null,'',uri);

			if(value){
				labels.attr('opacity',function(d){
					return labelOpacityScale(d.value);
				});
			}else{
				labels.attr('opacity',function(d){
					return 0;
				});
			}
		});

		layout_folder.add(preferences,'toggle_treemap').name('Toggle TreeMap').onFinishChange(function(value){
			uri = window.location.href;
			uri = updateQueryStringParameter(uri, 'toggle_treemap', value.toString());
			window.history.pushState(null,'',uri);

			if(value){
				force.drawTreemap(container);
			}else{
				force.deleteTreemap(container);
			}
		});
		
		layout_folder.add(preferences,'link_distance',50,200).step(10).name('Link Distance').onFinishChange(function(value){
			if(value!=link_distance){
				uri = window.location.href;
				window.location.href = updateQueryStringParameter(uri, 'link_distance', value);
			}
		});
		layout_folder.add(preferences,'force_charge',-900,-100).step(-10).name('Force Charge').onFinishChange(function(value){
			if(value!=force_charge){
				uri = window.location.href;
				window.location.href = updateQueryStringParameter(uri, 'force_charge', value);
			}
		});
		layout_folder.add(preferences,'node_radius_min',1,10).step(1).name('Node R. Min').onFinishChange(function(value){
			if(value!=node_r_min){
				uri = window.location.href;
				window.location.href = updateQueryStringParameter(uri, 'node_r_min', value);
			}
		});
		layout_folder.add(preferences,'node_radius_max',10,40).step(1).name('Node R. Max').onFinishChange(function(value){
			if(value!=node_r_max){
				uri = window.location.href;
				window.location.href = updateQueryStringParameter(uri, 'node_r_max', value);
			}
		});
		

		var dataset_folder = gui.addFolder('Dataset Statistics');
		
		dataset_folder.add(preferences,'year_from',1990,2016).step(1).name('(Year) From').listen().onFinishChange(function(value){
			if(value!=year_from){
				uri = window.location.href;
				window.location.href = updateQueryStringParameter(uri, 'year_from', value);
			}
			
		});
		dataset_folder.add(preferences,'year_to',1990,2016).step(1).name('(Year) To').listen().onFinishChange(function(value){
			if(value!=year_to){
				uri = window.location.href;
				window.location.href = updateQueryStringParameter(uri, 'year_to', value);
			}		
		});
		//dataset_folder.add(preferences,'seq_size').name('(Seq) Size').listen();
		//dataset_folder.add(preferences,'seq_max').name('(Seq) Maximum').listen();
		//dataset_folder.add(preferences,'seq_min').name('(Seq) Minimum').listen();
		dataset_folder.add(preferences,'seq_threshold',1,20).step(1).name('(Seq) Threshold').listen().onFinishChange(function(value){
			if(value!=threshold){
				uri = window.location.href;
				window.location.href = updateQueryStringParameter(uri, 'threshold', value);
			}
		});
		dataset_folder.add(preferences,'link_filter',1,20).step(1).name('Link Filter').listen().onFinishChange(function(value){
			if(value!=link_filter){
				uri = window.location.href;
				window.location.href = updateQueryStringParameter(uri, 'link_filter', value);
			}
		});
		dataset_folder.add(preferences,'color_sensitivity',10,30).step(1).name('Color Sensitivity').listen().onFinishChange(function(value){
			if(value!=color_sensitivity){
				uri = window.location.href;
				window.location.href = updateQueryStringParameter(uri, 'color_sensitivity', value);
			}
		});

		layout_folder.open();
		dataset_folder.open();

		/**
		var bar =  d3.selectAll("svg").append("g").attr("id","colorbar");
		var filling = d3.scale.quantile()
		    .domain([0,9])
		    .range(["#fff5f0","#fee0d2","#fcbba1","#fc9272","#fb6a4a","#ef3b2c","#cb181d","#a50f15","#67000d"])
	    
		var colorbar = Colorbar()
			.origin([$(window).width()-300,$(window).height()-50])
			.scale(filling)
			.barlength(300)
			.thickness(20)
			.orient("horizontal");
		d3.selectAll("#colorbar") .transition().duration(700) .call(colorbar);
		**/

		/**
		image = svg.append('image').attr('xlink:href','keywords.png').attr('x',20).attr('y',40).attr('width',800).style('display','none');

		svg.append('text').text('SHOW KEYWORDS').attr('class','showKeywordBtn').attr('dx',20).attr('dy',20).on('click',function(){
			// bootbox.dialog({
			//     message: '<p class="text-center"><img width="800" src="keywords.png"/></p>',
			//     closeButton: true
			// });
			image.style('display') == 'none'?image.style('display','block'):image.style('display','none');

		});
		**/

	}

	
	var innerLinePostion = function(d){
		var x1 = d.source.x,
			y1 = d.source.y,
			x2 = d.target.x,
			y2 = d.target.y,
			l  = Math.sqrt(Math.pow(y2-y1,2)+Math.pow(x2-x1,2));
			l_  = preferences['node_radius_min']/1 + preferences['edge_size']/1;
		var x1_ = x1 + l_*(x2-x1)/l,
			y1_ = y1 + l_*(y2-y1)/l,
			x2_ = x2 + l_*(x1-x2)/l,
			y2_ = y2 + l_*(y1-y2)/l;
		return [x1_,y1_,x2_,y2_];
	};

	var ticked = function(e){

			force.onTick(e);

			//Collision detection
			var q = d3.geom.quadtree(data.nodes),
			  k = e.alpha * 0.1,
			  i = 0,
			  n = data.nodes.length,
			  o;

			while (++i < n) {
				o = data.nodes[i];
				if (o.fixed) continue;
				// c = nodes[o.type];
				// o.x += (c.x - o.x) * k;
				// o.x += (xScale(o.name.charCodeAt(0)) - o.x) * k;
				// o.y += (yScale(o.value) - o.y) * k;
				q.visit(collide(o));
			}

			nodes.attr("cx", function(d) { return d.x ;})
				.attr("cy", function(d) { return d.y ;});
	};

	end = function(e){
			labels.attr('dx',function(d){return d.x;})
				.attr('dy',function(d){
					return d.y+this.getBBox().height;
				});
				
			links.each(function(d){
				d.center = circleCenter(d.source.x,d.source.y,d.target.x,d.target.y,60);
			});

		    links.attr("d", function(d) {
		    	var x1 = innerLinePostion(d)[0],
		    		y1 = innerLinePostion(d)[1],
		    		x2 = innerLinePostion(d)[2],
		    		y2 = innerLinePostion(d)[3];
			    var dx = d.target.x - d.source.x,
			        dy = d.target.y - d.source.y,
			        dr = Math.sqrt(dx * dx + dy * dy);
			    		    
			    return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
			  });

		    circleCenters.attr('cx',function(d){return d.center.x;})
		    	.attr('cy',function(d){return d.center.y});
		    
		    path.each(function(d,i){
		    	var dx = d.target.x - d.source.x,
			        dy = d.target.y - d.source.y,
			        dr = Math.sqrt(dx * dx + dy * dy);
			    var source = d.source;
		      	var target = d.target;
		      	var center = d.center;

		      	//var min_r = d3.min([nodeRadiusScale(d.source),nodeRadiusScale(d.target)]);
				  //var max_r = d3.max([nodeRadiusScale(d.source),nodeRadiusScale(d.target)]);
				var min_r = 4;

		      	// var source_r = nodeRadiusScale(d.source);
				  // var target_r = nodeRadiusScale(d.target);
				  var source_r = 4;
				  var target_r = 4;

		      	var radians = Math.atan2(-(source.y-center.y),(source.x-center.x));
		      	var degrees = radians * 180/Math.PI;

		      	var degree_margin_source = Math.atan2(source_r,dr)*180/Math.PI/2;
		      	var degree_margin_target = Math.atan2(target_r,dr)*180/Math.PI/2;
				var degree_between = 60 - degree_margin_source - degree_margin_target;
				  
		    	d3.select(this).selectAll('.rect0').each(function(s,i){
					block_count = preferences['seq_size'] + Math.floor((preferences['seq_size']-1)/500);
					area_width = (dr-source_r-target_r)/block_count;
					
		    		d3.select(this).attr('x',center.x).attr('y',center.y)
		    			.attr('width',area_width)
		    			.attr('height',area_width)
		    			.attr('transform',function(){
							//degree = -degrees+90+degree_margin+(60-degree_margin*2)*i;
							
			    			degree = -degrees+90+degree_margin_source+(degree_between/block_count)*(i+Math.floor(i/500))+degree_between/2/block_count;
			    			return 'rotate('+degree+' '+center.x+' '+center.y+') translate('+-d3.select(this).attr('width')/2+','+-(dr+area_width*3/2)+')';
			    		});
				});
				
				d3.select(this).selectAll('.rect1').each(function(s,i){
					block_count = preferences['seq_size'] + Math.floor((preferences['seq_size']-1)/500);
					area_width = (dr-source_r-target_r)/block_count;
					
		    		d3.select(this).attr('x',center.x).attr('y',center.y)
		    			.attr('width',area_width/2)
		    			.attr('height',area_width/2)
		    			.attr('transform',function(){
							//degree = -degrees+90+degree_margin+(60-degree_margin*2)*i;
							
			    			degree = -degrees+90+degree_margin_source+(degree_between/block_count)*(i+Math.floor(i/500))+degree_between/2/block_count;
			    			return 'rotate('+degree+' '+center.x+' '+center.y+') translate('+-d3.select(this).attr('width')/2+','+-(dr+area_width*5/4)+')';
			    		});
		    	});
			});

			// container.selectAll(".voronoi")
			// 	.data(voronoi(data.nodes)) //Use vononoi() with your dataset inside
			// 	.enter().append("path")
			// 	.attr("d", function(d, i) { return "M" + d.join("L") + "Z"; })
			// 	.datum(function(d, i) { return d.point; })
			// 	//Give each cell a unique class where the unique part corresponds
			// 	//to the circle classes
			// 	.attr("class", function(d,i) { return "voronoi "; })
			// 	//.style("stroke", "#2074A0") //If you want to look at the cells
			// 	.style("fill", "none")
			// 	.style("pointer-events", "all")
			// 	.on("mouseover", showTooltip)
    		// 	.on("mouseout",  removeTooltip);
	}

	var nodeRadiusScale = function(d){
		a = parseInt(node_r_max);//
		b = parseInt(node_r_min);//Base Radius
		//return (1+a/(1+Math.pow(Math.E,1+d.value/nodeValueMax)))*b;
		
		return b+(a*(d.value-nodeValueMin)/(nodeValueMax-nodeValueMin));
	}

	function dblclick(d) {
		d3.select(this).classed("fixed", d.fixed = false);
		uri = window.location.href;
		window.location.href = updateQueryStringParameter(uri, 'author_name', d.id);
	}

	$(window).resize(function(){
		var width = $(window).width();
		var height = $(window).height();
		svg.attr("width",width).attr("height",height);
		forceCenter.x(width/2);
		forceCenter.y(height/2);
		simulation.restart();
	});

	$('#nodeEdge').change(function(){
		edge = $('#nodeEdge').val();
		nodes.transition().style('stroke-width',edge);

		d3.selectAll('.path').remove();
		area_x_scale = d3.scaleLinear().range([0,linkDistance-radius*2-edge*2]).domain([0,seq_size-1]);
		area = d3.area().x(function(d,i){return area_x_scale(i);}).y0(seq_max).y1(function(d,i){return d;});
		path.insert("path").attr('class','path').datum(function(d){return d.seq;}).attr("d",area);

		ticked();
	});
	
	$('#linkDistance').change(function(){
		linkDistance = $('#linkDistance').val();
		forceLink.distance(linkDistance);

		d3.selectAll('.path').remove();
		area_x_scale = d3.scaleLinear().range([0,linkDistance-radius*2-edge*2]).domain([0,seq_size-1]);
		area = d3.area().x(function(d,i){return area_x_scale(i);}).y0(seq_max).y1(function(d,i){return d;});
		path.insert("path").attr('class','path').datum(function(d){return d.seq;}).attr("d",area);

		simulation.alpha(1).restart();
	});


	// theta is degree
	var circleCenter = function(x1,y1,x2,y2,theta){
		var radians = theta*Math.PI/180;
		//var d1 = (x2-Math.cos(radians)*x1+Math.sin(radians)*y1)/2,
		//	d2 = (y2-Math.sin(radians)*x1-Math.cos(radians)*y1)/2;

		var d1 = x2-Math.cos(radians)*x1+Math.sin(radians)*y1,
			d2 = y2-Math.sin(radians)*x1-Math.cos(radians)*y1;

		var x = (d1*(1-Math.cos(radians))-d2*Math.sin(radians))/(1-Math.cos(radians))/2,
			y = (d1-x*(1-Math.cos(radians)))/Math.sin(radians);

		return {'x':x,'y':y};
	};


	function collide(node) {
	  var r = rScale(node.value) + 16,
	      nx1 = node.x - r,
	      nx2 = node.x + r,
	      ny1 = node.y - r,
	      ny2 = node.y + r;
	  return function(quad, x1, y1, x2, y2) {
	    if (quad.point && (quad.point !== node)) {
	      var x = node.x - quad.point.x,
	          y = node.y - quad.point.y,
	          l = Math.sqrt(x * x + y * y),
	          r = rScale(node.value) + rScale(quad.point.value);
	      if (l < r) {
	        l = (l - r) / l * .5;
	        node.px += x * l;
	        node.py += y * l;
	      }
	    }
	    return x1 > nx2
	        || x2 < nx1
	        || y1 > ny2
	        || y2 < ny1;
	  };
	}

	function showTooltip(d) {
		// tooltipInstance = new Tooltip($(this),{
		// 	container: "body",
		// 	title: function() { return d.id; } ,
    	// 	trigger: "hover",
		// });
		// tooltipInstance.show();

		$(this).popover({
			placement: 'auto', //place the tooltip above the item
			container: 'body', //the name (class or id) of the container
			trigger: 'manual',
			html : true,
			content: function() { return d.id; } //the content inside the tooltip
		});
		$(this).popover('show');
	}
	
	//Hide the tooltip when the mouse moves away
	function removeTooltip() {
		//Hide the tooltip
		$('.popover').each(function() {
			$(this).remove();
		});
	}
	
});