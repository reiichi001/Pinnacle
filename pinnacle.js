const Client = require('discord.js');
const CONFIG = require('./config.json');

const client = new Client({
	disableEveryone: true,
});
if (CONFIG.token === '') {
	throw new Error("Please add a token file with your bot key to config.json");
}

client.login(CONFIG.token);

// We handle both of these events the same since it's a toggle
const events = {
	MESSAGE_REACTION_ADD: 'messageReactionAdd',
	MESSAGE_REACTION_REMOVE: 'messageReactionRemove',
};

// Bot basics
client.on("ready", () => console.log("Pinnacle is online!"));
client.on('error', console.error);

// This event handles toggling a pin if someone adds/removes the defined emoji for pins
client.on('raw', async event => {
	// eslint-disable-next-line no-prototype-builtins
	if (!events.hasOwnProperty(event.t)) {
		return;
	}

	const {
		d: data,
	} = event;
	const channel = client.channels.cache.get(data.channel_id);
	const message = await channel.messages.fetch(data.message_id);
	const emojiKey = data.emoji.id ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;

	// put any useful logging/debugging here
	console.log(`Server: "${message.guild.name}" Message: ${message.id} Event: ${event.t} Reaction: ${emojiKey}`);


	if (message.pinnable && emojiKey === CONFIG.emoji) {
		if (message.pinned) {
			// remove the pin
			message.unpin();
			message.reply("Unpinned the message");
		}
		else {
			// add a pin
			message.pin();
			message.reply("Pinned the message");
		}
	}
	else {
		// log an error. Pinnacle cannot pin things
		console.error("Couldn't do a pin/unpin. Check permissions and emoji");
	}
});

process.on('unhandledRejection', err => {
	const msg = err.stack.replace(new RegExp(`${__dirname}/`, 'gu'), './');
	console.error("Unhandled Rejection", msg);
});
