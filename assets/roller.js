"use strict"
$(function(){

	var settings, ws, usersList,
		hosts = {},
		guests = {},
		counter = 0,
		notif = _.template($("#notificationTemplate").html());

	function rand(n){
		return Math.floor(Math.random()*n)
	}
	function reidentify(){
		$('#viewport ul.results#self').attr('name',  $('#desc').val());
		ws.send('{"type":"identify", "name":"' + ($('#desc').val()||"Anonymous") + '"}');
		settings.save('name', $('#desc').val())
	}
	function notify(title, text){
		$('<li/>').html(notif({title:title, content:text})).addClass('notification')
			.on('click', function(){$(this).remove();})
			.appendTo('#notifications').hide().slideDown(300).delay(2000).fadeOut(300, function(){$(this).remove();})
	}
	function ask(text, placeholder, callback){
		$('#addHost').fadeOut(200, function(){$(this).remove()})
		$('<form id="addHost"/>').addClass('ask').attr('action', '#')
			.append($('<span/>').text(text))
			//.append('<br>')
			.append('<input type="text" class="answer" placeholder="'+placeholder+'">')
			//.append(
			//	$('<div>')
				.append('<button class="confirm">Ok</button>')
				.append('<button class="cancel">Cancel</button>')
			//)
			.on('click', '.confirm', function(e){
				callback($('.ask .answer').val());
				$(this).parents('.ask').fadeOut(200, function(){$(this).remove();});
				return false;

			}).on('click', '.cancel', function(e){
				callback(null);
				$(this).parents('.ask').fadeOut(200, function(){$(this).remove();});
				return false;

			}).on('submit', function(e){
				callback($('.ask .answer').val());
				$(this).parents('.ask').fadeOut(200, function(){$(this).remove();});
				return false;

			}).on('keydown', function(e){
				if(e.which === 27){
					callback(null);
					$(this).fadeOut(200, function(){$(this).remove();});
					return false;
				}

			}).appendTo('body').hide().fadeIn(200).find('input').focus();
	}
	Backbone.sync = function(method, model){
		var t = model.type||model.get("type");
		if(t === "settings"){
			switch(method){
				case "read":
					var s = localStorage['settings'];
					if(s) settings = new SettingsModel(JSON.parse(s));
					break;
				case "create": model.id="settings"
				case "update": localStorage['settings'] = model.toJSON(); break;
				case "delete":  break;
				default: if(window.console && console.error) console.error("Unsupported method: " + method);
			}
			localStorage['settings'] = JSON.stringify(model);
			return 0;
		}else if(t === "list"){
			switch(method){
				case "read":
					var i = 0, roll = localStorage["roll0"];
					for(i; i < localStorage.length; i++){
						roll = localStorage["roll"+(i)];
						if(roll){
							roll = JSON.parse(roll);
							//roll.model = model.models[0];
							roll.rules = new SettingsModel(roll.rules);
							rollsList.add(roll);
						}else{
							counter = i;
							break;
						}
					} break;
				case "create":
				case "update":
				case "delete":
				default: if(window.console && console.error) console.error("Unsupported method: " + method);
			}
		}else if(t === "roll"){
			switch(method){
				case "create": model.id = counter++;
				case "update": localStorage['roll'+model.id] = JSON.stringify(model); break;
				case "read":
				case "delete":
				default: if(window.console && console.error) console.error("Unsupported method: " + method);
			}
		}else return;
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
		}});
	settings = new SettingsModel;
	settings.fetch();
	$('#desc').val(settings.get('name'));





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
		}});
	var List = Backbone.Collection.extend({
		model: Roll,
		type:"list",
		hidden: function(){
			return this.where({hidden: true});
		},
		shown:function(){
			return this.without.apply(this, this.hidden());
		},
		nextOrder:function(){
			if(!this.length) return 1;
			return this.last().get('order');
		},comparator: "order"});
	var rollsList = new List;

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
		}});

	var User = Backbone.Model.extend({
		defaults: function(){
			return {
				name:"Anonymous",
				id:0,
				type:"guest",
				rollsList:null
			}
		}, initialize:function(){}
	});
	var UserList = Backbone.Collection.extend({
		model:User,
		guests:function(){
			return this.where({type:"guest"});
		},
		hosts:function(){
			return this.where({type:"host"});
		}});
	usersList = new UserList;

	var HostView = Backbone.View.extend({
		tagName:"ul",
		events:{
			//"click .remove": "remove"
		},remove:function(e, data){
			var that = this.$el;
				that.hide(350, function(e){that.remove()});

		},addRoll:function(roll){
			if(window.console && console.log) console.log('adding roll')
			var view = new RollView({model:roll});
			this.$el.prepend(view.render().$el);

		}, render:function(e){
			this.$el.attr('name', this.model.get("name")).toggleClass('results', true);
			return this;
		}, initialize:function(e){
			//this.rollsList = new List;
			if(window.console && console.log) console.log(this.model.rollsList);
			this.listenTo(this.model.rollsList, 'add', this.addRoll);
			this.listenTo(this.model, 'remove', this.remove);
			this.listenTo(this.model, 'change', this.render);
		}
	});

	var GuestView = Backbone.View.extend({
		tagName:"li",
		events:{
			//"remove": "remove"
		}, remove:function(e, data){
			var that = this.$el;
				that.hide(350, function(e){that.remove()});

		}, render:function(e){
			this.$el.attr('name', this.model.get("name"));
			return this;
		}, initialize:function(e){
			this.listenTo(this.model, 'change', this.render);
			this.listenTo(this.model, 'remove', this.remove);
			this.$el.text(this.model.get('name')[0]);
		}
	});

	var DiceRoller = Backbone.View.extend({
		el:$('main#roller'),
		events: {
			"click #settings" : "toggleOptions",
			"click #dice input" : "numberFocus",
			"click input:checkbox" : "updateSettings",
			"click #clear" : "clearRolls",
			"click #exalted" : "setExalted",
			"click #wod" : "setWod",
			"click #dnd" : "setDnd",
			"click #roll": "generate",
			"change input:text" : "updateSettings",
			"submit #dicepool": "generate",
			"keydown #desc": "selfRename",
			"click #show-hidden" : "toggleHidden",
			"connect" : "guestConnect",
			"confirm" : "hostConnect",
			"leave" : "guestLeave",
			"rename" : "userRename",
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

			usersList.create({type:"guest", name:data.name, id:data.id});

		},hostConnect: function(e, data){
			if(window.console && console.log) console.log("Connection", data.id, "is now broadcasting to you.");
			notify(data.name, "Has been added to your hosts.");

			usersList.create({type:"host", name:data.name, id:data.id});

		},guestLeave: function(e, data){
			if(window.console && console.log) console.log("Connection", data.id, "stopped watching you.");
			notify(data.name, "Went away.");

		},hostLeave: function(e, data){
			if(window.console && console.log) console.log("Connection", data.id, "stopped broadcasting to you.");
			notify(data.name, "Disconnected.");
			var n = parseInt(this.$('#viewport').attr('data-count'))-1;
			if(!n ||  isNaN(n) || n <= 1) this.$('#viewport').removeAttr('data-count');
			else this.$('#viewport').attr('data-count', n);
		},selfRename:function(e, data){
			if(e.which===13){
				$('#desc').blur();
				return false;
			}
		},userRename:function(e, data){
			console.log('rename', data);
			_.each(usersList.where({id:data.id}), function(u){u.save('name', data.name)});
		},


		updateSettings: function(){
			settings.set({
				total		: ($("#total").is(":checked"))		?1:0,
				doubles		: ($("#doubles").is(":checked"))	?1:0,
				rerolls		: ($("#rerolls").is(":checked"))	?parseInt($("#xagain").val()):0,
				xhighest	: ($("#xhighest").is(":checked"))	?parseInt($("#nhighest").val()):0,
				threshold	: ($("#threshold").is(":checked"))	?parseInt($("#targetNumber").val()):0,
				name		: $('#desc').val()
			});
			settings.save();
		},clearRolls:function(){
			_.each(rollsList.shown(), function(t){t.toggle()});

		},addRoll:function(roll){
			var view = new RollView({model:roll});
			this.$('.results#self').prepend(view.render().$el);

		},addUser:function(usr){
			if(usr.get('type')==="host"){
				usr.rollsList = new List;
				var view = new HostView({model:usr});
				this.$('#viewport').attr('data-count', (this.$('#viewport').attr('data-count')||1)+1).append(view.render().$el);
			}else {
				var view = new GuestView({model:usr});
				this.$('#guests').prepend(view.render().$el);
			}

		},roll:function(sides){
			return Math.ceil(Math.random() * sides);
		},generate:function(e){
			e.preventDefault();

			if($(e.currentTarget).is('input#desc')){
				$(e.currentTarget).blur();
				return false;
			}

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

			if(settings.get("xhighest")) results.sort();
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
			this.listenTo(usersList, 'add', this.addUser);
			rollsList.fetch();
		}});
	var diceRoller = new DiceRoller;


	window.usersList = usersList;

	window.ws = ws = new WebSocket('ws://localhost:8888');
	ws.onopen = function(data){
		if(window.console && console.log) console.log("connection to Horizonforge opened", ws, arguments);
		reidentify();
	}
	ws.onclose = function(){
		if(window.console && console.log) console.log("Horizonforge connection closed. Attempting to reconnect...");
		ws = new WebSocket('ws://localhost:8888');
	}
	ws.onerror = function(){
		if(window.console && console.log) console.log(arguments);
	}
	ws.onmessage = function(msg){
		console.log(msg.data);
		var req = JSON.parse(msg.data);
		switch(req.type){
			case "roll":
				req.model = new Roll;
				req.rules = new SettingsModel(req.rules);
				_.each(usersList.where({id:req.id, type:"host"}), function(host){
					//console.log("rolling for", host);
					host.rollsList.create({
						results:req.results,
						rules:req.rules,
						type:"roll-remote"
					});
				});
				//rollsList.create(req);
				break;
			case "connect":
				diceRoller.$el.trigger("connect", req);
				break;
			case "confirm":
				diceRoller.$el.trigger("confirm", req);
				break;
			case "leave":
				usersList.remove(usersList.where({"id":req.id}));
				diceRoller.$el.trigger("leave", req);
				break;
			case "rename":
				diceRoller.$el.trigger("rename", req);
				break;
			case "quit":
				usersList.remove(usersList.where({"id":req.id}));
				diceRoller.$el.trigger("quit", req);
				break;
			default:
				if(window.console && console.log) console.log("non-roll-type message recieved", req);
				break;
		}


	}

	$('body').on('click', function(e){
		var t = $(e.target)
		if(!t.is('li.plus') && !t.parents('.plus').length && !t.is('.ask') && !t.parents('.ask').length){
			$('.ask').fadeOut(200, function(){
				$('.ask').remove()
			});
			$('.dropdown').toggleClass('is-collapsed', true);
		}
	});
	$('#desc').on("change", reidentify);
	$('li.plus').on('click', function(){
		$(this).find('ul').toggleClass('is-collapsed');
	}).find('ul').on('click', '.connect', function(){
		ask('Connect', 'Display Name', function(d){
			if(d)ws.send(JSON.stringify({
				type:'connect',
				name:d
			}));
		});
	}).on('click', '.invite', function(){
		ask('Invite', 'Display Name', function(d){
			if(d)ws.send(JSON.stringify({
				type:'invite',
				name:d
			}));
		});
	});
});