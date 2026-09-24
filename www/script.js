window.addEventListener("load", windowLoadHandler, false);
var sphereRad = 140;
var radius_sp = 1;
//for debug messages
var Debugger = function () { };
Debugger.log = function (message) {
	try {
		console.log(message);
	}
	catch (exception) {
		return;
	}
}

function windowLoadHandler() {
	canvasApp();
}

function canvasSupport() {
	return Modernizr.canvas;
}

function canvasApp() {
	if (!canvasSupport()) {
		return;
	}

	var theCanvas = document.getElementById("canvasOne");
	var context = theCanvas.getContext("2d");

	var displayWidth;
	var displayHeight;
	var timer;
	var wait;
	var count;
	var numToAddEachFrame;
	var particleList;
	var recycleBin;
	var particleAlpha;
	var r, g, b;
	var fLen;
	var m;
	var projCenterX;
	var projCenterY;
	var zMax;
	var turnAngle;
	var turnSpeed;
	var sphereCenterX, sphereCenterY, sphereCenterZ;
	var particleRad;
	var zeroAlphaDepth;
	var randAccelX, randAccelY, randAccelZ;
	var gravity;
	var rgbString;
	//we are defining a lot of variables used in the screen update functions globally so that they don't have to be redefined every frame.
	var p;
	var outsideTest;
	var nextParticle;
	var sinAngle;
	var cosAngle;
	var rotX, rotZ;
	var depthAlphaFactor;
	var i;
	var theta, phi;
	var x0, y0, z0;

	init();

	// eel.expose(init)
	function init() {
		wait = 1;
		count = wait - 1;
		numToAddEachFrame = 8;

		//particle color
		r = 0;
		g = 72;
		b = 255;

		rgbString = "rgba(" + r + "," + g + "," + b + ","; //partial string for color which will be completed by appending alpha value.
		particleAlpha = 1; //maximum alpha

		displayWidth = theCanvas.width;
		displayHeight = theCanvas.height;

		fLen = 320; //represents the distance from the viewer to z=0 depth.

		//projection center coordinates sets location of origin
		projCenterX = displayWidth / 2;
		projCenterY = displayHeight / 2;

		//we will not draw coordinates if they have too large of a z-coordinate (which means they are very close to the observer).
		zMax = fLen - 2;

		particleList = {};
		recycleBin = {};

		//random acceleration factors - causes some random motion
		randAccelX = 0.1;
		randAccelY = 0.1;
		randAccelZ = 0.1;

		gravity = -0; //try changing to a positive number (not too large, for example 0.3), or negative for floating upwards.

		particleRad = 1.8;

		sphereCenterX = 0;
		sphereCenterY = 0;
		sphereCenterZ = -3 - sphereRad;

		//alpha values will lessen as particles move further back, causing depth-based darkening:
		zeroAlphaDepth = -750;

		turnSpeed = 2 * Math.PI / 1200; //the sphere will rotate at this speed (one complete rotation every 1600 frames).
		turnAngle = 0; //initial angle

		timer = setInterval(onTimer, 10 / 24);
	}

	function onTimer() {
		//if enough time has elapsed, we will add new particles.		
		count++;
		if (count >= wait) {

			count = 0;
			for (i = 0; i < numToAddEachFrame; i++) {
				theta = Math.random() * 2 * Math.PI;
				phi = Math.acos(Math.random() * 2 - 1);
				x0 = sphereRad * Math.sin(phi) * Math.cos(theta);
				y0 = sphereRad * Math.sin(phi) * Math.sin(theta);
				z0 = sphereRad * Math.cos(phi);

				//We use the addParticle function to add a new particle. The parameters set the position and velocity components.
				//Note that the velocity parameters will cause the particle to initially fly outwards away from the sphere center (after
				//it becomes unstuck).
				var p = addParticle(x0, sphereCenterY + y0, sphereCenterZ + z0, 0.002 * x0, 0.002 * y0, 0.002 * z0);

				//we set some "envelope" parameters which will control the evolving alpha of the particles.
				p.attack = 50;
				p.hold = 50;
				p.decay = 100;
				p.initValue = 0;
				p.holdValue = particleAlpha;
				p.lastValue = 0;

				//the particle will be stuck in one place until this time has elapsed:
				p.stuckTime = 90 + Math.random() * 20;

				p.accelX = 0;
				p.accelY = gravity;
				p.accelZ = 0;
			}
		}

		//update viewing angle
		turnAngle = (turnAngle + turnSpeed) % (2 * Math.PI);
		sinAngle = Math.sin(turnAngle);
		cosAngle = Math.cos(turnAngle);

		//background fill
		context.fillStyle = "#000000";
		context.fillRect(0, 0, displayWidth, displayHeight);

		//update and draw particles
		p = particleList.first;
		while (p != null) {
			//before list is altered record next particle
			nextParticle = p.next;

			//update age
			p.age++;

			//if the particle is past its "stuck" time, it will begin to move.
			if (p.age > p.stuckTime) {
				p.velX += p.accelX + randAccelX * (Math.random() * 2 - 1);
				p.velY += p.accelY + randAccelY * (Math.random() * 2 - 1);
				p.velZ += p.accelZ + randAccelZ * (Math.random() * 2 - 1);

				p.x += p.velX;
				p.y += p.velY;
				p.z += p.velZ;
			}

			/*
			We are doing two things here to calculate display coordinates.
			The whole display is being rotated around a vertical axis, so we first calculate rotated coordinates for
			x and z (but the y coordinate will not change).
			Then, we take the new coordinates (rotX, y, rotZ), and project these onto the 2D view plane.
			*/
			rotX = cosAngle * p.x + sinAngle * (p.z - sphereCenterZ);
			rotZ = -sinAngle * p.x + cosAngle * (p.z - sphereCenterZ) + sphereCenterZ;
			m = radius_sp * fLen / (fLen - rotZ);
			p.projX = rotX * m + projCenterX;
			p.projY = p.y * m + projCenterY;

			//update alpha according to envelope parameters.
			if (p.age < p.attack + p.hold + p.decay) {
				if (p.age < p.attack) {
					p.alpha = (p.holdValue - p.initValue) / p.attack * p.age + p.initValue;
				}
				else if (p.age < p.attack + p.hold) {
					p.alpha = p.holdValue;
				}
				else if (p.age < p.attack + p.hold + p.decay) {
					p.alpha = (p.lastValue - p.holdValue) / p.decay * (p.age - p.attack - p.hold) + p.holdValue;
				}
			}
			else {
				p.dead = true;
			}

			//see if the particle is still within the viewable range.
			if ((p.projX > displayWidth) || (p.projX < 0) || (p.projY < 0) || (p.projY > displayHeight) || (rotZ > zMax)) {
				outsideTest = true;
			}
			else {
				outsideTest = false;
			}

			if (outsideTest || p.dead) {
				recycle(p);
			}

			else {
				//depth-dependent darkening
				depthAlphaFactor = (1 - rotZ / zeroAlphaDepth);
				depthAlphaFactor = (depthAlphaFactor > 1) ? 1 : ((depthAlphaFactor < 0) ? 0 : depthAlphaFactor);
				context.fillStyle = rgbString + depthAlphaFactor * p.alpha + ")";

				//draw
				context.beginPath();
				context.arc(p.projX, p.projY, m * particleRad, 0, 2 * Math.PI, false);
				context.closePath();
				context.fill();
			}

			p = nextParticle;
		}
	}

	function addParticle(x0, y0, z0, vx0, vy0, vz0) {
		var newParticle;
		var color;

		//check recycle bin for available drop:
		if (recycleBin.first != null) {
			newParticle = recycleBin.first;
			//remove from bin
			if (newParticle.next != null) {
				recycleBin.first = newParticle.next;
				newParticle.next.prev = null;
			}
			else {
				recycleBin.first = null;
			}
		}
		//if the recycle bin is empty, create a new particle (a new ampty object):
		else {
			newParticle = {};
		}

		//add to beginning of particle list
		if (particleList.first == null) {
			particleList.first = newParticle;
			newParticle.prev = null;
			newParticle.next = null;
		}
		else {
			newParticle.next = particleList.first;
			particleList.first.prev = newParticle;
			particleList.first = newParticle;
			newParticle.prev = null;
		}

		//initialize
		newParticle.x = x0;
		newParticle.y = y0;
		newParticle.z = z0;
		newParticle.velX = vx0;
		newParticle.velY = vy0;
		newParticle.velZ = vz0;
		newParticle.age = 0;
		newParticle.dead = false;
		if (Math.random() < 0.5) {
			newParticle.right = true;
		}
		else {
			newParticle.right = false;
		}
		return newParticle;
	}

	function recycle(p) {
		//remove from particleList
		if (particleList.first == p) {
			if (p.next != null) {
				p.next.prev = null;
				particleList.first = p.next;
			}
			else {
				particleList.first = null;
			}
		}
		else {
			if (p.next == null) {
				p.prev.next = null;
			}
			else {
				p.prev.next = p.next;
				p.next.prev = p.prev;
			}
		}
		//add to recycle bin
		if (recycleBin.first == null) {
			recycleBin.first = p;
			p.prev = null;
			p.next = null;
		}
		else {
			p.next = recycleBin.first;
			recycleBin.first.prev = p;
			recycleBin.first = p;
			p.prev = null;
		}
	}
}


