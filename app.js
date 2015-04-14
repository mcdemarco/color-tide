$(function() {

	var defaultLover = 'eighteyed',
		defaultPals = 'palettes',
		defaultTransition = 'tide',
		initialLoverCount = 25,
		moreLoverCount = 10,
		loverLicenseIssues = "Skyblue2u,liddle_r",
		timeouts = [];
	
	var	$tideContainer = $('#tide_container'),
		$fadeContainer = $('#fade_container'),
		$colorHolders,
		loverPalsObj = {},
		minPals = 1,
		maxPals = 16, // the max number of palettes on screen at once
		duration = 3800,
		lover = defaultLover,
		loverMaxPals = 1000; // the max number of offsets available to query. This will update when you receive a result from getLoverData.
	
	loverHash = window.location.hash.substr(1);

	if (loverHash !== '') {
		lover = loverHash;
	}

	$(window).on('hashchange',function(){
		lover = window.location.hash.substr(1);
		if (lover)
			getLoverData(lover);
		buildInfoWindow();
		reinit();
	});

	function getRetrievalType() {
		var selectedType = $("input[name=retrieveType]:checked").val() ? $("input[name=retrieveType]:checked").val() : defaultPals;
		//Check loverMaxPals whenever we fetch the type.
		if (typeof loverPalsObj[selectedType] != undefined)
			loverMaxPals = loverPalsObj[selectedType];
		return selectedType;
	}
	
	function getTransitionType() {
		var selectedTide = ($("input[name=retrieveTide]:checked").val() ? $("input[name=retrieveTide]:checked").val() : defaultTransition);
		//Toggle containters and durations whenever we check the type.
		if (selectedTide == 'tide') {
			var deselectedTide = 'fade';
			minPals = 1;
			maxPals = 16;
			duration = 3800;
		} else {
			var deselectedTide = 'tide';
			minPals = 40;
			maxPals = 40;
			duration = 40*10000;
		}
		$("#" + selectedTide + "_container").show();
		$("#" + deselectedTide + "_container").hide();
		return selectedTide;
	}
	
	function getLovers(n,offset) {
		$.ajax({
			url: 'http://www.colourlovers.com/api/lovers/top?format=json&numResults='+n+'&resultOffset='+offset+'&jsonCallback=?',
			dataType: 'jsonp',
			success: function(lovers){
				//Only erase the existing list on success.
				$("#suggestions").html("");
				suggestLovers(lovers);
				$("#suggestions").append("<li><a href='#' id='more'>More...</a></li>");
				$("#more").click(function(){getLovers(moreLoverCount,n+offset);});
			}
		});
	}

	function suggestLovers(lovers) {
		$.each(lovers, function() {
			//Skip the fake karma and known license issues.
			if (this.rating < 16000000 && loverLicenseIssues.indexOf(this.userName) == -1) {
				$("#suggestions").append("<li><a href='#" + this.userName + "'>" + this.userName + "</li>");
			}
		});
	}

	// call the CL API, sets the loverMaxPals variable.
	function getLoverData(lover) {
		$.ajax({
			url: 'http://www.colourlovers.com/api/lover/'+lover+'/?format=json&jsonCallback=?',
			dataType: 'jsonp',
			success: function(loverdata){
				loverPalsObj = {"colors": loverdata[0].numColors,
								"palettes": loverdata[0].numPalettes,
								"patterns": loverdata[0].numPatterns};
				loverMaxPals = loverPalsObj[getRetrievalType()];
			}
		});
	}

	function getPals(requestUrl, currentRandomNumber) {
		$.ajax({
			url: requestUrl,
			dataType: 'jsonp',
			success: function(data){
				//console.log(data, currentRandomNumber);
				drawPals(data, currentRandomNumber);
			}
		});
	}

	function drawPals(data, currentRandomNumber) {

		// if we have results...
		if (data.length > 0) {
			$('#notification').fadeOut(5000, function(){
				$('#notification').html('');
			});
		} else {
			$('#notification').html('<p>No results. <br />(The user\'s ' + getRetrievalType() + ' license may forbid reproduction.)</p>');
			return;
		}
		
		// a little counter
		var currently = 0;
		$colorHolders.css('width', '0');

		$.each(data, function(i, palette){

			var colors = (palette.colors ? palette.colors : [palette.hex]);
			var widths = (palette.colorWidths ? palette.colorWidths : generateWidths(colors));

			if (getTransitionType() == 'tide') {
				//reverse the order of the colors, because of the order people do blend palettes on CL.
				colors.reverse();
				
				for (var j = 0; j < colors.length; j++) {
					$colorHolders.eq(currently).css({
						'background': '#'+colors[j],
						'width': widths[j] * (100/currentRandomNumber)+'%'
					});
					currently++;
				}
			} else {
				if (getRetrievalType() == 'patterns') {
					timeouts.push(setTimeout(function(){
						$("#color0").css({
							'background-image': 'url(' + palette.imageUrl + ')',
							'background-color': '#'+colors[0],
							'width': '100%'
						});
					},10000*currently));
					timeouts.push(setTimeout(function(){
						$("#title").html("<a target='_blank' href='" + palette.url + "'>" + palette.title + "</a> by " + palette.userName);
					},10000*currently + 1000));
				} else {
					timeouts.push(setTimeout(function(){
						for (var k = 0; k < colors.length; k++) {
 							$("#color" + k).css({
								'background': '#'+colors[k],
								'width': (widths[k] * 100)+'%'
							});
						}
						$("#title").html("<a target='_blank' href='" + palette.url + "'>" + palette.title + "</a> by " + palette.userName);
					},10000*currently));
				}
				currently++;
			}
		});

		function generateWidths(colors) {
			//Generate widths for pretend palettes.
			var widths = [];
			for (w=0; w < colors.length; w++)
				widths.push(1/colors.length);
			return widths;
		}
	}

	function getRandomInteger (min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function randomizePals() {
		// create a random number between 1 and the maximum number of palettes. This will be used to determine the number of palettes shown on this request.
		var currentRandomNumber = getRandomInteger(minPals,maxPals);

		// determine the maximum offset we can have based on the total number of palettes the lover has made. This will be used to set a random number for the offset on this request.
		var maxOffset = Math.floor(loverMaxPals / currentRandomNumber) - 1;

		// make the API request
		var requestURL = 'http://www.colourlovers.com/api/' + getRetrievalType() + '/' + $("input[name=retrieveTop]:checked").val() + '/?format=json' + ($("input[name=retrieveLover]").is(":checked") ? '&lover='+lover : '') + '&showPaletteWidths=1&resultOffset='+getRandomInteger(0,maxOffset)+'&numResults='+currentRandomNumber+'&jsonCallback=?';
		getPals(requestURL, currentRandomNumber);
	}

	// UI stuff
	function buildInfoWindow() {
		$('#lover').html(lover).attr('href', 'http://www.colourlovers.com/lover/'+lover+'/');
	}

	$('#info-link').on('click', function(e) {
		$('#config').toggleClass('is-open');
		e.preventDefault();
	});

	$('#full-screen-toggle').on('click', function() {
		toggleFullScreen();
	});

	function toggleFullScreen() {
		if ((document.fullScreenElement && document.fullScreenElement !== null) ||
			(!document.mozFullScreen && !document.webkitIsFullScreen)) {
			if (document.documentElement.requestFullScreen) {
				document.documentElement.requestFullScreen();
			} else if (document.documentElement.mozRequestFullScreen) {
				document.documentElement.mozRequestFullScreen();
			} else if (document.documentElement.webkitRequestFullScreen) {
				document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
				if (!document.webkitCurrentFullScreenElement) {
					// Element.ALLOW_KEYBOARD_INPUT does not work, document is not in full screen mode
					document.documentElement.webkitRequestFullScreen();
				}
			}
		}	else {
			if (document.cancelFullScreen) {
				document.cancelFullScreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.webkitCancelFullScreen) {
				document.webkitCancelFullScreen();
			}
		}
	}

	function init() {
		// Safari looks terrible because of sub-pixel rounding problems.  Apologize for them.
		if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
			$("div#notification").html('Tide mode does not perform as well in Safari; you may want to switch to fade mode, or to Chrome or Firefox.');
		} else {
			$("div#notification").html("<h1>Colour Tide</h1>");
		}
		// build placeholders for the max amount of colors possible
		for (var i = 0; i<maxPals*5; i++) {
			$tideContainer.append('<div class="color"></div>');
		}
		for (var i = 0; i<5; i++) {
			$fadeContainer.append('<div id="color' + i + '"></div>');
		}
		$colorHolders = $tideContainer.find('div.color');

		//Beware of fake lovers!
		getLovers(initialLoverCount,0);
		getLoverData(lover);
		buildInfoWindow();
		randomizePals();
		$("#tideForm").click(reinit);
	}

	function reinit() {
		getRetrievalType();
		getTransitionType();
		for (var i=0; i<timeouts.length; i++) {
			clearTimeout(timeouts[i]);
		}
		clearInterval(interval);
		randomizePals();
		interval = setInterval(liveIntervalFunction, duration);
	}
	
	init();

	// keep bringing in random the palettes per the duration

	var liveIntervalFunction = function(){
		clearInterval(interval);
		randomizePals();
		interval = setInterval(liveIntervalFunction, duration);
	};
	var interval = window.setInterval(liveIntervalFunction, duration);

});
