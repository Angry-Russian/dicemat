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

	function notify(title, text){
		$('<li/>').html(notif({title:title, content:text})).addClass('notification')
			.on('click', function(){$(this).remove();})
			.appendTo('#notifications').hide().slideDown(300).delay(2000).fadeOut(300, function(){$(this).remove();})
	}

	function ask(text, placeholder, callback){
		$('#addHost').fadeOut(200, function(){$(this).remove()})
		$('<form id="addHost"/>').addClass('ask').attr('action', '#')
			.append($('<span/>').text(text))
			.append('<input type="text" class="answer" placeholder="'+placeholder+'">')
			.append('<button class="confirm">Ok</button>')
			.append('<button class="cancel">Cancel</button>')
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

					if(settings.get('total')) $("#total").attr("checked", "checked");
					if(settings.get('doubles')) $("#doubles").attr("checked", "checked");
					if(settings.get('rerolls')) $("#rerolls").attr("checked", "checked").val(settings.get('rerolls'));
					if(settings.get('xhighest')) $("#xhighest").attr("checked", "checked").val(settings.get('xhighest'));
					if(settings.get('threshold')) $("#threshold").attr("checked", "checked").val(settings.get('threshold'));
					//name		: $('#desc').val()

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
					var i = 1, roll = localStorage["roll0"];
					for(i; i < localStorage.length; i++){
						roll = localStorage["roll"+(i)];
						if(roll){
							roll = JSON.parse(roll);
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
				case "create": model.id = model.get("order");
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
				sort: false,
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
	$('#desc').val(settings.get('name'));





	var Roll = Backbone.Model.extend({

		defaults:function(){
			return {
				title: "empty roll...",
				order: rollsList.nextOrder(),
				hidden: false,
				rules:settings,
				results:[]
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
			return this.last().get('order')+1;
		},comparator: "order"
	});
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
		}
	});

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
			diceRoller.$el.trigger("quit", {name: this.model.get("name")});
			var that = this.$el;
				that.hide(350, function(e){that.remove()});

		},addRoll:function(roll){
			var view = new RollView({model:roll});
			this.$el.prepend(view.render().$el);

		}, render:function(e){
			this.$el.attr('name', this.model.get("name")).toggleClass('results', true);
			return this;
		}, initialize:function(e){
			//this.rollsList = new List;
			this.listenTo(this.model.rollsList, 'add', this.addRoll);
			this.listenTo(this.model, 'remove', this.remove);
			this.listenTo(this.model, 'change', this.render);
		}
	});

	var DiceRoller = Backbone.View.extend({
		socketid:undefined,
		el:$('#roller'),
		events: {
			"click #settings" : "toggleOptions",
			"swipe" : "toggleOptions",
			"click #dice input" : "numberFocus",
			//"click input:checkbox" : "updateSettings",
			"click #clear" : "clearRolls",
			"click #exalted" : "setExalted",
			"click #wod" : "setWod",
			"click #dnd" : "setDnd",
			"click #roll": "generate",
			"change input" : "updateSettings",
			"submit #dicepool": "generate",
			"keydown #desc": "selfRename",
			"click #show-hidden" : "toggleHidden",

			"join" : "guestArrived",
			"leave" : "guestLeave",
			"rename" : "userRename"

		},toggleOptions:function(e){
			/*$('#options').toggle();
			$("#settings").toggleClass("on");*/
            $('#settings, #options').toggleClass("on");
			if(!$("#settings").is('.on')) this.updateSettings();
		},toggleHidden:function(){
			this.$el.toggleClass("show-hidden");
		},numberFocus:function(e){
			$(e.target).select();
		},


		setExalted : function(e){
			$("#threshold, #doubles").prop('checked', true);
			$('#targetNumber').val(7);
			$("#total, #nhighest, #rerolls").prop('checked', false);
			$(".diceInput").not("#d10s").val(0).attr('disabled', true);
			ga('send', 'event', 'settings', 'set', 'exalted');

		},
		setWod : function(e){
			$("#threshold, #rerolls").prop('checked', true);
			$('#targetNumber').val(8);
			$("#total, #nhighest, #doubles").prop('checked', false);
			$(".diceInput").not("#d10s").val(0).attr('disabled', true);
			ga('send', 'event', 'settings', 'set', 'wod');

		},
		setDnd : function(e){
			$("#total").prop('checked', true);
			$("#threshold, #rerolls, #nhighest, #doubles").prop('checked', false);
			$(".diceInput").attr('disabled', false);
			ga('send', 'event', 'settings', 'set', 'D&D');
		},


		guestArrived: function(e, data){
			var existingUser = usersList.where({name:data.name, id:data.id});
			notify(data.name || "Anonymous", "Joined room.");

			if(!existingUser.length){
				usersList.create({type:"host", name:data.name, id:data.id});//*/
			}

		},guestLeave: function(e, id){
			console.log(e, id);
			var user = usersList.where({"id":id});
			usersList.remove(user);
			notify(user.name || "Anonymous", "Went away.");

		},selfRename:function(e, data){
			if(e.which===13){
				$('#desc').blur();
				return false;
			}

		},userRename:function(e, data){
			var user = usersList.findWhere({id:data.id});
			if(user) user.set({name: data.name});
			ga('send', 'event', 'settings', 'rename', data.name);
		},


		updateSettings: function(e){
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
			usr.rollsList = new List;
			var view = new HostView({model:usr});
			this.$('#viewport').attr('data-count', usersList.length + 1).append(view.render().$el);

		},updateUser:function(usr){
			// nothing to do for now.

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

			if(settings.get("xhighest")) results.sort(function(a, b){return (a===b)?0:(a>b)?-1:1});
			if(rolled){
				var roll = {results: results, rules: settings};
				rollsList.create(roll);
				ws.emit('roll', roll);
			}

			ga('send', 'event', 'roll', 'click');

			return false;
		},

		render:function(){
			var len = usersList.length + 1;
			if(len===1)
				this.$('#viewport').removeAttr('data-count');
			else
				this.$('#viewport').attr('data-count', len);
		},
		initialize: function(){
			this.listenTo(rollsList, 'add', this.addRoll);
			this.listenTo(usersList, 'add', this.addUser);
			this.listenTo(usersList, 'remove', this.render);
			this.listenTo(usersList, 'change', this.updateUser);

			rollsList.fetch();
		}});

	function reidentify(){
		var n = $('#desc').val() || "Anonymous";
		$('#viewport ul.results#self').attr('name', n + " (self)");
		ws.emit('identify', n);
		settings.save('name',n);
	}

	window.usersList = usersList;
	var diceRoller = new DiceRoller,
		ws = window.ws = io('http://ramblescript.com:2500');
		//ws = window.ws = io('http://localhost:2500');




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

	$(window).on('hashchange', function(e){
		ws.emit("join", window.location.hash.slice(1));
	});


	ws.on('roll', function(req){
		console.log('roll', req);
		req.model = new Roll;
		req.rules = new SettingsModel(req.rules);
		_.each(usersList.where({id:req.id, type:"host"}), function(host){
			host.rollsList.create({
				results:req.results,
				rules:req.rules,
				type:"roll-remote"
			});
		});
	});
 	ws.on('join', function(e){
		console.log('join', e);
		diceRoller.$el.trigger("join", e);
	});
	ws.on('leave', function(e){
		console.log('leave', e);
		diceRoller.$el.trigger("leave", e);
	});
	ws.on('rename', function(e){
		console.log('rename', e);
		diceRoller.$el.trigger("rename", e);
	});
	ws.on('connect', function(){
		reidentify();
		if(window.location.hash && window.location.hash!=="#")
			ws.emit('join', window.location.hash);
	});
	ws.on('disconnect', function(e){
		console.log('disconnect', e);
		diceRoller.$el.trigger("disconnect", e);
	});
	ws.on('err', function(data){
		console.error(data);
	});
	ws.on('self', function(name){
		console.log('room', name);
		diceRoller.socketid = name;
		if(!window.location.hash || window.location.hash === "#")
			window.location.hash = name;
	});
	ws.on('memberlist', function(members){
		console.log('Memberlist:', members, arguments);
		// TODO: diceRoller.$el.trigger("memberlist", members);
		var filter = [];
		for(var i in members){
			filter.push(i);
			if(i !== diceRoller.socketid){
				var existingUser = usersList.findWhere({id:i});
				if(!existingUser) usersList.create({type:"host", name:members[i], id:i});
			}
		}

		usersList.forEach(function(user){
			if(filter.indexOf(user.id)<0)
				userList.remove(user);
		})
	});
	ws.on('chat', function(member, message){
		// -- chatCollection.create({id:user, text:message});
		console.log(user, 'says', message);
	});
	reidentify();
	$(window).trigger('hashchange');
	window.UserList = UserList;
});
