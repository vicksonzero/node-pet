const Logger = require("./lib/Logger");

module.exports = function(ghostScript){
	function Ghost(username){
		this.user = username;
		this._logger = new Logger("Ghost");
		console.log(this._logger);

		this.plugins = [];
	}

	function validateGhostScript (ghostScript) {
		return true;
	}


	Ghost.prototype = ghostScript;
	var p = Ghost.prototype;



	p.getPersistent = function getPersistent () {
		return this.persistent;
	};

	p.onInstalled = function onInstalled (game) {
		this._logger.info("onInstalled");
		var phrase = this.randomPhrase(this.scripts.installed, this.persistent.scripts.installed);
		game.speak( this.injectKeywords(phrase, game) );
		console.log(this.persistent.scripts.installed);
	};

	p.onPopup = function onPopup (game) {
		var phrase = this.randomPhrase(this.scripts.greetings, this.persistent.scripts.greetings);

		// debug
		//phrase = this.scripts.greetings.list[0];

		// flesh out by filling in dynamic stuffs
		phrase = this.injectKeywords(phrase, game);

		// actually speak the phrase
		game.speak( phrase );
	};

	/**
	 * phrasePersist:{list:[0,10,9,0,0,...]}	// Ghost.RANDOM
	 * phrasePersist:{count:0.5, list:[0,1,2,0,0,...]}	// Ghost.RANDOM // percentage weight. unsupported now
	 * phrasePersist:{used:10}	// Ghost.SEQUENCE
	 *
	 */
	p.randomPhrase = function randomPhrase (phraseArray, phrasePersist) {
		var result = "";
		var randomCount = phraseArray.nonoverlap;
		if(randomCount<=1){
			randomCount = Math.floor( phraseArray.list.length*randomCount );
		}
		if(!phraseArray.random){
			result = phraseArray.list[phrasePersist.used];
			console.log("HI");
			console.log(phraseArray.list.length);
			phrasePersist.used = (phrasePersist.used+1)%phraseArray.list.length;
			console.log(phrasePersist);
			return result;
		}else{
			// move flag forward
			for(var i=0; i < phrasePersist.list.length; i++){
				if(phrasePersist.list[i]){
					phrasePersist.list[i]--;
				}
			}
			var index = Math.floor(Math.random()*phraseArray.list.length);

			// limit max try
			for(var i=0; i < phraseArray.list.length; i++){

				// loop through the used array, wrap
				index = (index+1)%phraseArray.list.length;

				// if unused
				if(!phrasePersist.list[index]){
					// set count down. do not see this in the near future
					phrasePersist.list[index] = randomCount;
					// return result
					return phraseArray.list[index];
				}
			}
			console.log(phraseArray);
			throw "unexpected: phrasePersist is not cleared:";
		}
		return null;
	};

	p.injectKeywords =function injectKeywords (phrase, game) {
		phrase = (
			phrase
				.replace("_user", this.user)
				.replace("_myState", this.state)
				.replace("_time", game.getTime)
				.replace("_date", game.getDate)
				.replace("_botName", this.name)
				.replace(/_phrase\[([a-zA-Z_-]+)\]/, this.getPhraseFromMatches.bind(this))
		);
		return phrase;
	};

	p.getPhraseFromMatches = function getPhraseFromMatches(match, p1){	// todo: also eat _phrase[timeAnnouncer.default]
		if(this.scripts.hasOwnProperty(p1)){
			var phrase = this.randomPhrase(this.scripts[p1], this.persistent.scripts[p1]);
			return this.injectKeywords(phrase, game);
		}else{
			var phrase = this.randomPhrase(this.scripts.noPluginPhrase, this.persistent.scripts.noPluginPhrase);
			phrase = phrase.replace("_pluginName", p1);
			return this.injectKeywords(phrase, game);
		}
	};

	p.setPersistent = function setPersistent (val) {
		this.persistent = val;
		// on persistent changed
	};

	p.initPersistent = function initPersistent () {
		this.persistent.scripts = {};
		Object.keys(this.scripts).forEach(function(scriptKey){
			this.persistent.scripts[scriptKey] = {
				used:0,
				list:[]
			};
			for(var i=0; i < this.scripts[scriptKey].list.length; i++){
				this.persistent.scripts[scriptKey].list.push(0);
			}
		}.bind(this));

	};

	p.addPlugin = function addPlugin(plugin) {
		this._logger.info("Plugin: "+plugin.name+" installed");
		this.plugins.push(plugin);
		plugin.init(this);
	};
	

	return Ghost;
};
