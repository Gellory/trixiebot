/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Discord = require("discord.js");
const { EventEmitter } = require("events");

// eslint-disable-next-line no-unused-vars
const LocaleManager = require("../../core/managers/LocaleManager");
const Translation = require("../i18n/Translation");

// eslint-disable-next-line no-unused-vars
const StreamConfig = require("./stream/StreamConfig");
const Stream = require("./stream/Stream");
const StreamQueryCursor = require("./StreamQueryCursor");

class AlertManager extends EventEmitter {
    /**
     * @param {Db} db
     * @param {LocaleManager} locale
     * @param {Discord.Client} client
     * @param {StreamProcessor[]} services
     */
    constructor(db, locale, client, services) {
        super();

        /** @type {OnlineChannel[]} */
        this.online = [];

        this.database = db.collection("alert");
        this.db_config = db.collection("alert_config");
        this.locale = locale;
        this.client = client;

        /** @type {StreamProcessor[]} */
        this.services = [];
        this.services_mapped = {};

        for (let Service of services) {
            const service = new Service(this);
            service.on("offline", async oldStream => {
                if (!oldStream) return;

                this.online.splice(this.online.indexOf(oldStream), 1);

                await this.database.updateOne({
                    _id: oldStream._id,
                }, { $set: { messageId: null, lastChannelId: null } });

                if (await this.isCleanup(oldStream.guild))
                    await oldStream.delete();
            });
            service.on("change", async stream => {
                const old = this.online.findIndex(old =>
                    old.service === stream.service &&
                    old.userId === stream.userId &&
                    old.guild.id === stream.guild.id);
                if (old >= 0) {
                    const oldStream = this.online[old];
                    this.online.splice(old, 1);
                    if (await this.isCleanup(oldStream.guild))
                        oldStream.delete();
                }

                const channel = stream.curr_channel;
                if (!channel) return;

                if (channel.deleted) {
                    await this.removeStreamConfig(stream);
                    return;
                }
                if (!channel.permissionsFor(channel.guild.me).has(Discord.Permissions.FLAGS.SEND_MESSAGES)) return;

                const embed = await stream.getEmbed();

                const onlineMessage = await this.locale.send(
                    channel,
                    new Translation("alert.announcement", "{{user}} is live on {{service}}!", {
                        user: stream.username,
                        service: stream.service.display_name,
                    }),
                    { embed }
                );

                stream.setMessage(onlineMessage);

                this.online.push(stream);

                await this.database.updateOne({
                    _id: stream._id,
                }, {
                    $set: {
                        name: stream.username,
                        messageId: onlineMessage.id,
                        lastChannelId: onlineMessage.channel.id,
                    },
                });
            });
            service.on("online", async stream => {
                const channel = stream.curr_channel;
                if (!channel) return;

                if (channel.deleted) {
                    await this.removeStreamConfig(stream);
                    return;
                }
                if (!channel.permissionsFor(channel.guild.me).has(Discord.Permissions.FLAGS.SEND_MESSAGES)) return;

                const embed = await stream.getEmbed();

                const onlineMessage = await this.locale.send(
                    channel,
                    new Translation("alert.announcement", "{{user}} is live on {{service}}!", {
                        user: stream.username,
                        service: stream.service.display_name,
                    }),
                    { embed }
                );

                stream.setMessage(onlineMessage);

                this.online.push(stream);

                await this.database.updateOne({
                    _id: stream._id,
                }, {
                    $set: {
                        name: stream.username,
                        messageId: onlineMessage.id,
                        lastChannelId: onlineMessage.channel.id,
                    },
                });
            });
            this.services.push(service);
            this.services_mapped[service.name] = service;
        }
    }

    getServiceConfigsStream(service) {
        const db_stream = this.database.find({ service: service.name });

        return new StreamQueryCursor(db_stream, this, service);
    }

    /**
     * @param {string} url
     * @returns {Processor}
     */
    getService(url) {
        for (let service of this.services)
            if (service.testURL(url))
                return service;
    }

    /**
     * @param {StreamConfig} config
     */
    async addStreamConfig(config) {
        for (let service of this.services) {
            if (service.name !== config.service.name) continue;

            await this.database.insertOne({
                service: config.service.name,
                guildId: config.guild.id,
                channelId: config.channel && config.channel.id,
                nsfwChannelId: config.nsfwChannel && config.nsfwChannel.id,
                sfwChannelId: config.sfwChannel && config.sfwChannel.id,
                userId: config.userId,
                name: config.username,
                messageId: null,
                lastChannelId: null,
            });

            await service.addStreamConfig(config);

            return new Stream(this, service, config.channel, config.nsfwChannel, config.sfwChannel, {
                ...config, messageId: null, lastChannelId: null,
            });
        }
    }

    /**
     * @param {StreamConfig} config
     */
    async removeStreamConfig(config) {
        for (let service of this.services) {
            if (service.name !== config.service.name) continue;

            await this.database.deleteOne({ _id: config._id });

            await service.removeStreamConfig(config);

            return;
        }
    }

    /**
     * @param {Discord.Guild} guild
     * @param {ParsedStream} parsed
     * @returns {Promise<Stream>}
     */
    async getStreamConfig(guild, parsed) {
        const raw = await this.database.findOne({
            service: parsed.service.name,
            guildId: guild.id,
            userId: parsed.userId,
        });
        if (!raw) return;

        const def = guild.channels.get(raw.channelId);
        const nsfw = guild.channels.get(raw.nsfwChannelId);
        const sfw = guild.channels.get(raw.sfwChannelId);

        return new Stream(this, this.services_mapped[raw.service], def, nsfw, sfw, raw);
    }

    getStreamConfigs(guild) {
        return new StreamQueryCursor(this.database.find({ guildId: guild.id }), this).toArray();
    }

    getOnlineStreams(guild) {
        return this.online.filter(online => online.guild.id === guild.id);
    }

    // Config stuff

    async isCompact(guild) {
        return !!await this.db_config.findOne({ guildId: guild.id, compact: true });
    }

    async setCompact(guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { compact: true } }, { upsert: true });
    }

    async unsetCompact(guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { compact: false } }, { upsert: true });
    }

    async isCleanup(guild) {
        return !await this.db_config.findOne({ guildId: guild.id, cleanup: false });
    }

    async setCleanup(guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { cleanup: true } }, { upsert: true });
    }

    async unsetCleanup(guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { cleanup: false } }, { upsert: true });
    }
}

module.exports = AlertManager;