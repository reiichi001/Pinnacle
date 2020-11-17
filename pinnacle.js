/* eslint-disable max-len */
const {
	Client,
} = require('discord.js');
const CONFIG = require('./config.json');
const Sequelize = require('sequelize');

const globalPrefix = CONFIG.prefix;
const globalEmoji = CONFIG.emoji;

const client = new Client({
	disableEveryone: true,
});
if (CONFIG.token === '') {
	throw new Error("Please add a token file with your bot key to config.json");
}

client.login(CONFIG.token);

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'database.sqlite',
});

const Prefixes = sequelize.define('prefixes', {
	server: {
		type: Sequelize.STRING,
		defaultValue: 0,
		allowNull: false,
		unique: true,
	},
	prefix: {
		type: Sequelize.STRING,
		defaultValue: globalPrefix,
		unique: false,
	},
	emoji: {
		type: Sequelize.STRING,
		defaultValue: globalEmoji,
		unique: false,
	},
});

const ServerRoles = sequelize.define("serverroles", {
	server: {
		type: Sequelize.STRING,
		defaultValue: 0,
		allowNull: false,
	},
	roleid: {
		type: Sequelize.STRING,
		allowNull: false,
		unique: true,
	},
});

// We handle both of these events the same since it's a toggle
const events = {
	MESSAGE_REACTION_ADD: 'messageReactionAdd',
	MESSAGE_REACTION_REMOVE: 'messageReactionRemove',
};