$(function () {
    const nearbyRestaurants = [
        { name: "Gjelina", area: "Abbot Kinney, Venice", distance: 13, cuisine: "Produce-Forward American", price: "$$$", rating: 4.5, status: "Open", review: "A destination for seasonal vegetables, wood-fired dishes, and a lively Abbot Kinney patio." , image: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=520&q=80" },
        { name: "San Damian", area: "Abbot Kinney, Venice", distance: 13, cuisine: "Mexican Coastal Seafood", price: "$$$", rating: 4.4, status: "Open", review: "Contemporary seafood inspired by the Mexican coast, right in the Abbot Kinney dining corridor." , image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=520&q=80" },
        { name: "Sweetfin", area: "Abbot Kinney, Venice", distance: 13, cuisine: "Poke + Protein Bowls", price: "$$", rating: 4.4, status: "Open", review: "Gluten-free poke and protein bowls with fresh toppings for a quick, lighter meal." , image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=520&q=80" },
        { name: "Café Gratitude", area: "Rose Ave, Venice", distance: 14, cuisine: "Plant-Based", price: "$$", rating: 4.4, status: "Open", review: "Plant-based bowls, juices, and nourishing comfort food near the Venice beach neighborhoods." , image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=520&q=80" },
        { name: "Farmshop", area: "Brentwood", distance: 18, cuisine: "California Market Cafe", price: "$$$", rating: 4.4, status: "Open", review: "Seasonal salads, grain bowls, sandwiches, and artisan provisions at Brentwood Country Mart." , image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=520&q=80" },
        { name: "Kreation Organic", area: "Beverly Hills", distance: 19, cuisine: "Organic Cafe + Juice", price: "$$", rating: 4.3, status: "Open", review: "Cold-pressed juices, smoothies, salads, and clean-ingredient meals for wellness-minded travelers." , image: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?auto=format&fit=crop&w=520&q=80" },
        { name: "Gracias Madre", area: "West Hollywood", distance: 16, cuisine: "Plant-Based Mexican", price: "$$$", rating: 4.5, status: "Open", review: "Colorful vegan plates, fresh salsas, and a lively patio in West Hollywood." , image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=520&q=80" },
        { name: "The Win-Dow", area: "Marina del Rey", distance: 10, cuisine: "Burgers + Beach Food", price: "$$", rating: 4.5, status: "Open", review: "Casual smash burgers, crispy chicken, and fries for an easy Marina del Rey stop." , image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=520&q=80" },
        { name: "Great White", area: "Venice", distance: 12, cuisine: "California Cafe", price: "$$", rating: 4.5, status: "Open", review: "Bright, produce-forward bowls, salads, and sourdough." , image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=520&q=80" },
        { name: "Moon Juice", area: "Abbot Kinney, Venice", distance: 12, cuisine: "Juice + Wellness Bar", price: "$$", rating: 4.4, status: "Open", review: "Adaptogenic smoothies, pressed juices, and plant-based snacks." , image: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?auto=format&fit=crop&w=520&q=80" },
        { name: "The Butcher's Daughter", area: "Venice", distance: 13, cuisine: "Vegetarian", price: "$$", rating: 4.5, status: "Open", review: "Vegetable-forward brunch, fresh juices, and colorful grain bowls." , image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=520&q=80" },
        { name: "Blue Bottle Coffee", area: "Venice", distance: 13, cuisine: "Coffee + Light Bites", price: "$$", rating: 4.4, status: "Open", review: "Carefully brewed coffee with wholesome pastries and toast." , image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=520&q=80" },
        { name: "Greenleaf Kitchen & Cocktails", area: "Marina del Rey", distance: 10, cuisine: "Healthy California", price: "$$", rating: 4.4, status: "Open", review: "Custom salads, wraps, protein bowls, and fresh juices by the marina." , image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=520&q=80" },
        { name: "Bluewater Grill", area: "Marina del Rey", distance: 10, cuisine: "Sustainable Seafood", price: "$$$", rating: 4.5, status: "Open", review: "Fresh seafood, grilled fish, and lighter coastal plates." , image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=520&q=80" },
        { name: "Erewhon", area: "Marina del Rey", distance: 9, cuisine: "Organic Market + Cafe", price: "$$$", rating: 4.3, status: "Open", review: "Organic prepared meals, smoothies, and clean-ingredient snacks." , image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=520&q=80" },
        { name: "The Honor Bar", area: "Beverly Hills", distance: 19, cuisine: "American Bar + Grill", price: "$$$", rating: 4.5, status: "Open", review: "Neighborhood bar with crisp salads, grilled plates, and fresh sides." , image: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=520&q=80" },
        { name: "M Café", area: "Beverly Hills", distance: 18, cuisine: "Macrobiotic", price: "$$", rating: 4.4, status: "Open", review: "Plant-based macrobiotic plates, soba, and nutrient-dense bowls." , image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=520&q=80" },
        { name: "Culina Ristorante", area: "Beverly Hills", distance: 17, cuisine: "Mediterranean Italian", price: "$$$", rating: 4.5, status: "Open", review: "Seasonal Mediterranean ingredients, grilled fish, and garden salads." , image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=520&q=80" },
        { name: "Gracias Madre", area: "West Hollywood", distance: 16, cuisine: "Plant-Based Mexican", price: "$$$", rating: 4.5, status: "Open", review: "Colorful vegan plates, fresh salsas, and a lively patio for visitors.", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=520&q=80" },
        { name: "Farmshop", area: "Brentwood", distance: 18, cuisine: "California Market Cafe", price: "$$$", rating: 4.4, status: "Open", review: "Seasonal salads, grain bowls, sandwiches, and artisan provisions.", image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=520&q=80" },
        { name: "The Ivy", area: "Beverly Hills", distance: 19, cuisine: "California American", price: "$$$$", rating: 4.3, status: "Open", review: "Iconic garden dining with polished service and a classic tourist-friendly scene.", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=520&q=80" },
        { name: "Coni'Seafood", area: "Inglewood", distance: 5, cuisine: "Nayarit Seafood", price: "$$", rating: 4.6, status: "Open", review: "Pescado zarandeado and caramelized onions.", image: "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=520&q=80" },
        { name: "Jame Enoteca", area: "El Segundo", distance: 5, cuisine: "Italian", price: "$$$", rating: 4.7, status: "Open", review: "Arugula pappardelle and braised beef cheek.", image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=520&q=80" },
        { name: "Wolfgold", area: "LAX TBIT", distance: 0, cuisine: "Californian / Wood-Fired", price: "$$$", rating: 4.6, status: "Terminal", review: "Wood-fired pizza and seasonal salads airside.", image: "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=520&q=80" },
        { name: "Playa Provisions", area: "Playa del Rey", distance: 8, cuisine: "Multi-Concept", price: "$$", rating: 4.5, status: "Open", review: "Four concepts from chef Brooke Williamson.", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=520&q=80" }
    ];

    function renderRestaurants(filter = "all") {
        const list = document.getElementById("restaurantList");
        if (!list) return;
        const filtered = nearbyRestaurants.filter((restaurant) =>
            filter === "terminal" ? restaurant.status === "Terminal" :
            filter === "nearby" ? restaurant.distance <= 5 :
            filter === "healthy" ? /healthy|vegetarian|macrobiotic|wellness|organic|juice|coffee/i.test(`${restaurant.cuisine} ${restaurant.review}`) :
            filter === "westside" ? /Venice|Marina del Rey|Beverly Hills|Santa Monica/i.test(restaurant.area) : true
        );
        list.innerHTML = filtered.map((restaurant) => `
            <article class="restaurant-card">
                <img class="restaurant-photo" src="${restaurant.image}" alt="${restaurant.name} food" loading="lazy">
                <div class="restaurant-card-content">
                    <div class="restaurant-card-top">
                        <span class="restaurant-name">${restaurant.name}</span>
                        <span class="restaurant-rating">${restaurant.rating} <i class="bi bi-star-fill"></i></span>
                    </div>
                    <div class="restaurant-cuisine">${restaurant.cuisine} · ${restaurant.price}</div>
                    <div class="restaurant-card-meta"><span>${restaurant.area} · ${restaurant.distance === 0 ? "In terminal" : `${restaurant.distance} mi`}</span><span class="restaurant-status">${restaurant.status}</span></div>
                </div>
            </article>`).join("");
    }

    renderRestaurants();
    $(document).on("click", ".restaurant-filter", function () {
        $(".restaurant-filter").removeClass("active");
        $(this).addClass("active");
        renderRestaurants($(this).data("filter"));
    });

    const shoppingSpots = [
        { name: "Abbot Kinney boutiques", area: "Abbot Kinney, Venice", type: "Independent fashion + vintage", detail: "Walkable blocks of California labels, denim, jewelry, and design shops.", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=700&q=80" },
        { name: "Montana Avenue", area: "Montana Ave, Santa Monica", type: "Relaxed luxury + local style", detail: "A leafy neighborhood strip for contemporary clothes, accessories, and gifts.", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=700&q=80" },
        { name: "Marina del Rey waterfront", area: "Marina del Rey", type: "Resort casual + beachwear", detail: "Easygoing coastal shopping for vacation clothes, sunglasses, and activewear.", image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80" }
    ];

    function renderShopping(filter = "all") {
        const list = document.getElementById("shoppingList");
        if (!list) return;
        const filtered = shoppingSpots.filter((spot) => filter === "all" || spot.area.includes(filter));
        list.innerHTML = filtered.map((spot) => `
            <article class="shopping-card">
                <img class="shopping-photo" src="${spot.image}" alt="Clothing shopping at ${spot.name}" loading="lazy">
                <div class="shopping-card-content">
                    <div class="shopping-card-top"><span class="shopping-name">${spot.name}</span><i class="bi bi-bag shopping-icon" aria-hidden="true"></i></div>
                    <div class="shopping-type">${spot.type}</div>
                    <div class="shopping-detail">${spot.area} · ${spot.detail}</div>
                </div>
            </article>`).join("");
    }

    renderShopping();
    $(document).on("click", ".shopping-filter", function () {
        $(".shopping-filter").removeClass("active");
        $(this).addClass("active");
        renderShopping($(this).data("shopping-filter"));
    });
});

$(function () {
    $("#slider-range").slider({
		range: false,
		min: 20,
		max: 500,
		value: 280,
		slide: function (event, ui) {
			console.log(ui.value);
			sphereRad = ui.value;
		}
	});
});

$(function () {
	$("#slider-test").slider({
		range: false,
		min: 1.0,
		max: 2.0,
		value: 1,
		step: 0.01,
		slide: function (event, ui) {
			radius_sp = ui.value;
		}
	});
});
