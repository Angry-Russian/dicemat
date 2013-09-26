$(function(){

	var counter = 0, settings, rollsList, ws;

	ws = new WebSocket('ws://horionforge.com:8888');
	ws.onopen = function(data){
		console.log("connection to Horizonforge opened", ws, arguments);
	}
	ws.onclose = function(){
		console.log(arguments);
	}
	ws.onmessage = function(){
		console.log(arguments);
	}
	ws.onerror = function(){
		console.log(arguments);
	}

	Backbone.sync = function(method, model){
		if(window.console && console.log) console.log(method +" : ", model);

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
						console.log(roll);
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
				type: "settings"
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
			"click #dice input":"numberFocus",
			"click input:checkbox" : "updateSettings",
			"click #clear" : "hideRolls",
			"click #exalted" : "setExalted",
			"click #wod" : "setWod",
			"click #dnd" : "setDnd",
			"click #roll": "generate",
			"click #show-hidden" : "toggleHidden"

		},toggleOptions:function(e){
			$('#options').toggle();
			$("#settings").toggleClass("on");
			if(!$("#settings").is('.on')) this.updateSettings();
		},toggleHidden:function(){
			this.$el.toggleClass("show-hidden");
		},numberFocus:function(e){
			$(e.target).select();
		},setExalted : function(e){
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
		},updateSettings: function(){
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
		},generate:function(){

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
			if(rolled) rollsList.create({results: results});
		},

		render:function(){},
		initialize: function(){
			this.listenTo(rollsList, 'add', this.addRoll);
			rollsList.fetch();
		}
	});
	window.diceRoller = new DiceRoller;
});