// Bot basics
client.once('ready', () => {
	Prefixes.sync();
	ServerRoles.sync();
});


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

	let emoji = globalEmoji;
	const guildEmoji = await Prefixes.findOne({
		where: {
			server: message.guild.id,
		},
	});
	if (guildEmoji) {
		emoji = guildEmoji.get("emoji");
	}

	if (message.pinnable && emojiKey === emoji) {
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

// process message commands
client.on('message', async message => {
	if (message.author.bot) {
		return;
	}

	let prefix;
	if (message.content.startsWith(globalPrefix)) {
		prefix = globalPrefix;
	}
	else {
		const guildPrefix = await Prefixes.findOne({
			where: {
				server: message.guild.id,
			},
		});
		if (guildPrefix) {
			prefix = guildPrefix.get("prefix");
		}
	}

	// Checks if the bot was mentioned, with no message after it, returns the prefix.
	const prefixMention = new RegExp(`^\\s*<@!?${client.user.id}>\\s*$`, 'u');
	if (message.content.match(prefixMention)) {
		message.channel.send(`My prefix on this guild is \`${prefix}\``);
		return;
	}

	let args;
	if (message.guild && message.content.startsWith(prefix)) {
		if (!prefix) {
			return;
		}
		args = message.content.slice(prefix.length).trim()
			.split(/\s+/u);
	}
	else {
		const slice = message.content.startsWith(globalPrefix) ? globalPrefix.length : 0;
		args = message.content.slice(slice).split(/\s+/u);
	}

	const command = args.shift().toLowerCase();

	if (command === 'help') {
		message.channel.send({
			"embed": {
				"title": `Pinnacle Help`,
				"description": `Pinnacle's job is simple. It's here to help you pin messages `
					+ `without all the extra power of the "manage messages" permissions`
					+ ' in discord that could be misued.',
				"fields": [
					{
						"name": `addrole`,
						"value": `You can use \`${prefix}addrole <role>\` to add a role to Pinnacle's whitelist.`,
					},
					{
						"name": `emoji`,
						"value": `You can use \`${prefix}emoji <emoji>\` to change the emoji Pinnacle will use to pin things.`,
					},
					{
						"name": `help`,
						"value": `You can use \`${prefix}help\` to display this message.`,
					},
					{
						"name": `prefix`,
						"value": `You can use \`${prefix}prefix <new prefix>\` to change Pinnacle's prefix on your server.`,
					},
					{
						"name": `removerole`,
						"value": `You can use \`${prefix}addrole <role>\` to remove a role to Pinnacle's whitelist.`,
					},
					{
						"name": `roles`,
						"value": `You can use \`${prefix}roles\` to list all of the roles you've whitelisted for Pinnacle.`,
					},
				],
				"color": CONFIG.embed_color,
				"footer": {
					"text": "Like Pinnacle? Let the creator know!",
				},
			},
		});
	}

	if (command === 'prefix') {
		if (args.length) {
			const affectedRows = await Prefixes.upsert({
				server: message.guild.id,
				prefix: `${args[0]}`,
			});

			if (affectedRows) {
				message.channel.send({
					"embed": {
						"title": `Changed prefix`,
						"description": `Successfully updated prefix to \`${args[0]}\``,
						"color": CONFIG.embed_color,
						"footer": {
							"text": "Like Pinnacle? Let the creator know!",
						},
					},
				});
				return;
			}
			message.channel.send("Something went wrong...");
			return;
		}

		const userprefixres = await Prefixes.findOne({
			where: {
				server: message.guild.id,
			},
		});
		if (userprefixres) {
			message.channel.send({
				"embed": {
					"title": `Pinnacle Prefix`,
					"description": `Pinnacle's prefix is \`${userprefixres.get('prefix')}\``,
					"color": CONFIG.embed_color,
					"footer": {
						"text": "Like Pinnacle? Let the creator know!",
					},
				},
			});
			return;
		}
		message.channel.send({
			"embed": {
				"title": `Pinnacle Prefix`,
				"description": `Pinnacle's prefix is \`${globalPrefix}\``,
				"color": CONFIG.embed_color,
				"footer": {
					"text": "Like Pinnacle? Let the creator know!",
				},
			},
		});
	}

	if (command === 'emoji') {
		if (args.length) {
			const affectedRows = await Prefixes.upsert({
				server: message.guild.id,
				emoji: `${args[0]}`,
			});

			if (affectedRows) {
				message.channel.send({
					"embed": {
						"title": `Changed emoji`,
						"description": `Successfully updated emoji to \`${args[0]}\``,
						"color": CONFIG.embed_color,
						"footer": {
							"text": "Like Pinnacle? Let the creator know!",
						},
					},
				});
				return;
			}
			message.channel.send("Something went wrong...");
			return;
		}

		const useremojires = await Prefixes.findOne({
			where: {
				server: message.guild.id,
			},
		});
		if (useremojires) {
			message.channel.send({
				"embed": {
					"title": `Pinnacle Prefix`,
					"description": `Pinnacle's emoji is \`${useremojires.get('emoji')}\``,
					"color": CONFIG.embed_color,
					"footer": {
						"text": "Like Pinnacle? Let the creator know!",
					},
				},
			});
			return;
		}
		message.channel.send({
			"embed": {
				"title": `Pinnacle Prefix`,
				"description": `Pinnacle's emoji is \`${globalEmoji}\``,
				"color": CONFIG.embed_color,
				"footer": {
					"text": "Like Pinnacle? Let the creator know!",
				},
			},
		});
	}

	if (command === "roles") {
		const customroles = await ServerRoles.findAll({
			attributes: ['roleid'],
			where: {
				server: message.guild.id,
			},
		});

		if (customroles && customroles.length > 0) {
			const arr = customroles.map(rolename => `<@&${rolename.roleid}>`);

			message.channel.send({
				"embed": {
					"title": `Pinnacle Roles`,
					"description": `The following roles can use Pinnacle: ${arr.join(', ')}`,
					"color": CONFIG.embed_color,
					"footer": {
						"text": "Like Pinnacle? Let the creator know!",
					},
				},
			});
		}
		else {
			message.channel.send(`There are no role restrictions for this server`);
		}
	}

	if (command === "addrole") {
		if (args.length) {
			// look for a discord role by this name
			const guildRole = message.guild.roles.cache.find(r => r.name === args[0]);
			if (guildRole) {
				console.log(`Role ID to add: ${guildRole.id}`);
				// then add it
				const customroles = await ServerRoles.upsert({
					server: message.guild.id,
					roleid: guildRole.id,
				});

				// if insertion was successful, confirm it to the user
				if (customroles) {
					message.channel.send({
						"embed": {
							"title": `Pinnacle Roles`,
							"description": `The role ${guildRole} has been whitelisted.`,
							"color": CONFIG.embed_color,
							"footer": {
								"text": "Like Pinnacle? Let the creator know!",
							},
						},
					});
				}
			}
			else {
				message.channel.send("Could not find that role. Please check for capitalization and spelling.");
			}
		}
		else {
			message.channel.send("You did not specify a role");
		}
	}

	if (command === "removerole") {
		if (args.length) {
			// look for a discord role by this name
			const guildRole = message.guild.roles.cache.find(r => r.name === args[0]);
			if (guildRole) {
				console.log(`Role ID to remove: ${guildRole.id}`);
				// then add it
				const customroles = await ServerRoles.destroy({
					where: {
						server: message.guild.id,
						roleid: guildRole.id,
					},
				});

				// if insertion was successful, confirm it to the user
				if (customroles) {
					message.channel.send({
						"embed": {
							"title": `Pinnacle Roles`,
							"description": `The role ${guildRole} has been removed.`,
							"color": CONFIG.embed_color,
							"footer": {
								"text": "Like Pinnacle? Let the creator know!",
							},
						},
					});
				}
			}
			else {
				message.channel.send("Could not find that role. Please check for capitalization and spelling.");
			}
		}
		else {
			message.channel.send("You did not specify a role");
		}
	}
});

process.on('unhandledRejection', err => {
	const msg = err.stack.replace(new RegExp(`${__dirname}/`, 'gu'), './');
	console.error("Unhandled Rejection", msg);
});
