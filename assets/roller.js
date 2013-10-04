$(function(){

	var counter = 0, notif = _.template($("#notificationTemplate").html()), settings, rollsList, ws;

	function rand(n){
		return Math.floor(Math.random()*n)
	}
	function reidentify(){
		if($('#desc').val()){
			ws.send('{"type":"identify", "name":"' + ($('#desc').val()||"Anonymous") + '"}');
			settings.save('name', $('#desc').val())
		}
	}
	function notify(title, text){
		$(notif({title:title, content:text}))
			.on('click', function(){$(this).remove();})
			.appendTo('body').hide().fadeIn(300).delay(2000).fadeOut(300, function(){$(this).remove();})
	}

	Backbone.sync = function(method, model){
		//if(window.console && console.log) console.log(method +" : ", model);

		if(model.attributes && model.attributes.type === "settings"){
			switch(method){
				case "read":
					var s = localStorage['settings'];
					if(s) settings = new SettingsModel(JSON.parse(s));
					break;
				case "create": model.id="settings"
				case "update": localStorage['settings'] = model.toJSON(); break;
				case "delete":  break;
				default: console.error("Unsupported method: " + method);
			}
			localStorage['settings'] = JSON.stringify(model);
			return 0;
		}

		switch(method){
			case "read":
				var i = 0, roll = localStorage["roll0"];
				while(roll){
					roll = localStorage["roll"+(i++)];
					if(roll){
						roll = JSON.parse(roll);
						roll.model = model.models[0];
						roll.rules = new SettingsModel(roll.rules);
						rollsList.create(roll);
					}else{
						counter = i-1;
						break;
					}
				}
				break;
			case "create": model.id = counter++;
			case "update": localStorage['roll'+model.id] = JSON.stringify(model); break;
			case "delete":  break;
			default: console.error("Unsupported method: " + method);
		}
	};


	var SettingsModel = Backbone.Model.extend({

		defaults:function(){
			return {
				xhighest: 0,
				total: 0,
				threshold: 0,
				doubles: 0,
				rerolls: 0,
				type: "settings",
				name: ""
			}
		}, update: function(settings){
			_.each(settings, function(value, key, list){
				this[key] = value;
			});
		}
	});

	settings = new SettingsModel;
	settings.fetch();

	var Roll = Backbone.Model.extend({

		defaults:function(){
			return {
				title: "empty roll...",
				order: rollsList.nextOrder(),
				hidden: false,
				rules:settings,
				results:[],
				type: "roll"
			};
		},

		toggle:function(state){
			this.save({
				hidden: (typeof state === "boolean") ? state : !this.get('hidden')
			})
		},

		initialize:function(){
		}
	});

	var List = Backbone.Collection.extend({
		model: Roll,
		hidden: function(){
			return this.where({hidden: true});
		},
		shown:function(){
			return this.without.apply(this, this.hidden());
		},
		nextOrder:function(){
			if(!this.length) return 1;
			return this.last().get('order');
		},comparator: "order"
	});
	rollsList = new List;

	var RollView = Backbone.View.extend({
		tagName:"li",
		template: _.template($('#liTemplate').html()),

		events:{
			"click .close" : "toggle"
		},toggle:function(){
			this.model.toggle();
			this.$el.toggleClass('is-hidden', this.model.get('hidden'));
			this.render();
		},

		render:function(){
			this.$el.html(this.template(this.model.toJSON())).toggleClass('is-hidden', this.model.get("hidden"));
			return this;
		},

		initialize:function(){
			this.listenTo(this.model, 'change', this.render);
		}
	});

	var DiceRoller = Backbone.View.extend({
		el:$('main#roller'),
		events: {
			"click #settings" : "toggleOptions",
			"change input:text" : "updateSettings",
			"click #dice input" : "numberFocus",
			"click input:checkbox" : "updateSettings",
			"click #clear" : "hideRolls",
			"click #exalted" : "setExalted",
			"click #wod" : "setWod",
			"click #dnd" : "setDnd",
			"click #roll": "generate",
			"submit #dicepool": "generate",
			"click #show-hidden" : "toggleHidden",
			"connect" : "guestConnect",
			"leave" : "guestLeave",
			"quit" : "hostLeave"

		},toggleOptions:function(e){
			$('#options').toggle();
			$("#settings").toggleClass("on");
			if(!$("#settings").is('.on')) this.updateSettings();
		},toggleHidden:function(){
			this.$el.toggleClass("show-hidden");
		},numberFocus:function(e){
			$(e.target).select();
		},


		setExalted : function(e){
			$("#threshold, #doubles").attr('checked', 'checked');
			$('#targetNumber').val(7);
			$("#total, #nhighest, #rerolls").removeAttr('checked');
			$(".diceInput").not("#d10s").val(0).attr('disabled', true);
		},setWod : function(e){
			$("#threshold, #rerolls").attr('checked', 'checked');
			$('#targetNumber').val(8);
			$("#total, #nhighest, #doubles").removeAttr('checked');
			$(".diceInput").not("#d10s").val(0).attr('disabled', true);
		},setDnd : function(e){
			$("#total").attr('checked', 'checked');
			$("#threshold, #rerolls, #nhighest, #doubles").removeAttr('checked');
			$(".diceInput").attr('disabled', false);
		},


		guestConnect: function(e, data){
			if(window.console && console.log) console.log("Connection", data.id, "is now watching you.");
			notify(data.name, "Has come to watch.");
		},guestLeave: function(e, data){
			if(window.console && console.log) console.log("Connection", data.id, "stopped watching you.");
			notify(data.name, "Went away.");
		},hostLeave: function(e, data){
			if(window.console && console.log) console.log("Connection", data.id, "stopped broadcasting to you.");
			notify(data.name, "Disconnected.");
		},


		updateSettings: function(){
			settings.set({
				total		: ($("#total").is(":checked"))		?1:0,
				doubles		: ($("#doubles").is(":checked"))	?1:0,
				rerolls		: ($("#rerolls").is(":checked"))	?parseInt($("#xagain").val()):0,
				xhighest	: ($("#xhighest").is(":checked"))	?parseInt($("#nhighest").val()):0,
				threshold	: ($("#threshold").is(":checked"))	?parseInt($("#targetNumber").val()):0
			});
			settings.save();
		},clearRolls:function(){
			rollsList.shown().hide();
		},addRoll:function(roll){
			var view = new RollView({model:roll});
			this.$("#results").prepend(view.render().$el);
		},roll:function(sides){
			return Math.ceil(Math.random() * sides);
		},generate:function(e){
			e.preventDefault();
			var rolled = 0;
			var sides = [4, 6, 8, 10, 12, 20, 100];
			var results = [];
			var dice = [parseInt($("#d4s").val()),
						parseInt($("#d6s").val()),
						parseInt($("#d8s").val()),
						parseInt($("#d10s").val()),
						parseInt($("#d12s").val()),
						parseInt($("#d20s").val()),
						parseInt($("#d100s").val())];

	 		for(var d = 0; d<dice.length; d++){
				for(var dd = 0; dd<dice[d]; dd++){
					var r = this.roll(sides[d]);
					if(settings.get("rerolls")>1 && r>=settings.get("rerolls")) dd--;
					results.push(r);
					rolled = true;
				}
			}

			if(settings.get("xhighest")) results.sort(function(a, b){return a<b;});
			var roll = {results: results, rules: settings, type:"roll"};
			
			if(rolled){
				rollsList.create(roll);
				ws.send(JSON.stringify(roll));
			}
			return false;
		},

		render:function(){},
		initialize: function(){
			this.listenTo(rollsList, 'add', this.addRoll);
			rollsList.fetch();
		}
	});
	var diceRoller = new DiceRoller;

	window.ws = ws = new WebSocket('ws://localhost:8888');
	ws.onopen = function(data){
		reidentify();
		console.log("connection to Horizonforge opened", ws, arguments);
	}
	ws.onclose = function(){
		//attempt to reconnect
		console.log("Horizonforge connection closed. Attempting to reconnect...");
		ws = new WebSocket('ws://localhost:8888');
	}
	ws.onmessage = function(msg){
		var req = JSON.parse(msg.data);
		switch(req.type){
			case "roll":
				req.model = new Roll;
				req.rules = new SettingsModel(req.rules);
				rollsList.create(req);
				break;
			case "connect":
				diceRoller.$el.trigger("connect", req);
				break;
			case "leave":
				diceRoller.$el.trigger("leave", req);
				break;
			case "quit":
				diceRoller.$el.trigger("quit", req);
				break;
			default: //console.log("non-roll-type message recieved");
				break;
		}

			
	}
	ws.onerror = function(){
		console.log(arguments);
	}


	/*var adj = [
		"",
		"The",
		"A",
		"One",
		"Red",
		"Green",
		"Blue",
		"Yellow",
		"Violet",
		"Reborn",
		"Malevolent",
		"Shining",
		"Glorious",
		"Majestic",
		"Terrifying",
		"Sunken",
		"Beligerant",
		"Shouting",
		"Rising",
		"Unknown",
		"Wrathful"
	].sort(function(a, b){
		return Math.round(Math.random())*2-1;
	})[0];
	var name = [
		"Raptor",
		"Whisper",
		"Student",
		"Inventor",
		"Teacher",
		"Conqueror",
		"Mirror",
		"Coin",
		"Bonesetter",
		"Mouse",
		"Gazelle",
		"Hawk",
		"Eagle",
		"Arrow",
		"Suliman",
		"Devourer",
		"Skinner",
		"Juggernaut",
		"Fly",
		"Shadow",
		"Crane",
		"Sentinel",
		"Protector",
		"Lord",
		"Lady",
		"Priest",
		"Priestess",
		"Unknown",
		"Mesmer"
	].sort(function(a, b){
		return Math.round(Math.random())*2-1;
	})[0];
	var suff = [
		"",
		"Unknown",
		"from the Grave",
		"Binds the Sun",
		"of Nexus",
		"of Greatforks",
		"of Gem",
		"of The Lap",
		"of Meru",
		"of the Faraway",
		"of the Undrempt Sands",
		"of the Careful Whisper",
		"that Bleeds Lies",
		"that Seduces the Sky",
		"Bechernokov",
		"Samnarok",
		"Meldereval",
		"Bachtukth",
		"who Sees Without Words",
		"who Does That One Thing That No One Else Really Does.",
		"of the Duck-Punch",
		"who Has Been Duck-Punched Several Times And Lived To Tell About It",
		"duck-punches",
	].sort(function(a, b){
		return Math.round(Math.random())*2-1;
	})[0];//*/
	$('#desc')
		.on("change", reidentify)
		//.val(adj + " " + name + " " + suff);
});