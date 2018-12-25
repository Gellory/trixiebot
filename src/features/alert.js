const fetch = require("node-fetch");
const log = require("../modules/log");
const CONST = require("../modules/CONST");
const Discord = require("discord.js");

const BaseCommand = require("../class/BaseCommand");
const TreeCommand = require("../class/TreeCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

// const twitch = require("twitch");
// const keys = {
//     twitch: require("../../keys/twitch.json")
// };

const base = "https://api.picarto.tv/v1/";

const services = {
    "picarto.tv": "picarto",
    // "twitch.tv": "twitch"
};
const services_reversed = {
    "picarto": "picarto.tv",
    // "twitch": "twitch.tv"
};

async function request(api) {
    const r = await fetch(base + api);
    return await r.json();
}

class Channel {
    constructor(channel) {
        channel = Object.setPrototypeOf(channel, Channel.prototype);
        return channel;
    }
}

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("alert");

    /** @type {Channel[]} */
    const online = new Array;

    async function checkChanges() {
        // get all online channels
        /** @type {any[]} */
        const picartoOnline = await request("online?adult=true");

        const stream = database.find({});
        stream.addListener("data", config => checkChange(picartoOnline, config));
        stream.once("end", () => { });
        stream.once("error", err => { log(err); });
    }

    async function checkChange(picartoOnline, savedConfig) {
        const guild = client.guilds.get(savedConfig.guildId);
        if (!guild) return;
        if (!guild.available) return;

        if (savedConfig.service !== "picarto") return;

        const oldChannel = online.find(channel => {
            return savedConfig.service === channel.service &&
                savedConfig.userId === channel.userId &&
                savedConfig.guildId === channel.guildId;
        });

        const guildChannel = guild.channels.get(savedConfig.channelId);
        if (!guildChannel) {
            if (oldChannel) online.splice(online.indexOf(oldChannel), 1);

            await database.deleteOne({
                service: savedConfig.service,
                guildId: savedConfig.guildId,
                userId: savedConfig.userId
            });
            return;
        }

        let channelPage = picartoOnline.find(channelPage => savedConfig.userId === channelPage.user_id.toString());
        if (!channelPage) {
            // remove the channel from the recently online list                
            if (savedConfig.messageId || oldChannel) {
                if (oldChannel)
                    online.splice(online.indexOf(oldChannel), 1);

                await database.updateOne({
                    service: savedConfig.service,
                    guildId: savedConfig.guildId,
                    userId: savedConfig.userId
                }, {
                    $set: {
                        messageId: null
                    }
                });

                // also delete the online message
                const onlineMessage = await guildChannel.fetchMessage((oldChannel || savedConfig).messageId);
                if (!onlineMessage) return;

                await onlineMessage.delete();
            }
        } else {
            // if the channel was not recently online, set it online
            if (oldChannel || savedConfig.messageId) return;

            channelPage = await request("channel/id/" + channelPage.user_id);

            const embed = new Discord.RichEmbed()
                .setColor(CONST.COLOR.PRIMARY)
                .setURL("https://www.picarto.tv/" + channelPage.name)
                .setAuthor(channelPage.name)
                .setTitle(channelPage.title)
                .addField("Followers", channelPage.followers, true)
                .addField("Total Viewers", channelPage.viewers_total, true)
                .setThumbnail(channelPage.avatar)
                .setImage(guildChannel.nsfw ?
                    `${channelPage.thumbnails.web_large}?${Date.now()}` : 
                    channelPage.adult ?
                        "https://66.media.tumblr.com/6c2c27a36111b356b65cf21746b72698/tumblr_p4tu9xcuEv1v9xi8y_og_500.jpg" :
                        `${channelPage.thumbnails.web_large}?${Date.now()}`)
                .setFooter(`${channelPage.adult ? "NSFW | " : ""}Category: ${channelPage.category} | Tags: ${channelPage.tags.join(", ")}`);

            const onlineMessage = await guildChannel.sendTranslated("{{user}} is live!", {
                user: channelPage.name
            }, { embed });

            const newchannel = new Channel({
                service: savedConfig.service,
                guildId: savedConfig.guildId,
                channelId: savedConfig.channelId,
                userId: channelPage.user_id.toString(),
                name: channelPage.name,
                messageId: onlineMessage.id
            });
            online.push(newchannel);

            await database.updateOne({
                service: savedConfig.service,
                guildId: savedConfig.guildId,
                userId: savedConfig.userId
            }, {
                $set: {
                    name: channelPage.name,
                    messageId: onlineMessage.id
                }
            });
        }
    }

    setInterval(() => checkChanges(), 60 * 1000);
    checkChanges();

    const alertCommand = cr.register("alert", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Make Trixie announce streamers when they go live.\nWorks only with Picarto at the moment.")
            .setUsage("<page url> <?channel>", "Subscribe Trixie to a Picarto channel!")
            .addParameter("page url", "copy the url of the stream page and paste it in here")
            .addParameterOptional("channel", "the channel to post the alert to later. If omitted will be this channel"))
        .setCategory(Category.MODERATION);

    /**
     * SUB COMMANDS
     */

    alertCommand.registerSubCommand("remove", new class extends BaseCommand {
        async call(message, url) {
            if (url === "") {
                return;
            }

            if (!/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/.test(url)) {
                await message.channel.sendTranslated("`page url` should be a vaid url! Instead I got a lousy \"{{url}}\"", {
                    url
                });
                log("Page url given is not valid. - alert");
                return;
            }

            const shorturl = url.match(/[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b\/([-a-zA-Z0-9@:%_+.~]{2,25})\b/)[0];
            const [host, name] = shorturl.split("/");
            const service = services[host];
            if (!service) {
                await message.channel.sendTranslated("MMMMMMMMMMMMHHHHHHHH I don't know this... {{service}} or whatever", {
                    service: host
                });
                log("Service not supported - alert");
                return;
            }
            if (!name) {
                await message.channel.sendTranslated("You should also give me your channel page in the url instead of just the site!");
                log("User page name not given - alert");
                return;
            }

            if (service === "picarto") {
                let channelPage;
                try {
                    channelPage = await request("channel/name/" + name);
                } catch (err) {
                    await message.channel.sendTranslated("I was not subscribed to this streamer.");
                    return;
                }

                const savedConfig = await database.findOne({
                    service,
                    guildId: message.guild.id,
                    userId: channelPage.user_id.toString()
                });
                if (!savedConfig) {
                    await message.channel.sendTranslated("I was not subscribed to this streamer.");
                    return;
                }

                await database.deleteOne({ _id: savedConfig._id });
                await message.channel.sendTranslated("Stopped alerting for {{name}}", {
                    name: channelPage.name
                });

                const oldChannel = online.find(channel => {
                    return savedConfig.service === channel.service &&
                        savedConfig.userId === channel.userId &&
                        savedConfig.guildId === channel.guildId;
                });
                if (oldChannel) online.splice(online.indexOf(oldChannel), 1);

                const guildChannel = message.guild.channels.get(savedConfig.channelId);
                if (!guildChannel) return;

                const channel = oldChannel || savedConfig;
                if (!channel.messageId) return;

                const onlineMessage = await guildChannel.fetchMessage(channel.messageId);
                if (!onlineMessage) return;

                await onlineMessage.delete();
                return;
            }
        }
    })
        .setHelp(new HelpContent().setUsage("<page url>", "unsubscribe Trixie from a Picarto channel"));

    alertCommand.registerSubCommand("list", new class extends BaseCommand {
        async call(message) {
            const streams = await database.find({
                guildId: message.guild.id
            }).toArray();

            if (streams.length === 0) {
                await message.channel.sendTranslated("Hehe, nothing here lol. Time to add some.");
                log("Sent alerts messages. None exist");
                return;
            }

            const sorted_by_channels = new Object;
            for (const stream of streams) {
                sorted_by_channels[stream.channelId] = [...(sorted_by_channels[stream.channelId] || []), stream];
            }

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
            for (const channelId in sorted_by_channels) {
                const channel = message.guild.channels.get(channelId);
                if (!channel) continue;

                let str = "";
                for (const stream of sorted_by_channels[channelId]) {
                    str += `${services_reversed[stream.service]}/**${stream.name}**\n`;
                }

                embed.addField("#" + channel.name, str);
            }

            message.channel.send({ embed });
        }
    })
        .setHelp(new HelpContent().setUsage("", "list all active streaming alerts"));

    alertCommand.registerDefaultCommand(new class extends BaseCommand {
        async call(message, msg) {
            if (msg === "") {
                return;
            }
            const channel = message.mentions.channels.first() || message.channel;

            const url = msg.replace(new RegExp(channel.toString(), "g"), "").trim();
            if (url === "") {
                await message.channel.sendTranslated("`page url` should be a vaid url! Instead I got nothing", {
                    url
                });
                return;
            }
            if (!/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/.test(url)) {
                await message.channel.sendTranslated("`page url` should be a vaid url! Instead I got a lousy \"{{url}}\"", {
                    url
                });
                return;
            }

            const shorturl = url.match(/[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b\/([-a-zA-Z0-9@:%_+.~]{2,25})\b/)[0];
            const [host, name] = shorturl.split("/");
            const service = services[host];
            if (!service) {
                await message.channel.sendTranslated("MMMMMMMMMMMMHHHHHHHH I don't know this... {{service}} or whatever", {
                    service: host
                });
                return;
            }
            if (!name) {
                await message.channel.sendTranslated("You should also give me your channel page in the url instead of just the site!");
                return;
            }

            if (service === "picarto") {
                let channelPage;
                try {
                    channelPage = await request("channel/name/" + name);
                } catch (err) {
                    await message.channel.sendTranslated("That user does not exist!");
                    return;
                }

                const savedConfig = await database.findOne({
                    service,
                    guildId: channel.guild.id,
                    userId: channelPage.user_id.toString()
                });
                if (savedConfig) {
                    await message.channel.sendTranslated("This server is already subscribed to this streamer.");
                    return;
                }

                await database.insertOne({
                    service,
                    guildId: channel.guild.id,
                    channelId: channel.id,
                    userId: channelPage.user_id.toString(),
                    name: channelPage.name,
                    messageId: null
                });
                await message.channel.sendTranslated("Will be alerting y'all there when {{name}} goes online!", {
                    name: channelPage.name
                });
                return;
            }
        }
    });

    alertCommand.registerSubCommandAlias("*", "add");
};