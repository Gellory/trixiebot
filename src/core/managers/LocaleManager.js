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

const fs = require("fs-extra");
const path = require("path");
const { isPlainObject } = require("../../util/util");
const { po } = require("gettext-parser");
const Gettext = require("node-gettext");
const DocumentMapCache = require("../../modules/db/DocumentMapCache");

const gt = new Gettext;

const translationsDir = path.join(__dirname, "..", "..", "..", "assets", "locale");
const locales = ["en", "de", "hu"];
const domain = "messages";

for (const locale of locales) {
    const filename = `${locale}.po`;
    const translationsFilePath = path.join(translationsDir, filename);
    const translationsContent = fs.readFileSync(translationsFilePath, "utf8")
        // we do this because I don't want to make a translation to be dependent of the context
        .split("\n")
        .filter(line => {
            if (line.startsWith("msgctxt")) return false;
            return true;
        })
        .join("\n");

    const parsedTranslations = po.parse(translationsContent, "utf8");
    gt.addTranslations(locale, domain, parsedTranslations);
}

gt.setTextDomain(domain);

class Cursor {
    constructor(opts = {}) {
        this.opts = opts;
    }

    translate(message) {
        this.opts.translate = message;
        return this;
    }

    ifPlural(message) {
        this.opts.plural = message;
        return this;
    }

    format(opts = {}) {
        this.opts.format = opts;
        return this;
    }

    locale(locale = "en") {
        this.opts.locale = locale;
        return this;
    }

    fetch(num) {
        let str = "";
        if (this.opts.locale) gt.setLocale(this.opts.locale);
        if (num && this.opts.plural) {
            str = gt.ngettext(this.opts.translate, this.opts.plural, num);
        } else {
            str = gt.gettext(this.opts.translate);
        }

        return module.exports.format(str, this.opts.format);
    }
}

module.exports = class LocaleManager {
    constructor(client, db, locales) {
        this.client = client;
        this.db = db.collection("locale");
        this._cache = new DocumentMapCache(this.db, "guildId", {
            indexes: {
                removedFrom: { expireAfterSeconds: 7 * 24 * 3600, sparse: true },
            },
        });
        this.locales = locales;

        this.addListeners();
    }

    addListeners() {
        this.client.addListener("guildCreate", async guild => {
            await this._cache.update(guild.id, { removedFrom: undefined });
        });

        this.client.addListener("guildDelete", async guild => {
            await this._cache.update(guild.id, { removedFrom: new Date });
        });
    }

    async get(guildId, channelid) {
        let config = await this._cache.get(guildId);
        if (!config) config = { global: "en", channels: {} };
        if (typeof config.global !== "string" || !isPlainObject(config.channels)) {
            config.global = typeof config.global !== "string" ? "en" : config.global;
            config.channels = !isPlainObject(config.channels) ? {} : config.channels;
            await this._cache.set(guildId, config);
        }

        if (channelid) {
            return config.channels[channelid] || config.global;
        } else {
            return config;
        }
    }

    async set(guildId, channelId, locale) {
        if (channelId && typeof channelId !== "string") {
            let config = {
                global: channelId.global,
                channels: channelId.channels,
            };
            await this._cache.set(guildId, config);
        } else {
            if (!locale) {
                locale = channelId;
                channelId = null;
            }
            if (!["global", "default", ...this.locales].includes(locale)) {
                throw new Error("Not a known locale");
            }
            let config = await this.get(guildId);
            if (channelId) {
                if (/(global|default)/i.test(locale)) delete config.channels[channelId];
                else config.channels[channelId] = locale;
            } else {
                config.global = locale;
            }
            await this._cache.set(guildId, config);
        }
    }

    async delete(guildId, channelId) {
        if (!channelId) {
            await this._cache.delete(guildId);
        } else {
            let config = await this.get(guildId);
            if (config) {
                if (config.channels[channelId]) delete config.channels[channelId];
                await this._cache.set(guildId, config);
            }
        }
    }
};

// expose the function for formating a string
function format(message, format = {}) {
    for (const f in format)
        message = message.replace(new RegExp(`{{\\s*${f}\\s*}}`, "g"), format[f]);

    return message;
}
module.exports.format = format;

function translate(message) {
    return new Cursor({ translate: message });
}
module.exports.translate = translate;

module.exports.locales = locales;
module.exports.setLocale = gt.setLocale.bind(gt);
module.exports.locale = function locale(code) {
    return new Cursor({ locale: code });
};

module.exports.autoTranslate = async function autoTranslate(channel, str, format) {
    return translate(str)
        .locale(await channel.locale())
        .format(format)
        .fetch() || str;
};

module.exports.autoTranslateChannel = async function autoTranslateChannel(str, format) {
    return translate(str)
        .locale(await this.locale())
        .format(format)
        .fetch() || str;
};

module.exports.sendTranslated = async function sendTranslated(str, format, embed) {
    return await this.send(await module.exports.autoTranslateChannel.apply(this, [str, format]), embed);
};